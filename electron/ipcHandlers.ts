import { ipcMain } from 'electron';
import { getDb, getDbPath, closeDb, reopenDb } from './database';
import { validateLegacyDatabase, importLegacyDatabase } from './legacy-importer';
import { win } from './main';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import { pipeline } from 'stream';
const streamPipeline = promisify(pipeline);
import os from 'os';
import { execSync } from 'child_process';
import {
  encryptFile,
  decryptFile,
  getOrCreateEncryptionKey
} from './encryption';
// Google Drive integration temporarily disabled
// import { authenticate, isAuthenticated, deleteTokens, loadCredentials } from './oauth';
// import {
//   uploadBackup,
//   downloadBackup,
//   listBackups,
//   deleteBackup as deleteDriveBackup,
//   getFileInfo,
// } from './googleDrive';

// Database stores dates as Julian Day Numbers (JDN).
// Unix Epoch (1970-01-01T00:00:00Z) is JDN 2440587.5
const JDN_EPOCH = 2440587.5;
const MS_PER_DAY = 86400 * 1000;

// CPU Load tracking
let lastCpuStats = os.cpus();


function toJsDate(jdn: number | null): string | null {
  if (jdn === null || jdn === undefined || jdn === 0) return null;
  const timestamp = (jdn - JDN_EPOCH) * MS_PER_DAY;
  return new Date(timestamp).toISOString();
}

function toDelphiDate(isoDate: string | Date | null): number | null {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return null;
  const timestamp = date.getTime();
  return (timestamp / MS_PER_DAY) + JDN_EPOCH;
}


async function createBackupHelper(encrypt: boolean = true, type: 'manual' | 'auto' = 'manual') {
  const dbPath = getDbPath();
  const dbDir = path.dirname(dbPath);
  const typeDir = path.join(dbDir, 'backups', type);

  // Create backups directory if it doesn't exist
  if (!fs.existsSync(typeDir)) {
    fs.mkdirSync(typeDir, { recursive: true });
  }

  // Generate backup filename with timestamp
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '')
    .replace('T', '_');

  // Use .gz for compressed backups
  const extension = encrypt ? '.encrypted.gz' : '.sqlite.gz';
  const backupFileName = `${type}_${timestamp}${extension}`;
  const backupPath = path.join(typeDir, backupFileName);

  // Close database connection before copying
  closeDb();

  try {
    const tempCompressed = backupPath + '.gz.tmp';

    // 1. Always Compress first
    const readStream = fs.createReadStream(dbPath);
    const writeStream = fs.createWriteStream(tempCompressed);
    const zip = zlib.createGzip();
    await streamPipeline(readStream, zip, writeStream);

    if (encrypt) {
      const encryptionKey = getOrCreateEncryptionKey(dbDir);
      // 2. Encrypt the compressed file
      await encryptFile(tempCompressed, backupPath, encryptionKey);
      fs.unlinkSync(tempCompressed);
    } else {
      // Just move the compressed file to final destination
      fs.renameSync(tempCompressed, backupPath);
    }

    // Get stats for return
    const stats = fs.statSync(backupPath);
    return {
      success: true,
      fileName: backupFileName,
      size: stats.size,
      date: stats.mtime.toISOString(),
      encrypted: encrypt,
      type: type
    };
  } finally {
    // Reopen database
    reopenDb();
  }
}

let autoBackupTimer: NodeJS.Timeout | null = null;
function triggerAutoBackup() {
  if (autoBackupTimer) clearTimeout(autoBackupTimer);
  autoBackupTimer = setTimeout(async () => {
    try {
      const db = getDb();
      const enabledVal = db.prepare('SELECT value FROM settings WHERE key = ?').get('auto_backup_enabled') as any;
      if (enabledVal && enabledVal.value === 'false') {
        console.log('Auto-backup is disabled in settings, skipping.');
        return;
      }

      console.log('Running scheduled auto-backup...');
      await createBackupHelper(true, 'auto');

      // Keep only last 30 auto-backups
      const dbPath = getDbPath();
      const dbDir = path.dirname(dbPath);
      const autoDir = path.join(dbDir, 'backups', 'auto');
      if (fs.existsSync(autoDir)) {
        const files = fs.readdirSync(autoDir)
          .filter(f => f.startsWith('auto_backup_'))
          .map(f => ({ name: f, time: fs.statSync(path.join(autoDir, f)).mtime.getTime() }))
          .sort((a, b) => b.time - a.time);

        if (files.length > 30) {
          files.slice(30).forEach(f => {
            fs.unlinkSync(path.join(autoDir, f.name));
          });
        }
      }
    } catch (error) {
      console.error('Auto backup failed:', error);
    }
  }, 5000); // Debounce 5 seconds
}

