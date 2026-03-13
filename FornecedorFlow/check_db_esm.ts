import "dotenv/config";
import fs from "fs";

async function checkDb() {
    const cnpj = "16614075000100";
    try {
        const { storage } = await import("./server/storage");

        const supplier = await storage.getSupplierByCnpj(cnpj);
        if (!supplier) {
            console.log("Supplier not found in DB");
            return;
        }
        console.log(`Supplier found: ${supplier.companyName}, Ticker: ${supplier.ticker}`);

        const validations = await storage.getValidationsBySupplier(supplier.id);
        if (validations.length === 0) {
            console.log("No validations found for this supplier");
            return;
        }

        // Sort by date descending
        validations.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });

        const latest = validations[0];
        console.log("Latest Validation ID:", latest.id);
        console.log("Latest Validation Date:", latest.createdAt);
        console.log("Market Data:", JSON.stringify(latest.financialMarketData, null, 2));

        fs.writeFileSync("db_result.json", JSON.stringify({
            supplier,
            latestValidation: latest
        }, null, 2));
    } catch (error) {
        console.error("Error:", error);
    }
}

checkDb();
