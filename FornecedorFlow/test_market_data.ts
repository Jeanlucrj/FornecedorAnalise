// test_market_data.ts
import "dotenv/config";
import fs from "fs";

async function test() {
    const cnpj = "16614075000100";
    let output = `Testing CNPJ: ${cnpj}\n`;

    // Redirect console.log for capturing
    const originalLog = console.log;
    console.log = (...args: any[]) => {
        output += args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(" ") + "\n";
        originalLog(...args);
    };

    try {
        console.log("HG Brasil Key Configured:", !!process.env.HG_BRASIL_API_KEY);
        console.log("Brapi Token Configured:", !!process.env.BRAPI_API_KEY);

        // Dynamic import after dotenv/config
        const { cnpjService } = await import("./server/services/cnpjService");
        const { marketDataService } = await import("./server/services/marketDataService");

        const supplierData = await cnpjService.getSupplierData(cnpj);
        output += `Supplier Data: ${JSON.stringify(supplierData, null, 2)}\n`;

        const marketData = await marketDataService.getMarketData(
            supplierData.companyName,
            cnpj,
            supplierData.naturezaJuridica
        );
        output += `Market Data Results: ${JSON.stringify(marketData, null, 2)}\n`;

        if (marketData) {
            console.log("✅ Market Data Found!");
        } else {
            console.log("❌ Market Data NOT Found.");
        }
    } catch (error) {
        output += `Test failed: ${error}\n`;
        console.error(error);
    }

    fs.writeFileSync("test_results.log", output, "utf-8");
}

test();
