import Database from "better-sqlite3";
import fs from "fs";
import { parse } from "csv-parse/sync";

// Configurações
const db = new Database("maintos.db");
const csvFilePath = "service_orders.csv"; // Nome do seu arquivo CSV

try {
  if (!fs.existsSync(csvFilePath)) {
    console.error(`Erro: O arquivo ${csvFilePath} não foi encontrado.`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvFilePath, "utf-8");
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const insert = db.prepare(`
    INSERT INTO orders (
      requester, equipment_tag, equipment_name, sector, 
      maintenance_type, problem_description, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((data) => {
    for (const row of data) {
      insert.run(
        row.requester,
        row.equipment_tag,
        row.equipment_name,
        row.sector,
        row.maintenance_type,
        row.problem_description,
        row.status || 'open',
        row.created_at || new Date().toISOString()
      );
    }
  });

  insertMany(records);
  console.log(`Sucesso! ${records.length} registros importados.`);

} catch (error) {
  console.error("Erro durante a importação:", error);
} finally {
  db.close();
}
