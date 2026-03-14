import axios from "axios";
import "dotenv/config";

const hgBrasilKey = (process.env.HG_BRASIL_API_KEY || "").trim();

async function testHgBrasilSearch() {
    console.log("HG Brasil Key:", hgBrasilKey ? "Set" : "Not Set");
    if (!hgBrasilKey) return;

    const names = ["DIRECIONAL", "WEG", "VALE"];

    for (const name of names) {
        console.log(`\n🔍 Searching HG Brasil for: ${name}`);
        try {
            const url = `https://api.hgbrasil.com/finance/stock_price?key=${hgBrasilKey}&symbol=${name}`;
            const response = await axios.get(url);
            console.log(`Response for ${name}:`, JSON.stringify(response.data, null, 2));
        } catch (error: any) {
            console.log(`Error for ${name}:`, error.message);
        }
    }
}

testHgBrasilSearch();
