const Database = require('better-sqlite3');
const path = require('path');

// Path to the database
const dbPath = path.join(process.cwd(), 'base.sqlite');

try {
    const db = new Database(dbPath, { verbose: console.log });
    console.log('Successfully connected to database');

    // List all tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables:', tables.map(t => t.name).join(', '));

    // Example check
    if (tables.some(t => t.name === 'Ремонт')) {
        const count = db.prepare('SELECT COUNT(*) as count FROM Ремонт').get().count;
        console.log(`Number of repairs: ${count}`);
    }

} catch (err) {
    console.error('Error connecting to database:', err);
}
