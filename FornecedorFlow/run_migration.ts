import Database from "better-sqlite3";
import fs from "fs";

const db = new Database("db.sqlite");

const migration = fs.readFileSync("migrations/add_plan_updated_at.sql", "utf-8");

console.log("🔧 Running migration: add_plan_updated_at.sql");
console.log(migration);

try {
    db.exec(migration);
    console.log("✅ Migration completed successfully!");
} catch (error: any) {
    console.error("❌ Migration failed:", error.message);
}

db.close();
