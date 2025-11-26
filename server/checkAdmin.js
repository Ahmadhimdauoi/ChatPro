const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const checkAndFixAdmin = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/chatpro');
    console.log('🔗 Connected to MongoDB');

    // Find admin user
    const admin = await User.findOne({ email: 'ahmad2025@chatpro.com' });
    
    if (!admin) {
      console.log('❌ Admin user not found, creating...');
      
      // Create new admin user
      const newAdmin = new User({
        username: 'ahmad2025',
        email: 'ahmad2025@chatpro.com',
        password_hash: 'Admin123!@#',
        department: 'IT',
        role: 'Admin',
        status: 'active'
      });
      
      await newAdmin.save();
      console.log('✅ Admin user created successfully');
    } else {
      console.log('✅ Admin user found:', admin.username);
      
      // Test password matching
      const isValid = await admin.matchPassword('Admin123!@#');
      console.log('🔑 Password test (Admin123!@#):', isValid ? '✅ Valid' : '❌ Invalid');
      
      if (!isValid) {
        console.log('🔄 Updating password...');
        admin.password_hash = 'Admin123!@#';
        await admin.save();
        console.log('✅ Password updated');
        
        // Test again
        const testAgain = await admin.matchPassword('Admin123!@#');
        console.log('🔑 New password test:', testAgain ? '✅ Valid' : '❌ Invalid');
      }
    }

    console.log('\n📋 Login Credentials:');
    console.log('📧 Email: ahmad2025@chatpro.com');
    console.log('🔑 Password: Admin123!@#');
    console.log('👤 Username: ahmad2025');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected');
  }
};

checkAndFixAdmin();
