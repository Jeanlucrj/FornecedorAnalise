import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function createTestUser() {
    try {
        console.log("🔐 Criando usuário de teste...");

        const testEmail = "teste@fornecedorflow.com";
        const testPassword = "Teste123!";

        // Verificar se já existe
        const existing = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.email, testEmail)
        });

        if (existing) {
            console.log("⚠️ Usuário de teste já existe!");
            console.log("Email:", testEmail);
            console.log("ID:", existing.id);
            return;
        }

        // Criar hash da senha
        const hashedPassword = await hashPassword(testPassword);

        // Inserir usuário
        const [newUser] = await db.insert(users).values({
            email: testEmail,
            password: hashedPassword,
            firstName: "Usuário",
            lastName: "Teste",
            plan: "free",
            apiUsage: 0,
            apiLimit: 10,
            notificationsEnabled: true,
            autoRefreshEnabled: false,
            monitoringFrequency: "daily",
            emailNotifications: false,
            whatsappNotifications: false,
        }).returning();

        console.log("✅ Usuário de teste criado com sucesso!");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📧 Email:", testEmail);
        console.log("🔑 Senha:", testPassword);
        console.log("🆔 ID:", newUser.id);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("");
        console.log("🌐 Teste em: https://fornecedor-analise.vercel.app/login");

    } catch (error: any) {
        console.error("❌ Erro ao criar usuário:", error);
        console.error("Stack:", error.stack);
    } finally {
        process.exit(0);
    }
}

createTestUser();
