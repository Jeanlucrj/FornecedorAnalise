import "dotenv/config";
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from "../shared/schema.js";
import { eq } from 'drizzle-orm';

// LOCAL DATABASE CONNECTION (Source)
// Adjust if local URL is different, but based on context user uses it for local tests
const LOCAL_DATABASE_URL = "postgresql://postgres:Mf%4006296009@localhost:5432/postgres";

// PRODUCTION DATABASE CONNECTION (Target)
const PROD_DATABASE_URL = process.env.DATABASE_URL;

if (!PROD_DATABASE_URL) {
    console.error("❌ DATABASE_URL (Production) not found in environment variables.");
    process.exit(1);
}

async function migrate() {
    console.log("🚀 Starting database migration from local to production...");

    const localSql = postgres(LOCAL_DATABASE_URL);
    const localDb = drizzle(localSql, { schema });

    const prodSql = postgres(PROD_DATABASE_URL);
    const prodDb = drizzle(prodSql, { schema });

    try {
        // 1. Migrate Admins
        console.log("📦 Migrating Admins...");
        const localAdmins = await localDb.select().from(schema.admins);
        console.log(`Found ${localAdmins.length} admins.`);
        for (const admin of localAdmins) {
            await prodDb.insert(schema.admins).values(admin).onConflictDoUpdate({
                target: schema.admins.username,
                set: admin
            });
        }

        // 2. Migrate Users
        console.log("📦 Migrating Users...");
        const localUsers = await localDb.select().from(schema.users);
        console.log(`Found ${localUsers.length} users.`);
        for (const user of localUsers) {
            await prodDb.insert(schema.users).values(user).onConflictDoUpdate({
                target: schema.users.email,
                set: user
            });
        }

        // 3. Migrate Suppliers
        console.log("📦 Migrating Suppliers...");
        const localSuppliers = await localDb.select().from(schema.suppliers);
        console.log(`Found ${localSuppliers.length} suppliers.`);
        for (const supplier of localSuppliers) {
            await prodDb.insert(schema.suppliers).values(supplier).onConflictDoUpdate({
                target: schema.suppliers.cnpj,
                set: supplier
            });
        }

        // 4. Migrate Partners
        console.log("📦 Migrating Partners...");
        const localPartners = await localDb.select().from(schema.partners);
        for (const partner of localPartners) {
            await prodDb.insert(schema.partners).values(partner).onConflictDoNothing();
        }

        // 5. Migrate Validations
        console.log("📦 Migrating Validations...");
        const localValidations = await localDb.select().from(schema.validations);
        for (const validation of localValidations) {
            await prodDb.insert(schema.validations).values(validation).onConflictDoNothing();
        }

        console.log("✅ Migration completed successfully!");
    } catch (error) {
        console.error("❌ Migration failed:", error);
    } finally {
        await localSql.end();
        await prodSql.end();
    }
}

migrate();
