const http = require('http');

const data = JSON.stringify({
  email: 'ahmad2025@chatpro.com',
  password: 'Admin123!@#'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', body);
    try {
      const parsed = JSON.parse(body);
      if (res.statusCode === 200 && parsed.success) {
        console.log('🎉 LOGIN SUCCESSFUL!');
      } else {
        console.log('❌ LOGIN FAILED:', parsed.message);
      }
    } catch (e) {
      console.log('❌ Error parsing response');
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err.message);
});

req.write(data);
req.end();
