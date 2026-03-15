const https = require('https');

const options = {
  hostname: 'fornecedor-analise.vercel.app',
  port: 443,
  path: '/api/health',
  method: 'GET'
};

console.log('🏥 Testando /api/health...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);

  let responseBody = '';

  res.on('data', (chunk) => {
    responseBody += chunk;
  });

  res.on('end', () => {
    console.log('Response:');
    try {
      const json = JSON.parse(responseBody);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(responseBody);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro:', error.message);
});

req.end();
