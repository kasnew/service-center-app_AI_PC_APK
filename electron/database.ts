import Database from 'better-sqlite3';
import path from 'node:path';
import { app } from 'electron';

let db: Database.Database | null = null;

export function initDatabase() {
    // For development, we use the file in the project root.
    // In production, we should copy it to userData.
    let dbPath = path.join(process.cwd(), '1.sqlite');

    if (app.isPackaged) {
        dbPath = path.join(app.getPath('userData'), '1.sqlite');
        // Copy if not exists (logic to be added for production)
    }

    console.log('Database path:', dbPath);

    try {
        db = new Database(dbPath, { verbose: console.log });
        db.pragma('journal_mode = WAL');
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
