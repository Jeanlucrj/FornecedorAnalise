import "dotenv/config";
import { db } from "../server/db.js";
import { users, validations, activityLogs } from "../shared/schema.js";
import { desc, eq } from "drizzle-orm";

async function globalInvestigate() {
    console.log("🔍 Investigação Global...");

    try {
        // Check all users
        const allUsers = await db.query.users.findMany();
        console.log(`👥 Usuários no sistema (${allUsers.length}):`);
        allUsers.forEach(u => {
            console.log(` - ID: ${u.id}, Email: ${u.email}, Usage: ${u.apiUsage}/${u.apiLimit}`);
        });

        // Check all validations
        const allValidations = await db.query.validations.findMany({
            orderBy: [desc(validations.createdAt)],
            limit: 10
        });
        console.log(`📋 Últimas Validações (${allValidations.length}):`);
        allValidations.forEach(v => {
            const user = allUsers.find(u => u.id === v.userId);
            console.log(` - ID: ${v.id}, User: ${user?.email || v.userId}, Status: ${v.status}, Score: ${v.score}, Info: ${v.cadastralStatus || 'N/A'}`);
        });

        // Check recent activity logs for ANY errors
        const recentLogs = await db.query.activityLogs.findMany({
            orderBy: [desc(activityLogs.createdAt)],
            limit: 20
        });
        console.log(`🕒 Últimos Logs de Atividade (${recentLogs.length}):`);
        recentLogs.forEach(l => {
            const user = allUsers.find(u => u.id === l.userId);
            console.log(` - Ação: ${l.action}, User: ${user?.email || l.userId || 'System'}, Details: ${JSON.stringify(l.details)}, Data: ${l.createdAt}`);
        });

    } catch (error) {
        console.error("❌ Erro na investigação global:", error);
    } finally {
        process.exit(0);
    }
}

globalInvestigate();
