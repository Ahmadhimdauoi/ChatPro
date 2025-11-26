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
  role: {
    type: String,
    enum: ['Admin', 'Manager', 'Employee'],
    default: 'Employee',
  },
  permissions: {
    canDeleteUsers: { type: Boolean, default: false },
    canManageGroups: { type: Boolean, default: false },
    canViewAnalytics: { type: Boolean, default: false },
    canGenerateSummaries: { type: Boolean, default: false },
    canManageChannels: { type: Boolean, default: false },
  },
  unseenMessages: [{
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    latestMessageContent: { type: String }, // لعرض محتوى الرسالة في الإشعار
    count: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
  }],
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
  
  // Set permissions based on role
  if (this.role === 'Admin') {
    this.permissions = {
      canDeleteUsers: true,
      canManageGroups: true,
      canViewAnalytics: true,
      canGenerateSummaries: true,
      canManageChannels: true,
    };
  } else if (this.role === 'Manager') {
    this.permissions = {
      canDeleteUsers: false,
      canManageGroups: true,
      canViewAnalytics: true,
      canGenerateSummaries: true,
      canManageChannels: true,
    };
  } else {
    this.permissions = {
      canDeleteUsers: false,
      canManageGroups: false,
      canViewAnalytics: false,
      canGenerateSummaries: false,
      canManageChannels: false,
    };
  }
  
  next();
});

// Method to compare entered password with hashed password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password_hash);
};

const User = mongoose.model('User', UserSchema);

module.exports = User;
