import "dotenv/config";

async function checkSuppliers() {
    try {
        const { storage } = await import("./server/storage");
        const cnpjs = ["16614075000100", "84429695000111"];

        for (const cnpj of cnpjs) {
            const supplier = await storage.getSupplierByCnpj(cnpj);
            if (supplier) {
                console.log(`CNPJ: ${cnpj}`);
                console.log(`- Name: ${supplier.companyName}`);
                console.log(`- Legal Nature: ${supplier.legalNature}`);
                console.log(`- Ticker: ${supplier.ticker}`);

                const validations = await storage.getValidationsBySupplier(supplier.id);
                console.log(`- Number of validations: ${validations.length}`);
                if (validations.length > 0) {
                    const latest = validations.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))[0];
                    console.log(`- Latest validation market data: ${JSON.stringify(latest.financialMarketData)}`);
                }
            } else {
                console.log(`CNPJ: ${cnpj} not found in database.`);
            }
            console.log("---");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

checkSuppliers();
