const http = require('http');

// Get admin token first (you'll need to replace this with a valid token)
const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTI1ZDYwYTVkZmJlZGZlMmMyMjNjN2YiLCJ1c2VybmFtZSI6ImFobWFkMjAyNSIsImVtYWlsIjoiYWhtYWQyMDI1QGNoYXRwcm8uY29tIiwiaWF0IjoxNzY0MDg4ODAwLCJleHAiOjE3NjQwOTI0MDB9.7dxcMbAA67lxmiFTsNSdJXEw0Fg4Fmnn9sg-6pDMmNE';

// Test group data
const groupData = {
  name: 'Test Group',
  description: 'Test group description',
  participants: ['6925d60a5dfbedfe2c223c7f'], // Updated admin user ID
  category: 'general',
  tags: ['test'],
  isPrivate: false
};

const postData = JSON.stringify(groupData);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/admin/groups',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`,
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testing createGroup endpoint...');
console.log('📡 Request URL:', `http://localhost:5000/api/admin/groups`);
console.log('📝 Group data:', groupData);
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
      
      if (res.statusCode === 200 && parsedData.success) {
        console.log('🎉 GROUP CREATION SUCCESSFUL!');
      } else {
        console.log('❌ GROUP CREATION FAILED');
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

req.write(postData);
req.end();

console.log('📤 Request sent...');
