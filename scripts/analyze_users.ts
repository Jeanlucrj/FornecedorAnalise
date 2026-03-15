import "dotenv/config";
import { db } from "../server/db.js";
import { users } from "../shared/schema.js";

async function analyzeUsers() {
    try {
        const allUsers = await db.select().from(users);
        console.log(JSON.stringify(allUsers, null, 2));
    } catch (error) {
        console.error("Error fetching users:", error);
    } finally {
        process.exit(0);
    }
}

analyzeUsers();
