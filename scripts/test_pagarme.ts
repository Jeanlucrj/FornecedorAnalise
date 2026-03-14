import "dotenv/config";
import { pagarmeService } from "../server/services/pagarmeService";

async function testPagarme() {
    console.log("🚀 Testing Pagar.me Integration...");

    if (!process.env.PAGARME_SECRET_KEY || process.env.PAGARME_SECRET_KEY.includes("PLACEHOLDER")) {
        console.error("❌ PAGARME_SECRET_KEY is missing or is still a placeholder.");
        return;
    }

    try {
        console.log("Creating a test order for PIX...");
        const order = await pagarmeService.createOrder({
            amount: 1000, // R$ 10,00
            paymentMethod: 'pix',
            customer: {
                name: 'Cliente Teste',
                email: 'teste@exemplo.com',
                cpf: '00000000000'
            }
        });

        console.log("✅ Order created successfully!");
        console.log("Order ID:", order.id);
        console.log("PIX QR Code:", (order as any).charges?.[0]?.last_transaction?.qr_code);
    } catch (error: any) {
        console.error("❌ Error creating order:", error?.response?.data || error.message);
    }
}

testPagarme();
