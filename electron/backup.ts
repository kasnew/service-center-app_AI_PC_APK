import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import { pipeline } from 'stream';
const streamPipeline = promisify(pipeline);
import { getDbPath, closeDb, reopenDb } from './database';
import { getOrCreateEncryptionKey, encryptFile } from './encryption';

export async function createBackup(encrypt: boolean = true, type: 'manual' | 'auto' | 'migration' = 'manual', tag?: string) {
    const dbPath = getDbPath();
    const dbDir = path.dirname(dbPath);
    const typeDir = path.join(dbDir, 'backups', type);

    if (!fs.existsSync(typeDir)) {
        fs.mkdirSync(typeDir, { recursive: true });
    }

    const now = new Date();
    const timestamp = now.toISOString()
        .replace(/:/g, '-')
        .replace(/\..+/, '')
        .replace('T', '_');

    const extension = encrypt ? '.encrypted.gz' : '.sqlite.gz';
    const tagPrefix = tag ? `${tag}_` : '';
    const backupFileName = `${tagPrefix}${type}_${timestamp}${extension}`;
    const backupPath = path.join(typeDir, backupFileName);

    // Close database connection before copying
    closeDb();

    try {
        const tempCompressed = backupPath + '.gz.tmp';

        // 1. Compress first
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

export function createSimpleBackupSync(type: 'migration' = 'migration') {
    const dbPath = getDbPath();
    const dbDir = path.dirname(dbPath);
    const typeDir = path.join(dbDir, 'backups', type);

    if (!fs.existsSync(typeDir)) {
        fs.mkdirSync(typeDir, { recursive: true });
    }

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_before_migration_${timestamp}.sqlite`;
    const backupPath = path.join(typeDir, backupFileName);

    // This is synchronous and simple for migration safety
    fs.copyFileSync(dbPath, backupPath);
    return backupPath;
}
