import { cnpjService } from "./server/services/cnpjService";
import "dotenv/config";

async function debugCnpj() {
    const cnpj = "16614075000100";
    try {
        const data = await cnpjService.getSupplierData(cnpj);
        console.log("=== CNPJ SERVICE OUTPUT ===");
        console.log("Company Name:", data.companyName);
        console.log("Natureza Juridica:", data.naturezaJuridica);
        console.log("Trade Name:", data.tradeName);
        console.log("Full Object:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error:", error);
    }
}

debugCnpj();
