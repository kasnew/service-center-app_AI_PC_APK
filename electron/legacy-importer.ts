import Database from 'better-sqlite3';
import { getDb } from './database';

export interface LegacyValidationResult {
    isValid: boolean;
    error?: string;
    stats?: {
        repairs: number;
        parts: number;
        transactions: number;
        notes: number;
    };
}

export interface ImportProgress {
    stage: string;
    current: number;
    total: number;
}

/**
 * Валідує legacy базу даних і повертає статистику
 */
export function validateLegacyDatabase(legacyDbPath: string): LegacyValidationResult {
    let legacyDb: Database.Database | null = null;

    try {
        // Перевіряємо чи існує файл
        legacyDb = new Database(legacyDbPath, { readonly: true });

        // Перевіряємо наявність необхідних таблиць
        const tables = legacyDb
            .prepare("SELECT name FROM sqlite_master WHERE type='table'")
            .all() as Array<{ name: string }>;

        const tableNames = tables.map(t => t.name);
        const requiredTables = ['Ремонт', 'Расходники', 'Каса'];

        for (const tableName of requiredTables) {
            if (!tableNames.includes(tableName)) {
                return {
                    isValid: false,
                    error: `Відсутня необхідна таблиця: ${tableName}`,
                };
            }
        }

        // Підраховуємо записи
        const repairs = (
            legacyDb.prepare('SELECT COUNT(*) as count FROM Ремонт').get() as { count: number }
        ).count;
        const parts = (
            legacyDb.prepare('SELECT COUNT(*) as count FROM Расходники').get() as { count: number }
        ).count;
        const transactions = (
            legacyDb.prepare('SELECT COUNT(*) as count FROM Каса').get() as { count: number }
        ).count;
        const notes = (
            legacyDb.prepare('SELECT COUNT(*) as count FROM Заметки').get() as { count: number }
        ).count;

        return {
            isValid: true,
            stats: {
                repairs,
                parts,
                transactions,
                notes,
            },
        };
    } catch (error) {
        return {
            isValid: false,
            error: `Помилка читання БД: ${error instanceof Error ? error.message : String(error)}`,
        };
    } finally {
        if (legacyDb) {
            legacyDb.close();
        }
    }
}

/**
 * Імпортує дані з legacy БД з повною заміною поточних даних
 */
