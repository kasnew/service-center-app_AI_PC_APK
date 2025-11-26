import { ipcMain } from 'electron';
import { getDb } from './database';

// Database stores dates as Julian Day Numbers (JDN).
// Unix Epoch (1970-01-01T00:00:00Z) is JDN 2440587.5
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

export function registerIpcHandlers() {
  ipcMain.handle('get-repairs', async (_event, args) => {
    const { page = 1, limit = 50, search = '', status = null, shouldCall = false } = args;
    const db = getDb();
    const offset = (page - 1) * limit;

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
        Перезвонить as shouldCall
      FROM Ремонт
      WHERE 1=1
    `;

    const params: any[] = [];

    if (shouldCall) {
      query += ` AND Перезвонить = 1`;
    }

    if (search) {
      query += ` AND (Имя_заказчика LIKE ? OR Телефон LIKE ? OR Квитанция LIKE ? OR Наименование_техники LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
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

    query += ` ORDER BY Квитанция DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const repairs = db.prepare(query).all(...params).map((r: any) => ({
      ...r,
      dateStart: toJsDate(r.dateStart),
      dateEnd: toJsDate(r.dateEnd),
    }));

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as count FROM Ремонт WHERE 1=1`;
    const countParams: any[] = [];

    if (shouldCall) {
      countQuery += ` AND Перезвонить = 1`;
    }

    if (search) {
      countQuery += ` AND (Имя_заказчика LIKE ? OR Телефон LIKE ? OR Квитанция LIKE ? OR Наименование_техники LIKE ?)`;
      const term = `%${search}%`;
      countParams.push(term, term, term, term);
    }

    if (status) {
      if (Array.isArray(status)) {
        if (status.length > 0) {
          const placeholders = status.map(() => '?').join(',');
          countQuery += ` AND Состояние IN (${placeholders})`;
          countParams.push(...status);
        }
      } else {
        countQuery += ` AND Состояние = ?`;
        countParams.push(status);
      }
    }

    const total = (db.prepare(countQuery).get(...countParams) as any).count;

    return { repairs, total, page, totalPages: Math.ceil(total / limit) };
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
        Перезвонить as shouldCall
      FROM Ремонт
      WHERE ID = ?
    `).get(id) as any;

    if (!repair) return null;

    // Convert dates
    repair.dateStart = toJsDate(repair.dateStart);
    repair.dateEnd = toJsDate(repair.dateEnd);

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
      shouldCall
    } = repairData;

    // Convert JS dates back to Delphi format
    const delphiDateStart = toDelphiDate(dateStart);
    const delphiDateEnd = toDelphiDate(dateEnd);

    if (id) {
      // Update existing repair
      const stmt = db.prepare(`
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
          Перезвонить = ?
        WHERE ID = ?
      `);

      stmt.run(
        receiptId,
        deviceName,
        faultDesc,
        workDone || '',
        costLabor || 0,
        totalCost || 0,
        isPaid ? 1 : 0,
        status,
        clientName,
        clientPhone,
        profit || 0,
        delphiDateStart,
        delphiDateEnd,
        note || '',
        shouldCall ? 1 : 0,
        id
      );

      return { id, receiptId };
    } else {
      // Insert new repair
      const stmt = db.prepare(`
        INSERT INTO Ремонт (
          Квитанция,
          Наименование_техники,
          Описание_неисправности,
          Выполнено,
          Стоимость,
          Сумма,
          Оплачено,
          Состояние,
          Имя_заказчика,
          Телефон,
          Доход,
          Начало_ремонта,
          Конец_ремонта,
          Примечание,
          Перезвонить
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        receiptId,
        deviceName,
        faultDesc,
        workDone || '',
        costLabor || 0,
        totalCost || 0,
        isPaid ? 1 : 0,
        status,
        clientName,
        clientPhone,
        profit || 0,
        delphiDateStart,
        delphiDateEnd,
        note || '',
        shouldCall ? 1 : 0
      );

      return { id: result.lastInsertRowid, receiptId };
    }
  });

  // Get next available receipt ID
  ipcMain.handle('get-next-receipt-id', async () => {
    const db = getDb();
    const result = db.prepare('SELECT MAX(Квитанция) as maxId FROM Ремонт').get() as any;
    return (result.maxId || 0) + 1;
  });

  // Delete repair
  ipcMain.handle('delete-repair', async (_event, id) => {
    const db = getDb();
    // First delete associated parts
    db.prepare('DELETE FROM Расходники WHERE Квитанция = ?').run(id);
    // Then delete the repair
    db.prepare('DELETE FROM Ремонт WHERE ID = ?').run(id);
    return { success: true };
  });
}
