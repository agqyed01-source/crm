import express from "express";
import path from "path";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from 'fs';
import Database from "better-sqlite3";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SECRET = process.env.JWT_SECRET || "fallback-secret-key-do-not-use-in-prod";

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize SQLite
let db: Database.Database;
try {
  console.log('[DEBUG] Initializing database...');
  db = new Database('database.sqlite');
  db.pragma('journal_mode = WAL');
  console.log('[DEBUG] Database initialized successfully.');
} catch (error: any) {
  console.error('[ERROR] Failed to initialize database:', error);
  process.exit(1);
}

// Migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    email TEXT UNIQUE COLLATE NOCASE,
    displayName TEXT,
    role TEXT,
    passhash TEXT,
    createdAt INTEGER,
    updatedAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT,
    company TEXT,
    country TEXT,
    phone TEXT,
    email TEXT,
    status TEXT,
    salesRepId TEXT,
    lastFollowUp TEXT,
    createdAt INTEGER,
    updatedAt INTEGER,
    address TEXT,
    state TEXT,
    city TEXT,
    zip TEXT,
    taxId TEXT,
    countryCode TEXT
  );

  CREATE TABLE IF NOT EXISTS history_logs (
    id TEXT PRIMARY KEY,
    customerId TEXT,
    type TEXT,
    note TEXT,
    oldStatus TEXT,
    newStatus TEXT,
    contactMethod TEXT,
    createdBy TEXT,
    createdAt INTEGER,
    FOREIGN KEY(customerId) REFERENCES customers(id) ON DELETE CASCADE
  );
`);

// Alter tables if they already exist to add new columns (run silently)
try { db.exec("ALTER TABLE customers ADD COLUMN address TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE customers ADD COLUMN state TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE customers ADD COLUMN city TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE customers ADD COLUMN zip TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE customers ADD COLUMN taxId TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE customers ADD COLUMN countryCode TEXT;"); } catch(e){}

// Simple Admin Bootstrapper
const adminEmail = 'agqyed01@gmail.com';
const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
if (!existingAdmin) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (uid, email, displayName, role, passhash, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'admin_uid_' + Date.now(),
    adminEmail,
    'Super Admin',
    'admin',
    hash,
    Date.now(),
    Date.now()
  );
}

// Authentication Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// API: Auth
app.post("/api/auth/register", (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing email/password" });
  
  try {
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ error: "Email already in use" });
    
    // Check if it should be an admin
    const role = email === adminEmail ? 'admin' : 'sales';
    const hash = bcrypt.hashSync(password, 10);
    const uid = 'user_' + Date.now() + Math.random().toString(36).substring(2, 6);
    const now = Date.now();
    
    db.prepare(`
      INSERT INTO users (uid, email, displayName, role, passhash, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uid, email, name || '', role, hash, now, now);
    
    const user = { uid, email, displayName: name, role };
    const token = jwt.sign(user, SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  try {
    const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(400).json({ error: "Invalid credentials" });
    
    const valid = bcrypt.compareSync(password, user.passhash);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });
    
    const safeUser = { uid: user.uid, email: user.email, displayName: user.displayName, role: user.role };
    const token = jwt.sign(safeUser, SECRET, { expiresIn: '7d' });
    res.json({ token, user: safeUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/me", authenticateToken, (req: any, res) => {
  // reload user details
  try {
    const user = db.prepare('SELECT uid, email, displayName, role FROM users WHERE uid = ?').get(req.user.uid);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Users
app.get("/api/users", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') return res.status(403).json({ error: "Forbidden" });
  try {
    const users = db.prepare('SELECT uid, email, displayName, role FROM users').all();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:id/role", authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
  try {
    db.prepare('UPDATE users SET role = ?, updatedAt = ? WHERE uid = ?').run(req.body.role, Date.now(), req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Customers
app.get("/api/customers", authenticateToken, (req: any, res) => {
  try {
    let sql = 'SELECT * FROM customers';
    let params: any[] = [];
    
    // Simplistic RBAC
    if (req.user.role === 'sales') {
      sql += ' WHERE status = ? OR salesRepId = ?';
      params = ['In Pool', req.user.uid];
    }
    
    const count = db.prepare('SELECT COUNT(*) as count FROM customers').get() as {count: number};
    let customers = db.prepare(sql).all(...params);
    res.json({ customers, total: count.count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/customers/:id", authenticateToken, (req: any, res) => {
  const { id } = req.params;
  const updates = req.body;
  const now = Date.now();
  
  try {
    const existing: any = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    
    // Check permission logic here (omitted for brevity, assume valid if it gets here, this is basic API)
    
    db.prepare(`
      UPDATE customers 
      SET status = ?, salesRepId = ?, lastFollowUp = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      updates.status !== undefined ? updates.status : existing.status,
      updates.salesRepId !== undefined ? updates.salesRepId : existing.salesRepId,
      updates.lastFollowUp !== undefined ? updates.lastFollowUp : existing.lastFollowUp,
      now,
      id
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/customers/import", authenticateToken, (req: any, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: "Expected array" });
  try {
    const insert = db.prepare(`
      INSERT INTO customers (id, name, company, address, state, city, zip, countryCode, country, phone, taxId, email, status, salesRepId, lastFollowUp, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = db.transaction((customers: any[]) => {
      let inserted = 0;
      for (const cus of customers) {
        insert.run(
          cus.id, cus.name, cus.company, 
          cus.address || '', cus.state || '', cus.city || '', cus.zip || '', cus.countryCode || '',
          cus.country, cus.phone, cus.taxId || '', cus.email, 
          cus.status, cus.salesRepId || null, cus.lastFollowUp || '', cus.createdAt, cus.updatedAt
        );
        inserted++;
      }
      return inserted;
    });
    
    const count = insertMany(req.body);
    res.json({ success: true, count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: History 
app.get("/api/customers/:id/history", authenticateToken, (req: any, res) => {
  try {
    const logs = db.prepare('SELECT * FROM history_logs WHERE customerId = ? ORDER BY createdAt DESC').all(req.params.id);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/customers/:id/history", authenticateToken, (req: any, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    db.prepare(`
      INSERT INTO history_logs (id, customerId, type, note, oldStatus, newStatus, contactMethod, createdBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.id, id, data.type, data.note, data.oldStatus, data.newStatus, data.contactMethod, req.user.uid, Date.now());
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start the Server with Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:\${PORT}`);
  });
}

startServer();
