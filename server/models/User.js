const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/.+@.+\..+/, 'Please enter a valid email address'],
  },
  password_hash: {
    type: String,
    required: [true, 'Password is required'],
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'offline', 'online'],
    default: 'offline',
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt timestamps
});

// Hash password before saving the user
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password_hash')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password_hash = await bcrypt.hash(this.password_hash, salt);
  next();
});

// Method to compare entered password with hashed password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password_hash);
};

const User = mongoose.model('User', UserSchema);

module.exports = User;
