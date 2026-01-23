import { getDb } from './database';
import { networkInterfaces } from 'os';
import type { Server } from 'http';

// Database date conversion functions (same as in ipcHandlers.ts)
const JDN_EPOCH = 2440587.5;
const MS_PER_DAY = 86400 * 1000;

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

let server: Server | null = null;
let serverPort: number = 3000;
// Track unique clients by IP address with last activity timestamp
const activeClients = new Map<string, number>(); // IP -> last activity timestamp
const CLIENT_TIMEOUT = 30000; // 30 seconds - consider client inactive after this time

export async function startSyncServer(port: number = 3000): Promise<{ success: boolean; port?: number; error?: string }> {
  if (server) {
    return { success: false, error: 'Server is already running' };
  }

  try {
    // Lazy import express to avoid loading it at module load time
    const expressModule = await import('express');
    const express = expressModule.default || expressModule;
    const app = express();
    app.use(express.json());

    // CORS middleware for Android
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Track unique clients by IP address
    app.use((req, _res, next) => {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      console.log(`[Sync Server] ${req.method} ${req.url} from ${clientIp}`);

      // Remove port if present (e.g., "::ffff:192.168.1.1" or "192.168.1.1:12345")
      const cleanIp = clientIp.split(':').pop() || clientIp;
      const now = Date.now();

      // Update or add client activity
      activeClients.set(cleanIp, now);

      // Clean up inactive clients (older than timeout)
      const timeout = now - CLIENT_TIMEOUT;
      for (const [ip, lastActivity] of activeClients.entries()) {
        if (lastActivity < timeout) {
          activeClients.delete(ip);
        }
      }

      next();
    });

    // Health check endpoint
    app.get('/api/health', (_req: any, res: any) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Add root endpoint for easy testing in browser
    app.get('/', (_req: any, res: any) => {
      res.json({
        message: 'Service Center Sync Server is running',
        endpoints: ['/api/health', '/api/repairs', '/api/warehouse']
      });
    });

    // ========== REPAIRS ENDPOINTS ==========

    // GET /api/repairs - List repairs with filters
    app.get('/api/repairs', (req: any, res: any) => {
      try {
        const db = getDb();
        const {
          page = '1',
          limit = '50',
          search = '',
          status = null,
          shouldCall = 'false',
          executor = null,
          dateStart = null,
          dateEnd = null,
          paymentDateStart = null,
          paymentDateEnd = null,
        } = req.query;

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const offset = (pageNum - 1) * limitNum;

        let query = `
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
          WHERE 1=1
        `;

        const params: any[] = [];

        if (shouldCall === 'true') {
          query += ` AND Перезвонить = 1`;
        }

        if (executor) {
          query += ` AND Виконавець = ?`;
          params.push(executor);
        }

        if (search) {
          const normalizedSearch = (search as string).replace(/\D/g, '');
          const phoneSearchTerm = normalizedSearch ? `%${normalizedSearch}%` : '';
          query += ` AND (LOWER(Имя_заказчика) LIKE LOWER(?) OR REPLACE(REPLACE(REPLACE(REPLACE(Телефон, '-', ''), ' ', ''), '(', ''), ')', '') LIKE ? OR Квитанция LIKE ? OR LOWER(Наименование_техники) LIKE LOWER(?) OR CAST(Стоимость AS TEXT) LIKE ? OR CAST(Сумма AS TEXT) LIKE ?)`;
          const term = `%${search}%`;
          params.push(term, phoneSearchTerm || term, term, term, term, term);
        }

        if (dateStart) {
          query += ` AND Начало_ремонта >= ?`;
          params.push(toDelphiDate(dateStart as string));
        }

        if (dateEnd) {
          query += ` AND Начало_ремонта <= ?`;
          const date = new Date(dateEnd as string);
          date.setUTCHours(23, 59, 59, 999);
          params.push(toDelphiDate(date.toISOString()));
        }

        if (paymentDateStart || paymentDateEnd) {
          query += ` AND Оплачено = 1`;
        }

        if (paymentDateStart) {
          query += ` AND Конец_ремонта >= ?`;
          params.push(toDelphiDate(paymentDateStart as string));
        }

        if (paymentDateEnd) {
          query += ` AND Конец_ремонта <= ?`;
          const date = new Date(paymentDateEnd as string);
          date.setUTCHours(23, 59, 59, 999);
          params.push(toDelphiDate(date.toISOString()));
        }

        if (status) {
          if (Array.isArray(status)) {
            if (status.length > 0) {
              const placeholders = status.map(() => '?').join(',');
              query += ` AND Состояние IN (${placeholders})`;
              params.push(...status);
            }
          } else {
            query += ` AND Состояние = ?`;
            params.push(status);
          }
        }

        // Get total count
        const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY[\s\S]*$/, '');
        const totalResult = db.prepare(countQuery).get(...params) as { total: number };
        const total = totalResult.total;

        query += ` ORDER BY Квитанция DESC LIMIT ? OFFSET ?`;
        params.push(limitNum, offset);

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

        const repairs = db.prepare(query).all(...params).map((repair: any) => ({
          ...repair,
          status: convertStatusToNumber(repair.status),
          isPaid: Boolean(repair.isPaid),
          shouldCall: Boolean(repair.shouldCall),
          dateStart: toJsDate(repair.dateStart),
          dateEnd: toJsDate(repair.dateEnd),
        }));

        res.json({
          data: repairs,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        });
      } catch (error: any) {
        console.error('Error fetching repairs:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // GET /api/repairs/:id - Get single repair
    app.get('/api/repairs/:id', (req: any, res: any) => {
      try {
        const db = getDb();
        const id = parseInt(req.params.id, 10);

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

        if (!repair) {
          return res.status(404).json({ error: 'Repair not found' });
        }

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

        res.json({
          ...repair,
          status: convertStatusToNumber(repair.status),
          isPaid: Boolean(repair.isPaid),
          shouldCall: Boolean(repair.shouldCall),
          dateStart: toJsDate(repair.dateStart),
          dateEnd: toJsDate(repair.dateEnd),
        });
      } catch (error: any) {
        console.error('Error fetching repair:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // POST /api/repairs - Create repair
    app.post('/api/repairs', (req: any, res: any) => {
      try {
        const db = getDb();
        const repairData = req.body;

        const delphiDateStart = toDelphiDate(repairData.dateStart);
        const delphiDateEnd = toDelphiDate(repairData.dateEnd);

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

        const statusNumber = convertStatusToNumber(repairData.status);
        const isPaid = repairData.isPaid || false;
        const paymentType = repairData.paymentType || 'Готівка';
        const executor = repairData.executor || 'Андрій';
        const totalCost = repairData.totalCost || 0;

        const result = db.prepare(`
          INSERT INTO Ремонт (
            Квитанция, Наименование_техники, Описание_неисправности, Выполнено,
            Стоимость, Сумма, Оплачено, Состояние, Имя_заказчика, Телефон,
            Доход, Начало_ремонта, Конец_ремонта, Примечание, Перезвонить,
            Виконавець, ТипОплати, UpdateTimestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          repairData.receiptId,
          repairData.deviceName,
          repairData.faultDesc || '',
          repairData.workDone || '',
          repairData.costLabor || 0,
          totalCost,
          isPaid ? 1 : 0,
          statusNumber,
          repairData.clientName,
          repairData.clientPhone,
          repairData.profit || 0,
          delphiDateStart,
          delphiDateEnd,
          repairData.note || '',
          repairData.shouldCall ? 1 : 0,
          executor,
          paymentType
        );

        const repairId = result.lastInsertRowid;

        // Create transaction if repair is paid (same logic as in ipcHandlers.ts)
        // Always create transactions for paid repairs, regardless of cash register setting
        if (isPaid && totalCost > 0) {
          // Get cash register settings
          const cardCommission = db.prepare('SELECT value FROM settings WHERE key = ?').get('card_commission_percent') as any;
          const commissionPercent = cardCommission ? parseFloat(cardCommission.value) : 1.5;

          // Get current balances
          const latest = db.prepare(`
            SELECT Готівка as cash, Карта as card 
            FROM Каса 
            ORDER BY ID DESC 
            LIMIT 1
          `).get() as any;

          const balances = {
            cash: latest?.cash || 0,
            card: latest?.card || 0
          };

          let newCash = balances.cash;
          let newCard = balances.card;
          let commission = 0;

          let description = `Оплата квитанції #${repairData.receiptId}. ${paymentType}. ${executor}`;

          if (paymentType === 'Картка') {
            commission = totalCost * (commissionPercent / 100);
            newCard += totalCost;
            description += ` (Комісія: ${commission.toFixed(2)} грн)`;
          } else {
            newCash += totalCost;
          }

          // Get executor ID
          const executorRecord = db.prepare('SELECT ID FROM Executors WHERE Name = ?').get(executor) as any;

          const now = new Date().toISOString();
          const execDate = delphiDateEnd ? repairData.dateEnd : now;

          // Create profit transaction
          db.prepare(`
            INSERT INTO Каса (
              Дата_створення, Дата_виконання, Категорія, Опис, Сума, Готівка, Карта,
              ВиконавецьID, ВиконавецьІмя, КвитанціяID, ТипОплати
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            toDelphiDate(now),
            toDelphiDate(execDate),
            'Прибуток',
            description,
            totalCost,
            newCash,
            newCard,
            executorRecord?.ID,
            executor,
            repairId,
            paymentType
          );

          // If commission was deducted, create a separate expense transaction for commission
          if (commission > 0) {
            const commissionBalances = db.prepare(`
              SELECT Готівка as cash, Карта as card 
              FROM Каса 
              ORDER BY ID DESC 
              LIMIT 1
            `).get() as any;

            const commissionCardBalance = commissionBalances.card - commission;

            db.prepare(`
              INSERT INTO Каса (
                Дата_створення, Дата_виконання, Категорія, Опис, Сума, Готівка, Карта,
                ВиконавецьID, ВиконавецьІмя, КвитанціяID, ТипОплати
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              toDelphiDate(now),
              toDelphiDate(execDate),
              'Комісія банку',
              `Комісія банку за оплату квитанції #${repairData.receiptId}`,
              -commission,
              commissionBalances.cash,
              commissionCardBalance,
              executorRecord?.ID,
              executor,
              repairId,
              'Картка'
            );
          }
        }

        res.status(201).json({ id: repairId, success: true });
      } catch (error: any) {
        console.error('Error creating repair:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // PUT /api/repairs/:id - Update repair
    app.put('/api/repairs/:id', (req: any, res: any) => {
      try {
        const db = getDb();
        const id = parseInt(req.params.id, 10);
        const repairData = req.body;

        const delphiDateStart = toDelphiDate(repairData.dateStart);
        const delphiDateEnd = toDelphiDate(repairData.dateEnd);

        // Calculate total cost: costLabor + sum of all parts
        const parts = db.prepare(`
          SELECT Сумма as priceUah
          FROM Расходники
          WHERE Квитанция = ?
        `).all(id) as any[];

        const partsTotal = parts.reduce((sum, part) => sum + (part.priceUah || 0), 0);
        const costLabor = repairData.costLabor || 0;
        const calculatedTotalCost = costLabor + partsTotal;

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
          repairData.receiptId,
          repairData.deviceName,
          repairData.faultDesc || '',
          repairData.workDone || '',
          costLabor,
          calculatedTotalCost, // Use calculated total instead of provided totalCost
          repairData.isPaid ? 1 : 0,
          repairData.status,
          repairData.clientName,
          repairData.clientPhone,
          repairData.profit || 0,
          delphiDateStart,
          delphiDateEnd,
          repairData.note || '',
          repairData.shouldCall ? 1 : 0,
          repairData.executor || 'Андрій',
          repairData.paymentType || 'Готівка',
          id
        );

        res.json({ success: true });
      } catch (error: any) {
        console.error('Error updating repair:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // DELETE /api/repairs/:id - Delete repair
    app.delete('/api/repairs/:id', (req: any, res: any) => {
      try {
        const db = getDb();
        const id = parseInt(req.params.id, 10);

        db.prepare('DELETE FROM Ремонт WHERE ID = ?').run(id);

        res.json({ success: true });
      } catch (error: any) {
        console.error('Error deleting repair:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // POST /api/repairs/:id/refund - Process refund for a repair
    app.post('/api/repairs/:id/refund', (req: any, res: any) => {
      try {
        const db = getDb();
        const repairId = parseInt(req.params.id, 10);
        const { receiptId, refundAmount, refundType, returnPartsToWarehouse, note } = req.body;

        // Get repair info
        const repair = db.prepare(`
          SELECT ID, Квитанция as receiptId, Сумма as totalCost, Оплачено as isPaid, 
                 ТипОплати as paymentType, Виконавець as executor
          FROM Ремонт WHERE ID = ?
        `).get(repairId) as any;

        if (!repair) {
          return res.status(404).json({ success: false, error: 'Ремонт не знайдено' });
        }

        if (!repair.isPaid) {
          return res.status(400).json({ success: false, error: 'Квитанція не оплачена' });
        }

        const refundTransaction = db.transaction(() => {
          // Get current balances
          const latest = db.prepare(`
            SELECT Готівка as cash, Карта as card 
            FROM Каса 
            ORDER BY ID DESC 
            LIMIT 1
          `).get() as any;

          const balances = {
            cash: latest?.cash || 0,
            card: latest?.card || 0
          };

          // Find the original income transaction
          const originalIncome = db.prepare(`
            SELECT ID, Сума as amount, ТипОплати as paymentType, ВиконавецьID as executorId, 
                   ВиконавецьІмя as executorName
            FROM Каса 
            WHERE КвитанціяID = ? AND Категорія = 'Прибуток'
            ORDER BY ID DESC LIMIT 1
          `).get(repairId) as any;

          const originalPaymentType = originalIncome?.paymentType || repair.paymentType || 'Готівка';
          const isFullRefund = refundAmount === repair.totalCost;

          // Calculate new balances based on refund type
          let newCash = balances.cash;
          let newCard = balances.card;

          if (refundType === 'Готівка') {
            newCash -= refundAmount;
          } else {
            newCard -= refundAmount;
          }

          // Create refund description
          let refundDescription = `Повернення коштів за квитанцію #${receiptId || repair.receiptId}`;
          if (!isFullRefund) {
            refundDescription += ` (часткове: ${refundAmount.toFixed(2)} з ${repair.totalCost.toFixed(2)} ₴)`;
          }
          if (note) {
            refundDescription += `. ${note}`;
          }
          if (refundType !== originalPaymentType) {
            refundDescription += ` [Оплата: ${originalPaymentType}, Повернення: ${refundType}]`;
          }

          // Get executor info
          const executorRecord = db.prepare('SELECT ID FROM Executors WHERE Name = ?').get(repair.executor) as any;

          const now = new Date().toISOString();

          // Create refund transaction
          db.prepare(`
            INSERT INTO Каса (
              Дата_створення, Дата_виконання, Категорія, Опис, Сума, Готівка, Карта,
              ВиконавецьID, ВиконавецьІмя, КвитанціяID, ТипОплати, ЗвязанаТранзакціяID
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            toDelphiDate(now),
            toDelphiDate(now),
            'Повернення',
            refundDescription,
            -refundAmount,
            newCash,
            newCard,
            executorRecord?.ID || originalIncome?.executorId,
            repair.executor || originalIncome?.executorName,
            repairId,
            refundType,
            originalIncome?.ID || null
          );

          // If original payment was by card and this is a full refund, reverse the commission too
          if (isFullRefund && originalPaymentType === 'Картка') {
            const commissionTransaction = db.prepare(`
              SELECT ID, Сума as amount
              FROM Каса
              WHERE Категорія = 'Комісія банку' AND КвитанціяID = ?
              ORDER BY ID DESC LIMIT 1
            `).get(repairId) as any;

            if (commissionTransaction) {
              const commissionBalances = db.prepare(`
                SELECT Готівка as cash, Карта as card 
                FROM Каса 
                ORDER BY ID DESC 
                LIMIT 1
              `).get() as any;

              const commissionAmount = Math.abs(commissionTransaction.amount || 0);

              db.prepare(`
                INSERT INTO Каса (
                  Дата_створення, Дата_виконання, Категорія, Опис, Сума, Готівка, Карта,
                  КвитанціяID, ТипОплати, ЗвязанаТранзакціяID
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                toDelphiDate(now),
                toDelphiDate(now),
                'Повернення',
                `Повернення комісії банку за квитанцію #${receiptId || repair.receiptId}`,
                commissionAmount,
                commissionBalances.cash,
                commissionBalances.card + commissionAmount,
                repairId,
                'Картка',
                commissionTransaction.ID
              );
            }
          }

          // Return parts to warehouse if requested
          if (returnPartsToWarehouse) {
            const parts = db.prepare(`
              SELECT ID, Поставщик as supplier
              FROM Расходники 
              WHERE Квитанция = ?
            `).all(repairId) as any[];

            for (const part of parts) {
              if (part.supplier === 'ЧипЗона' || part.supplier === 'Послуга') {
                db.prepare('DELETE FROM Расходники WHERE ID = ?').run(part.ID);
              } else {
                db.prepare(`
                  UPDATE Расходники SET 
                    Квитанция = NULL,
                    Наличие = 1,
                    Дата_продажи = NULL,
                    Сумма = 0,
                    Доход = 0
                  WHERE ID = ?
                `).run(part.ID);
              }
            }
          }

          // Update repair record - mark as unpaid after refund
          db.prepare(`
            UPDATE Ремонт SET 
              Оплачено = 0,
              Состояние = 4,
              UpdateTimestamp = datetime('now')
            WHERE ID = ?
          `).run(repairId);
        });

        refundTransaction();

        res.json({ success: true });
      } catch (error: any) {
        console.error('Error processing refund:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // ========== WAREHOUSE ENDPOINTS ==========

    // GET /api/warehouse - List warehouse items
    app.get('/api/warehouse', (req: any, res: any) => {
      try {
        const db = getDb();
        const {
          inStock = 'false',
          stockFilter = 'all',
          supplier = null,
          search = '',
          dateArrivalStart = null,
          dateArrivalEnd = null,
        } = req.query;

        let filterCondition = '';
        if (stockFilter === 'inStock') {
          filterCondition = 'AND Наличие = 1';
        } else if (stockFilter === 'sold') {
          filterCondition = 'AND Наличие = 0 AND Дата_продажи IS NOT NULL';
        } else if (stockFilter === 'all') {
          filterCondition = '';
        } else if (inStock === 'true') {
          filterCondition = 'AND Наличие = 1';
        }

        let query = `
          SELECT
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
            ШтрихКод as barcode
          FROM Расходники
          WHERE 1=1 ${filterCondition}
        `;

        const params: any[] = [];

        if (supplier) {
          query += ` AND Поставщик = ?`;
          params.push(supplier);
        }

        if (search) {
          query += ` AND (
            Наименование_расходника LIKE ? OR 
            Поставщик LIKE ? OR
            Код_товара LIKE ?
          )`;
          const searchParam = `%${search}%`;
          params.push(searchParam, searchParam, searchParam);
        }

        if (dateArrivalStart) {
          query += ` AND Приход >= ?`;
          params.push(toDelphiDate(dateArrivalStart as string));
        }

        if (dateArrivalEnd) {
          query += ` AND Приход <= ?`;
          params.push(toDelphiDate(dateArrivalEnd as string));
        }

        query += ` ORDER BY Приход DESC`;

        const items = db.prepare(query).all(...params).map((item: any) => ({
          ...item,
          dateArrival: toJsDate(item.dateArrival),
          dateSold: toJsDate(item.dateSold),
          inStock: Boolean(item.inStock),
        }));

        res.json({ data: items });
      } catch (error: any) {
        console.error('Error fetching warehouse items:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // GET /api/warehouse/suppliers - Get available suppliers
    app.get('/api/warehouse/suppliers', (_req: any, res: any) => {
      try {
        const db = getDb();
        const suppliers = db.prepare(`
          SELECT DISTINCT Поставщик as supplier
          FROM Расходники
          WHERE Поставщик IS NOT NULL AND Поставщик != ''
          ORDER BY Поставщик
        `).all() as Array<{ supplier: string }>;

        res.json({ data: suppliers.map(s => s.supplier) });
      } catch (error: any) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // GET /api/warehouse/barcode/:barcode - Find warehouse item by barcode
    app.get('/api/warehouse/barcode/:barcode', (req: any, res: any) => {
      try {
        const db = getDb();
        const barcode = req.params.barcode;

        const item = db.prepare(`
          SELECT
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
            ШтрихКод as barcode
          FROM Расходники
          WHERE ШтрихКод = ?
          ORDER BY ID DESC
          LIMIT 1
        `).get(barcode) as any;

        if (!item) {
          return res.status(404).json({ error: 'Item not found' });
        }

        res.json({
          data: {
            ...item,
            dateArrival: toJsDate(item.dateArrival),
            dateSold: toJsDate(item.dateSold),
            inStock: Boolean(item.inStock),
          }
        });
      } catch (error: any) {
        console.error('Error fetching item by barcode:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // PUT /api/warehouse/:id/barcode - Update barcode for warehouse item
    app.put('/api/warehouse/:id/barcode', (req: any, res: any) => {
      try {
        const db = getDb();
        const id = parseInt(req.params.id, 10);
        const { barcode } = req.body;

        // Check if item exists
        const item = db.prepare('SELECT ID FROM Расходники WHERE ID = ?').get(id) as any;
        if (!item) {
          return res.status(404).json({ error: 'Item not found' });
        }

        // Update barcode
        db.prepare('UPDATE Расходники SET ШтрихКод = ? WHERE ID = ?').run(
          barcode || null,
          id
        );

        res.json({ success: true });
      } catch (error: any) {
        console.error('Error updating barcode:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // DELETE /api/warehouse/:id/barcode - Remove barcode from warehouse item
    app.delete('/api/warehouse/:id/barcode', (req: any, res: any) => {
      try {
        const db = getDb();
        const id = parseInt(req.params.id, 10);

        // Check if item exists
        const item = db.prepare('SELECT ID FROM Расходники WHERE ID = ?').get(id) as any;
        if (!item) {
          return res.status(404).json({ error: 'Item not found' });
        }

        // Remove barcode
        db.prepare('UPDATE Расходники SET ШтрихКод = NULL WHERE ID = ?').run(id);

        res.json({ success: true });
      } catch (error: any) {
        console.error('Error removing barcode:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // GET /api/repairs/:id/parts - Get parts for a repair
    app.get('/api/repairs/:id/parts', (req: any, res: any) => {
      try {
        const db = getDb();
        const repairId = parseInt(req.params.id, 10);

        // Get repair to check if it exists
        const repair = db.prepare('SELECT ID FROM Ремонт WHERE ID = ?').get(repairId) as any;
        if (!repair) {
          return res.status(404).json({ error: 'Repair not found' });
        }

        // Get parts for this repair (using repairId, not receiptId)
        // Note: Квитанция field in Расходники stores the repair ID, not receiptId
        const parts = db.prepare(`
          SELECT
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
            ШтрихКод as barcode
          FROM Расходники
          WHERE Квитанция = ?
        `).all(repairId).map((p: any) => ({
          ...p,
          dateArrival: toJsDate(p.dateArrival),
          dateSold: toJsDate(p.dateSold),
          inStock: Boolean(p.inStock),
        }));

        res.json({ data: parts });
      } catch (error: any) {
        console.error('Error fetching repair parts:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // POST /api/repairs/:id/parts - Add part to repair
    app.post('/api/repairs/:id/parts', (req: any, res: any) => {
      try {
        const db = getDb();
        const repairId = parseInt(req.params.id, 10);
        const { partId, priceUah, costUah, supplier, name, isPaid, dateEnd } = req.body;

        // Get repair to check if it exists
        const repair = db.prepare('SELECT * FROM Ремонт WHERE ID = ?').get(repairId) as any;
        if (!repair) {
          return res.status(404).json({ error: 'Repair not found' });
        }

        if (partId) {
          // Using existing warehouse item
          const warehouseItem = db.prepare('SELECT * FROM Расходники WHERE ID = ?').get(partId) as any;
          if (!warehouseItem) {
            return res.status(404).json({ error: 'Warehouse item not found' });
          }

          // Update warehouse item to link it to repair
          const profit = priceUah - (warehouseItem.Вход || 0);
          const delphiDateSold = isPaid && dateEnd ? toDelphiDate(dateEnd) : null;

          db.prepare(`
            UPDATE Расходники SET
              Квитанция = ?,
              Сумма = ?,
              Доход = ?,
              Наличие = 0,
              Дата_продажи = ?
            WHERE ID = ?
          `).run(repairId, priceUah, profit, delphiDateSold, partId);
        } else {
          // Manual entry (new item)
          const profit = priceUah - (costUah || 0);
          const delphiDateArrival = toDelphiDate(new Date().toISOString());
          const delphiDateSold = isPaid && dateEnd ? toDelphiDate(dateEnd) : null;

          db.prepare(`
            INSERT INTO Расходники (
              Наименование_расходника, Цена_уе, Курс, Вход, Сумма, Доход, Наличие,
              Поставщик, Приход, Дата_продажи, Квитанция
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            name,
            0, // priceUsd
            0, // exchangeRate
            costUah || 0,
            priceUah,
            profit,
            0, // inStock (sold)
            supplier,
            delphiDateArrival,
            delphiDateSold,
            repairId
          );
        }

        // Update repair total cost: costLabor + sum of all parts
        const parts = db.prepare(`
          SELECT Сумма as priceUah
          FROM Расходники
          WHERE Квитанция = ?
        `).all(repairId) as any[];

        const partsTotal = parts.reduce((sum, part) => sum + (part.priceUah || 0), 0);
        const costLabor = repair.Стоимость || 0;
        const newTotalCost = costLabor + partsTotal;

        // Update repair total cost
        db.prepare(`
          UPDATE Ремонт
          SET Сумма = ?
          WHERE ID = ?
        `).run(newTotalCost, repairId);

        res.json({ success: true });
      } catch (error: any) {
        console.error('Error adding part to repair:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // DELETE /api/repairs/:id/parts/:partId - Remove part from repair
    app.delete('/api/repairs/:id/parts/:partId', (req: any, res: any) => {
      try {
        const db = getDb();
        const repairId = parseInt(req.params.id, 10);
        const partId = parseInt(req.params.partId, 10);

        // Get repair to check if it exists
        const repair = db.prepare('SELECT * FROM Ремонт WHERE ID = ?').get(repairId) as any;
        if (!repair) {
          return res.status(404).json({ error: 'Repair not found' });
        }

        // Get part to check if it exists and belongs to this repair
        const part = db.prepare('SELECT * FROM Расходники WHERE ID = ?').get(partId) as any;
        if (!part) {
          return res.status(404).json({ error: 'Part not found' });
        }

        if (part.Квитанция !== repairId) {
          return res.status(400).json({ error: 'Part does not belong to this repair' });
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

        // Update repair total cost: costLabor + sum of all remaining parts
        const parts = db.prepare(`
          SELECT Сумма as priceUah
          FROM Расходники
          WHERE Квитанция = ?
        `).all(repairId) as any[];

        const partsTotal = parts.reduce((sum, part) => sum + (part.priceUah || 0), 0);
        const costLabor = repair.Стоимость || 0;
        const newTotalCost = costLabor + partsTotal;

        // Update repair total cost
        db.prepare(`
          UPDATE Ремонт
          SET Сумма = ?
          WHERE ID = ?
        `).run(newTotalCost, repairId);

        res.json({ success: true });
      } catch (error: any) {
        console.error('Error removing part from repair:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // ========== TRANSACTIONS ENDPOINTS ==========

    // GET /api/transactions - List transactions
    app.get('/api/transactions', (req: any, res: any) => {
      try {
        const db = getDb();
        const {
          startDate = null,
          endDate = null,
          category = null,
          paymentType = null,
          search = '',
        } = req.query;

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
          params.push(toDelphiDate(startDate as string));
        }

        if (endDate) {
          query += ` AND Дата_виконання <= ?`;
          const date = new Date(endDate as string);
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
          dateExecuted: toJsDate(t.dateExecuted),
        }));

        res.json({ data: transactions });
      } catch (error: any) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // ========== EXECUTORS ENDPOINTS ==========

    // GET /api/executors - List executors
    app.get('/api/executors', (_req: any, res: any) => {
      try {
        const db = getDb();
        const executors = db.prepare('SELECT ID as id, Name as name, SalaryPercent as salaryPercent FROM Executors').all();
        res.json({ data: executors });
      } catch (error: any) {
        console.error('Error fetching executors:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // ========== SUPPLIERS ENDPOINTS ==========

    // GET /api/suppliers - List suppliers
    app.get('/api/suppliers', (_req: any, res: any) => {
      try {
        const db = getDb();
        const suppliers = db.prepare('SELECT ID as id, Name as name FROM Suppliers ORDER BY Name').all();
        res.json({ data: suppliers });
      } catch (error: any) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // ========== STATUS COUNTS ENDPOINT ==========

    // GET /api/status-counts - Get repair status counts
    app.get('/api/status-counts', (_req: any, res: any) => {
      try {
        const db = getDb();
        const counts = db.prepare(`
          SELECT 
            Состояние as status,
            COUNT(*) as count
          FROM Ремонт
          GROUP BY Состояние
        `).all() as Array<{ status: string; count: number }>;

        const result: Record<string, number> = {};
        counts.forEach(({ status, count }) => {
          result[status] = count;
        });

        res.json({ data: result });
      } catch (error: any) {
        console.error('Error fetching status counts:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // ========== BALANCES ENDPOINT ==========

    // GET /api/balances - Get cash register balances
    app.get('/api/balances', (_req: any, res: any) => {
      try {
        const db = getDb();
        const lastTransaction = db.prepare(`
          SELECT Готівка as cash, Карта as card
          FROM Каса
          ORDER BY ID DESC
          LIMIT 1
        `).get() as { cash: number; card: number } | undefined;

        if (!lastTransaction) {
          return res.json({ data: { cash: 0, card: 0 } });
        }

        res.json({ data: { cash: lastTransaction.cash, card: lastTransaction.card } });
      } catch (error: any) {
        console.error('Error fetching balances:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // ========== NEXT RECEIPT ID ENDPOINT ==========

    // GET /api/next-receipt-id - Get next receipt ID
    app.get('/api/next-receipt-id', (_req: any, res: any) => {
      try {
        const db = getDb();
        const result = db.prepare('SELECT MAX(Квитанция) as maxId FROM Ремонт').get() as { maxId: number | null };
        const nextId = (result?.maxId || 0) + 1;
        res.json({ data: { nextReceiptId: nextId } });
      } catch (error: any) {
        console.error('Error fetching next receipt ID:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // ========== LOCKS ENDPOINTS ==========

    // GET /api/locks/:id - Check lock status for a repair
    app.get('/api/locks/:id', (req: any, res: any) => {
      try {
        const db = getDb();
        const id = parseInt(req.params.id, 10);
        const lock = db.prepare('SELECT * FROM SyncLocks WHERE RecordID = ?').get(id) as any;

        if (lock) {
          res.json({ locked: true, device: lock.DeviceName, time: lock.LockTime });
        } else {
          res.json({ locked: false });
        }
      } catch (error: any) {
        console.error('Error checking lock:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // POST /api/locks/:id - Set lock for a repair
    app.post('/api/locks/:id', (req: any, res: any) => {
      try {
        const db = getDb();
        const id = parseInt(req.params.id, 10);
        const { device } = req.body;

        // Check if already locked by another device
        const existingLock = db.prepare('SELECT * FROM SyncLocks WHERE RecordID = ?').get(id) as any;
        if (existingLock && existingLock.DeviceName !== device) {
          return res.status(409).json({
            success: false,
            error: 'Already locked',
            device: existingLock.DeviceName,
            time: existingLock.LockTime
          });
        }

        // Delete existing lock and create new one
        db.prepare('DELETE FROM SyncLocks WHERE RecordID = ?').run(id);
        db.prepare('INSERT INTO SyncLocks (RecordID, DeviceName) VALUES (?, ?)').run(id, device || 'Android');

        res.json({ success: true });
      } catch (error: any) {
        console.error('Error setting lock:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // DELETE /api/locks/:id - Release lock for a repair
    app.delete('/api/locks/:id', (req: any, res: any) => {
      try {
        const db = getDb();
        const id = parseInt(req.params.id, 10);

        db.prepare('DELETE FROM SyncLocks WHERE RecordID = ?').run(id);

        res.json({ success: true });
      } catch (error: any) {
        console.error('Error releasing lock:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Configure Express to trust proxy (for accurate IP detection)
    app.set('trust proxy', true);

    // Start server on all interfaces (0.0.0.0) to allow connections from other devices
    server = app.listen(port, '0.0.0.0', () => {
      console.log(`Sync server running on port ${port}`);
      console.log(`Server accessible at: http://localhost:${port}`);
    });

    serverPort = port;

    return { success: true, port };
  } catch (error: any) {
    console.error('Error starting sync server:', error);
    return { success: false, error: error.message };
  }
}

export function stopSyncServer(): { success: boolean; error?: string } {
  if (!server) {
    return { success: false, error: 'Server is not running' };
  }

  try {
    // Clear active clients tracking
    activeClients.clear();

    server.close();
    server = null;
    return { success: true };
  } catch (error: any) {
    console.error('Error stopping sync server:', error);
    return { success: false, error: error.message };
  }
}

export function getSyncServerStatus(): { running: boolean; port?: number; ipAddresses?: string[]; activeConnections?: number } {
  if (!server) {
    return { running: false, activeConnections: 0 };
  }

  // Clean up inactive clients before counting
  const now = Date.now();
  const timeout = now - CLIENT_TIMEOUT;
  for (const [ip, lastActivity] of activeClients.entries()) {
    if (lastActivity < timeout) {
      activeClients.delete(ip);
    }
  }

  const addresses = getLocalIPAddresses();
  return {
    running: true,
    port: serverPort,
    ipAddresses: addresses,
    activeConnections: activeClients.size,
  };
}

export function getLocalIPAddresses(): string[] {
  const interfaces = networkInterfaces();
  const addresses: string[] = [];

  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name];
    if (!nets) continue;

    for (const net of nets) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }

  return addresses;
}

