const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatpro';

async function debugPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('🔌 Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({ email: 'ahmad2025@chatpro.com' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Admin user found');
    console.log('📧 Email:', adminUser.email);
    console.log('👤 Username:', adminUser.username);
    console.log('🛡️ Role:', adminUser.role);
    
    const correctPassword = 'Admin123!@#';
    console.log('🔑 Testing password:', correctPassword);
    console.log('🔐 Stored hash:', adminUser.password_hash);
    console.log('🔐 Hash length:', adminUser.password_hash ? adminUser.password_hash.length : 0);

    // Test 1: Direct bcrypt compare
    console.log('\n🧪 Test 1: Direct bcrypt compare');
    const directCompare = await bcrypt.compare(correctPassword, adminUser.password_hash);
    console.log('📊 Direct compare result:', directCompare ? '✅ MATCH' : '❌ NO MATCH');

    // Test 2: Manual hash and compare
    console.log('\n🧪 Test 2: Manual hash creation');
    const salt = await bcrypt.genSalt(10);
    console.log('🧂 Salt:', salt);
    const newHash = await bcrypt.hash(correctPassword, salt);
    console.log('🔐 New hash:', newHash);
    
    const manualCompare = await bcrypt.compare(correctPassword, newHash);
    console.log('📊 Manual compare result:', manualCompare ? '✅ MATCH' : '❌ NO MATCH');

    // Test 3: Using the model method
    console.log('\n🧪 Test 3: Using model method');
    const modelMethodResult = await adminUser.matchPassword(correctPassword);
    console.log('📊 Model method result:', modelMethodResult ? '✅ MATCH' : '❌ NO MATCH');

    // Test 4: Check if the stored hash is valid bcrypt format
    console.log('\n🧪 Test 4: Hash format check');
    const isBcryptHash = adminUser.password_hash.startsWith('$2');
    console.log('📊 Is valid bcrypt hash:', isBcryptHash ? '✅ YES' : '❌ NO');

  } catch (error) {
    console.error('❌ Error debugging password:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the function
debugPassword();
