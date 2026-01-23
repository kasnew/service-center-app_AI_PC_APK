import Database from 'better-sqlite3';
import path from 'node:path';
import { app, dialog } from 'electron';
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
    const DB_VERSION = 1;

    try {
        db = new Database(dbPath, { verbose: console.log });
        db.pragma('journal_mode = WAL');
        db.pragma('synchronous = NORMAL');

        // Check database version
        const currentVersion = db.pragma('user_version', { simple: true }) as number;

        if (currentVersion < DB_VERSION && fs.existsSync(dbPath)) {
            console.log(`Database version mismatch: current ${currentVersion}, target ${DB_VERSION}`);

            // Warn user and perform migration
            const choice = dialog.showMessageBoxSync({
                type: 'info',
                title: 'Оновлення бази даних',
                message: 'Доступна нова версія структури бази даних.',
                detail: 'Програма виконає оновлення та створить резервну копію перед початком. Це займе кілька секунд.',
                buttons: ['Оновити', 'Вийти'],
                defaultId: 0,
                cancelId: 1
            });

            if (choice === 1) {
                app.quit();
                process.exit(0);
            }

            // Perform backup
            try {
                const { createSimpleBackupSync } = require('./backup');
                const backupPath = createSimpleBackupSync();
                console.log('Migration backup created:', backupPath);
            } catch (backupError) {
                console.error('Failed to create migration backup:', backupError);
                const confirm = dialog.showMessageBoxSync({
                    type: 'warning',
                    title: 'Помилка бекапу',
                    message: 'Не вдалося створити резервну копію. Продовжити оновлення без бекапу?',
                    buttons: ['Так', 'Ні'],
                    defaultId: 1
                });
                if (confirm === 1) {
                    app.quit();
                    process.exit(0);
                }
            }
        }

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

        const executorCount = db.prepare('SELECT COUNT(*) as count FROM Executors').get() as { count: number };
        if (executorCount.count === 0) {
            db.prepare('INSERT INTO Executors (Name, SalaryPercent, ProductsPercent) VALUES (?, ?, ?)').run('Андрій', 100.0, 100.0);
        }

        // Ad-hoc migrations (keeping them for safety, but integrated into the flow)
        try {
            const executorTableInfo = db.prepare('PRAGMA table_info(Executors)').all() as Array<{ name: string }>;
            if (!executorTableInfo.some(col => col.name === 'ProductsPercent')) {
                db.prepare('ALTER TABLE Executors ADD COLUMN ProductsPercent REAL NOT NULL DEFAULT 0').run();
                db.prepare('UPDATE Executors SET ProductsPercent = 100.0 WHERE Name = ?').run('Андрій');
            }
        } catch (e) { }

        try {
            const executorTableInfo = db.prepare('PRAGMA table_info(Executors)').all() as Array<{ name: string }>;
            if (!executorTableInfo.some(col => col.name === 'Password')) {
                db.prepare('ALTER TABLE Executors ADD COLUMN Password TEXT').run();
            }
            if (!executorTableInfo.some(col => col.name === 'Role')) {
                db.prepare("ALTER TABLE Executors ADD COLUMN Role TEXT DEFAULT 'worker'").run();
                db.prepare("UPDATE Executors SET Role = 'admin' WHERE ID = (SELECT MIN(ID) FROM Executors)").run();
            }
        } catch (e) { }

        try {
            const tableInfo = db.prepare('PRAGMA table_info(Ремонт)').all() as Array<{ name: string }>;
            if (!tableInfo.some(col => col.name === 'Виконавець')) {
                db.prepare('ALTER TABLE Ремонт ADD COLUMN Виконавець TEXT DEFAULT \'Андрій\'').run();
            }
            if (!tableInfo.some(col => col.name === 'ТипОплати')) {
                db.prepare('ALTER TABLE Ремонт ADD COLUMN ТипОплати TEXT DEFAULT \'Готівка\'').run();
            }
        } catch (e) { }

        try {
            const tableInfo = db.prepare('PRAGMA table_info(Расходники)').all() as Array<{ name: string }>;
            if (!tableInfo.some(col => col.name === 'ШтрихКод')) {
                db.prepare('ALTER TABLE Расходники ADD COLUMN ШтрихКод TEXT').run();
            }
        } catch (e) { }

        db.prepare(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `).run();

        db.prepare(`
            CREATE TABLE IF NOT EXISTS КатегоріїВитрат (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Назва TEXT NOT NULL UNIQUE,
                Активна INTEGER DEFAULT 1
            )
        `).run();

        db.prepare(`
            CREATE TABLE IF NOT EXISTS КатегоріїПрибутків (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                Назва TEXT NOT NULL UNIQUE,
                Активна INTEGER DEFAULT 1
            )
        `).run();

        const incomeCategoryCount = db.prepare('SELECT COUNT(*) as count FROM КатегоріїПрибутків').get() as { count: number };
        if (incomeCategoryCount.count === 0) {
            const initialIncomeCategories = ['Ремонт', 'Продаж товару', 'Інший дохід'];
            const insertIncomeCategory = db.prepare('INSERT OR IGNORE INTO КатегоріїПрибутків (Назва) VALUES (?)');
            initialIncomeCategories.forEach(name => {
                insertIncomeCategory.run(name);
            });
        }

        db.prepare(`
            CREATE TABLE IF NOT EXISTS SyncLocks (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                RecordID INTEGER,
                DeviceName TEXT,
                LockTime DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `).run();

        const tablesToUpdate = ['Ремонт', 'Каса', 'Расходники'];
        tablesToUpdate.forEach(tableName => {
            try {
                if (!db) return;
                const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
                if (!tableInfo.some(col => col.name === 'UpdateTimestamp')) {
                    db.prepare(`ALTER TABLE ${tableName} ADD COLUMN UpdateTimestamp TEXT`).run();
                    db.prepare(`UPDATE ${tableName} SET UpdateTimestamp = datetime('now')`).run();
                }
            } catch (e) { }
        });

        // PERFORMANCE INDEXES
        db.prepare('CREATE INDEX IF NOT EXISTS idx_remont_kvitancia ON Ремонт(Квитанция)').run();
        db.prepare('CREATE INDEX IF NOT EXISTS idx_remont_phone ON Ремонт(Телефон)').run();
        db.prepare('CREATE INDEX IF NOT EXISTS idx_remont_status_kvit ON Ремонт(Состояние, Квитанция)').run();
        db.prepare('CREATE INDEX IF NOT EXISTS idx_remont_executor_kvit ON Ремонт(Виконавець, Квитанция)').run();
        db.prepare('CREATE INDEX IF NOT EXISTS idx_remont_shouldcall_kvit ON Ремонт(Перезвонить, Квитанция)').run();
        db.prepare('CREATE INDEX IF NOT EXISTS idx_remont_start ON Ремонт(Начало_ремонта)').run();
        db.prepare('CREATE INDEX IF NOT EXISTS idx_rashodniki_kvitancia ON Расходники(Квитанция)').run();
        db.prepare('CREATE INDEX IF NOT EXISTS idx_rashodniki_barcode ON Расходники(ШтрихКод)').run();

        // Finalize version update
        if (currentVersion < DB_VERSION) {
            db.pragma(`user_version = ${DB_VERSION}`);
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
