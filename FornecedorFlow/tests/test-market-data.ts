import { marketDataService } from '../server/services/marketDataService.js';

async function test() {
    const companies = [
        { name: 'PETROLEO BRASILEIRO S.A. - PETROBRAS', cnpj: '33000167000101' },
        { name: 'VALE S.A.', cnpj: '33592510000154' },
        { name: 'ITAÚ UNIBANCO HOLDING S.A.', cnpj: '60701190000104' },
        { name: 'BOMBRIL S.A.', cnpj: '60108714000105' },
        { name: 'Empresa Inexistente LTDA', cnpj: '00000000000000' }
    ];

    for (const company of companies) {
        console.log(`\n--- Testing: ${company.name} ---`);
        try {
            const data = await marketDataService.getMarketData(company.name, company.cnpj);
            if (data) {
                console.log('✅ Market data found:');
                console.log(`   Ticker: ${data.ticker}`);
                console.log(`   Price: ${data.price}`);
                console.log(`   Market Cap: ${data.marketCap}`);
                console.log(`   Source: ${data.source}`);
            } else {
                console.log('ℹ️ No market data found (expected if not listed).');
            }
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }
}

test();
