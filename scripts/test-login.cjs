const https = require('https');

const data = JSON.stringify({
  email: 'teste@fornecedorflow.com',
  password: 'Teste123!'
});

const options = {
  hostname: 'fornecedor-analise.vercel.app',
  port: 443,
  path: '/api/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('🔐 Testando login em produção...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));

  let responseBody = '';

  res.on('data', (chunk) => {
    responseBody += chunk;
  });

  res.on('end', () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Response Body:');
    try {
      const json = JSON.parse(responseBody);
      console.log(JSON.stringify(json, null, 2));

      if (res.statusCode === 200) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ LOGIN FUNCIONOU COM SUCESSO!');
        console.log('✅ Problema resolvido!');
      } else {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('❌ Login falhou com status:', res.statusCode);
      }
    } catch (e) {
      console.log(responseBody);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro na requisição:', error.message);
});

req.write(data);
req.end();
