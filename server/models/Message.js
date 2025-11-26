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
    required: function() {
      // Content is required unless there's a file attachment
      return !this.fileAttachment;
    },
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
  // Enhanced file attachment fields
  fileAttachment: {
    url: { type: String, required: false },
    filename: { type: String, required: false },
    originalName: { type: String, required: false },
    mimeType: { type: String, required: false },
    size: { type: Number, required: false },
    uploadedAt: { type: Date, default: Date.now }
  },
  // Mentions support
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Message priority and type
  priority: {
    type: String,
    enum: ['normal', 'urgent', 'important'],
    default: 'normal'
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'system', 'announcement'],
    default: 'text'
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Index for efficient querying of messages within a chat, sorted by timestamp
MessageSchema.index({ chat_id: 1, timestamp: 1 });

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message;
