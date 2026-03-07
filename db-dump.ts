import Database from "better-sqlite3";

const db = new Database("maintos.db");

console.log("--- SCHEMA ---");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];

for (const table of tables) {
  console.log(`\nTable: ${table.name}`);
  const schema = db.prepare(`PRAGMA table_info(${table.name})`).all();
  console.table(schema);
}

console.log("\n--- DATA: Technicians ---");
const technicians = db.prepare("SELECT * FROM technicians").all();
console.table(technicians);

console.log("\n--- DATA: Orders (Last 10) ---");
const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 10").all();
console.table(orders);

db.close();
