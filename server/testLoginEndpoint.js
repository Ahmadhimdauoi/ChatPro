const http = require('http');

// Test data
const loginData = {
  email: 'ahmad2025@chatpro.com',
  password: 'Admin123!@#'
};

// Convert data to JSON string
const postData = JSON.stringify(loginData);

// Options for the HTTP request
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testing login endpoint...');
console.log('📡 Request URL:', `http://localhost:5000/api/auth/login`);
console.log('📧 Email:', loginData.email);
console.log('🔑 Password:', loginData.password);
console.log('');

const req = http.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  console.log(`📋 Response Headers:`, res.headers);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Response Body:', responseData);
    
    try {
      const parsedData = JSON.parse(responseData);
      console.log('✅ Parsed Response:', JSON.stringify(parsedData, null, 2));
      
      if (res.statusCode === 200 && parsedData.token) {
        console.log('🎉 LOGIN SUCCESSFUL!');
        console.log('🎫 Token:', parsedData.token.substring(0, 50) + '...');
      } else {
        console.log('❌ LOGIN FAILED');
        console.log('💬 Error:', parsedData.message || 'Unknown error');
      }
    } catch (error) {
      console.log('❌ Error parsing response:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request Error:', error.message);
});

// Send the request
req.write(postData);
req.end();

console.log('📤 Request sent...');
