const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  chat_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: [true, 'Chat ID is required'],
  },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender ID is required'],
  },
  content: {
    type: String,
    required: [true, 'Message content cannot be empty'],
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  is_read: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Index for efficient querying of messages within a chat, sorted by timestamp
MessageSchema.index({ chat_id: 1, timestamp: 1 });

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message;
