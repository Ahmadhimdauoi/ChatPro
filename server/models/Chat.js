const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['private', 'group'],
    default: 'private',
    required: true,
  },
  name: {
    type: String,
    trim: true,
    // Required for group chats, optional for private chats
    required: function() {
      return this.type === 'group';
    },
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  groupAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Only required for group chats
    required: function() {
      return this.type === 'group';
    },
  },
  // New fields for enhanced features
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  pinnedMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  // For workspace/channel organization
  category: {
    type: String,
    enum: ['general', 'marketing', 'development', 'sales', 'hr', 'project', 'other'],
    default: 'general'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

ChatSchema.index({ participants: 1 }); // Index for querying by participants

const Chat = mongoose.model('Chat', ChatSchema);

module.exports = Chat;
