const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['private', 'group'],
    required: [true, 'Chat type is required'],
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
    required: [true, 'Chat participants are required'],
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Add an index to participants for efficient lookup
  // This allows finding chats a user is part of quickly
}, {
  timestamps: true,
});

ChatSchema.index({ participants: 1 }); // Index for querying by participants

const Chat = mongoose.model('Chat', ChatSchema);

module.exports = Chat;
