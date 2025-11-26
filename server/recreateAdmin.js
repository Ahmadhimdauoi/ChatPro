const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatpro';

async function recreateAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('🔌 Connected to MongoDB');

    // Delete existing admin user if exists
    const existingAdmin = await User.findOne({ email: 'ahmad2025@chatpro.com' });
    if (existingAdmin) {
      console.log('🗑️ Deleting existing admin user...');
      await User.deleteOne({ email: 'ahmad2025@chatpro.com' });
      console.log('✅ Existing admin user deleted');
    }

    // Create new admin user
    const adminUser = new User({
      username: 'ahmad2025',
      email: 'ahmad2025@chatpro.com',
      password_hash: 'Admin123!@#', // Will be hashed by pre-save hook
      department: 'IT',
      role: 'Admin',
      status: 'online'
    });

    // Save the user (permissions will be set automatically by the pre-save middleware)
    await adminUser.save();

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: ahmad2025@chatpro.com');
    console.log('👤 Username: ahmad2025');
    console.log('🔑 Password: Admin123!@#');
    console.log('🛡️ Role: Admin');
    console.log('📊 Permissions:', adminUser.permissions);
    
    // Test the password immediately
    console.log('\n🧪 Testing password...');
    const isMatch = await adminUser.matchPassword('Admin123!@#');
    console.log('🔑 Password test result:', isMatch ? '✅ MATCH' : '❌ NO MATCH');

  } catch (error) {
    console.error('❌ Error recreating admin user:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the function
recreateAdmin();
