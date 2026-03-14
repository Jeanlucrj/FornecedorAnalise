import { pagarmeService } from "./server/services/pagarmeService";
import * as dotenv from "dotenv";

dotenv.config();

async function testCreditCardPayment() {
    console.log("🧪 TESTE DE PAGAMENTO COM CARTÃO DE CRÉDITO");
    console.log("=" . repeat(60));

    try {
        // Dados do cartão de teste da Pagar.me
        // https://docs.pagar.me/docs/realizando-testes
        const testCardData = {
            number: "4000000000000010", // Cartão de teste aprovado
            holderName: "TESTE DA SILVA",
            expMonth: 12,
            expYear: 2030,
            cvv: "123"
        };

        const customerData = {
            name: "Teste da Silva",
            email: "teste@fornecedorflow.com.br",
            cpf: "12345678909",
            phone: "11999999999",
            address: {
                street: "Avenida Paulista",
                number: "1000",
                zipCode: "01310100",
                neighborhood: "Bela Vista",
                city: "São Paulo",
                state: "SP",
                line1: "Avenida Paulista, 1000",
                line2: "Bela Vista - São Paulo/SP"
            }
        };

        console.log("\n📝 Criando pedido de teste...");
        console.log("Valor: R$ 997,00 (Plano Premium)");
        console.log("Método: Cartão de Crédito");
        console.log("Cartão: 4000 0000 0000 0010 (Teste - Aprovado)\n");

        const order = await pagarmeService.createOrder({
            amount: 99700, // R$ 997,00 em centavos
            paymentMethod: 'credit_card',
            customer: customerData,
            cardData: testCardData
        });

        console.log("\n✅ PEDIDO CRIADO COM SUCESSO!");
        console.log("=" . repeat(60));
        console.log(`Order ID: ${order.id}`);
        console.log(`Status: ${order.status}`);
        console.log(`Código: ${order.code}`);

        if (order.charges && order.charges.length > 0) {
            const charge = order.charges[0] as any;
            console.log(`\nCharge ID: ${charge.id}`);
            console.log(`Status do Charge: ${charge.status}`);
            console.log(`Amount: R$ ${(charge.amount / 100).toFixed(2)}`);

            if (charge.lastTransaction || charge.last_transaction) {
                const tx = charge.lastTransaction || charge.last_transaction;
                console.log(`\nTransaction ID: ${tx.id}`);
                console.log(`Gateway ID: ${tx.gatewayId || tx.gateway_id || 'N/A'}`);
                console.log(`Success: ${tx.success}`);

                if (tx.gatewayResponse) {
                    console.log(`Gateway Code: ${tx.gatewayResponse.code || 'N/A'}`);
                }
            }
        }

        console.log("\n🔗 Acesse o dashboard da Pagar.me para verificar:");
        console.log("https://dashboard.pagar.me/");
        console.log(`\n📄 JSON completo da resposta:`);
        console.log(JSON.stringify(order, null, 2));

        if (order.status === 'paid') {
            console.log("\n✅ PAGAMENTO APROVADO! ✅");
        } else if (order.status === 'pending') {
            console.log("\n⏳ PAGAMENTO PENDENTE");
        } else if (order.status === 'failed') {
            console.log("\n❌ PAGAMENTO RECUSADO");
        }

        return order;

    } catch (error: any) {
        console.error("\n❌ ERRO AO PROCESSAR PAGAMENTO:");
        console.error("=" . repeat(60));

        if (error.response?.data) {
            console.error("Resposta da API:");
            console.error(JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
            console.error(error);
        }

        throw error;
    }
}

// Execute o teste
testCreditCardPayment()
    .then(() => {
        console.log("\n✅ Teste concluído com sucesso!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Teste falhou:", error.message);
        process.exit(1);
    });
