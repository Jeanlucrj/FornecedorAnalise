import { pagarmeService } from './server/services/pagarmeService';

async function testPixPayment() {
    console.log('🧪 Testing PIX payment with fixed payload...\n');

    try {
        const result = await pagarmeService.createOrder({
            amount: 99700, // R$ 997.00
            paymentMethod: 'pix',
            customer: {
                name: 'JEAN DA CRUZ',
                email: 'jeanluiz38@gmail.com',
                cpf: '029.663.707-69',
            },
        });

        console.log('✅ SUCCESS! Order created:');
        console.log(JSON.stringify(result, null, 2));

        if (result.charges && result.charges[0]?.last_transaction) {
            const tx = result.charges[0].last_transaction;
            console.log('\n📱 PIX QR CODE:');
            console.log('URL:', tx.qr_code_url);
            console.log('Code:', tx.qr_code?.substring(0, 50) + '...');
        }
    } catch (error: any) {
        console.error('❌ ERROR:', error.message);
        if (error.errors) {
            console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
        }
    }
}

testPixPayment();
