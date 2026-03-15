// Simple fetch test
fetch('https://fornecedor-analise.vercel.app/api/health')
  .then(res => {
    console.log('Status:', res.status);
    return res.text();
  })
  .then(text => {
    console.log('Response:', text);

    // Now test login
    return fetch('https://fornecedor-analise.vercel.app/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'teste@fornecedorflow.com',
        password: 'Teste123!'
      })
    });
  })
  .then(res => {
    console.log('\nLogin Status:', res.status);
    return res.text();
  })
  .then(text => {
    console.log('Login Response:', text);
  })
  .catch(err => {
    console.error('Error:', err.message);
  });
