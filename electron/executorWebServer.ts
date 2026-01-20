import { getDb } from './database';
import { networkInterfaces } from 'os';
import type { Server } from 'http';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database date conversion functions
const JDN_EPOCH = 2440587.5;
const MS_PER_DAY = 86400 * 1000;

// Function to notify main window about data changes
function notifyMainWindow(eventType: string, data?: any) {
    try {
        // Dynamic import to avoid circular dependency
        import('./main').then(({ win }) => {
            if (win && !win.isDestroyed()) {
                win.webContents.send('executor-data-changed', { eventType, data, timestamp: Date.now() });
            }
        }).catch(() => {
            // Ignore errors if main is not available
        });
    } catch (e) {
        // Ignore errors
    }
}


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

// Cash register helpers
function getCashRegisterSettings(db: any) {
    const settings = {
        cardCommissionPercent: 1.5,
        cashRegisterEnabled: false,
        cashRegisterStartDate: '',
    };

    try {
        const cardCommission = db.prepare('SELECT value FROM settings WHERE key = ?').get('card_commission_percent') as any;
        const enabled = db.prepare('SELECT value FROM settings WHERE key = ?').get('cash_register_enabled') as any;
        const startDate = db.prepare('SELECT value FROM settings WHERE key = ?').get('cash_register_start_date') as any;

        if (cardCommission) settings.cardCommissionPercent = parseFloat(cardCommission.value);
        if (enabled) settings.cashRegisterEnabled = enabled.value === 'true';
        if (startDate) settings.cashRegisterStartDate = startDate.value;
    } catch (e) {
        console.error('Error getting register settings:', e);
    }

    return settings;
}

function getBalances(db: any) {
    try {
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
    } catch (e) {
        return { cash: 0, card: 0 };
    }
}

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

// Simple JWT-like token generation (no external deps)
const JWT_SECRET = crypto.randomBytes(32).toString('hex');

interface TokenPayload {
    executorId: number;
    executorName: string;
    role: string;
    salaryPercent: number;
    productsPercent: number;
    exp: number;
}

function createToken(payload: Omit<TokenPayload, 'exp'>): string {
    const tokenPayload: TokenPayload = {
        ...payload,
        exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    };
    const data = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
    return `${data}.${signature}`;
}

function verifyToken(token: string): TokenPayload | null {
    try {
        const [data, signature] = token.split('.');
        const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
        if (signature !== expectedSig) return null;

        const payload: TokenPayload = JSON.parse(Buffer.from(data, 'base64url').toString());
        if (payload.exp < Date.now()) return null;

        return payload;
    } catch {
        return null;
    }
}

// Password hashing
function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

let webServer: Server | null = null;
let webServerPort: number = 3001;

