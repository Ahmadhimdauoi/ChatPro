const { exec } = require('child_process');

// Test using properly escaped JSON
const curlCommand = `curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\\"email\\":\\"ahmad2025@chatpro.com\\",\\"password\\":\\"Admin123!@#\\"}" -v`;

console.log('🧪 Testing with properly escaped curl...');
console.log('📡 Command:', curlCommand);
console.log('');

exec(curlCommand, { cwd: __dirname }, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  console.log('📄 STDOUT:', stdout);
  console.log('📋 STDERR:', stderr);
});
