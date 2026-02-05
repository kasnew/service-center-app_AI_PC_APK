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
        let appImagePath: string | undefined;

        if (process.env.APPIMAGE) {
            appImagePath = process.env.APPIMAGE;
        } else {
            appImagePath = process.execPath;
        }

        const appImageDir = appImagePath ? path.dirname(appImagePath) : process.cwd();

        const portablePath = path.join(appImageDir, 'base.sqlite');
        const userDataPath = path.join(app.getPath('userData'), 'base.sqlite');

        if (fs.existsSync(portablePath)) {
            dbPath = portablePath;
            console.log('Using portable database from AppImage directory:', dbPath);
        } else {
            dbPath = userDataPath;
            console.log('Using userData directory for database:', dbPath);

            const userDataDir = app.getPath('userData');
            if (!fs.existsSync(userDataDir)) {
                fs.mkdirSync(userDataDir, { recursive: true });
            }
        }
    }

    console.log('Database path:', dbPath);
    const DB_VERSION = 3;

    try {
        const database = new Database(dbPath, { verbose: console.log });
        db = database;
        database.pragma('journal_mode = WAL');
        database.pragma('synchronous = NORMAL');

        // Check database version
        let currentVersion = database.pragma('user_version', { simple: true }) as number;
        console.log(`Current DB version: ${currentVersion}, Target version: ${DB_VERSION}`);

        // 1. Ensure core tables exist (Basic schema)
        database.prepare(`
            CREATE TABLE IF NOT EXISTS Suppliers (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT UNIQUE NOT NULL
            )
        `).run();

        database.prepare(`
            CREATE TABLE IF NOT EXISTS Executors (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT UNIQUE NOT NULL,
                SalaryPercent REAL NOT NULL DEFAULT 0,
                ProductsPercent REAL NOT NULL DEFAULT 0,
                Password TEXT,
                Role TEXT DEFAULT 'worker',
                Icon TEXT,
                Color TEXT
            )
        `).run();

        database.prepare(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `).run();

        database.prepare(`
            CREATE TABLE IF NOT EXISTS КатегоріїВитрат (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Назва TEXT NOT NULL UNIQUE,
                Активна INTEGER DEFAULT 1
            )
        `).run();

        database.prepare(`
            CREATE TABLE IF NOT EXISTS КатегоріїПрибутків (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Назва TEXT NOT NULL UNIQUE,
                Активна INTEGER DEFAULT 1
            )
        `).run();

        database.prepare(`
            CREATE TABLE IF NOT EXISTS SyncLocks (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                RecordID INTEGER,
                DeviceName TEXT,
                LockTime DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();

        // 2. Run structured migrations
        if (currentVersion < 1) {
            // Initial data for version 1
            const supplierCount = database.prepare('SELECT COUNT(*) as count FROM Suppliers').get() as { count: number };
            if (supplierCount.count === 0) {
                const initialSuppliers = ['ARC', 'DFI', 'Послуга', 'Чипзона'];
                const insertSupplier = database.prepare('INSERT OR IGNORE INTO Suppliers (Name) VALUES (?)');
                initialSuppliers.forEach(name => insertSupplier.run(name));
            }

            // Sync suppliers from existing warehouse items if any
            try {
                database.prepare(`
                    INSERT OR IGNORE INTO Suppliers (Name)
                    SELECT DISTINCT Поставщик
                    FROM Расходники
                    WHERE Поставщик IS NOT NULL AND Поставщик != ''
                `).run();
            } catch (e) { /* Расходники might not exist yet if fresh install */ }

            const executorCount = database.prepare('SELECT COUNT(*) as count FROM Executors').get() as { count: number };
            if (executorCount.count === 0) {
                database.prepare('INSERT INTO Executors (Name, SalaryPercent, ProductsPercent, Role) VALUES (?, ?, ?, ?)').run('Андрій', 100.0, 100.0, 'admin');
            }

            const incomeCategoryCount = database.prepare('SELECT COUNT(*) as count FROM КатегоріїПрибутків').get() as { count: number };
            if (incomeCategoryCount.count === 0) {
                const initialIncomeCategories = ['Ремонт', 'Продаж товару', 'Інший дохід'];
                const insertIncomeCategory = database.prepare('INSERT OR IGNORE INTO КатегоріїПрибутків (Назва) VALUES (?)');
                initialIncomeCategories.forEach(name => {
                    insertIncomeCategory.run(name);
                });
            }

            // Ensure columns in legacy tables
            try {
                const tableInfo = database.prepare('PRAGMA table_info(Ремонт)').all() as any[];
                if (!tableInfo.some(col => col.name === 'Виконавець')) database.prepare("ALTER TABLE Ремонт ADD COLUMN Виконавець TEXT DEFAULT 'Андрій'").run();
                if (!tableInfo.some(col => col.name === 'ТипОплати')) database.prepare("ALTER TABLE Ремонт ADD COLUMN ТипОплати TEXT DEFAULT 'Готівка'").run();
            } catch (e) { }

            try {
                const tableInfo = database.prepare('PRAGMA table_info(Расходники)').all() as any[];
                if (!tableInfo.some(col => col.name === 'ШтрихКод')) database.prepare("ALTER TABLE Расходники ADD COLUMN ШтрихКод TEXT").run();
            } catch (e) { }

            database.pragma('user_version = 1');
            currentVersion = 1;
        }

        if (currentVersion < 2) {
            console.log('Migrating to version 2: Warehouse Limits & Timestamps');

            // WarehouseLimits migration (ProductCode instead of Name/Supplier)
            try {
                const tableInfo = database.prepare('PRAGMA table_info(WarehouseLimits)').all() as any[];
                const hasProductCode = tableInfo.some(col => col.name === 'ProductCode');

                if (!hasProductCode) {
                    console.log('Recreating WarehouseLimits table for ProductCode tracking...');
                    database.prepare('DROP TABLE IF EXISTS WarehouseLimits').run();
                }
            } catch (e) { }

            database.prepare(`
                CREATE TABLE IF NOT EXISTS WarehouseLimits (
                    ID INTEGER PRIMARY KEY AUTOINCREMENT,
                    ProductCode TEXT NOT NULL UNIQUE,
                    MinQuantity INTEGER NOT NULL DEFAULT 0,
                    UpdateTimestamp TEXT
                )
            `).run();

            // Add UpdateTimestamp to all tracking tables if missing
            const tablesToTrack = ['Ремонт', 'Каса', 'Расходники', 'WarehouseLimits', 'Suppliers', 'Executors', 'КатегоріїВитрат', 'КатегоріїПрибутків'];
            tablesToTrack.forEach(tableName => {
                try {
                    const tableInfo = database.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
                    if (!tableInfo.some(col => col.name === 'UpdateTimestamp')) {
                        database.prepare(`ALTER TABLE ${tableName} ADD COLUMN UpdateTimestamp TEXT`).run();
                        database.prepare(`UPDATE ${tableName} SET UpdateTimestamp = datetime('now')`).run();
                    }
                } catch (e) { }
            });

            database.pragma('user_version = 2');
            currentVersion = 2;
        }

        if (currentVersion < 3) {
            console.log('Migrating to version 3: Executor Icons & Colors');
            try {
                const tableInfo = database.prepare('PRAGMA table_info(Executors)').all() as any[];
                if (!tableInfo.some(col => col.name === 'Icon')) {
                    database.prepare("ALTER TABLE Executors ADD COLUMN Icon TEXT").run();
                }
                if (!tableInfo.some(col => col.name === 'Color')) {
                    database.prepare("ALTER TABLE Executors ADD COLUMN Color TEXT").run();
                }

                // Set defaults for existing executors
                database.prepare("UPDATE Executors SET Icon = 'Cpu', Color = '#3b82f6' WHERE Name LIKE '%андрій%'").run();
                database.prepare("UPDATE Executors SET Icon = 'Zap', Color = '#f59e0b' WHERE Name LIKE '%юрій%'").run();
                database.prepare("UPDATE Executors SET Icon = 'Settings', Color = '#64748b' WHERE Icon IS NULL").run();
            } catch (e) {
                console.error('Migration to v3 failed:', e);
            }
            database.pragma('user_version = 3');
            currentVersion = 3;
        }

        // 3. Indexes for performance (Can run safely every time)
        database.prepare('CREATE INDEX IF NOT EXISTS idx_remont_kvitancia ON Ремонт(Квитанция)').run();
        database.prepare('CREATE INDEX IF NOT EXISTS idx_remont_phone ON Ремонт(Телефон)').run();
        database.prepare('CREATE INDEX IF NOT EXISTS idx_remont_status_kvit ON Ремонт(Состояние, Квитанция)').run();
        database.prepare('CREATE INDEX IF NOT EXISTS idx_remont_executor_kvit ON Ремонт(Виконавець, Квитанция)').run();
        database.prepare('CREATE INDEX IF NOT EXISTS idx_remont_start ON Ремонт(Начало_ремонта)').run();
        database.prepare('CREATE INDEX IF NOT EXISTS idx_rashodniki_kvitancia ON Расходники(Квитанция)').run();
        database.prepare('CREATE INDEX IF NOT EXISTS idx_rashodniki_barcode ON Расходники(ШтрихКод)').run();
        database.prepare('CREATE INDEX IF NOT EXISTS idx_warehouse_limits_code ON WarehouseLimits(ProductCode)').run();

        if (currentVersion < DB_VERSION) {
            database.pragma(`user_version = ${DB_VERSION}`);
            console.log(`Database migrated to version ${DB_VERSION}`);
        }

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
