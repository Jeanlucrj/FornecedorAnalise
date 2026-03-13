import axios from "axios";

async function testDebug() {
    try {
        console.log("Calling /api/debug-market for DIRECIONAL...");
        const res = await axios.get("http://localhost:5000/api/debug-market?name=DIRECIONAL&cnpj=16614075000100");
        console.log("Response:", JSON.stringify(res.data, null, 2));

        console.log("\nCalling /api/debug-market for WEG...");
        const res2 = await axios.get("http://localhost:5000/api/debug-market?name=WEG&cnpj=84429695000111");
        console.log("Response:", JSON.stringify(res2.data, null, 2));
    } catch (error: any) {
        console.error("Error:", error.message);
        if (error.response) console.error("Data:", error.response.data);
    }
}

testDebug();
