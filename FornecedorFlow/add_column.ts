import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL!;
const sql = neon(databaseUrl);

async function addColumn() {
    try {
        console.log("🔧 Adding plan_updated_at column to users table...");

        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_updated_at TIMESTAMP`;

        console.log("✅ Column added successfully!");
    } catch (error: any) {
        console.error("❌ Error:", error.message);
    }
}

addColumn();
