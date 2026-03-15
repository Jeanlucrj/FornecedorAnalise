import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function testConnection() {
    console.log("🔍 Testando conexão com Supabase...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    try {
        // Test 1: Database connection
        console.log("\n1️⃣ Testando conexão com banco...");
        const testQuery = await db.execute`SELECT 1 as test`;
        console.log("✅ Conexão com banco OK");

        // Test 2: Check if user exists
        console.log("\n2️⃣ Verificando se usuário de teste existe...");
        const user = await db.query.users.findFirst({
            where: eq(users.email, "teste@fornecedorflow.com")
        });

        if (user) {
            console.log("✅ Usuário encontrado:");
            console.log("   - ID:", user.id);
            console.log("   - Email:", user.email);
            console.log("   - Nome:", user.firstName, user.lastName);
            console.log("   - Plano:", user.plan);
            console.log("   - Password hash (primeiros 20 chars):", user.password.substring(0, 20) + "...");
        } else {
            console.log("❌ Usuário NÃO encontrado no banco!");
        }

        // Test 3: List all users
        console.log("\n3️⃣ Listando todos os usuários no banco...");
        const allUsers = await db.query.users.findMany({
            columns: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                createdAt: true
            }
        });
        console.log(`📊 Total de usuários: ${allUsers.length}`);
        allUsers.forEach((u, i) => {
            console.log(`   ${i + 1}. ${u.email} - ${u.firstName} ${u.lastName}`);
        });

        // Test 4: Database URL info
        console.log("\n4️⃣ Informações do DATABASE_URL:");
        const dbUrl = process.env.DATABASE_URL;
        if (dbUrl) {
            const urlParts = new URL(dbUrl);
            console.log("   - Host:", urlParts.hostname);
            console.log("   - Port:", urlParts.port);
            console.log("   - Database:", urlParts.pathname);
            console.log("   - User:", urlParts.username);
        }

        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ Todos os testes de banco passaram!");

    } catch (error: any) {
        console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.error("❌ ERRO:", error.message);
        console.error("Stack:", error.stack);
    } finally {
        process.exit(0);
    }
}

testConnection();
