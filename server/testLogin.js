const mongoose = require('mongoose');
const User = require('./models/User');

const testLogin = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/chatpro');
    console.log('🔗 Connected to MongoDB');

    // Test the exact login process
    const email = 'ahmad2025@chatpro.com';
    const password = 'Admin123!@#';

    console.log('\n🔍 Testing login process...');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);

    // Step 1: Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:', user.username);
    console.log('📊 User role:', user.role);
    console.log('📊 User status:', user.status);

    // Step 2: Test password matching
    const isMatch = await user.matchPassword(password);
    console.log('🔑 Password match:', isMatch ? '✅ Valid' : '❌ Invalid');

    if (isMatch) {
      console.log('\n🎉 Login should work!');
      console.log('📋 Expected response:');
      console.log('- success: true');
      console.log('- message: "Logged in successfully"');
      console.log('- user data with role:', user.role);
    } else {
      console.log('\n❌ Login will fail - password mismatch');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected');
  }
};

testLogin();
