const http = require('http');

// Get admin token first
const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTI1ZDYwYTVkZmJlZGZlMmMyMjNjN2YiLCJ1c2VybmFtZSI6ImFobWFkMjAyNSIsImVtYWlsIjoiYWhtYWQyMDI1QGNoYXRwcm8uY29tIiwiaWF0IjoxNzY0MDg4ODAwLCJleHAiOjE3NjQwOTI0MDB9.7dxcMbAA67lxmiFTsNSdJXEw0Fg4Fmnn9sg-6pDMmNE';

// Test with minimal data to isolate the issue
const groupData = {
  name: 'Test Group',
  participants: ['6925d60a5dfbedfe2c223c7f']
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

console.log('🧪 Testing MINIMAL createGroup endpoint...');
console.log('📝 Minimal Group data:', groupData);
console.log('');

const req = http.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Response Body:', responseData);
    
    try {
      const parsedData = JSON.parse(responseData);
      
      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('🎉 GROUP CREATION SUCCESSFUL!');
        console.log('✅ Group ID:', parsedData.data?._id);
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
