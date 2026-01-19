import Database from 'better-sqlite3';
import path from 'node:path';
import { app } from 'electron';
import fs from 'fs';

let db: Database.Database | null = null;
let dbPath: string = '';

export function initDatabase() {
    // For development, we use the file in the project root.
    dbPath = path.join(process.cwd(), 'base.sqlite');

    if (app.isPackaged) {
        // In production, try to find database in the same directory as the AppImage
        // This allows portable usage when database is in the same folder

        // For AppImage, APPIMAGE env variable contains the path to the AppImage file
        // For other executables, use process.execPath
        let appImagePath: string | undefined;

        if (process.env.APPIMAGE) {
            // Running as AppImage
            appImagePath = process.env.APPIMAGE;
        } else {
            // Running as regular executable
            appImagePath = process.execPath;
        }

        const appImageDir = appImagePath ? path.dirname(appImagePath) : process.cwd();

        // Try multiple locations in order of priority:
        // 1. Same directory as AppImage (for portable use)
        // 2. userData directory (default Electron location)

        const portablePath = path.join(appImageDir, 'base.sqlite');
        const userDataPath = path.join(app.getPath('userData'), 'base.sqlite');

        // Check if database exists in AppImage directory (portable mode)
        if (fs.existsSync(portablePath)) {
            dbPath = portablePath;
            console.log('Using portable database from AppImage directory:', dbPath);
        } else {
            // Use userData directory
            dbPath = userDataPath;
            console.log('Using userData directory for database:', dbPath);

            // Ensure userData directory exists
            const userDataDir = app.getPath('userData');
            if (!fs.existsSync(userDataDir)) {
                fs.mkdirSync(userDataDir, { recursive: true });
            }
        }
    }

    console.log('Database path:', dbPath);

    try {
        db = new Database(dbPath, { verbose: console.log });
        db.pragma('journal_mode = WAL');
        db.pragma('synchronous = NORMAL');

        // Create Suppliers table
        db.prepare(`
            CREATE TABLE IF NOT EXISTS Suppliers (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT UNIQUE NOT NULL
            )
        `).run();

        // Populate initial suppliers ONLY if table is empty
        const supplierCount = db.prepare('SELECT COUNT(*) as count FROM Suppliers').get() as { count: number };

        if (supplierCount.count === 0) {
            const initialSuppliers = ['ARC', 'DFI', 'Послуга', 'Чипзона'];
            const insertSupplier = db.prepare('INSERT OR IGNORE INTO Suppliers (Name) VALUES (?)');

            initialSuppliers.forEach(name => {
                insertSupplier.run(name);
            });
        }

        // Import existing suppliers from Warehouse items
        // We only import those that are not null/empty and not already in the list
        db.prepare(`
            INSERT OR IGNORE INTO Suppliers (Name)
            SELECT DISTINCT Поставщик
            FROM Расходники
            WHERE Поставщик IS NOT NULL AND Поставщик != ''
        `).run();

        // Create Executors table
        db.prepare(`
            CREATE TABLE IF NOT EXISTS Executors (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT UNIQUE NOT NULL,
                SalaryPercent REAL NOT NULL DEFAULT 0,
                ProductsPercent REAL NOT NULL DEFAULT 0
            )
        `).run();

        // Populate initial executor ONLY if table is empty
        const executorCount = db.prepare('SELECT COUNT(*) as count FROM Executors').get() as { count: number };

        if (executorCount.count === 0) {
            db.prepare('INSERT INTO Executors (Name, SalaryPercent, ProductsPercent) VALUES (?, ?, ?)').run('Андрій', 100.0, 100.0);
        }

        // Add ProductsPercent column if it doesn't exist (migration for existing databases)
        try {
            const executorTableInfo = db.prepare('PRAGMA table_info(Executors)').all() as Array<{ name: string }>;
            const hasProductsPercent = executorTableInfo.some(col => col.name === 'ProductsPercent');

            if (!hasProductsPercent) {
                db.prepare('ALTER TABLE Executors ADD COLUMN ProductsPercent REAL NOT NULL DEFAULT 0').run();
                // Set Андрій's ProductsPercent to 100 by default
                db.prepare('UPDATE Executors SET ProductsPercent = 100.0 WHERE Name = ?').run('Андрій');
                console.log('Added ProductsPercent column to Executors table');
            }
        } catch (error) {
            console.error('Error adding ProductsPercent column:', error);
        }

        // Add Password and Role columns for web authentication (migration)
        try {
            const executorTableInfo = db.prepare('PRAGMA table_info(Executors)').all() as Array<{ name: string }>;
            const hasPassword = executorTableInfo.some(col => col.name === 'Password');
            const hasRole = executorTableInfo.some(col => col.name === 'Role');

            if (!hasPassword) {
                db.prepare('ALTER TABLE Executors ADD COLUMN Password TEXT').run();
                console.log('Added Password column to Executors table');
            }
            if (!hasRole) {
                db.prepare("ALTER TABLE Executors ADD COLUMN Role TEXT DEFAULT 'worker'").run();
                // Set first executor as admin
                db.prepare("UPDATE Executors SET Role = 'admin' WHERE ID = (SELECT MIN(ID) FROM Executors)").run();
                console.log('Added Role column to Executors table');
            }
        } catch (error) {
            console.error('Error adding auth columns to Executors:', error);
        }

        // Add Виконавець column to Ремонт table if it doesn't exist
        try {
            // Check if column exists
            const tableInfo = db.prepare('PRAGMA table_info(Ремонт)').all() as Array<{ name: string }>;
            const hasExecutorColumn = tableInfo.some(col => col.name === 'Виконавець');

            if (!hasExecutorColumn) {
                db.prepare('ALTER TABLE Ремонт ADD COLUMN Виконавець TEXT DEFAULT \'Андрій\'').run();
                console.log('Added Виконавець column to Ремонт table');
            }
        } catch (error) {
            console.error('Error adding Виконавець column:', error);
        }

        // Add ТипОплати column to Ремонт table if it doesn't exist
        try {
            const tableInfo = db.prepare('PRAGMA table_info(Ремонт)').all() as Array<{ name: string }>;
            const hasPaymentTypeColumn = tableInfo.some(col => col.name === 'ТипОплати');

            if (!hasPaymentTypeColumn) {
                db.prepare('ALTER TABLE Ремонт ADD COLUMN ТипОплати TEXT DEFAULT \'Готівка\'').run();
                console.log('Added ТипОплати column to Ремонт table');
            }
        } catch (error) {
            console.error('Error adding ТипОплати column:', error);
        }

        // Add ШтрихКод column to Расходники table if it doesn't exist
        try {
            const tableInfo = db.prepare('PRAGMA table_info(Расходники)').all() as Array<{ name: string }>;
            const hasBarcodeColumn = tableInfo.some(col => col.name === 'ШтрихКод');

            if (!hasBarcodeColumn) {
                db.prepare('ALTER TABLE Расходники ADD COLUMN ШтрихКод TEXT').run();
                console.log('Added ШтрихКод column to Расходники table');
            }
        } catch (error) {
            console.error('Error adding ШтрихКод column:', error);
        }

        // Create settings table
        db.prepare(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `).run();

        // Create expense categories table if it doesn't exist
        db.prepare(`
            CREATE TABLE IF NOT EXISTS КатегоріїВитрат (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Назва TEXT NOT NULL UNIQUE,
                Активна INTEGER DEFAULT 1
            )
        `).run();

        // Create income categories table if it doesn't exist
        db.prepare(`
            CREATE TABLE IF NOT EXISTS КатегоріїПрибутків (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Назва TEXT NOT NULL UNIQUE,
                Активна INTEGER DEFAULT 1
            )
        `).run();

        // Populate initial income categories ONLY if table is empty
        const incomeCategoryCount = db.prepare('SELECT COUNT(*) as count FROM КатегоріїПрибутків').get() as { count: number };
        if (incomeCategoryCount.count === 0) {
            const initialIncomeCategories = ['Ремонт', 'Продаж товару', 'Інший дохід'];
            const insertIncomeCategory = db.prepare('INSERT OR IGNORE INTO КатегоріїПрибутків (Назва) VALUES (?)');
            initialIncomeCategories.forEach(name => {
                insertIncomeCategory.run(name);
            });
        }

        // Create SyncLocks table
        db.prepare(`
            CREATE TABLE IF NOT EXISTS SyncLocks (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                RecordID INTEGER,
                DeviceName TEXT,
                LockTime DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();

        // Add UpdateTimestamp columns
        const tablesToUpdate = ['Ремонт', 'Каса', 'Расходники'];
        tablesToUpdate.forEach(tableName => {
            try {
                if (!db) return;
                const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
                const hasUpdateTimestamp = tableInfo.some(col => col.name === 'UpdateTimestamp');
                if (!hasUpdateTimestamp) {
                    db.prepare(`ALTER TABLE ${tableName} ADD COLUMN UpdateTimestamp TEXT`).run();
                    db.prepare(`UPDATE ${tableName} SET UpdateTimestamp = datetime('now')`).run();
                    console.log(`Added UpdateTimestamp column to ${tableName} table`);
                }
            } catch (error) {
                console.error(`Error adding UpdateTimestamp to ${tableName}:`, error);
            }
        });

        // PERFORMANCE INDEXES for actual database
        db.prepare('CREATE INDEX IF NOT EXISTS idx_remont_kvitancia ON Ремонт(Квитанция)').run();
        db.prepare('CREATE INDEX IF NOT EXISTS idx_remont_phone ON Ремонт(Телефон)').run();
        db.prepare('CREATE INDEX IF NOT EXISTS idx_remont_status ON Ремонт(Состояние)').run();
        db.prepare('CREATE INDEX IF NOT EXISTS idx_remont_start ON Ремонт(Начало_ремонта)').run();
        db.prepare('CREATE INDEX IF NOT EXISTS idx_rashodniki_kvitancia ON Расходники(Квитанция)').run();
        db.prepare('CREATE INDEX IF NOT EXISTS idx_rashodniki_barcode ON Расходники(ШтрихКод)').run();

        return true;
    } catch (error) {
        console.error('Failed to initialize database:', error);
        return false;
    }
}

export function getDb() {
    if (!db) {
        throw new Error('Database not initialized');
    }
    return db;
}

export function getDbPath(): string {
    return dbPath;
}

export function closeDb(): void {
    if (db) {
        db.close();
        db = null;
    }
}

export function reopenDb(): boolean {
    closeDb();
    return initDatabase();
}
