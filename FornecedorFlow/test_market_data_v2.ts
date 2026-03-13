// test_market_data.ts
import "dotenv/config";
import fs from "fs";

async function test() {
    const companies = [
        { name: "DIRECIONAL", cnpj: "16614075000100", nature: "Sociedade Anônima Aberta" },
        { name: "PETROLEO BRASILEIRO S.A. - PETROBRAS", cnpj: "33000167000101", nature: "Sociedade Anônima Aberta" },
        { name: "WEG S.A.", cnpj: "84429695000111", nature: "Sociedade Anônima Aberta" }
    ];

    let output = `Testing Market Data Search Refactor\n`;

    // Redirect console.log for capturing
    const originalLog = console.log;
    console.log = (...args: any[]) => {
        output += args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(" ") + "\n";
        originalLog(...args);
    };

    try {
        const { marketDataService } = await import("./server/services/marketDataService");

        for (const company of companies) {
            console.log(`\n--- Testing ${company.name} ---`);
            const marketData = await marketDataService.getMarketData(
                company.name,
                company.cnpj,
                company.nature
            );
            if (marketData) {
                console.log(`✅ Result for ${company.name}: ${marketData.ticker} (${marketData.price})`);
            } else {
                console.log(`❌ No data for ${company.name}`);
            }
        }
    } catch (error) {
        console.error(error);
    }

    fs.writeFileSync("test_results_v2.log", output, "utf-8");
}

test();
