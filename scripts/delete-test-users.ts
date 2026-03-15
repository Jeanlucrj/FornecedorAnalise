import "dotenv/config";
import { db } from "../server/db.js";
import { users } from "../shared/schema.js";
import { inArray } from "drizzle-orm";

async function deleteTestUsers() {
    const testEmails = [
        "andrei@test.com.br",
        "marcio@teste.com",
        "admin@local.test",
        "lucassilva@teste.com.br",
        "teste@fornecedorflow.com"
    ];

    console.log("🗑️ Deletando usuários de teste...");

    try {
        const result = await db.delete(users).where(inArray(users.email, testEmails)).returning();
        console.log(`✅ Sucesso! ${result.length} usuários removidos.`);
        result.forEach(u => console.log(` - ${u.email}`));
    } catch (error) {
        console.error("❌ Erro ao deletar usuários:", error);
    } finally {
        process.exit(0);
    }
}

deleteTestUsers();