export async function startExecutorWebServer(port: number = 3001): Promise<{ success: boolean; port?: number; error?: string }> {
    if (webServer) {
        return { success: false, error: 'Web server is already running' };
    }

    try {
        const expressModule = await import('express');
        const express = expressModule.default || expressModule;
        const app = express();
        app.use(express.json());

        // CORS middleware
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

        // Auth middleware
        const authMiddleware = (req: any, res: any, next: any) => {
            const authHeader = req.headers.authorization;
            if (!authHeader?.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'No token provided' });
            }

            const token = authHeader.substring(7);
            const payload = verifyToken(token);
            if (!payload) {
                return res.status(401).json({ error: 'Invalid or expired token' });
            }

            req.user = payload;
            next();
        };

        // ========== AUTH ENDPOINTS ==========

        // POST /api/auth/login
        app.post('/api/auth/login', (req: any, res: any) => {
            try {
                const db = getDb();
                const { name, password } = req.body;

                if (!name || !password) {
                    return res.status(400).json({ error: 'Name and password required' });
                }

                const executor = db.prepare(`
          SELECT ID, Name, Password, Role, SalaryPercent, ProductsPercent FROM Executors WHERE Name = ?
        `).get(name) as any;

                if (!executor) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }

                // Determine if user is admin (100/100 rates)
                const isAdmin = executor.SalaryPercent === 100 && executor.ProductsPercent === 100;
                // Determine if user is full-access worker (0/0 rates)
                const isFullAccess = executor.SalaryPercent === 0 && executor.ProductsPercent === 0;

                // If no password set, allow first login to set password
                if (!executor.Password) {
                    const hashedPassword = hashPassword(password);
                    db.prepare('UPDATE Executors SET Password = ? WHERE ID = ?').run(hashedPassword, executor.ID);

                    const token = createToken({
                        executorId: executor.ID,
                        executorName: executor.Name,
                        role: isAdmin ? 'admin' : 'worker',
                        salaryPercent: executor.SalaryPercent,
                        productsPercent: executor.ProductsPercent
                    });

                    return res.json({
                        token,
                        user: {
                            id: executor.ID,
                            name: executor.Name,
                            role: isAdmin ? 'admin' : 'worker',
                            salaryPercent: executor.SalaryPercent,
                            productsPercent: executor.ProductsPercent,
                            isFullAccess
                        },
                        message: 'Password set successfully'
                    });
                }

                // Verify password
                const hashedInput = hashPassword(password);
                if (hashedInput !== executor.Password) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }

                const token = createToken({
                    executorId: executor.ID,
                    executorName: executor.Name,
                    role: isAdmin ? 'admin' : 'worker',
                    salaryPercent: executor.SalaryPercent,
                    productsPercent: executor.ProductsPercent
                });

                res.json({
                    token,
                    user: {
                        id: executor.ID,
                        name: executor.Name,
                        role: isAdmin ? 'admin' : 'worker',
                        salaryPercent: executor.SalaryPercent,
                        productsPercent: executor.ProductsPercent,
                        isFullAccess
                    }
                });
            } catch (error: any) {
                console.error('Login error:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/auth/me
        app.get('/api/auth/me', authMiddleware, (req: any, res: any) => {
            res.json({ user: req.user });
        });

        // POST /api/auth/change-password
        app.post('/api/auth/change-password', authMiddleware, (req: any, res: any) => {
            try {
                const db = getDb();
                const { oldPassword, newPassword } = req.body;
                const executorId = req.user.executorId;

                if (!oldPassword || !newPassword) {
                    return res.status(400).json({ error: 'Old and new passwords required' });
                }

                // Get current password hash
                const executor = db.prepare('SELECT Password FROM Executors WHERE ID = ?').get(executorId) as any;
                if (!executor) {
                    return res.status(404).json({ error: 'Executor not found' });
                }

                // Check old password
                const hashedOld = hashPassword(oldPassword);
                if (hashedOld !== executor.Password) {
                    return res.status(401).json({ error: 'Невірний старий пароль' });
                }

                // Update to new password
                const hashedNew = hashPassword(newPassword);
                db.prepare('UPDATE Executors SET Password = ? WHERE ID = ?').run(hashedNew, executorId);

                res.json({ success: true, message: 'Пароль успішно змінено' });
            } catch (error: any) {
                console.error('Change password error:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // ========== MY REPAIRS ENDPOINTS ==========

        // GET /api/my/repairs - Get repairs for current executor
        app.get('/api/my/repairs', authMiddleware, (req: any, res: any) => {
            try {
                const db = getDb();
                const executorName = req.user.executorName;
                const salaryPercent = req.user.salaryPercent || 0;
                const productsPercent = req.user.productsPercent || 0;
                const { status, page = '1', limit = '50', search, filterStatus } = req.query;

                const pageNum = parseInt(page, 10);
                const limitNum = parseInt(limit, 10);
                const offset = (pageNum - 1) * limitNum;

                // Check if user is full-access (0/0 rates) - they see everything like admin
                const isFullAccess = salaryPercent === 0 && productsPercent === 0;
                // Regular workers with salary > 0 have limited access
                const isLimitedWorker = salaryPercent > 0;

                let query: string;
                const params: any[] = [];

                if (isFullAccess) {
                    // Full access - see all repairs like main app
                    query = `
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
                            Начало_ремонта as dateStart,
                            Конец_ремонта as dateEnd,
                            Примечание as note,
                            Виконавець as executor,
                            ТипОплати as paymentType
                        FROM Ремонт
                        WHERE 1=1
                    `;

                    // Add search filters for fullAccess
                    if (search) {
                        // Check if search is a number (receipt ID)
                        const isNumeric = /^\d+$/.test(search);
                        if (isNumeric) {
                            query += ` AND CAST(Квитанция AS TEXT) LIKE ?`;
                            params.push(`%${search}%`);
                        } else {
                            query += ` AND (Наименование_техники LIKE ? OR Имя_заказчика LIKE ? OR Телефон LIKE ?)`;
                            const searchTerm = `%${search}%`;
                            params.push(searchTerm, searchTerm, searchTerm);
                        }
                    }
                    if (filterStatus) {
                        query += ` AND Состояние = ?`;
                        params.push(filterStatus);
                    }
                } else if (isLimitedWorker) {
                    // Limited worker - only their repairs, only in progress (2) or waiting (3), not paid
                    query = `
                        SELECT
                            ID as id,
                            Квитанция as receiptId,
                            Наименование_техники as deviceName,
                            Описание_неисправности as faultDesc,
                            Выполнено as workDone,
                            Примечание as note,
                            Состояние as status
                        FROM Ремонт
                        WHERE Виконавець = ? AND Состояние IN (1, 2, 3) AND Оплачено = 0
                    `;
                    params.push(executorName);
                } else {
                    // Default - see own repairs
                    query = `
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
                            Начало_ремонта as dateStart,
                            Конец_ремонта as dateEnd,
                            Примечание as note,
                            Виконавець as executor,
                            ТипОплати as paymentType
                        FROM Ремонт
                        WHERE Виконавець = ?
                    `;
                    params.push(executorName);
                }

                if (status && !isLimitedWorker) {
                    query += ` AND Состояние = ?`;
                    params.push(status);
                }

                // Count query
                const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
                const totalResult = db.prepare(countQuery).get(...params) as { total: number };

                query += ` ORDER BY ID DESC LIMIT ? OFFSET ?`;
                params.push(limitNum, offset);

                const repairs = db.prepare(query).all(...params).map((repair: any) => ({
                    ...repair,
                    isPaid: Boolean(repair.isPaid),
                    dateStart: repair.dateStart ? toJsDate(repair.dateStart) : null,
                    dateEnd: repair.dateEnd ? toJsDate(repair.dateEnd) : null,
                }));

                res.json({
                    data: repairs,
                    isLimitedWorker,
                    isFullAccess,
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        total: totalResult.total,
                        totalPages: Math.ceil(totalResult.total / limitNum)
                    }
                });
            } catch (error: any) {
                console.error('Error fetching my repairs:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // PUT /api/my/repairs/:id/status - Update repair status
        app.put('/api/my/repairs/:id/status', authMiddleware, (req: any, res: any) => {
            try {
                const db = getDb();
                const id = parseInt(req.params.id, 10);
                const executorName = req.user.executorName;
                const { status, workDone } = req.body;

                // Check access level
                const salaryPercent = req.user.salaryPercent || 0;
                const productsPercent = req.user.productsPercent || 0;
                const isFullAccess = salaryPercent === 0 && productsPercent === 0;

                // Verify this repair belongs to the executor (unless admin or fullAccess)
                const repairRecord = db.prepare('SELECT Квитанция, Сумма, Оплачено, Состояние, Виконавець FROM Ремонт WHERE ID = ?').get(id) as any;
                if (!repairRecord) {
                    return res.status(404).json({ error: 'Repair not found' });
                }
                if (repairRecord.Виконавець !== executorName && req.user.role !== 'admin' && !isFullAccess) {
                    return res.status(403).json({ error: 'Access denied' });
                }

                const updates: string[] = [];
                const params: any[] = [];
                let isNowPaid = false;

                if (status !== undefined) {
                    updates.push('Состояние = ?');
                    params.push(status);
                }
                if (workDone !== undefined) {
                    updates.push('Выполнено = ?');
                    params.push(workDone);
                }

                // isPaid can only be updated by fullAccess users (0/0)
                if (req.body.isPaid !== undefined && isFullAccess) {
                    updates.push('Оплачено = ?');
                    params.push(req.body.isPaid ? 1 : 0);

                    // If marking as paid, also set status to "Issued" (6) and set dateEnd
                    if (req.body.isPaid) {
                        isNowPaid = true;
                        updates.push('Состояние = ?');
                        params.push(6); // Status: Issued (Видано)
                        updates.push('Конец_ремонта = ?');
                        params.push(toDelphiDate(new Date().toISOString()));
                        updates.push('ТипОплати = ?');
                        params.push('Готівка');
                    } else {
                        // If unmarking paid, set status back to "In Progress" (2)
                        updates.push('Состояние = ?');
                        params.push(2); // Status: In Progress (У роботі)
                    }
                }

                if (updates.length === 0) {
                    return res.status(400).json({ error: 'No updates provided' });
                }

                updates.push("UpdateTimestamp = datetime('now')");
                params.push(id);

                // Start DB transaction for atomicity
                db.transaction(() => {
                    db.prepare(`UPDATE Ремонт SET ${updates.join(', ')} WHERE ID = ?`).run(...params);

                    // --- CASH REGISTER LOGIC ---
                    if (isNowPaid) {
                        const settings = getCashRegisterSettings(db);
                        if (settings.cashRegisterEnabled) {
                            // Only create if it wasn't already paid/issued
                            const wasIssued = repairRecord.Состояние === 6 || repairRecord.Состояние === '6' || repairRecord.Состояние === 'Видано';
                            const wasPaid = repairRecord.Оплачено === 1 || wasIssued;

                            if (!wasPaid) {
                                const balances = getBalances(db);
                                const paymentType = 'Готівка';
                                const totalCost = repairRecord.Сумма || 0;
                                const receiptId = repairRecord.Квитанция;
                                const executor = repairRecord.Виконавець || 'Андрій';

                                let newCash = balances.cash + totalCost;
                                let description = `Оплата квитанції #${receiptId}. Готівка. ${executor} (через Web)`;

                                // Get executor ID
                                const executorRecord = db.prepare('SELECT ID FROM Executors WHERE Name = ?').get(executor) as any;

                                createTransaction(db, {
                                    category: 'Прибуток',
                                    description: description,
                                    amount: totalCost,
                                    cash: newCash,
                                    card: balances.card,
                                    executorId: executorRecord?.ID,
                                    executorName: executor,
                                    receiptId: id,
                                    paymentType: paymentType
                                });
                            }
                        }
                    }
                })();

                // Notify main window about the change for instant refresh
                notifyMainWindow('repair-updated', { repairId: id });

                res.json({ success: true });
            } catch (error: any) {
                console.error('Error updating repair status:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/my/salary - Get salary info for current executor
        app.get('/api/my/salary', authMiddleware, (req: any, res: any) => {
            try {
                const db = getDb();
                const executorName = req.user.executorName;
                const { dateStart, dateEnd } = req.query;

                // Get executor settings
                const executor = db.prepare('SELECT SalaryPercent, ProductsPercent FROM Executors WHERE Name = ?').get(executorName) as any;
                if (!executor) {
                    return res.status(404).json({ error: 'Executor not found' });
                }

                let dateCondition = '';
                const params: any[] = [executorName];

                if (dateStart) {
                    dateCondition += ' AND Конец_ремонта >= ?';
                    params.push(toDelphiDate(dateStart as string));
                }
                if (dateEnd) {
                    dateCondition += ' AND Конец_ремонта <= ?';
                    const date = new Date(dateEnd as string);
                    date.setUTCHours(23, 59, 59, 999);
                    params.push(toDelphiDate(date.toISOString()));
                }

                // Get completed repairs with payment
                const repairs = db.prepare(`
          SELECT 
            COUNT(*) as totalRepairs,
            SUM(CASE WHEN Оплачено = 1 THEN Стоимость ELSE 0 END) as totalLabor,
            SUM(CASE WHEN Оплачено = 1 THEN (Сумма - Стоимость) ELSE 0 END) as totalParts
          FROM Ремонт
          WHERE Виконавець = ? AND Оплачено = 1 ${dateCondition}
        `).get(...params) as any;

                const laborSalary = (repairs.totalLabor || 0) * (executor.SalaryPercent / 100);
                const partsSalary = (repairs.totalParts || 0) * (executor.ProductsPercent / 100);

                res.json({
                    data: {
                        totalRepairs: repairs.totalRepairs || 0,
                        totalLabor: repairs.totalLabor || 0,
                        totalParts: repairs.totalParts || 0,
                        salaryPercent: executor.SalaryPercent,
                        productsPercent: executor.ProductsPercent,
                        laborSalary,
                        partsSalary,
                        totalSalary: laborSalary + partsSalary
                    }
                });
            } catch (error: any) {
                console.error('Error fetching salary:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // GET /api/executors/list - Get list of executors (for login dropdown)
        // Hide admin (100/100 rates) from the list
        app.get('/api/executors/list', (_req: any, res: any) => {
            try {
                const db = getDb();
                // Exclude executors with 100/100 rates (admin)
                const executors = db.prepare(`
                    SELECT Name as name, SalaryPercent as salaryPercent, ProductsPercent as productsPercent 
                    FROM Executors 
                    WHERE NOT (SalaryPercent = 100 AND ProductsPercent = 100)
                    ORDER BY Name
                `).all();
                res.json({ data: executors });
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        // Health check
        app.get('/api/health', (_req: any, res: any) => {
            res.json({ status: 'ok', service: 'executor-web', timestamp: new Date().toISOString() });
        });

        // Serve executor web interface
        app.get('/', async (_req: any, res: any) => {
            try {
                // Try multiple paths to find the HTML file
                const possiblePaths = [
                    join(__dirname, '..', 'dist', 'executor.html'),
                    join(process.cwd(), 'dist', 'executor.html'),
                    join(process.cwd(), 'public', 'executor.html'),
                ];

                for (const htmlPath of possiblePaths) {
                    try {
                        if (fs.existsSync(htmlPath)) {
                            const html = fs.readFileSync(htmlPath, 'utf-8');
                            res.setHeader('Content-Type', 'text/html; charset=utf-8');
                            return res.send(html);
                        }
                    } catch (e) {
                        console.log('Path not searched or not found:', htmlPath);
                    }
                }

                // Fallback: return inline HTML
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.send(`
                    <!DOCTYPE html>
                    <html><head><meta charset="UTF-8"><title>Service Center</title></head>
                    <body style="background:#0f172a;color:#f1f5f9;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;">
                        <div style="text-align:center;">
                            <h1>🔧 Service Center</h1>
                            <p>Веб-інтерфейс для виконавців</p>
                            <p style="color:#94a3b8;">API доступний за адресою /api/</p>
                        </div>
                    </body></html>
                `);
            } catch (error: any) {
                console.error('Error loading page:', error);
                res.status(500).send('Error loading page: ' + error.message);
            }
        });

        // Start server
        webServer = app.listen(port, '0.0.0.0', () => {
            console.log(`Executor web server running on port ${port}`);
            console.log(`Web interface accessible at: http://localhost:${port}`);
        });

        webServerPort = port;
        return { success: true, port };
    } catch (error: any) {
        console.error('Error starting executor web server:', error);
        return { success: false, error: error.message };
    }
}

export function stopExecutorWebServer(): { success: boolean; error?: string } {
    if (!webServer) {
        return { success: false, error: 'Web server is not running' };
    }

    try {
        webServer.close();
        webServer = null;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export function getExecutorWebServerStatus(): { running: boolean; port?: number; ipAddresses?: string[] } {
    if (!webServer) {
        return { running: false };
    }

    const interfaces = networkInterfaces();
    const addresses: string[] = [];
    for (const name of Object.keys(interfaces)) {
        const nets = interfaces[name];
        if (!nets) continue;
        for (const net of nets) {
            if (net.family === 'IPv4' && !net.internal) {
                addresses.push(net.address);
            }
        }
    }

    return { running: true, port: webServerPort, ipAddresses: addresses };
}
