const mongoose = require('mongoose');
const User = require('./models/User');

// MongoDB connection - using environment variable or default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatpro';

async function checkLogin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('🔌 Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({ email: 'ahmad2025@chatpro.com' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found in database');
      console.log('🔧 Running addAdminUser script...');
      
      // Run the add admin user script
      const { exec } = require('child_process');
      exec('node addAdminUser.js', { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Error running addAdminUser:', error);
          return;
        }
        console.log(stdout);
        console.error(stderr);
      });
      
      return;
    }

    console.log('✅ Admin user found:');
    console.log('📧 Email:', adminUser.email);
    console.log('👤 Username:', adminUser.username);
    console.log('🛡️ Role:', adminUser.role);
    console.log('🔐 Password Hash exists:', !!adminUser.password);
    
    // Test password matching
    const testPassword = 'Admin123!@#';
    const isMatch = await adminUser.matchPassword(testPassword);
    
    console.log('🔑 Password test (Admin123!@#):', isMatch ? '✅ MATCH' : '❌ NO MATCH');
    
    if (!isMatch) {
      console.log('🔧 Password does not match. Resetting password...');
      adminUser.password = testPassword;
      await adminUser.save();
      console.log('✅ Password reset successfully');
    }

  } catch (error) {
    console.error('❌ Error checking login:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the function
checkLogin();
