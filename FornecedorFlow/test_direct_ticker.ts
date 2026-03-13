import "dotenv/config";
import axios from "axios";
import https from "https";

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
});

async function testTicker() {
    const ticker = "DIRR3";
    const token = (process.env.BRAPI_API_KEY || "").trim();
    console.log("Token:", token ? "Configured" : "MISSING");

    try {
        const url = `https://brapi.dev/api/quote/${ticker}?token=${token}`;
        console.log(`URL: ${url.replace(token, "SECRET")}`);
        const response = await axios.get(url, { httpsAgent });
        console.log("Response:", JSON.stringify(response.data, null, 2));
    } catch (error: any) {
        console.error("Error:", error.message);
        if (error.response) {
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        }
    }
}

testTicker();
