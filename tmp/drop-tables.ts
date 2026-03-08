import Database from "better-sqlite3";

const db = new Database("maintos.db");

try {
  db.exec("DROP TABLE IF EXISTS technician_locations");
  db.exec("DROP TABLE IF EXISTS technician_location_history");
  console.log("Successfully dropped unused tables.");
} catch (error) {
  console.error("Error dropping tables:", error);
} finally {
  db.close();
}
