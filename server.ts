import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("maintos.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester TEXT NOT NULL,
    equipment_tag TEXT NOT NULL,
    equipment_name TEXT NOT NULL,
    sector TEXT NOT NULL,
    maintenance_type TEXT NOT NULL,
    problem_description TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    technician_name TEXT,
    service_performed TEXT
  );

  CREATE TABLE IF NOT EXISTS technicians (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );
`);

// Seed technicians
db.exec("DELETE FROM technicians");
const insertTech = db.prepare("INSERT INTO technicians (name) VALUES (?)");
["Claudio", "Fábio", "Alexandro"].forEach(name => insertTech.run(name));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/orders", (req, res) => {
    const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
    res.json(orders);
  });

  app.post("/api/orders", (req, res) => {
    const { requester, equipment_tag, equipment_name, sector, maintenance_type, problem_description } = req.body;
    const info = db.prepare(`
      INSERT INTO orders (requester, equipment_tag, equipment_name, sector, maintenance_type, problem_description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(requester, equipment_tag, equipment_name, sector, maintenance_type, problem_description);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/orders/:id", (req, res) => {
    const { id } = req.params;
    const { requester, equipment_tag, equipment_name, sector, maintenance_type, problem_description } = req.body;
    db.prepare(`
      UPDATE orders 
      SET requester = ?, equipment_tag = ?, equipment_name = ?, sector = ?, maintenance_type = ?, problem_description = ?
      WHERE id = ?
    `).run(requester, equipment_tag, equipment_name, sector, maintenance_type, problem_description, id);
    res.json({ success: true });
  });

  app.delete("/api/orders/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM orders WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.post("/api/orders/:id/finish", (req, res) => {
    const { id } = req.params;
    const { technician_name, service_performed, finished_at } = req.body;
    db.prepare(`
      UPDATE orders 
      SET status = 'finished', technician_name = ?, service_performed = ?, finished_at = ?
      WHERE id = ?
    `).run(technician_name, service_performed, finished_at, id);
    res.json({ success: true });
  });

  app.get("/api/stats", (req, res) => {
    const total = db.prepare("SELECT COUNT(*) as count FROM orders").get() as { count: number };
    const open = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'open'").get() as { count: number };
    const finished = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'finished'").get() as { count: number };
    
    const sectors = db.prepare(`
      SELECT sector as name, COUNT(*) as value 
      FROM orders 
      GROUP BY sector 
      ORDER BY value DESC 
      LIMIT 5
    `).all();

    const equipment = db.prepare(`
      SELECT equipment_name as name, COUNT(*) as value 
      FROM orders 
      GROUP BY equipment_name 
      ORDER BY value DESC 
      LIMIT 3
    `).all();

    res.json({
      total: total.count,
      open: open.count,
      finished: finished.count,
      sectors,
      equipment
    });
  });

  app.get("/api/technicians", (req, res) => {
    const technicians = db.prepare(`
      SELECT t.*, 
      (SELECT COUNT(*) FROM orders o WHERE o.technician_name = t.name AND o.status = 'finished') as finished_count
      FROM technicians t
    `).all();
    res.json(technicians);
  });

  app.get("/api/history/:tag", (req, res) => {
    const { tag } = req.params;
    const history = db.prepare("SELECT * FROM orders WHERE equipment_tag = ? ORDER BY created_at DESC").all(tag);
    res.json(history);
  });

  app.get("/api/equipment", (req, res) => {
    try {
      const csvPath = path.join(__dirname, "Consulta.csv");
      if (!fs.existsSync(csvPath)) {
        return res.json([]);
      }
      const fileContent = fs.readFileSync(csvPath, "utf-8");
      const lines = fileContent.split("\n");
      const headers = lines[0].split(";");
      
      const equipment = lines.slice(1)
        .filter(line => line.trim() !== "")
        .map(line => {
          const values = line.split(";");
          return {
            tag: values[0]?.trim(),
            name: values[1]?.trim(),
            sector: values[2]?.trim()
          };
        });
      
      res.json(equipment);
    } catch (error) {
      console.error("Error reading Consulta.csv:", error);
      res.status(500).json({ error: "Failed to read equipment data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
