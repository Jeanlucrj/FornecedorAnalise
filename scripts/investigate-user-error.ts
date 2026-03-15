import "dotenv/config";
import { db } from "../server/db.js";
import { users, validations, activityLogs } from "../shared/schema.js";
import { eq, desc } from "drizzle-orm";

async function investigate() {
    const email = "davi1239luiz@gmail.com";
    console.log(`🔍 Investigando usuário: ${email}`);

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (!user) {
            console.log("❌ Usuário não encontrado.");
            return;
        }

        console.log("👤 Dados do Usuário:", JSON.stringify({
            id: user.id,
            email: user.email,
            plan: user.plan,
            apiUsage: user.apiUsage,
            apiLimit: user.apiLimit
        }, null, 2));

        const userValidations = await db.query.validations.findMany({
            where: eq(validations.userId, user.id),
            orderBy: [desc(validations.createdAt)],
        });

        console.log(`📋 Validações (${userValidations.length}):`);
        userValidations.forEach(v => {
            console.log(` - ID: ${v.id}, Status: ${v.status}, Score: ${v.score}, Data: ${v.createdAt}`);
        });

        const logs = await db.query.activityLogs.findMany({
            where: eq(activityLogs.userId, user.id),
            orderBy: [desc(activityLogs.createdAt)],
            limit: 10
        });

        console.log(`🕒 Logs de Atividade (${logs.length}):`);
        logs.forEach(l => {
            console.log(` - Ação: ${l.action}, Recurso: ${l.resource}, Detalhes: ${JSON.stringify(l.details)}, Data: ${l.createdAt}`);
        });

    } catch (error) {
        console.error("❌ Erro na investigação:", error);
    } finally {
        process.exit(0);
    }
}

investigate();