export function importLegacyDatabase(
    legacyDbPath: string,
    onProgress?: (progress: ImportProgress) => void
): { success: boolean; error?: string; imported?: { repairs: number; parts: number; transactions: number; notes: number } } {
    let legacyDb: Database.Database | null = null;

    try {
        const currentDb = getDb();
        legacyDb = new Database(legacyDbPath, { readonly: true });

        // Починаємо транзакцію
        const importTransaction = currentDb.transaction(() => {
            // Етап 1: Очищення поточних даних
            onProgress?.({ stage: 'Очищення поточних даних', current: 0, total: 4 });

            currentDb.prepare('DELETE FROM Расходники').run();
            currentDb.prepare('DELETE FROM Ремонт').run();
            currentDb.prepare('DELETE FROM Каса').run();
            currentDb.prepare('DELETE FROM Заметки').run();

            // Скидаємо автоінкремент
            currentDb.prepare("DELETE FROM sqlite_sequence WHERE name IN ('Ремонт', 'Расходники', 'Каса', 'Заметки')").run();

            // Етап 2: Імпорт ремонтів
            onProgress?.({ stage: 'Імпорт ремонтів', current: 1, total: 4 });

            const legacyRepairs = legacyDb!.prepare('SELECT * FROM Ремонт').all() as Array<any>;
            const insertRepair = currentDb.prepare(`
                INSERT INTO Ремонт (
                    ID, Наименование_техники, Описание_неисправности, Выполнено,
                    Стоимость, Начало_ремонта, Конец_ремонта, Квитанция,
                    Имя_заказчика, Телефон, Сумма, Оплачено, Примечание,
                    Перезвонить, Доход, Состояние, Виконавець
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (const repair of legacyRepairs) {
                insertRepair.run(
                    repair.ID,
                    repair['Наименование_техники'],
                    repair['Описание_неисправности'],
                    repair['Выполнено'],
                    repair['Стоимость'],
                    repair['Начало_ремонта'],
                    repair['Конец_ремонта'],
                    repair['Квитанция'],
                    repair['Имя_заказчика'],
                    repair['Телефон'],
                    repair['Сумма'],
                    repair['Оплачено'],
                    repair['Примечание'],
                    repair['Перезвонить'],
                    repair['Доход'],
                    repair['Состояние'],
                    repair['Виконавець'] || 'Андрій' // За замовчуванням для legacy записів
                );
            }

            // Етап 3: Імпорт запчастин
            onProgress?.({ stage: 'Імпорт запчастин', current: 2, total: 4 });

            const legacyParts = legacyDb!.prepare('SELECT * FROM Расходники').all() as Array<any>;
            const insertPart = currentDb.prepare(`
                INSERT INTO Расходники (
                    ID, Квитанция, Поставщик, Наименование_расходника, Количество,
                    Цена_грн, Вход, Доход, Сумма, Наличие, Приход, Накладная,
                    Код_товара, Курс, Цена_уе, №_квитанции, Дата_продажи, ТипОплатиПокупки
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (const part of legacyParts) {
                insertPart.run(
                    part.ID,
                    part['Квитанция'],
                    part['Поставщик'],
                    part['Наименование_расходника'],
                    part['Количество'],
                    part['Цена_грн'],
                    part['Вход'],
                    part['Доход'],
                    part['Сумма'],
                    part['Наличие'],
                    part['Приход'],
                    part['Накладная'],
                    part['Код_товара'],
                    part['Курс'],
                    part['Цена_уе'],
                    part['№_квитанции'],
                    part['Дата_продажи'],
                    part['ТипОплатиПокупки'] || 'Картка' // За замовчуванням
                );
            }

            // Етап 4: Імпорт транзакцій каси
            onProgress?.({ stage: 'Імпорт транзакцій', current: 3, total: 4 });

            const legacyTransactions = legacyDb!.prepare('SELECT * FROM Каса').all() as Array<any>;
            const insertTransaction = currentDb.prepare(`
                INSERT INTO Каса (
                    ID, Дата_створення, Дата_виконання, Категорія, Опис,
                    Сума, Готівка, Карта, ВиконавецьID, ВиконавецьІмя,
                    КвитанціяID, ТипОплати, ЗвязанаТранзакціяID
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (const transaction of legacyTransactions) {
                insertTransaction.run(
                    transaction.ID,
                    transaction['Дата_створення'],
                    transaction['Дата_виконання'],
                    transaction['Категорія'],
                    transaction['Опис'],
                    transaction['Сума'],
                    transaction['Готівка'],
                    transaction['Карта'],
                    transaction['ВиконавецьID'] || null,
                    transaction['ВиконавецьІмя'] || null,
                    transaction['КвитанціяID'] || null,
                    transaction['ТипОплати'] || null,
                    transaction['ЗвязанаТранзакціяID'] || null
                );
            }

            // Етап 5: Імпорт заміток (якщо є)
            onProgress?.({ stage: 'Імпорт заміток', current: 4, total: 4 });

            const legacyNotes = legacyDb!.prepare('SELECT * FROM Заметки').all() as Array<any>;
            const insertNote = currentDb.prepare(`
                INSERT INTO Заметки (
                    ID, Дата, Заметка, Выполнено, "Тип заметки"
                ) VALUES (?, ?, ?, ?, ?)
            `);

            for (const note of legacyNotes) {
                insertNote.run(
                    note.ID,
                    note['Дата'],
                    note['Заметка'],
                    note['Выполнено'],
                    note['Тип заметки']
                );
            }

            // Оновлюємо постачальників з імпортованих даних
            currentDb.prepare(`
                INSERT OR IGNORE INTO Suppliers (Name)
                SELECT DISTINCT Поставщик
                FROM Расходники
                WHERE Поставщик IS NOT NULL AND Поставщик != ''
            `).run();

            // Оновлюємо виконавців з імпортованих даних
            currentDb.prepare(`
                INSERT OR IGNORE INTO Executors (Name, SalaryPercent)
                SELECT DISTINCT Виконавець, 100.0
                FROM Ремонт
                WHERE Виконавець IS NOT NULL AND Виконавець != ''
            `).run();

            return {
                repairs: legacyRepairs.length,
                parts: legacyParts.length,
                transactions: legacyTransactions.length,
                notes: legacyNotes.length,
            };
        });

        const imported = importTransaction();

        return {
            success: true,
            imported,
        };
    } catch (error) {
        return {
            success: false,
            error: `Помилка імпорту: ${error instanceof Error ? error.message : String(error)}`,
        };
    } finally {
        if (legacyDb) {
            legacyDb.close();
        }
    }
}
