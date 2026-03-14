import { storage } from "./server/storage";
import "dotenv/config";

async function checkDb() {
    const cnpj = "16614075000100";
    try {
        const supplier = await storage.getSupplierByCnpj(cnpj);
        if (!supplier) {
            console.log("Supplier not found in DB");
            return;
        }
        console.log("Supplier found:", supplier.companyName, "Ticker:", supplier.ticker);

        const validations = await storage.getValidationsBySupplier(supplier.id);
        if (validations.length === 0) {
            console.log("No validations found for this supplier");
            return;
        }

        // Sort by date descending
        validations.sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());

        const latest = validations[0];
        console.log("Latest Validation Date:", latest.createdAt);
        console.log("Market Data:", JSON.stringify(latest.financialMarketData, null, 2));
    } catch (error) {
        console.error("Error:", error);
    }
}

checkDb();
