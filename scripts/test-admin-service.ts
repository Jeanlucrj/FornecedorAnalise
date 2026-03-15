import "dotenv/config";
import { adminService } from "../server/services/adminService.js";

async function test() {
    try {
        console.log("🔍 Testing adminService.getAllUsers()...");
        const result = await adminService.getAllUsers();
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        process.exit(0);
    }
}

test();
