import axios from "axios";

async function testApi() {
    const cnpj = "16614075000100";
    console.log(`Testing /api/validate for CNPJ: ${cnpj}`);
    try {
        const response = await axios.post("http://localhost:5000/api/validate", {
            cnpj,
            analysisType: "complete"
        }, {
            timeout: 60000 // 60s
        });

        console.log("Status:", response.status);
        if (response.data.validation && response.data.validation.financialMarketData) {
            console.log("Market Data:", JSON.stringify(response.data.validation.financialMarketData, null, 2));
        } else {
            console.log("Market Data is MISSING in response");
            console.log("FinancialMarketData field:", response.data.validation?.financialMarketData);
        }
    } catch (error: any) {
        if (error.response) {
            console.error("API Error Response:", error.response.status, error.response.data);
        } else {
            console.error("Error connecting to API:", error.message);
        }
    }
}

testApi();
