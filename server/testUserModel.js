const mongoose = require('mongoose');
require('dotenv').config();

// Test User model directly
const User = require('./models/User');

async function testUserModel() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🔍 Testing User model...');
    
    // Test finding the admin user
    const adminId = '6925d60a5dfbedfe2c223c7f';
    console.log('👤 Looking for user with ID:', adminId);
    
    const user = await User.findById(adminId);
    console.log('📊 User found:', user ? '✅' : '❌');
    
    if (user) {
      console.log('📋 User details:');
      console.log('  - Username:', user.username);
      console.log('  - Email:', user.email);
      console.log('  - Role:', user.role);
    }

    // Test finding multiple users
    console.log('\n🔍 Testing find with array of IDs...');
    const users = await User.find({ _id: { $in: [adminId] } });
    console.log('📊 Users found:', users.length);
    console.log('✅ User model test completed');

  } catch (error) {
    console.error('❌ Error testing User model:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testUserModel();
