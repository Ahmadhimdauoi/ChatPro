const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatpro';

async function fixAdminPassword() {
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

    console.log('✅ Admin user found:');
    console.log('📧 Email:', adminUser.email);
    console.log('👤 Username:', adminUser.username);
    console.log('🛡️ Role:', adminUser.role);
    console.log('🔐 Current password_hash exists:', !!adminUser.password_hash);
    console.log('🔐 Current password exists:', !!adminUser.password);

    // Hash the correct password
    const correctPassword = 'Admin123!@#';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(correctPassword, salt);
    
    // Update the password_hash field
    adminUser.password_hash = hashedPassword;
    await adminUser.save();
    
    console.log('✅ Password hash updated successfully');
    
    // Test the password
    const isMatch = await adminUser.matchPassword(correctPassword);
    console.log('🔑 Password test result:', isMatch ? '✅ MATCH' : '❌ NO MATCH');

  } catch (error) {
    console.error('❌ Error fixing password:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the function
fixAdminPassword();
