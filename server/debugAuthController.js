const mongoose = require('mongoose');
const User = require('./models/User');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatpro';

async function debugAuthController() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('🔌 Connected to MongoDB');

    const email = 'ahmad2025@chatpro.com';
    const password = 'Admin123!@#';

    console.log('\n🧪 Simulating authController.login logic...');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);

    // Step 1: Find user by email (same as authController)
    console.log('\n🔍 Step 1: Finding user by email...');
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:');
    console.log('👤 Username:', user.username);
    console.log('🛡️ Role:', user.role);
    console.log('🔐 Password hash exists:', !!user.password_hash);
    console.log('🔐 Password hash length:', user.password_hash ? user.password_hash.length : 0);

    // Step 2: Test password matching (same as authController)
    console.log('\n🔑 Step 2: Testing password match...');
    const isMatch = await user.matchPassword(password);
    console.log('📊 Password match result:', isMatch ? '✅ MATCH' : '❌ NO MATCH');

    if (!isMatch) {
      console.log('❌ Password does not match - this would return "Invalid credentials"');
      return;
    }

    console.log('✅ Password matches - login should succeed!');

    // Step 3: Generate token (same as authController)
    console.log('\n🎫 Step 3: Generating token...');
    const jwt = require('jsonwebtoken');
    require('dotenv').config();
    
    const generateToken = (id, username, email) => {
      return jwt.sign({ userId: id, username, email }, process.env.JWT_SECRET, {
        expiresIn: '1h',
      });
    };

    const token = generateToken(user._id, user.username, user.email);
    console.log('✅ Token generated successfully');
    console.log('🎫 Token (first 50 chars):', token.substring(0, 50) + '...');

    console.log('\n🎉 Login should be successful!');

  } catch (error) {
    console.error('❌ Error debugging auth controller:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the function
debugAuthController();