export function registerIpcHandlers() {
  // --- LOCKING HANDLERS ---
  ipcMain.handle('lock-repair', async (_event, id) => {
    try {
      const db = getDb();
      db.prepare('DELETE FROM SyncLocks WHERE RecordID = ?').run(id);
      db.prepare('INSERT INTO SyncLocks (RecordID, DeviceName) VALUES (?, ?)').run(id, 'PC');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('unlock-repair', async (_event, id) => {
    try {
      const db = getDb();
      db.prepare('DELETE FROM SyncLocks WHERE RecordID = ?').run(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('check-repair-lock', async (_event, id) => {
    try {
      const db = getDb();
      const lock = db.prepare('SELECT * FROM SyncLocks WHERE RecordID = ?').get(id) as any;
      if (lock) {
        return { locked: true, device: lock.DeviceName, time: lock.LockTime };
      }
      return { locked: false };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
  // Refocus window handler - fixes frozen inputs after window.confirm
  ipcMain.handle('refocus-window', async () => {
    try {
      if (win) {
        // Restore if minimized
        if (win.isMinimized()) {
          win.restore();
        }
        // Focus the window at OS level
        win.focus();
        // Focus the web contents (the rendered page)
        win.webContents.focus();
      }
      return { success: true };
    } catch (error: any) {
      console.error('Error refocusing window:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-repairs', async (_event, args) => {
    const {
      page = 1,
      limit = 50,
      search = '',
      status = null,
      shouldCall = false,
      executor = null,
      paymentDateStart = null,
      paymentDateEnd = null,
      advancedFilters = [] // New parameter
    } = args;
    const db = getDb();
    const offset = (page - 1) * limit;

    let filterSql = 'WHERE 1=1';
    const params: any[] = [];

    if (shouldCall) {
      filterSql += ` AND Перезвонить = 1`;
    }

    if (executor) {
      filterSql += ` AND Виконавець = ?`;
      params.push(executor);
    }

    if (search) {
      const normalizedSearch = search.replace(/\D/g, '');
      const phoneSearchTerm = normalizedSearch ? `%${normalizedSearch}%` : '';
      filterSql += ` AND (LOWER(Имя_заказчика) LIKE LOWER(?) OR REPLACE(REPLACE(REPLACE(REPLACE(Телефон, '-', ''), ' ', ''), '(', ''), ')', '') LIKE ? OR Квитанция LIKE ? OR LOWER(Наименование_техники) LIKE LOWER(?) OR CAST(Стоимость AS TEXT) LIKE ? OR CAST(Сумма AS TEXT) LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, phoneSearchTerm || term, term, term, term, term);
    }

    if (args.dateStart) {
      filterSql += ` AND Начало_ремонта >= ?`;
      params.push(toDelphiDate(args.dateStart));
    }

    if (args.dateEnd) {
      filterSql += ` AND Начало_ремонта <= ?`;
      const date = new Date(args.dateEnd);
      date.setUTCHours(23, 59, 59, 999);
      params.push(toDelphiDate(date.toISOString()));
    }

    if (paymentDateStart || paymentDateEnd) {
      filterSql += ` AND Оплачено = 1`;
    }

    if (paymentDateStart) {
      filterSql += ` AND Конец_ремонта >= ?`;
      params.push(toDelphiDate(paymentDateStart));
    }

    if (paymentDateEnd) {
      filterSql += ` AND Конец_ремонта <= ?`;
      const date = new Date(paymentDateEnd);
      date.setUTCHours(23, 59, 59, 999);
      params.push(toDelphiDate(date.toISOString()));
    }

    if (status) {
      if (Array.isArray(status)) {
        if (status.length > 0) {
          const placeholders = status.map(() => '?').join(',');
          filterSql += ` AND Состояние IN (${placeholders})`;
          params.push(...status);
        }
      } else {
        filterSql += ` AND Состояние = ?`;
        params.push(status);
      }
    }

    // Process Advanced Filters
    if (Array.isArray(advancedFilters) && advancedFilters.length > 0) {
      const fieldMap: Record<string, string> = {
        receiptId: 'Квитанция',
        deviceName: 'Наименование_техники',
        faultDesc: 'Описание_неисправности',
        workDone: 'Выполнено',
        costLabor: 'Стоимость',
        totalCost: 'Сумма',
        isPaid: 'Оплачено',
        status: 'Состояние',
        clientName: 'Имя_заказчика',
        clientPhone: 'Телефон',
        profit: 'Доход',
        note: 'Примечание',
        executor: 'Виконавець'
      };

      const operatorMap: Record<string, string> = {
        eq: '=',
        neq: '<>',
        gt: '>',
        lt: '<',
        gte: '>=',
        lte: '<=',
        cont: 'LIKE',
        ncont: 'NOT LIKE'
      };

      advancedFilters.forEach((filter: any, index: number) => {
        const dbField = fieldMap[filter.field];
        const op = operatorMap[filter.operator];
        if (!dbField || !op) return;

        const logic = index === 0 ? 'AND (' : (filter.logic || 'AND');

        let value = filter.value;
        let sqlOp = op;

        if (filter.operator === 'cont' || filter.operator === 'ncont') {
          value = `%${value}%`;
        }

        if (filter.field === 'isPaid') {
          value = value === 'true' || value === true || value === '1' ? 1 : 0;
        }

        // For phone field in advanced filter, we should also normalize if possible, 
        // but for simplicity we'll just do a standard LIKE if it's 'cont'

        if (index === 0) {
          filterSql += ` AND (${dbField} ${sqlOp} ?`;
        } else {
          filterSql += ` ${logic} ${dbField} ${sqlOp} ?`;
        }
        params.push(value);

        if (index === advancedFilters.length - 1) {
          filterSql += `)`;
        }
      });
    }

    const query = `
      SELECT
        ID as id,
        Квитанция as receiptId,
        Наименование_техники as deviceName,
        Описание_неисправности as faultDesc,
        Выполнено as workDone,
        Стоимость as costLabor,
        Сумма as totalCost,
        Оплачено as isPaid,
        Состояние as status,
        Имя_заказчика as clientName,
        Телефон as clientPhone,
        Доход as profit,
        Начало_ремонта as dateStart,
        Конец_ремонта as dateEnd,
        Примечание as note,
        Перезвонить as shouldCall,
        Виконавець as executor,
        ТипОплати as paymentType
      FROM Ремонт
      ${filterSql}
      ORDER BY Квитанция DESC 
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, limit, offset];
    const countParams = [...params];
    const countQuery = `SELECT COUNT(*) as count FROM Ремонт ${filterSql}`;

    // Helper function to convert string status to number
    const convertStatusToNumber = (status: any): number => {
      if (typeof status === 'number') return status;
      if (typeof status === 'string') {
        const statusMap: Record<string, number> = {
          'У черзі': 1,
          'У роботі': 2,
          'Очікув. відпов./деталі': 3,
          'Очікування': 3,
          'Готовий до видачі': 4,
          'Готовий': 4,
          'Не додзвонилися': 5,
          'Не додзвонились': 5,
          'Видано': 6,
          'Одеса': 7
        };
        return statusMap[status] || 1; // Default to Queue if unknown
      }
      return 1; // Default to Queue
    };

    const repairs = db.prepare(query).all(...queryParams).map((r: any) => ({
      ...r,
      status: convertStatusToNumber(r.status),
      dateStart: toJsDate(r.dateStart),
      dateEnd: toJsDate(r.dateEnd),
    }));

    const total = (db.prepare(countQuery).get(...countParams) as any).count;

    return { repairs, total, page, totalPages: Math.ceil(total / limit) };
  });

  // Get status counts
  ipcMain.handle('get-status-counts', async (_event) => {
    const db = getDb();
    const counts: Record<number, number> = {};

    // Get count for each status (check both number and string formats)
    for (let status = 1; status <= 7; status++) {
      // Map number to string for comparison
      const statusMap: Record<number, string[]> = {
        1: ['У черзі', '1'],
        2: ['У роботі', '2'],
        3: ['Очікув. відпов./деталі', 'Очікування', '3'],
        4: ['Готовий до видачі', 'Готовий', '4'],
        5: ['Не додзвонилися', 'Не додзвонились', '5'],
        6: ['Видано', '6'],
        7: ['Одеса', '7']
      };

      const statusStrings = statusMap[status] || [status.toString()];
      const placeholders = statusStrings.map(() => '?').join(',');
      const result = db.prepare(`SELECT COUNT(*) as count FROM Ремонт WHERE Состояние IN (${placeholders})`).get(...statusStrings) as any;
      counts[status] = result?.count || 0;
    }

    return counts;
  });

  ipcMain.handle('get-repair-details', async (_event, id) => {
    const db = getDb();

    const repair = db.prepare(`
      SELECT 
        ID as id,
        Квитанция as receiptId,
        Наименование_техники as deviceName,
        Описание_неисправности as faultDesc,
        Выполнено as workDone,
        Стоимость as costLabor,
        Сумма as totalCost,
        Оплачено as isPaid,
        Состояние as status,
        Имя_заказчика as clientName,
        Телефон as clientPhone,
        Доход as profit,
        Начало_ремонта as dateStart,
        Конец_ремонта as dateEnd,
        Примечание as note,
        Перезвонить as shouldCall,
        Виконавець as executor,
        ТипОплати as paymentType
      FROM Ремонт
      WHERE ID = ?
    `).get(id) as any;

    if (!repair) return null;

    // Helper function to convert string status to number
    const convertStatusToNumber = (status: any): number => {
      if (typeof status === 'number') return status;
      if (typeof status === 'string') {
        const statusMap: Record<string, number> = {
          'У черзі': 1,
          'У роботі': 2,
          'Очікув. відпов./деталі': 3,
          'Очікування': 3,
          'Готовий до видачі': 4,
          'Готовий': 4,
          'Не додзвонилися': 5,
          'Не додзвонились': 5,
          'Видано': 6,
          'Одеса': 7
        };
        return statusMap[status] || 1; // Default to Queue if unknown
      }
      return 1; // Default to Queue
    };

    // Convert dates and status
    repair.dateStart = toJsDate(repair.dateStart);
    repair.dateEnd = toJsDate(repair.dateEnd);
    repair.status = convertStatusToNumber(repair.status);

    const partsCorrected = db.prepare(`
      SELECT
        ID as id,
        Наименование_расходника as name,
        Цена_уе as priceUsd,
        Вход as costUah,
        Сумма as priceUah,
        Доход as profit,
        Наличие as inStock,
        Поставщик as supplier,
        Приход as dateArrival,
        Дата_продажи as dateSold
      FROM Расходники
      WHERE Квитанция = ?
    `).all(id).map((p: any) => ({
      ...p,
      dateArrival: toJsDate(p.dateArrival),
      dateSold: toJsDate(p.dateSold),
    }));

    return { ...repair, parts: partsCorrected };
  });

  // Helper to get cash register settings
  function getCashRegisterSettings(db: any) {
    const settings = {
      cardCommissionPercent: 1.5,
      cashRegisterEnabled: false,
      cashRegisterStartDate: '',
    };

    const cardCommission = db.prepare('SELECT value FROM settings WHERE key = ?').get('card_commission_percent') as any;
    const enabled = db.prepare('SELECT value FROM settings WHERE key = ?').get('cash_register_enabled') as any;
    const startDate = db.prepare('SELECT value FROM settings WHERE key = ?').get('cash_register_start_date') as any;

    if (cardCommission) settings.cardCommissionPercent = parseFloat(cardCommission.value);
    if (enabled) settings.cashRegisterEnabled = enabled.value === 'true';
    if (startDate) settings.cashRegisterStartDate = startDate.value;

    return settings;
  }

  // Helper to create transaction
  function createTransaction(db: any, data: any) {
    const { category, description, amount, cash, card, executorId, executorName, receiptId, paymentType, relatedTransactionId, dateExecuted } = data;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO Каса (
        Дата_створення, Дата_виконання, Категорія, Опис, Сума, Готівка, Карта,
        ВиконавецьID, ВиконавецьІмя, КвитанціяID, ТипОплати, ЗвязанаТранзакціяID, UpdateTimestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      toDelphiDate(now),
      toDelphiDate(dateExecuted || now),
      category,
      description,
      amount,
      cash,
      card,
      executorId,
      executorName,
      receiptId,
      paymentType,
      relatedTransactionId
    );
  }

  // Helper to get current balances
  function getBalances(db: any) {
    const latest = db.prepare(`
    SELECT Готівка as cash, Карта as card 
    FROM Каса 
    ORDER BY ID DESC 
    LIMIT 1
  `).get() as any;

    return {
      cash: latest?.cash || 0,
      card: latest?.card || 0
    };
  }

  // Save or update repair
  ipcMain.handle('save-repair', async (_event, repairData) => {

    const db = getDb();
    const {
      id,
      receiptId,
      deviceName,
      faultDesc,
      workDone,
      costLabor,
      totalCost,
      isPaid,
      status,
      clientName,
      clientPhone,
      profit,
      dateStart,
      dateEnd,
      note,
      shouldCall,
      executor,
      paymentType // New field
    } = repairData;



    // Convert JS dates back to Delphi format
    const delphiDateStart = toDelphiDate(dateStart);
    const delphiDateEnd = toDelphiDate(dateEnd);

    // Convert string status to number if needed
    const convertStatusToNumber = (status: any): number => {
      if (typeof status === 'number') return status;
      if (typeof status === 'string') {
        const statusMap: Record<string, number> = {
          'У черзі': 1,
          'У роботі': 2,
          'Очікув. відпов./деталі': 3,
          'Очікування': 3,
          'Готовий до видачі': 4,
          'Готовий': 4,
          'Не додзвонилися': 5,
          'Не додзвонились': 5,
          'Видано': 6,
          'Одеса': 7
        };
        return statusMap[status] || 1; // Default to Queue if unknown
      }
      return 1; // Default to Queue
    };

    // Get previous state if updating
    let previousState: any = null;
    if (id) {
      previousState = db.prepare('SELECT Оплачено as isPaid, Состояние as status, Виконавець as executor, ТипОплати as paymentType FROM Ремонт WHERE ID = ?').get(id);

      // Use paymentType from database, fallback to transaction if not set
      // Check if status is "Видано" (6) - can be number or string
      const isIssuedStatus = previousState && convertStatusToNumber(previousState.status) === 6;
      if (previousState && !previousState.paymentType && (previousState.isPaid === 1 || isIssuedStatus)) {
        const previousTransaction = db.prepare(`
          SELECT ТипОплати as paymentType
          FROM Каса
          WHERE КвитанціяID = ? AND Категорія = 'Прибуток'
          ORDER BY ID DESC LIMIT 1
        `).get(id) as any;

        if (previousTransaction) {
          previousState.paymentType = previousTransaction.paymentType || 'Готівка';
        } else {
          previousState.paymentType = previousState.paymentType || 'Готівка'; // Use from DB or default
        }
      }
    }

    const statusNumber = convertStatusToNumber(status);

    let resultId = id;

    // Wrap in transaction
    const transaction = db.transaction(() => {
      if (id) {
        // Update existing repair
        db.prepare(`
          UPDATE Ремонт 
          SET 
            Квитанция = ?,
            Наименование_техники = ?,
            Описание_неисправности = ?,
            Выполнено = ?,
            Стоимость = ?,
            Сумма = ?,
            Оплачено = ?,
            Состояние = ?,
            Имя_заказчика = ?,
            Телефон = ?,
            Доход = ?,
            Начало_ремонта = ?,
            Конец_ремонта = ?,
            Примечание = ?,
            Перезвонить = ?,
            Виконавець = ?,
            ТипОплати = ?,
            UpdateTimestamp = datetime('now')
          WHERE ID = ?
        `).run(
          receiptId,
          deviceName,
          faultDesc,
          workDone || '',
          costLabor || 0,
          totalCost || 0,
          isPaid ? 1 : 0,
          statusNumber,
          clientName,
          clientPhone,
          profit || 0,
          delphiDateStart,
          delphiDateEnd,
          note || '',
          shouldCall ? 1 : 0,
          executor || 'Андрій',
          paymentType || 'Готівка',
          id
        );

        // Update related transactions if executor changed
        if (previousState && previousState.executor !== (executor || 'Андрій')) {
          const newExecutorName = executor || 'Андрій';
          const oldExecutorName = previousState.executor;

          // Get new executor ID
          const newExecutorRecord = db.prepare('SELECT ID FROM Executors WHERE Name = ?').get(newExecutorName) as any;

          // Update all related transactions (both income and cancellation)
          db.prepare(`
            UPDATE Каса 
            SET 
              ВиконавецьID = ?,
              ВиконавецьІмя = ?,
              Опис = REPLACE(Опис, ?, ?)
            WHERE КвитанціяID = ? AND Категорія IN ('Прибуток', 'Скасування')
          `).run(
            newExecutorRecord?.ID,
            newExecutorName,
            oldExecutorName,
            newExecutorName,
            id
          );
        }
      } else {
        // Insert new repair
        const result = db.prepare(`
          INSERT INTO Ремонт (
            Квитанция, Наименование_техники, Описание_неисправности, Выполнено,
            Стоимость, Сумма, Оплачено, Состояние, Имя_заказчика, Телефон,
            Доход, Начало_ремонта, Конец_ремонта, Примечание, Перезвонить, Виконавець, ТипОплати, UpdateTimestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          receiptId,
          deviceName,
          faultDesc,
          workDone || '',
          costLabor || 0,
          totalCost || 0,
          isPaid ? 1 : 0,
          statusNumber,
          clientName,
          clientPhone,
          profit || 0,
          delphiDateStart,
          delphiDateEnd,
          note || '',
          shouldCall ? 1 : 0,
          executor || 'Андрій',
          paymentType || 'Готівка'
        );
        resultId = result.lastInsertRowid;
      }

      // --- CASH REGISTER LOGIC ---
      const settings = getCashRegisterSettings(db);

      if (settings.cashRegisterEnabled) {
        const wasIssuedStatus = previousState && convertStatusToNumber(previousState.status) === 6;
        const isNowIssuedStatus = convertStatusToNumber(status) === 6;
        const wasPaid = previousState ? (previousState.isPaid === 1 || wasIssuedStatus) : false;
        const isNowPaid = isPaid || isNowIssuedStatus;

        // 1. Payment Transaction
        if (!wasPaid && isNowPaid) {
          const balances = getBalances(db);
          const pType = paymentType || 'Готівка'; // Default to Cash if not specified

          let newCash = balances.cash;
          let newCard = balances.card;
          let commission = 0;

          let description = `Оплата квитанції #${receiptId}. ${pType}. ${executor || 'Андрій'}`;

          if (pType === 'Картка') {
            commission = (totalCost || 0) * (settings.cardCommissionPercent / 100);
            // Add full amount to card first
            newCard += totalCost || 0;
            description += ` (Комісія: ${commission.toFixed(2)} грн)`;
          } else {
            newCash += totalCost || 0;
          }

          // Get executor ID
          const executorRecord = db.prepare('SELECT ID FROM Executors WHERE Name = ?').get(executor || 'Андрій') as any;

          // Create profit transaction with full amount (before commission deduction)
          createTransaction(db, {
            category: 'Прибуток',
            description: description,
            amount: totalCost || 0, // Full amount before commission
            cash: newCash,
            card: newCard,
            executorId: executorRecord?.ID,
            executorName: executor || 'Андрій',
            receiptId: resultId,
            paymentType: pType,
            dateExecuted: dateEnd
          });

          // If commission was deducted, create a separate expense transaction for commission
          if (commission > 0) {
            // Get updated balances after profit transaction
            const commissionBalances = getBalances(db);
            // Commission reduces card balance
            const commissionCardBalance = commissionBalances.card - commission;
            createTransaction(db, {
              category: 'Комісія банку',
              description: `Комісія банку за оплату квитанції #${receiptId}`,
              amount: -commission,
              cash: commissionBalances.cash,
              card: commissionCardBalance,
              receiptId: resultId,
              paymentType: 'Картка',
              dateExecuted: dateEnd
            });
          }
        }

        // 2. Update Payment Type (if payment type changed for paid repair)
        if (wasPaid && isNowPaid && previousState) {
          const oldPaymentType = previousState.paymentType || 'Готівка';
          const newPaymentType = paymentType || 'Готівка';

          if (oldPaymentType !== newPaymentType) {
            // Find existing profit transaction
            const existingProfit = db.prepare(`
              SELECT * FROM Каса 
              WHERE КвитанціяID = ? AND Категорія = 'Прибуток'
              ORDER BY ID DESC LIMIT 1
            `).get(resultId) as any;

            // Find existing commission transaction (only relevant for card payments)
            let existingCommission: any = null;
            if (oldPaymentType === 'Картка') {
              existingCommission = db.prepare(`
                SELECT * FROM Каса 
                WHERE КвитанціяID = ? AND Категорія = 'Комісія банку'
                ORDER BY ID DESC LIMIT 1
              `).get(resultId) as any;
            }

            if (existingProfit) {
              const balances = getBalances(db);

              // Step 1: Reverse old transactions
              // When reversing card payment with commission:
              // - Profit transaction added totalCost to card
              // - Commission transaction subtracted commission from card
              // - Net effect: card increased by (totalCost - commission)
              // To reverse: subtract (totalCost - commission) from card, then add commission back
              // This is equivalent to: subtract totalCost, then add commission

              let reverseCash = balances.cash;
              let reverseCard = balances.card;

              // Reverse profit transaction
              // For card payments with commission:
              // - Original: profit +10000, commission -150, net on card: +9850
              // - To reverse: subtract 10000, then add 150 back = subtract net 9850
              // But we want to show both reversals in transaction log, so:
              // 1. Reverse profit: subtract 10000
              // 2. Reverse commission: add 150
              if (existingProfit.ТипОплати === 'Картка') {
                // Subtract the full amount that was added by profit transaction
                reverseCard -= existingProfit.Сума;
              } else {
                reverseCash -= existingProfit.Сума;
              }

              // Create cancellation transaction for profit
              createTransaction(db, {
                category: 'Скасування',
                description: `Скасування оплати квитанції #${receiptId} (зміна способу оплати)`,
                amount: -existingProfit.Сума, // Reverse full amount
                cash: reverseCash,
                card: reverseCard,
                executorId: existingProfit.ВиконавецьID,
                executorName: existingProfit.ВиконавецьІмя,
                receiptId: resultId,
                paymentType: existingProfit.ТипОплати,
                relatedTransactionId: existingProfit.ID
              });

              // Reverse commission if it existed
              // After reversing profit, we subtracted totalCost from card
              // But on card there was only (totalCost - commission) because commission was already subtracted
              // So card balance after profit reversal is: original - totalCost
              // To get back to original, we need to add commission: original - totalCost + commission = original - (totalCost - commission)
              // This is correct because (totalCost - commission) is what was actually added to card
              if (existingCommission) {
                const commissionBalances = getBalances(db);
                const commissionAmount = Math.abs(existingCommission.Сума);
                // Calculate the correct card balance after adding commission back
                // commissionBalances.card is the balance after profit reversal (which is original - totalCost)
                // Adding commission gives us: original - totalCost + commission
                // But we want: original - (totalCost - commission) = original - totalCost + commission
                // So this is correct!
                const newCardBalance = commissionBalances.card + commissionAmount;
                createTransaction(db, {
                  category: 'Скасування',
                  description: `Скасування комісії банку за квитанцію #${receiptId} (зміна способу оплати)`,
                  amount: commissionAmount, // Positive amount to return money
                  cash: commissionBalances.cash,
                  card: newCardBalance,
                  receiptId: resultId,
                  paymentType: 'Картка',
                  relatedTransactionId: existingCommission.ID
                });
              }

              // Step 2: Create new transactions with new payment type
              // Get balances after all reversals
              const newBalances = getBalances(db);
              let newCash = newBalances.cash;
              let newCard = newBalances.card;
              let commission = 0;

              let description = `Оплата квитанції #${receiptId}. ${newPaymentType}. ${executor || 'Андрій'}`;

              // Get executor ID
              const executorRecord = db.prepare('SELECT ID FROM Executors WHERE Name = ?').get(executor || 'Андрій') as any;

              if (newPaymentType === 'Картка') {
                commission = (totalCost || 0) * (settings.cardCommissionPercent / 100);
                description += ` (Комісія: ${commission.toFixed(2)} грн)`;

                // Create profit transaction first: add full amount to card
                newCard += totalCost || 0;
                createTransaction(db, {
                  category: 'Прибуток',
                  description: description,
                  amount: totalCost || 0, // Full amount before commission
                  cash: newCash,
                  card: newCard,
                  executorId: executorRecord?.ID,
                  executorName: executor || 'Андрій',
                  receiptId: resultId,
                  paymentType: newPaymentType,
                  dateExecuted: dateEnd
                });

                // Then create commission transaction: subtract commission from card
                const commissionBalances = getBalances(db);
                const commissionCardBalance = commissionBalances.card - commission;
                createTransaction(db, {
                  category: 'Комісія банку',
                  description: `Комісія банку за оплату квитанції #${receiptId}`,
                  amount: -commission,
                  cash: commissionBalances.cash,
                  card: commissionCardBalance,
                  receiptId: resultId,
                  paymentType: 'Картка',
                  dateExecuted: dateEnd
                });
              } else {
                // Cash payment: just add to cash
                newCash += totalCost || 0;
                createTransaction(db, {
                  category: 'Прибуток',
                  description: description,
                  amount: totalCost || 0,
                  cash: newCash,
                  card: newCard,
                  executorId: executorRecord?.ID,
                  executorName: executor || 'Андрій',
                  receiptId: resultId,
                  paymentType: newPaymentType,
                  dateExecuted: dateEnd
                });
              }
            }
          }
        }

        // 3. Cancel Transaction (Refund)
        if (wasPaid && !isNowPaid) {
          // Find original transaction
          const original = db.prepare(`
            SELECT * FROM Каса 
            WHERE КвитанціяID = ? AND Категорія = 'Прибуток'
            ORDER BY ID DESC LIMIT 1
          `).get(resultId) as any;

          if (original) {
            const balances = getBalances(db);
            let newCash = balances.cash;
            let newCard = balances.card;

            // Refund FULL amount (including commission)
            if (original.ТипОплати === 'Картка') {
              newCard -= original.Сума;
            } else {
              newCash -= original.Сума;
            }

            createTransaction(db, {
              category: 'Скасування',
              description: `Скасування оплати квитанції #${receiptId}`,
              amount: -original.Сума,
              cash: newCash,
              card: newCard,
              executorId: original.ВиконавецьID,
              executorName: original.ВиконавецьІмя,
              receiptId: resultId,
              paymentType: original.ТипОплати,
              relatedTransactionId: original.ID
            });
          }
        }
      }
    });

    try {
      transaction();

      triggerAutoBackup();
      return { success: true, id: resultId };
    } catch (error) {
      console.error('Error in save-repair transaction:', error);
      throw error;
    }
  });

  ipcMain.handle('delete-repair', async (_event, id) => {

    const db = getDb();

    // Get repair info BEFORE transaction to ensure we have the receipt ID
    const repair = db.prepare('SELECT Квитанция as receiptId, Оплачено as isPaid FROM Ремонт WHERE ID = ?').get(id) as any;


    if (!repair) {
      console.error('Repair not found for deletion, id:', id);
      return { success: false, error: 'Ремонт не знайдено' };
    }

    // Transaction to ensure data integrity
    const deleteTransaction = db.transaction(() => {
      // --- CASH REGISTER LOGIC ---
      const settings = getCashRegisterSettings(db);
      if (settings.cashRegisterEnabled && repair.isPaid) {
        // Find the income transaction for this repair
        const incomeTransaction = db.prepare(`
            SELECT ID, Сума as amount, ТипОплати as paymentType, Готівка as cash, Карта as card
            FROM Каса 
            WHERE Категорія = 'Прибуток' AND КвитанціяID = ?
            ORDER BY ID DESC LIMIT 1
          `).get(id) as any;

        if (incomeTransaction) {
          const balances = getBalances(db);
          let newCash = balances.cash;
          let newCard = balances.card;

          // Find previous transaction to calculate NET amount added (accounting for commission)
          const previousTransaction = db.prepare(`
            SELECT Готівка as cash, Карта as card
            FROM Каса
            WHERE ID < ?
            ORDER BY ID DESC LIMIT 1
          `).get(incomeTransaction.ID) as any;

          const prevCash = previousTransaction?.cash || 0;
          const prevCard = previousTransaction?.card || 0;

          // Calculate actual delta
          const netCashAdded = incomeTransaction.cash - prevCash;
          const netCardAdded = incomeTransaction.card - prevCard;

          // Reverse the income transaction using NET amount
          if (incomeTransaction.paymentType === 'Картка') {
            newCard -= netCardAdded;
          } else {
            newCash -= netCashAdded;
          }

          createTransaction(db, {
            category: 'Скасування',
            description: `Видалення квитанції #${repair.receiptId}`,
            amount: -incomeTransaction.amount,
            cash: newCash,
            card: newCard,
            paymentType: incomeTransaction.paymentType,
            relatedTransactionId: incomeTransaction.ID
          });

          // If the original payment was by card, we also need to reverse the commission
          if (incomeTransaction.paymentType === 'Картка') {
            const commissionTransaction = db.prepare(`
              SELECT ID, Сума as amount
              FROM Каса
              WHERE Категорія = 'Комісія банку' AND КвитанціяID = ?
              ORDER BY ID DESC LIMIT 1
            `).get(id) as any;

            if (commissionTransaction) {
              const commissionBalances = getBalances(db);
              const commissionAmount = Math.abs(commissionTransaction.amount || 0);
              createTransaction(db, {
                category: 'Скасування',
                description: `Скасування комісії банку за квитанцію #${repair.receiptId} (видалення)`,
                amount: commissionAmount,
                cash: commissionBalances.cash,
                card: commissionBalances.card + commissionAmount,
                paymentType: 'Картка',
                relatedTransactionId: commissionTransaction.ID
              });
            }
          }
        }
      }

      // 1. Delete manual entries (Services/ChipZone) using INTERNAL ID
      db.prepare(`
        DELETE FROM Расходники 
        WHERE Квитанция = ? AND Поставщик IN ('ЧипЗона', 'Послуга')
      `).run(id);

      // 2. Return warehouse items to stock using INTERNAL ID
      db.prepare(`
        UPDATE Расходники SET 
          Квитанция = NULL,
          Наличие = 1,
          Дата_продажи = NULL,
          Сумма = 0,
          Доход = 0
        WHERE Квитанция = ?
      `).run(id);

      // 3. Delete the repair record using INTERNAL ID
      db.prepare('DELETE FROM Ремонт WHERE ID = ?').run(id);
    });

    deleteTransaction();
    triggerAutoBackup();

    return { success: true };
  });

  // Get next receipt ID
  ipcMain.handle('get-next-receipt-id', async () => {
    const db = getDb();
    const result = db.prepare('SELECT MAX(Квитанция) as maxId FROM Ремонт').get() as any;
    return (result?.maxId || 0) + 1;
  });

  // Warehouse items
  ipcMain.handle('get-warehouse-items', async (_event, args) => {

    const { inStock = false, stockFilter, supplier = null, search = '', groupByName = false, dateArrivalStart = null, dateArrivalEnd = null } = args;
    try {
      const db = getDb();


      // Determine filter based on stockFilter or legacy inStock
      let filterCondition = '';
      if (stockFilter === 'inStock') {
        filterCondition = 'AND Наличие = 1';
      } else if (stockFilter === 'sold') {
        filterCondition = 'AND Наличие = 0 AND Дата_продажи IS NOT NULL';
      } else if (stockFilter === 'all') {
        filterCondition = ''; // No filter
      } else if (inStock) {
        // Legacy support
        filterCondition = 'AND Наличие = 1';
      }

      const selectColumns = groupByName
        ? `
        MIN(ID) as id,
        Наименование_расходника as name,
        MIN(Цена_уе) as priceUsd,
        MIN(Курс) as exchangeRate,
        MIN(Вход) as costUah,
        MIN(Сумма) as priceUah,
        MIN(Доход) as profit,
        MAX(Наличие) as inStock,
        Поставщик as supplier,
        MIN(Приход) as dateArrival,
        MAX(Дата_продажи) as dateSold,
        MIN(Квитанция) as receiptId,
        MIN(Накладная) as invoice,
        MIN(Код_товара) as productCode,
        MIN(ШтрихКод) as barcode,
        COUNT(*) as quantity
      `
        : `
        ID as id,
        Наименование_расходника as name,
        Цена_уе as priceUsd,
        Курс as exchangeRate,
        Вход as costUah,
        Сумма as priceUah,
        Доход as profit,
        Наличие as inStock,
        Поставщик as supplier,
        Приход as dateArrival,
        Дата_продажи as dateSold,
        Квитанция as receiptId,
        Накладная as invoice,
        Код_товара as productCode,
        ШтрихКод as barcode,
        1 as quantity
      `;

      let query = `SELECT ${selectColumns} FROM Расходники WHERE 1=1 ${filterCondition}`;
      const params: any[] = [];

      if (supplier) {
        query += ` AND Поставщик = ?`;
        params.push(supplier);
      }

      if (search) {
        if (args.exactName) {
          query += ` AND Наименование_расходника = ?`;
          params.push(search);
        } else {
          query += ` AND (
          Наименование_расходника LIKE ? OR 
          Поставщик LIKE ? OR
          Код_товара LIKE ?
        )`;
          const searchParam = `%${search}%`;
          params.push(searchParam, searchParam, searchParam);
        }
      }

      if (dateArrivalStart) {
        query += ` AND Приход >= ?`;
        params.push(toDelphiDate(dateArrivalStart));
      }

      if (dateArrivalEnd) {
        query += ` AND Приход <= ?`;
        params.push(toDelphiDate(dateArrivalEnd));
      }

      if (groupByName) {
        query += ` GROUP BY Наименование_расходника, Поставщик`;
      }

      // Use the alias 'dateArrival' for ordering to be consistent
      query += ` ORDER BY dateArrival DESC`;

      const items = db.prepare(query).all(...params).map((item: any) => ({
        ...item,
        dateArrival: toJsDate(item.dateArrival),
        dateSold: toJsDate(item.dateSold),
        inStock: Boolean(item.inStock)
      }));


      return items;
    } catch (error) {
      console.error('Error in get-warehouse-items:', error);
      throw error;
    }
  });

  ipcMain.handle('add-warehouse-item', async (_event, item) => {
    const db = getDb();

    // If quantity > 1, we insert multiple rows
    const quantity = item.quantity || 1;
    const ids: (number | bigint)[] = [];
    const paymentType = item.paymentType || 'Картка'; // Default to Card

    const stmt = db.prepare(`
      INSERT INTO Расходники (
        Наименование_расходника, Цена_уе, Курс, Вход, Сумма, Доход, Наличие,
        Поставщик, Приход, Дата_продажи, Квитанция, ТипОплатиПокупки, Накладная, Код_товара
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTransaction = db.transaction(() => {
      for (let i = 0; i < quantity; i++) {
        const result = stmt.run(
          item.name,
          item.priceUsd || 0,
          item.exchangeRate || 0,
          item.costUah || 0,
          item.priceUah || 0,
          item.profit || 0,
          item.inStock !== undefined ? (item.inStock ? 1 : 0) : 1, // Default to 1 (in stock) if not specified
          item.supplier,
          toDelphiDate(item.dateArrival),
          toDelphiDate(item.dateSold),
          item.receiptId || null,
          paymentType,
          item.invoice || null,
          item.productCode || null
        );
        ids.push(result.lastInsertRowid);
      }

      // --- CASH REGISTER LOGIC ---
      const settings = getCashRegisterSettings(db);
      if (settings.cashRegisterEnabled) {
        const totalCost = (item.costUah || 0) * quantity;
        const balances = getBalances(db);

        let newCash = balances.cash;
        let newCard = balances.card;

        if (paymentType === 'Готівка') {
          newCash -= totalCost;
        } else {
          newCard -= totalCost;
        }


        // Use current timestamp if the date is today to ensure correct sorting
        const today = new Date().toISOString().split('T')[0];
        const transactionDate = item.dateArrival === today ? new Date().toISOString() : item.dateArrival;

        createTransaction(db, {
          category: 'Покупка',
          description: `Покупка товару: ${item.name} (${item.supplier}) х${quantity}`,
          amount: -totalCost,
          cash: newCash,
          card: newCard,
          paymentType: paymentType,
          dateExecuted: transactionDate
        });
      }
    });

    insertTransaction();
    triggerAutoBackup();

    return { success: true, ids };
  });

  ipcMain.handle('update-warehouse-item', async (_event, item) => {
    const db = getDb();

    db.prepare(`
      UPDATE Расходники SET
        Наименование_расходника = ?,
        Цена_уе = ?,
        Курс = ?,
        Вход = ?,
        Сумма = ?,
        Доход = ?,
        Наличие = ?,
        Поставщик = ?,
        Приход = ?,
        Дата_продажи = ?,
        Квитанция = ?
      WHERE ID = ?
    `).run(
      item.name,
      item.priceUsd || 0,
      item.exchangeRate || 0,
      item.costUah || 0,
      item.priceUah || 0,
      item.profit || 0,
      item.inStock ? 1 : 0,
      item.supplier,
      toDelphiDate(item.dateArrival),
      toDelphiDate(item.dateSold),
      item.receiptId || null,
      item.id
    );
    triggerAutoBackup();

    return { success: true };
  });

  ipcMain.handle('delete-warehouse-item', async (_event, id, isWriteOff = false) => {
    const db = getDb();

    // Get item info before deletion to check if we need to return money
    const item = db.prepare(`
      SELECT Вход as costUah, ТипОплатиПокупки as paymentType, Наименование_расходника as name, Поставщик as supplier
      FROM Расходники
      WHERE ID = ?
    `).get(id) as any;

    // Delete the item
    db.prepare('DELETE FROM Расходники WHERE ID = ?').run(id);

    // --- CASH REGISTER LOGIC ---
    if (item && item.costUah && item.costUah > 0) {
      const settings = getCashRegisterSettings(db);
      if (settings.cashRegisterEnabled) {
        const balances = getBalances(db);
        const paymentType = item.paymentType || 'Картка';
        const cost = item.costUah || 0;

        if (isWriteOff) {
          // Write-off: create transaction but DON'T return money to balance
          // Balance stays the same, but we record the write-off
          createTransaction(db, {
            category: 'Списання',
            description: `Списання коштів за товар: ${item.name || 'Товар'}${item.supplier ? ` (${item.supplier})` : ''}`,
            amount: -cost, // Negative amount to show it's a write-off
            cash: balances.cash, // Balance doesn't change
            card: balances.card, // Balance doesn't change
            paymentType: paymentType,
            dateExecuted: new Date().toISOString()
          });
        } else {
          // Regular deletion: return money to balance
          let newCash = balances.cash;
          let newCard = balances.card;

          // Return money to the same payment type it was purchased with
          if (paymentType === 'Готівка') {
            newCash += cost;
          } else {
            newCard += cost;
          }

          // Create transaction for money return
          createTransaction(db, {
            category: 'Скасування',
            description: `Повернення коштів за товар: ${item.name || 'Товар'}${item.supplier ? ` (${item.supplier})` : ''}`,
            amount: cost,
            cash: newCash,
            card: newCard,
            paymentType: paymentType,
            dateExecuted: new Date().toISOString()
          });
        }
      }
    }
    triggerAutoBackup();

    return { success: true };
  });

  // ========== REPAIR PARTS HANDLERS ==========

  // Get parts for a specific repair
  ipcMain.handle('get-repair-parts', async (_event, repairId: number) => {
    const db = getDb();
    const parts = db.prepare(`
      SELECT
        ID as id,
        Наименование_расходника as name,
        Цена_уе as priceUsd,
        Вход as costUah,
        Сумма as priceUah,
        Доход as profit,
        Наличие as inStock,
        Поставщик as supplier,
        Приход as dateArrival,
        Дата_продажи as dateSold,
        Квитанция as receiptId,
        Накладная as invoice,
        Код_товара as productCode,
        ШтрихКод as barcode
      FROM Расходники
      WHERE Квитанция = ?
    `).all(repairId).map((p: any) => ({
      ...p,
      dateArrival: toJsDate(p.dateArrival),
      dateSold: toJsDate(p.dateSold),
      inStock: Boolean(p.inStock)
    }));
    return parts;
  });

  // Add part to repair
  ipcMain.handle('add-part-to-repair', async (_event, data: any) => {
    const db = getDb();
    const { partId, repairId, priceUah, costUah, supplier, name, isPaid, dateEnd } = data;

    if (partId) {
      // Using existing warehouse item
      // First, get the warehouse item
      const warehouseItem = db.prepare('SELECT * FROM Расходники WHERE ID = ?').get(partId) as any;

      if (!warehouseItem) {
        throw new Error('Товар не знайдено на складі');
      }

      // Update the warehouse item to link it to the repair
      db.prepare(`
        UPDATE Расходники SET
          Квитанция = ?,
          Сумма = ?,
          Доход = ?,
          Наличие = 0,
          Дата_продажи = ?,
          UpdateTimestamp = datetime('now')
        WHERE ID = ?
      `).run(
        repairId,
        priceUah,
        priceUah - (warehouseItem.Вход || 0),
        isPaid ? toDelphiDate(dateEnd) : null,
        partId
      );
      triggerAutoBackup();
      return { success: true, id: partId };
    } else {
      // Manual entry (ЧипЗона/Послуга)
      const result = db.prepare(`
        INSERT INTO Расходники (
          Наименование_расходника, Цена_уе, Курс, Вход, Сумма, Доход, Наличие,
          Поставщик, Приход, Дата_продажи, Квитанция, UpdateTimestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        name,
        0, // priceUsd
        0, // exchangeRate
        costUah,
        priceUah,
        priceUah - costUah,
        0, // not in stock (used in repair)
        supplier,
        toDelphiDate(new Date().toISOString()), // dateArrival
        isPaid ? toDelphiDate(dateEnd) : null,
        repairId
      );
      triggerAutoBackup();
      return { success: true, id: result.lastInsertRowid };
    }
  });

  // Update part price in repair
  ipcMain.handle('update-part-price', async (_event, data: any) => {
    const db = getDb();
    const { partId, priceUah, costUah } = data;



    // Get current part data
    const part = db.prepare('SELECT * FROM Расходники WHERE ID = ?').get(partId) as any;

    if (!part) {
      throw new Error('Товар не знайдено');
    }

    // Ensure values are numbers and round to 2 decimal places
    const finalPriceUah = typeof priceUah === 'number' ? Math.round(priceUah * 100) / 100 : (part.Сумма || 0);
    const finalCostUah = costUah !== undefined && typeof costUah === 'number'
      ? Math.round(costUah * 100) / 100
      : (part.Вход || 0);

    // Calculate profit
    const profit = Math.round((finalPriceUah - finalCostUah) * 100) / 100;



    // Update price and profit
    db.prepare(`
      UPDATE Расходники SET
        Сумма = ?,
        Вход = ?,
        Доход = ?,
        UpdateTimestamp = datetime('now')
      WHERE ID = ?
    `).run(
      finalPriceUah,
      finalCostUah,
      profit,
      partId
    );



    // Update repair total cost if part is linked to a repair
    if (part.Квитанция) {
      const repairId = part.Квитанция;
      const repair = db.prepare('SELECT Стоимость as costLabor FROM Ремонт WHERE ID = ?').get(repairId) as any;

      if (repair) {
        const partsTotal = db.prepare(`
          SELECT COALESCE(SUM(Сумма), 0) as total
          FROM Расходники
          WHERE Квитанция = ?
        `).get(repairId) as any;

        const partsCost = db.prepare(`
          SELECT COALESCE(SUM(Вход), 0) as total
          FROM Расходники
          WHERE Квитанция = ?
        `).get(repairId) as any;

        const newTotalCost = (repair.costLabor || 0) + (partsTotal?.total || 0);
        // Profit = (labor cost - 0) + (parts price - parts cost)
        const laborProfit = repair.costLabor || 0; // Labor profit is the full cost (no cost for labor)
        const partsProfit = (partsTotal?.total || 0) - (partsCost?.total || 0);
        const totalProfit = laborProfit + partsProfit;

        db.prepare(`
          UPDATE Ремонт SET
            Сумма = ?,
            Доход = ?
          WHERE ID = ?
        `).run(
          newTotalCost,
          totalProfit,
          repairId
        );
      }
    }
    triggerAutoBackup();

    return { success: true };
  });

  // Remove part from repair
  ipcMain.handle('remove-part-from-repair', async (_event, data: any) => {
    const db = getDb();
    const { partId } = data; // We don't rely on supplier from client anymore

    // Check if this is a manual entry (ЧипЗона/Послуга) or warehouse item
    const part = db.prepare('SELECT * FROM Расходники WHERE ID = ?').get(partId) as any;

    if (!part) {
      throw new Error('Товар не знайдено');
    }

    const supplier = part.Поставщик;


    if (supplier === 'ЧипЗона' || supplier === 'Послуга') {
      // Manual entry - delete it

      db.prepare('DELETE FROM Расходники WHERE ID = ?').run(partId);
    } else {
      // Warehouse item - return it to stock

      db.prepare(`
        UPDATE Расходники SET
          Квитанция = NULL,
          Наличие = 1,
          Дата_продажи = NULL,
          Сумма = 0,
          Доход = 0
        WHERE ID = ?
      `).run(partId);
    }
    triggerAutoBackup();

    return { success: true };
  });

  // Update repair payment status for parts
  ipcMain.handle('update-repair-payment', async (_event, data: any) => {
    const db = getDb();
    const { repairId, isPaid, dateEnd } = data;

    // Get previous state for cash register logic
    const previousState = db.prepare(`
        SELECT ID, Квитанция, Сумма, Оплачено, Состояние, Виконавець, ТипОплати
        FROM Ремонт 
        WHERE ID = ? OR Квитанция = ?
    `).get(repairId, repairId) as any;

    if (!previousState) {
      throw new Error('Ремонт не знайдено');
    }

    const actualRepairId = previousState.ID;
    const receiptId = previousState.Квитанция;

    // Update all parts for this repair
    db.prepare(`
      UPDATE Расходники SET
        Дата_продажи = ?
      WHERE Квитанция = ?
    `).run(
      isPaid ? toDelphiDate(dateEnd) : null,
      receiptId
    );

    // Also sync the repair record status
    if (isPaid) {
      db.prepare(`
        UPDATE Ремонт SET 
          Оплачено = 1, 
          Состояние = 6, 
          Конец_ремонта = ? 
        WHERE ID = ?
      `).run(toDelphiDate(dateEnd), actualRepairId);
    } else {
      db.prepare(`
        UPDATE Ремонт SET 
          Оплачено = 0 
        WHERE ID = ?
      `).run(actualRepairId);
    }

    // --- CASH REGISTER LOGIC ---
    const settings = getCashRegisterSettings(db);

    if (settings.cashRegisterEnabled) {
      const wasPaid = previousState.Оплачено === 1 || previousState.Состояние === 6;
      const isNowPaid = isPaid;

      if (!wasPaid && isNowPaid) {
        const balances = getBalances(db);
        const pType = previousState.ТипОплати || 'Готівка';
        const totalCost = previousState.Сумма || 0;
        const executor = previousState.Виконавець || 'Андрій';

        let newCash = balances.cash;
        let newCard = balances.card;
        let commission = 0;

        let description = `Оплата квитанції #${receiptId}. ${pType}. ${executor}`;

        if (pType === 'Картка') {
          commission = totalCost * (settings.cardCommissionPercent / 100);
          newCard += totalCost;
          description += ` (Комісія: ${commission.toFixed(2)} грн)`;
        } else {
          newCash += totalCost;
        }

        const executorRecord = db.prepare('SELECT ID FROM Executors WHERE Name = ?').get(executor) as any;

        createTransaction(db, {
          category: 'Прибуток',
          description: description,
          amount: totalCost,
          cash: newCash,
          card: newCard,
          executorId: executorRecord?.ID,
          executorName: executor,
          receiptId: actualRepairId,
          paymentType: pType,
          dateExecuted: dateEnd
        });

        if (commission > 0) {
          const commissionBalances = getBalances(db);
          const commissionCardBalance = commissionBalances.card - commission;
          createTransaction(db, {
            category: 'Комісія банку',
            description: `Комісія банку за оплату квитанції #${receiptId}`,
            amount: -commission,
            cash: commissionBalances.cash,
            card: commissionCardBalance,
            receiptId: actualRepairId,
            paymentType: 'Картка',
            dateExecuted: dateEnd
          });
        }
      } else if (wasPaid && !isNowPaid) {
        // Handle cancellation if needed (though UI might not support un-paying yet)
        const existingProfit = db.prepare(`
                SELECT * FROM Каса 
                WHERE КвитанціяID = ? AND Категорія = 'Прибуток'
                ORDER BY ID DESC LIMIT 1
            `).get(actualRepairId) as any;

        if (existingProfit) {
          const balances = getBalances(db);
          let reverseCash = balances.cash;
          let reverseCard = balances.card;

          if (existingProfit.ТипОплати === 'Картка') {
            reverseCard -= existingProfit.Сума;
          } else {
            reverseCash -= existingProfit.Сума;
          }

          createTransaction(db, {
            category: 'Скасування',
            description: `Скасування оплати квитанції #${receiptId} (повернення в роботу)`,
            amount: -existingProfit.Сума,
            cash: reverseCash,
            card: reverseCard,
            executorId: existingProfit.ВиконавецьID,
            executorName: existingProfit.ВиконавецьІмя,
            receiptId: actualRepairId,
            paymentType: existingProfit.ТипОплати,
            relatedTransactionId: existingProfit.ID,
            dateExecuted: dateEnd
          });

          // Also cancel commission if card
          if (existingProfit.ТипОплати === 'Картка') {
            const commissionBalances = getBalances(db);
            const existingCommission = db.prepare(`
                        SELECT * FROM Каса 
                        WHERE КвитанціяID = ? AND Категорія = 'Комісія банку'
                        ORDER BY ID DESC LIMIT 1
                    `).get(actualRepairId) as any;

            if (existingCommission) {
              const commissionAmount = Math.abs(existingCommission.Сума);
              const newCardBalance = commissionBalances.card + commissionAmount;
              createTransaction(db, {
                category: 'Скасування',
                description: `Скасування комісії банку за квитанцію #${receiptId} (повернення в роботу)`,
                amount: commissionAmount,
                cash: commissionBalances.cash,
                card: newCardBalance,
                receiptId: actualRepairId,
                paymentType: 'Картка',
                dateExecuted: dateEnd
              });
            }
          }
        }
      }
    }

    triggerAutoBackup();

    return { success: true };
  });

  // Get available suppliers
  // Get available suppliers
  ipcMain.handle('get-available-suppliers', async () => {
    const db = getDb();
    const suppliers = db.prepare('SELECT Name FROM Suppliers ORDER BY Name').all().map((s: any) => s.Name);
    return suppliers;
  });

  // Delete barcode from warehouse item
  ipcMain.handle('delete-warehouse-item-barcode', async (_event, data: any) => {
    const db = getDb();
    const { itemId } = data;

    // Check if item exists
    const item = db.prepare('SELECT ID FROM Расходники WHERE ID = ?').get(itemId) as any;
    if (!item) {
      throw new Error('Товар не знайдено');
    }

    // Remove barcode
    db.prepare('UPDATE Расходники SET ШтрихКод = NULL WHERE ID = ?').run(itemId);
    triggerAutoBackup();

    return { success: true };
  });

  // Update barcode for warehouse item
  ipcMain.handle('update-warehouse-item-barcode', async (_event, data: any) => {
    const db = getDb();
    const { itemId, barcode } = data;

    // Check if item exists
    const item = db.prepare('SELECT ID FROM Расходники WHERE ID = ?').get(itemId) as any;
    if (!item) {
      throw new Error('Товар не знайдено');
    }

    // Update barcode
    db.prepare('UPDATE Расходники SET ШтрихКод = ? WHERE ID = ?').run(barcode, itemId);
    triggerAutoBackup();

    return { success: true };
  });

  // Suppliers Management
  ipcMain.handle('get-suppliers', async () => {
    const db = getDb();
    return db.prepare('SELECT * FROM Suppliers ORDER BY Name').all();
  });

  ipcMain.handle('add-supplier', async (_event, name: string) => {
    const db = getDb();
    try {
      const result = db.prepare('INSERT INTO Suppliers (Name) VALUES (?)').run(name);
      triggerAutoBackup();
      return { success: true, id: result.lastInsertRowid };
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Такий контрагент вже існує');
      }
      throw error;
    }
  });

  ipcMain.handle('delete-supplier', async (_event, id: number) => {
    const db = getDb();
    db.prepare('DELETE FROM Suppliers WHERE ID = ?').run(id);
    triggerAutoBackup();
    return { success: true };
  });

  // ========== EXECUTORS MANAGEMENT ==========

  // Get all executors
  ipcMain.handle('get-executors', async () => {
    const db = getDb();
    return db.prepare('SELECT * FROM Executors ORDER BY Name').all();
  });

  // Add executor
  ipcMain.handle('add-executor', async (_event, data: { name: string; salaryPercent: number; productsPercent: number }) => {
    const db = getDb();
    try {
      const result = db.prepare('INSERT INTO Executors (Name, SalaryPercent, ProductsPercent) VALUES (?, ?, ?)').run(data.name, data.salaryPercent, data.productsPercent);
      triggerAutoBackup();
      return { success: true, id: result.lastInsertRowid };
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Такий виконавець вже існує');
      }
      throw error;
    }
  });

  // Update executor
  ipcMain.handle('update-executor', async (_event, data: { id: number; name: string; salaryPercent: number; productsPercent: number }) => {
    const db = getDb();
    try {
      db.prepare('UPDATE Executors SET Name = ?, SalaryPercent = ?, ProductsPercent = ? WHERE ID = ?').run(data.name, data.salaryPercent, data.productsPercent, data.id);
      triggerAutoBackup();
      return { success: true };
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Таке ім\'я виконавця вже існує');
      }
      throw error;
    }
  });

  // Delete executor
  ipcMain.handle('delete-executor', async (_event, id: number) => {
    const db = getDb();
    db.prepare('DELETE FROM Executors WHERE ID = ?').run(id);
    triggerAutoBackup();
    return { success: true };
  });

  // ========== DATABASE MANAGEMENT ==========

  // Restore from backup
  ipcMain.handle('restore-backup', async (_event, backupFileName: string, type: 'manual' | 'auto' = 'manual') => {
    try {
      const dbPath = getDbPath();
      const dbDir = path.dirname(dbPath);
      const backupPath = path.join(dbDir, 'backups', type, backupFileName);

      // Check if backup file exists
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Файл резервної копії не знайдено: ${backupPath}`);
      }

      // Close database before restore
      closeDb();

      // Create a backup of current state before restoring
      const currentBackupPath = path.join(dbDir, 'backups', 'manual', `before_restore_${Date.now()}.sqlite.gz`);
      if (!fs.existsSync(path.dirname(currentBackupPath))) {
        fs.mkdirSync(path.dirname(currentBackupPath), { recursive: true });
      }

      // Pre-restore backup (compressed)
      try {
        const preRestoreStream = fs.createReadStream(dbPath);
        const preRestoreWrite = fs.createWriteStream(currentBackupPath);
        await streamPipeline(preRestoreStream, zlib.createGzip(), preRestoreWrite);
      } catch (e) {
        console.error('Failed to create pre-restore backup, proceeding anyway:', e);
      }

      const isEncrypted = backupFileName.includes('.encrypted');
      const isCompressed = backupFileName.endsWith('.gz');

      const tempFile1 = dbPath + '.step1';
      const tempFile2 = dbPath + '.step2';

      let currentFile = backupPath;

      // 1. Decrypt if needed
      if (isEncrypted) {
        const encryptionKey = getOrCreateEncryptionKey(dbDir);
        await decryptFile(currentFile, tempFile1, encryptionKey);
        currentFile = tempFile1;
      }

      // 2. Decompress if needed
      if (isCompressed) {
        const targetForDecompress = currentFile === backupPath ? tempFile1 : tempFile2;
        await streamPipeline(
          fs.createReadStream(currentFile),
          zlib.createGunzip(),
          fs.createWriteStream(targetForDecompress)
        );
        // If we used tempFile1 for decompressing (meaning no encryption), keep it.
        // If we used tempFile2 (meaning encrypted), currentFile becomes tempFile2.
        currentFile = targetForDecompress;
      }

      // 3. Move final result to database path
      if (currentFile === backupPath) {
        // Should not happen if at least one of isEncrypted/isCompressed is true
        fs.copyFileSync(backupPath, dbPath);
      } else {
        fs.renameSync(currentFile, dbPath);
      }

      // Clean up other temp file if exists
      if (fs.existsSync(tempFile1)) fs.unlinkSync(tempFile1);
      if (fs.existsSync(tempFile2)) fs.unlinkSync(tempFile2);

      // Reopen database
      reopenDb();
      return { success: true };
    } catch (error: any) {
      // Reopen database even if restore failed
      reopenDb();
      console.error('Restore failed:', error);
      throw new Error(`Помилка відновлення з резервної копії: ${error.message}`);
    }
  });

  // List backups
  ipcMain.handle('list-backups', async () => {
    try {
      const dbPath = getDbPath();
      const dbDir = path.dirname(dbPath);
      const backupsRoot = path.join(dbDir, 'backups');
      const types: ('manual' | 'auto')[] = ['manual', 'auto'];

      let allBackups: any[] = [];

      for (const type of types) {
        const dir = path.join(backupsRoot, type);
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          const backups = files
            .filter((file: string) => file.endsWith('.sqlite') || file.endsWith('.encrypted') || file.endsWith('.gz'))
            .map((file: string) => {
              const filePath = path.join(dir, file);
              const stats = fs.statSync(filePath);
              const isEncrypted = file.includes('.encrypted'); // Simplified for list
              return {
                fileName: file,
                size: stats.size,
                date: stats.mtime.toISOString(),
                encrypted: isEncrypted,
                type: type
              };
            });
          allBackups = [...allBackups, ...backups];
        }
      }

      return allBackups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error: any) {
      console.error('List backups failed:', error);
      throw new Error(`Помилка отримання списку резервних копій: ${error.message}`);
    }
  });

  // Delete backup
  ipcMain.handle('delete-backup', async (_event, backupFileName: string, type: 'manual' | 'auto' = 'manual') => {
    try {
      const dbPath = getDbPath();
      const dbDir = path.dirname(dbPath);
      const backupPath = path.join(dbDir, 'backups', type, backupFileName);

      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
      return { success: true };
    } catch (error: any) {
      console.error('Delete backup failed:', error);
      throw new Error(`Помилка видалення резервної копії: ${error.message}`);
    }
  });

  ipcMain.handle('delete-all-backups', async () => {
    try {
      const dbPath = getDbPath();
      const dbDir = path.dirname(dbPath);
      const backupsRoot = path.join(dbDir, 'backups');
      const types = ['manual', 'auto'];

      for (const type of types) {
        const dir = path.join(backupsRoot, type);
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isFile()) {
              fs.unlinkSync(filePath);
            }
          }
        }
      }
      return { success: true };
    } catch (error: any) {
      console.error('Delete all backups failed:', error);
      throw new Error(`Помилка видалення усіх резервних копій: ${error.message}`);
    }
  });

  // Create backup with manual trigger
  ipcMain.handle('create-backup', async (_event, encrypt: boolean = true) => {
    try {
      return await createBackupHelper(encrypt, 'manual');
    } catch (error: any) {
      reopenDb();
      console.error('Manual backup failed:', error);
      throw new Error(`Помилка створення резервної копії: ${error.message}`);
    }
  });

  // Clear database
  ipcMain.handle('clear-database', async () => {
    try {
      // First, create manual backup
      await createBackupHelper(true, 'manual');

      const db = getDb();

      // Clear all data from tables
      db.prepare('DELETE FROM Расходники').run();
      db.prepare('DELETE FROM Ремонт').run();
      db.prepare('DELETE FROM Каса').run();
      db.prepare('DELETE FROM Заметки').run();
      db.prepare('DELETE FROM Suppliers').run();
      db.prepare('DELETE FROM Executors').run();
      db.prepare('DELETE FROM КатегоріїВитрат').run();
      db.prepare('DELETE FROM КатегоріїПрибутків').run();
      try { db.prepare('DELETE FROM settings').run(); } catch (e) { }

      // Reset autoincrement counters
      db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('Расходники', 'Ремонт', 'Каса', 'Заметки', 'Suppliers', 'Executors', 'КатегоріїВитрат', 'КатегоріїПрибутків')").run();
      db.prepare('VACUUM').run();

      reopenDb();
      return { success: true };
    } catch (error: any) {
      console.error('Clear database failed:', error);
      throw new Error(`Помилка очистки бази даних: ${error.message}`);
    }
  });

  // Rename backup
  ipcMain.handle('rename-backup', async (_event, oldFileName: string, newFileName: string, type: 'manual' | 'auto' = 'manual') => {
    try {
      const dbPath = getDbPath();
      const dbDir = path.dirname(dbPath);
      const oldPath = path.join(dbDir, 'backups', type, oldFileName);

      // Ensure new name has correct extension
      let finalNewName = newFileName;
      if (oldFileName.endsWith('.gz') && !newFileName.endsWith('.gz')) finalNewName += '.gz';

      const newPath = path.join(dbDir, 'backups', type, finalNewName);

      if (!fs.existsSync(oldPath)) throw new Error('Файл не знайдено');
      if (fs.existsSync(newPath)) throw new Error('Файл з такою назвою вже існує');

      fs.renameSync(oldPath, newPath);
      return { success: true };
    } catch (error: any) {
      console.error('Rename backup failed:', error);
      throw new Error(`Помилка перейменування: ${error.message}`);
    }
  });

  // ========== BACKUP SETTINGS ==========

  ipcMain.handle('get-backup-settings', async () => {
    const db = getDb();
    const settings = {
      autoBackupEnabled: true,
      backupOnExit: false,
    };

    const enabled = db.prepare('SELECT value FROM settings WHERE key = ?').get('auto_backup_enabled') as any;
    const onExit = db.prepare('SELECT value FROM settings WHERE key = ?').get('backup_on_exit') as any;

    if (enabled) settings.autoBackupEnabled = enabled.value !== 'false';
    if (onExit) settings.backupOnExit = onExit.value === 'true';

    return settings;
  });

  ipcMain.handle('update-backup-settings', async (_event, updates: any) => {
    const db = getDb();

    if (updates.autoBackupEnabled !== undefined) {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
        'auto_backup_enabled',
        updates.autoBackupEnabled ? 'true' : 'false'
      );
    }

    if (updates.backupOnExit !== undefined) {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
        'backup_on_exit',
        updates.backupOnExit ? 'true' : 'false'
      );
    }

    return { success: true };
  });

  // ========== LEGACY DATABASE IMPORT ==========

  // Validate legacy database
  ipcMain.handle('validate-legacy-database', async (_event, legacyDbPath: string) => {
    try {
      const result = validateLegacyDatabase(legacyDbPath);
      return result;
    } catch (error: any) {
      console.error('Validate legacy database failed:', error);
      return {
        isValid: false,
        error: `Помилка валідації: ${error.message}`,
      };
    }
  });

  // Import legacy database
  ipcMain.handle('import-legacy-database', async (_event, args: { legacyDbPath: string, backupName?: string }) => {
    const { legacyDbPath, backupName } = args;

    try {
      // Step 1: Create backup before import
      if (backupName) {
        await ipcMain.emit('create-backup-with-name', null, backupName);
      } else {
        await createBackupHelper();
      }

      // Step 2: Import legacy data
      const importResult = importLegacyDatabase(legacyDbPath, (progress: { stage: string; current: number; total: number }) => {
        // Send progress to renderer
        if (win) {
          win.webContents.send('import-progress', progress);
        }
      });

      if (!importResult.success) {
        throw new Error(importResult.error || 'Невідома помилка імпорту');
      }

      return {
        success: true,
        imported: importResult.imported,
        backupCreated: true,
      };
    } catch (error: any) {
      console.error('Import legacy database failed:', error);
      return {
        success: false,
        error: `Помилка імпорту: ${error.message}`,
      };
    }
  });

  // Open file dialog for selecting legacy database
  ipcMain.handle('open-file-dialog', async () => {
    const { dialog } = await import('electron');
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'SQLite Database', extensions: ['sqlite', 'db'] }
      ]
    });

    if (result.canceled) {
      return { canceled: true };
    }

    return { canceled: false, filePath: result.filePaths[0] };
  });


  // ========== CASH REGISTER HANDLERS ==========

  // Get cash register settings
  ipcMain.handle('get-cash-register-settings', async () => {
    const db = getDb();
    const settings = {
      cardCommissionPercent: 1.5,
      cashRegisterEnabled: false,
      cashRegisterStartDate: '',
    };

    const cardCommission = db.prepare('SELECT value FROM settings WHERE key = ?').get('card_commission_percent') as any;
    const enabled = db.prepare('SELECT value FROM settings WHERE key = ?').get('cash_register_enabled') as any;
    const startDate = db.prepare('SELECT value FROM settings WHERE key = ?').get('cash_register_start_date') as any;

    if (cardCommission) settings.cardCommissionPercent = parseFloat(cardCommission.value);
    if (enabled) settings.cashRegisterEnabled = enabled.value === 'true';
    if (startDate) settings.cashRegisterStartDate = startDate.value;

    return settings;
  });

  // Update cash register settings
  ipcMain.handle('update-cash-register-settings', async (_event, updates: any) => {
    const db = getDb();

    if (updates.cardCommissionPercent !== undefined) {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
        'card_commission_percent',
        updates.cardCommissionPercent.toString()
      );
    }

    return { success: true };
  });

  // Activate cash register
  ipcMain.handle('activate-cash-register', async (_event, data: { initialCash: number; initialCard: number }) => {
    const db = getDb();
    const now = new Date().toISOString();

    // Set cash register as enabled
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('cash_register_enabled', 'true');
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('cash_register_start_date', now);

    // Create initial balance transaction
    db.prepare(`
      INSERT INTO Каса (
        Дата_створення, Дата_виконання, Категорія, Опис, Сума, Готівка, Карта
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      toDelphiDate(now),
      toDelphiDate(now),
      'Початковий баланс',
      'Активація каси. Початкові баланси.',
      data.initialCash + data.initialCard,
      data.initialCash,
      data.initialCard
    );

    return { success: true };
  });

  // Get current cash balances
  ipcMain.handle('get-cash-balances', async () => {
    const db = getDb();

    // Get the latest transaction to get current balances
    const latest = db.prepare(`
      SELECT Готівка as cash, Карта as card 
      FROM Каса 
      ORDER BY ID DESC 
      LIMIT 1
    `).get() as any;

    if (latest) {
      return { cash: latest.cash || 0, card: latest.card || 0 };
    }

    return { cash: 0, card: 0 };
  });

  // ========== EXPENSE CATEGORIES HANDLERS ==========

  // Get all expense categories
  ipcMain.handle('get-expense-categories', async () => {
    const db = getDb();
    const categories = db.prepare('SELECT ID as id, Назва as name, Активна as active FROM КатегоріїВитрат ORDER BY Назва').all();
    return categories.map((c: any) => ({ ...c, active: Boolean(c.active) }));
  });

  // Add expense category
  ipcMain.handle('add-expense-category', async (_event, name: string) => {
    const db = getDb();
    try {
      const result = db.prepare('INSERT INTO КатегоріїВитрат (Назва) VALUES (?)').run(name);
      triggerAutoBackup();
      return { success: true, id: result.lastInsertRowid };
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Така категорія вже існує');
      }
      throw error;
    }
  });

  // Update expense category
  ipcMain.handle('update-expense-category', async (_event, data: { id: number; name: string }) => {
    const db = getDb();
    try {
      db.prepare('UPDATE КатегоріїВитрат SET Назва = ? WHERE ID = ?').run(data.name, data.id);
      return { success: true };
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Така категорія вже існує');
      }
      throw error;
    }
  });

  // Toggle category active status
  ipcMain.handle('toggle-expense-category', async (_event, data: { id: number; active: boolean }) => {
    const db = getDb();
    db.prepare('UPDATE КатегоріїВитрат SET Активна = ? WHERE ID = ?').run(data.active ? 1 : 0, data.id);
    return { success: true };
  });

  // Delete expense category
  ipcMain.handle('delete-expense-category', async (_event, id: number) => {
    const db = getDb();
    db.prepare('DELETE FROM КатегоріїВитрат WHERE ID = ?').run(id);
    return { success: true };
  });

  // ========== INCOME CATEGORIES HANDLERS ==========

  // Get all income categories
  ipcMain.handle('get-income-categories', async () => {
    const db = getDb();
    const categories = db.prepare('SELECT ID as id, Назва as name, Активна as active FROM КатегоріїПрибутків ORDER BY Назва').all();
    return categories.map((c: any) => ({ ...c, active: Boolean(c.active) }));
  });

  // Add income category
  ipcMain.handle('add-income-category', async (_event, name: string) => {
    const db = getDb();
    try {
      const result = db.prepare('INSERT INTO КатегоріїПрибутків (Назва) VALUES (?)').run(name);
      triggerAutoBackup();
      return { success: true, id: result.lastInsertRowid };
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Така категорія вже існує');
      }
      throw error;
    }
  });

  // Update income category
  ipcMain.handle('update-income-category', async (_event, data: { id: number; name: string }) => {
    const db = getDb();
    try {
      db.prepare('UPDATE КатегоріїПрибутків SET Назва = ? WHERE ID = ?').run(data.name, data.id);
      return { success: true };
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Така категорія вже існує');
      }
      throw error;
    }
  });

  // Toggle category active status
  ipcMain.handle('toggle-income-category', async (_event, data: { id: number; active: boolean }) => {
    const db = getDb();
    db.prepare('UPDATE КатегоріїПрибутків SET Активна = ? WHERE ID = ?').run(data.active ? 1 : 0, data.id);
    return { success: true };
  });

  // Delete income category
  ipcMain.handle('delete-income-category', async (_event, id: number) => {
    const db = getDb();
    db.prepare('DELETE FROM КатегоріїПрибутків WHERE ID = ?').run(id);
    return { success: true };
  });

  // ========== TRANSACTION MANAGEMENT HANDLERS ==========

  // Get transactions
  ipcMain.handle('get-transactions', async (_event, filters: any) => {
    const db = getDb();
    const { startDate, endDate, category, paymentType, search } = filters;

    let query = `
      SELECT 
        ID as id,
        Дата_створення as dateCreated,
        Дата_виконання as dateExecuted,
        Категорія as category,
        Опис as description,
        Сума as amount,
        Готівка as cash,
        Карта as card,
        ВиконавецьІмя as executorName,
        ТипОплати as paymentType
      FROM Каса
      WHERE 1=1 AND (Сума != 0 OR Категорія IN ('Коригування', 'Списання'))
    `;

    const params: any[] = [];

    if (startDate) {
      query += ` AND Дата_виконання >= ?`;
      params.push(toDelphiDate(startDate));
    }

    if (endDate) {
      query += ` AND Дата_виконання <= ?`;
      // Set to end of day to include all transactions on that date
      const date = new Date(endDate);
      date.setUTCHours(23, 59, 59, 999);
      params.push(toDelphiDate(date.toISOString()));
    }

    if (category) {
      query += ` AND Категорія = ?`;
      params.push(category);
    }

    if (paymentType) {
      query += ` AND ТипОплати = ?`;
      params.push(paymentType);
    }

    if (search) {
      query += ` AND Опис LIKE ?`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY Дата_виконання DESC, ID DESC`;

    const transactions = db.prepare(query).all(...params).map((t: any) => ({
      ...t,
      dateCreated: toJsDate(t.dateCreated),
      dateExecuted: toJsDate(t.dateExecuted)
    }));

    return transactions;
  });

  // Create manual transaction
  ipcMain.handle('create-manual-transaction', async (_event, data: any) => {
    const db = getDb();
    const { dateExecuted, category, description, amount, paymentType, type } = data; // type: 'income' | 'expense'

    const balances = getBalances(db);
    let newCash = balances.cash;
    let newCard = balances.card;

    // Calculate amount based on type (income is positive, expense is negative)
    // But 'amount' passed from UI might be absolute. Let's assume UI passes positive for amount.
    const finalAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);

    if (paymentType === 'Готівка') {
      newCash += finalAmount;
    } else {
      newCard += finalAmount;
    }

    // Fix dateExecuted: if it's a datetime-local string (YYYY-MM-DDTHH:mm), 
    // treat it as UTC time to preserve the exact time values entered by user
    let processedDateExecuted = dateExecuted;
    if (dateExecuted && typeof dateExecuted === 'string' && dateExecuted.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
      // datetime-local format without seconds - append ':00.000Z' to treat as UTC
      // This preserves the exact time the user entered without timezone conversion
      processedDateExecuted = dateExecuted + ':00.000Z';
    }

    createTransaction(db, {
      category,
      description,
      amount: finalAmount,
      cash: newCash,
      card: newCard,
      paymentType,
      dateExecuted: processedDateExecuted
    });

    return { success: true };
  });

  // Reconcile balances
  ipcMain.handle('reconcile-balances', async (_event, data: any) => {
    const db = getDb();
    const { actualCash, actualCard, description } = data;

    const balances = getBalances(db);
    const cashDiff = actualCash - balances.cash;
    const cardDiff = actualCard - balances.card;
    const totalDiff = cashDiff + cardDiff;

    if (cashDiff === 0 && cardDiff === 0) {
      return { success: true, message: 'Баланси співпадають' };
    }

    const formatDiff = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)} грн`;
    const diffDetails = `(готівка: ${formatDiff(cashDiff)}, картка: ${formatDiff(cardDiff)})`;
    const finalDescription = description
      ? `${description} ${diffDetails}`
      : `Коригування балансів ${diffDetails}`;

    // Create adjustment transaction
    // We update balances to match actual values
    createTransaction(db, {
      category: 'Коригування',
      description: finalDescription,
      amount: totalDiff,
      cash: actualCash,
      card: actualCard,
      paymentType: 'Змішано',
      dateExecuted: new Date().toISOString()
    });

    return { success: true };
  });

  // Delete transaction (Manual only)
  ipcMain.handle('delete-transaction', async (_event, id: number) => {
    const db = getDb();

    const transaction = db.transaction(() => {
      // 1. Get transaction to delete
      const tx = db.prepare('SELECT * FROM Каса WHERE ID = ?').get(id) as any;
      if (!tx) throw new Error('Транзакцію не знайдено');

      // Check if allowed to delete (only manual ones ideally, but for now let's allow if not linked?)
      // If linked to repair/receipt, maybe warn or block?
      // For now, let's proceed with recalculation logic.

      const cashDiff = tx.ТипОплати === 'Готівка' ? -tx.Сума : 0; // Reverse the effect
      const cardDiff = tx.ТипОплати === 'Картка' ? -tx.Сума : 0;

      // 2. Delete
      db.prepare('DELETE FROM Каса WHERE ID = ?').run(id);

      // 3. Update subsequent transactions
      // We need to shift balances for all newer transactions
      db.prepare(`
        UPDATE Каса 
        SET 
          Готівка = Готівка + ?,
          Карта = Карта + ?
        WHERE ID > ?
      `).run(cashDiff, cardDiff, id);
    });

    transaction();
    triggerAutoBackup();
    return { success: true };
  });

  // ========== PROFITS ANALYTICS HANDLERS ==========

  // Get executor profits for a date range
  ipcMain.handle('get-executor-profits', async (_event, filters: any) => {
    const db = getDb();
    const { startDate, endDate } = filters;

    let query = `
      SELECT 
        r.ID as repairId,
        r.Виконавець as executorName,
        r.Доход as profit,
        r.Стоимость as labor,
        r.Сумма as totalCost,
        r.Конец_ремонта as dateEnd
      FROM Ремонт r
      WHERE r.Оплачено = 1 AND r.Сумма != 0
    `;

    const params: any[] = [];

    if (startDate) {
      query += ` AND r.Конец_ремонта >= ?`;
      params.push(toDelphiDate(startDate));
    }

    if (endDate) {
      query += ` AND r.Конец_ремонта <= ?`;
      const date = new Date(endDate);
      date.setUTCHours(23, 59, 59, 999);
      params.push(toDelphiDate(date.toISOString()));
    }

    const repairs = db.prepare(query).all(...params);

    // Get cash register settings for commission calculation
    const settings = getCashRegisterSettings(db);
    const cardCommissionPercent = settings.cardCommissionPercent || 0;

    // Get total write-offs (Списання) for the date range
    let writeOffsQuery = `
      SELECT ABS(SUM(Сума)) as totalWriteOffs
      FROM Каса
      WHERE Категорія = 'Списання'
    `;
    const writeOffsParams: any[] = [];

    if (startDate) {
      writeOffsQuery += ` AND Дата_виконання >= ?`;
      writeOffsParams.push(toDelphiDate(startDate));
    }

    if (endDate) {
      writeOffsQuery += ` AND Дата_виконання <= ?`;
      const date = new Date(endDate);
      date.setUTCHours(23, 59, 59, 999);
      writeOffsParams.push(toDelphiDate(date.toISOString()));
    }

    const writeOffsResult = db.prepare(writeOffsQuery).get(...writeOffsParams) as any;
    const totalWriteOffs = writeOffsResult?.totalWriteOffs || 0;

    // Group by executor and calculate totals
    const executorMap = new Map<string, {
      repairCount: number;
      totalProfit: number;
      totalLabor: number;
      totalCommission: number;
    }>();

    for (const repair of repairs) {
      const repairData = repair as { executorName?: string; profit?: number; labor?: number; totalCost?: number; repairId: number };
      const executorName = repairData.executorName || 'Не вказано';
      const profit = repairData.profit || 0;
      const labor = repairData.labor || 0;
      const totalCost = repairData.totalCost || 0;

      // Check if payment was made by card by looking at transactions
      const incomeTransaction = db.prepare(`
        SELECT ТипОплати as paymentType, Сума as amount
        FROM Каса
        WHERE Категорія = 'Прибуток' AND КвитанціяID = ?
        ORDER BY ID DESC
        LIMIT 1
      `).get(repairData.repairId) as any;

      // Calculate commission if payment was by card
      let commission = 0;
      if (incomeTransaction && incomeTransaction.paymentType === 'Картка' && totalCost > 0) {
        commission = totalCost * (cardCommissionPercent / 100);
      }

      if (!executorMap.has(executorName)) {
        executorMap.set(executorName, {
          repairCount: 0,
          totalProfit: 0,
          totalLabor: 0,
          totalCommission: 0
        });
      }

      const executor = executorMap.get(executorName)!;
      executor.repairCount += 1;
      executor.totalProfit += profit;
      executor.totalLabor += labor;
      executor.totalCommission += commission;
    }

    // Get executor salary percentages
    const executorSettings = db.prepare('SELECT Name, SalaryPercent FROM Executors').all() as any[];
    const salaryMap = new Map(executorSettings.map((e: any) => [e.Name, e.SalaryPercent]));

    // Convert to array and calculate totals with commission
    const executors = Array.from(executorMap.entries())
      .map(([executorName, data]) => {
        const salaryPercent = salaryMap.get(executorName) || 0;
        const totalLabor = data.totalLabor || 0;
        const productsProfit = data.totalProfit || 0; // Прибуток від товарів (Доход)
        const totalCommission = data.totalCommission || 0; // Загальна комісія для всіх ремонтів виконавця

        // Прибуток виконавця = (вартість робіт - комісія банку) * коефіцієнт працівника
        const executorProfit = ((totalLabor - totalCommission) * salaryPercent) / 100;

        // Прибуток сервісу від роботи = вартість робіт - прибуток виконавця
        // Виконавець отримує відсоток від (totalLabor - totalCommission), тому:
        // serviceProfitFromWork = totalLabor - executorProfit
        // Але комісія має бути віднята від прибутку сервісу, тому:
        // serviceProfitFromWork = totalLabor - executorProfit - totalCommission
        // Або: totalLabor - (totalLabor - totalCommission) * salaryPercent / 100 - totalCommission
        // = totalLabor - totalLabor * salaryPercent / 100 + totalCommission * salaryPercent / 100 - totalCommission
        // = totalLabor * (1 - salaryPercent / 100) - totalCommission * (1 - salaryPercent / 100)
        // = (totalLabor - totalCommission) * (1 - salaryPercent / 100)
        const serviceProfitFromWork = totalLabor - executorProfit - totalCommission;

        // Списання за товар списуються тільки з Андрія (господаря), не з інших виконавців
        const executorWriteOffs = executorName === 'Андрій' ? totalWriteOffs : 0;

        // Total service profit = products profit + service profit from work - write-offs
        // Комісія вже віднята в serviceProfitFromWork
        const totalServiceProfit = productsProfit + serviceProfitFromWork - executorWriteOffs;

        return {
          executorName: executorName,
          repairCount: data.repairCount,
          totalProfit: totalServiceProfit, // Загальний прибуток сервісу (з урахуванням комісії)
          productsProfit: productsProfit, // Прибуток від товарів (без комісії)
          serviceProfitFromWork: serviceProfitFromWork, // Прибуток сервісу від роботи
          totalLabor: totalLabor,
          salaryPercent: salaryPercent,
          executorProfit: executorProfit, // Прибуток виконавця (не враховує комісію, бо він отримує відсоток від labor)
          totalCommission: totalCommission // Загальна комісія банку
        };
      })
      .sort((a, b) => b.totalProfit - a.totalProfit);

    return executors;
  });

  // Get executor receipts with financial details
  ipcMain.handle('get-executor-receipts', async (_event, filters: any) => {
    const db = getDb();
    const { executorName, startDate, endDate } = filters;

    let query = `
      SELECT 
        r.ID as id,
        r.Квитанция as receiptId,
        r.Наименование_техники as deviceName,
        r.Имя_заказчика as clientName,
        r.Телефон as clientPhone,
        r.Стоимость as costLabor,
        r.Сумма as totalCost,
        r.Доход as profit,
        r.Конец_ремонта as dateEnd,
        r.ТипОплати as paymentType
      FROM Ремонт r
      WHERE r.Оплачено = 1 AND r.Сумма != 0
    `;

    const params: any[] = [];

    if (executorName) {
      query += ` AND r.Виконавець = ?`;
      params.push(executorName);
    }

    if (startDate) {
      query += ` AND r.Конец_ремонта >= ?`;
      params.push(toDelphiDate(startDate));
    }

    if (endDate) {
      query += ` AND r.Конец_ремонта <= ?`;
      const date = new Date(endDate);
      date.setUTCHours(23, 59, 59, 999);
      params.push(toDelphiDate(date.toISOString()));
    }

    query += ` ORDER BY r.Конец_ремонта DESC, r.Квитанция DESC`;

    const repairs = db.prepare(query).all(...params);

    // Get cash register settings for commission calculation
    const settings = getCashRegisterSettings(db);
    const cardCommissionPercent = settings.cardCommissionPercent || 0;

    // Get executor salary percentage
    let salaryPercent = 0;
    if (executorName) {
      const executor = db.prepare('SELECT SalaryPercent FROM Executors WHERE Name = ?').get(executorName) as any;
      if (executor) {
        salaryPercent = executor.SalaryPercent || 0;
      }
    }

    // Enrich with financial details (commission, etc.)
    const receipts = repairs.map((repair: any) => {
      const repairId = repair.id;
      const totalCost = repair.totalCost || 0;
      const paymentType = repair.paymentType || 'Готівка';

      // Check if payment was made by card by looking at transactions
      const incomeTransaction = db.prepare(`
        SELECT ТипОплати as paymentType, Сума as amount
        FROM Каса
        WHERE Категорія = 'Прибуток' AND КвитанціяID = ?
        ORDER BY ID DESC
        LIMIT 1
      `).get(repairId) as any;

      // Calculate commission if payment was by card
      let commission = 0;
      if (incomeTransaction && incomeTransaction.paymentType === 'Картка' && totalCost > 0) {
        commission = totalCost * (cardCommissionPercent / 100);
      }

      // Get parts cost (products sold with this repair)
      const partsQuery = db.prepare(`
        SELECT SUM(Сумма) as partsCost
        FROM Расходники
        WHERE Квитанция = ? AND Наличие = 0
      `);
      const partsResult = partsQuery.get(repairId) as any;
      const partsCost = partsResult?.partsCost || 0;

      return {
        ...repair,
        dateEnd: toJsDate(repair.dateEnd),
        costLabor: repair.costLabor || 0,
        totalCost: totalCost,
        profit: repair.profit || 0,
        partsCost: partsCost,
        servicesCost: repair.costLabor || 0, // Labor cost is services
        commission: commission,
        paymentType: paymentType || 'Готівка',
        salaryPercent: salaryPercent,
        executorProfit: ((repair.costLabor - commission) * salaryPercent) / 100
      };
    });

    return receipts;
  });

  // Get products statistics
  ipcMain.handle('get-products-stats', async (_event, filters: any) => {
    const db = getDb();
    const { startDate, endDate } = filters;

    // Total expenses on products (purchased in date range)
    let expensesQuery = `
      SELECT SUM(Вход) as totalExpenses
      FROM Расходники
      WHERE 1=1
    `;
    const expensesParams: any[] = [];

    if (startDate) {
      expensesQuery += ` AND Приход >= ?`;
      expensesParams.push(toDelphiDate(startDate));
    }

    if (endDate) {
      expensesQuery += ` AND Приход <= ?`;
      const date = new Date(endDate);
      date.setUTCHours(23, 59, 59, 999);
      expensesParams.push(toDelphiDate(date.toISOString()));
    }

    const expensesResult = db.prepare(expensesQuery).get(...expensesParams) as any;

    // Total revenue from products (sold in date range)
    let revenueQuery = `
      SELECT SUM(Доход) as totalRevenue
      FROM Расходники
      WHERE Дата_продажи IS NOT NULL
    `;
    const revenueParams: any[] = [];

    if (startDate) {
      revenueQuery += ` AND Дата_продажи >= ?`;
      revenueParams.push(toDelphiDate(startDate));
    }

    if (endDate) {
      revenueQuery += ` AND Дата_продажи <= ?`;
      const date = new Date(endDate);
      date.setUTCHours(23, 59, 59, 999);
      revenueParams.push(toDelphiDate(date.toISOString()));
    }

    const revenueResult = db.prepare(revenueQuery).get(...revenueParams) as any;

    // Unsold products value (currently in stock)
    const unsoldQuery = `
      SELECT SUM(Вход) as unsoldValue
      FROM Расходники
      WHERE Наличие = 1
    `;
    const unsoldResult = db.prepare(unsoldQuery).get() as any;

    return {
      totalExpenses: expensesResult?.totalExpenses || 0,
      totalRevenue: revenueResult?.totalRevenue || 0,
      unsoldValue: unsoldResult?.unsoldValue || 0
    };
  });

  // Get unpaid ready orders
  ipcMain.handle('get-unpaid-ready-orders', async (_event, filters: any) => {
    const db = getDb();
    const { startDate, endDate } = filters || {};

    // Build query with date range filter
    let query = `
      SELECT 
        ID as id,
        Квитанция as receiptId,
        Наименование_техники as deviceName,
        Имя_заказчика as clientName,
        Телефон as clientPhone,
        Стоимость as costLabor,
        Сумма as totalCost,
        Конец_ремонта as dateEnd
      FROM Ремонт
      WHERE Состояние = 4 AND Оплачено = 0 AND Сумма != 0
    `;

    const params: any[] = [];

    if (startDate) {
      query += ` AND Конец_ремонта >= ?`;
      params.push(toDelphiDate(startDate));
    }

    if (endDate) {
      query += ` AND Конец_ремонта <= ?`;
      const date = new Date(endDate);
      date.setUTCHours(23, 59, 59, 999);
      params.push(toDelphiDate(date.toISOString()));
    }

    // Sort by dateEnd descending (newest first)
    query += ` ORDER BY Конец_ремонта DESC`;

    const repairs = db.prepare(query).all(...params);

    let servicesTotal = 0;
    let productsTotal = 0;

    const orders = repairs.map((repair: any) => {
      // Get parts for this repair
      const parts = db.prepare(`
        SELECT SUM(Сумма) as partsTotal
        FROM Расходники
        WHERE Квитанция = ?
      `).get(repair.id) as any;

      const servicesCost = repair.costLabor || 0;
      const partsCost = parts?.partsTotal || 0;

      servicesTotal += servicesCost;
      productsTotal += partsCost;

      return {
        id: repair.id,
        receiptId: repair.receiptId,
        deviceName: repair.deviceName,
        clientName: repair.clientName,
        clientPhone: repair.clientPhone,
        servicesCost,
        partsCost,
        totalCost: servicesCost + partsCost
      };
    });

    return {
      servicesTotal,
      productsTotal,
      grandTotal: servicesTotal + productsTotal,
      orders
    };
  });

  // Save background image
  ipcMain.handle('save-background-image', async (_event, { fileName, fileData }) => {
    try {
      const dbPath = getDbPath();
      const dbDir = path.dirname(dbPath);
      const imagesDir = path.join(dbDir, 'background-images');

      // Create images directory if it doesn't exist
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const ext = path.extname(fileName);
      const baseName = path.basename(fileName, ext);
      const uniqueFileName = `${baseName}_${timestamp}${ext}`;
      const filePath = path.join(imagesDir, uniqueFileName);

      // Save file
      fs.writeFileSync(filePath, Buffer.from(fileData));

      // Return relative path for use in app
      return {
        success: true,
        filePath: `file://${filePath}`,
      };
    } catch (error: any) {
      console.error('Error saving background image:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // ========== GOOGLE DRIVE INTEGRATION ==========
  // Temporarily disabled

  // // Check if Google Drive credentials are configured
  // ipcMain.handle('google-drive-check-credentials', async () => {
  //   try {
  //     const credentials = loadCredentials();
  //     return { configured: credentials !== null };
  //   } catch (error: any) {
  //     console.error('Error checking credentials:', error);
  //     return { configured: false, error: error.message };
  //   }
  // });

  // // Check if user is authenticated
  // ipcMain.handle('google-drive-check-auth', async () => {
  //   try {
  //     return { authenticated: isAuthenticated() };
  //   } catch (error: any) {
  //     console.error('Error checking auth:', error);
  //     return { authenticated: false, error: error.message };
  //   }
  // });

  // // Authenticate with Google Drive
  // ipcMain.handle('google-drive-auth', async () => {
  //   try {
  //     const tokens = await authenticate(win);
  //     return { success: true, tokens };
  //   } catch (error: any) {
  //     console.error('Google Drive auth error:', error);
  //     return { success: false, error: error.message };
  //   }
  // });

  // // Disconnect from Google Drive
  // ipcMain.handle('google-drive-disconnect', async () => {
  //   try {
  //     deleteTokens();
  //     return { success: true };
  //   } catch (error: any) {
  //     console.error('Error disconnecting:', error);
  //     return { success: false, error: error.message };
  //   }
  // });

  // // Upload backup to Google Drive
  // ipcMain.handle('google-drive-upload-backup', async (_event, backupFileName: string) => {
  //   try {
  //     const dbPath = getDbPath();
  //     const dbDir = path.dirname(dbPath);
  //     const backupsDir = path.join(dbDir, 'backups');
  //     const backupPath = path.join(backupsDir, backupFileName);

  //     if (!fs.existsSync(backupPath)) {
  //       throw new Error('Файл бекапу не знайдено');
  //     }

  //     const result = await uploadBackup(backupPath, backupFileName);
  //     return { success: true, fileId: result.id, fileName: result.name, size: result.size };
  //   } catch (error: any) {
  //     console.error('Error uploading backup to Google Drive:', error);
  //     return { success: false, error: error.message };
  //   }
  // });

  // // Download backup from Google Drive
  // ipcMain.handle('google-drive-download-backup', async (_event, fileId: string, fileName: string) => {
  //   try {
  //     const dbPath = getDbPath();
  //     const dbDir = path.dirname(dbPath);
  //     const backupsDir = path.join(dbDir, 'backups');

  //     // Ensure backups directory exists
  //     if (!fs.existsSync(backupsDir)) {
  //       fs.mkdirSync(backupsDir, { recursive: true });
  //     }

  //     const savePath = path.join(backupsDir, fileName);

  //     await downloadBackup(fileId, savePath);
  //     return { success: true, filePath: savePath };
  //   } catch (error: any) {
  //     console.error('Error downloading backup from Google Drive:', error);
  //     return { success: false, error: error.message };
  //   }
  // });

  // // List backups in Google Drive
  // ipcMain.handle('google-drive-list-backups', async () => {
  //   try {
  //     const backups = await listBackups();
  //     return { success: true, backups };
  //   } catch (error: any) {
  //     console.error('Error listing backups from Google Drive:', error);
  //     return { success: false, error: error.message, backups: [] };
  //   }
  // });

  // // Delete backup from Google Drive
  // ipcMain.handle('google-drive-delete-backup', async (_event, fileId: string) => {
  //   try {
  //     await deleteDriveBackup(fileId);
  //     return { success: true };
  //   } catch (error: any) {
  //     console.error('Error deleting backup from Google Drive:', error);
  //     return { success: false, error: error.message };
  //   }
  // });

  // // Get file info from Google Drive
  // ipcMain.handle('google-drive-get-file-info', async (_event, fileId: string) => {
  //   try {
  //     const info = await getFileInfo(fileId);
  //     return { success: true, info };
  //   } catch (error: any) {
  //     console.error('Error getting file info from Google Drive:', error);
  //     return { success: false, error: error.message };
  //   }
  // });

  // ========== SYNC SERVER HANDLERS ==========

  ipcMain.handle('sync-server-start', async (_event, port: number = 3000) => {
    const { startSyncServer } = await import('./syncServer');
    return startSyncServer(port);
  });

  ipcMain.handle('sync-server-stop', async () => {
    const { stopSyncServer } = await import('./syncServer');
    return stopSyncServer();
  });

  ipcMain.handle('sync-server-status', async () => {
    const { getSyncServerStatus } = await import('./syncServer');
    return getSyncServerStatus();
  });

  ipcMain.handle('sync-server-get-ip', async () => {
    const { getLocalIPAddresses } = await import('./syncServer');
    return { addresses: getLocalIPAddresses() };
  });

  // ========== EXECUTOR WEB SERVER HANDLERS ==========

  ipcMain.handle('executor-web-server-start', async (_event, port: number = 3001) => {
    const { startExecutorWebServer } = await import('./executorWebServer');
    return startExecutorWebServer(port);
  });

  ipcMain.handle('executor-web-server-stop', async () => {
    const { stopExecutorWebServer } = await import('./executorWebServer');
    return stopExecutorWebServer();
  });

  ipcMain.handle('executor-web-server-status', async () => {
    const { getExecutorWebServerStatus } = await import('./executorWebServer');
    return getExecutorWebServerStatus();
  });

  // Set executor password
  ipcMain.handle('set-executor-password', async (_event, { executorId, password }: { executorId: number; password: string }) => {
    const db = getDb();
    const crypto = await import('crypto');
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    db.prepare('UPDATE Executors SET Password = ? WHERE ID = ?').run(hashedPassword, executorId);
    return { success: true };
  });

  // Reset executor password
  ipcMain.handle('reset-executor-password', async (_event, executorId: number) => {
    const db = getDb();
    db.prepare('UPDATE Executors SET Password = NULL WHERE ID = ?').run(executorId);
    return { success: true };
  });

  // Set executor role
  ipcMain.handle('set-executor-role', async (_event, { executorId, role }: { executorId: number; role: 'admin' | 'worker' }) => {
    const db = getDb();
    db.prepare('UPDATE Executors SET Role = ? WHERE ID = ?').run(role, executorId);
    return { success: true };
  });

  // ========== SYSTEM STATS ==========
  ipcMain.handle('get-system-stats', async () => {
    try {
      // RAM usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memPercent = Math.round((usedMem / totalMem) * 100);

      // CPU Load calculation from CPU times (more accurate than loadavg)
      const currentCpuStats = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;

      for (let i = 0; i < currentCpuStats.length; i++) {
        const last = lastCpuStats[i]?.times || currentCpuStats[i].times;
        const current = currentCpuStats[i].times;

        const idle = current.idle - last.idle;
        const total = (
          (current.user + current.nice + current.sys + current.idle + current.irq) -
          (last.user + last.nice + last.sys + last.idle + last.irq)
        );

        totalIdle += idle;
        totalTick += total;
      }

      const cpuLoad = totalTick > 0
        ? Math.round(100 * (1 - totalIdle / totalTick))
        : 0;

      lastCpuStats = currentCpuStats;


      // CPU Temperature (Linux)
      let cpuTemp = 0;
      try {
        const tempStr = execSync('cat /sys/class/thermal/thermal_zone*/temp | head -n 1').toString();
        cpuTemp = Math.round(parseInt(tempStr) / 1000);
      } catch (e) {
        // Fallback
        try {
          const tempStr = execSync('cat /sys/class/thermal/thermal_zone0/temp').toString();
          cpuTemp = Math.round(parseInt(tempStr) / 1000);
        } catch (e2) {
          // No luck
        }
      }

      // Disk Usage
      let diskPercent = 0;
      try {
        const diskStr = execSync("df -h . | tail -1 | awk '{print $5}'").toString();
        diskPercent = parseInt(diskStr.replace('%', ''));
      } catch (e) {
        // Fallback
      }

      return {
        cpuLoad: Math.min(100, cpuLoad),
        memPercent: Math.min(100, memPercent),
        cpuTemp,
        diskPercent,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      return null;
    }
  });
}

