import { cnpjService } from "./server/services/cnpjService";
import fs from "fs";
import "dotenv/config";

async function debugCnpj() {
    const cnpj = "16614075000100";
    try {
        const data = await cnpjService.getSupplierData(cnpj);
        fs.writeFileSync("debug_result.json", JSON.stringify(data, null, 2));
        console.log("Success! Data written to debug_result.json");
    } catch (error) {
        console.error("Error:", error);
    }
}

debugCnpj();
