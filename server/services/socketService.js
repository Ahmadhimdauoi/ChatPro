const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User'); // Required for user status updates
const Chat = require('../models/Chat'); // Required for chat participants

require('dotenv').config();

let io; // Hold the socket.io server instance

/**
 * Initializes Socket.IO with event listeners.
 * @param {Server} socketIoInstance The Socket.IO server instance.
 */
const initSocketIO = (socketIoInstance) => {
  io = socketIoInstance;

  // Middleware for JWT authentication
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId; // Attach userId to socket for later use
      socket.username = decoded.username; // Attach username
      next();
    } catch (error) {
      console.error('Socket.IO authentication failed:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected via Socket.IO: ${socket.userId} (${socket.username})`);

    // A user has connected, update their status to 'online'
    // and broadcast to other users (future implementation: emit 'userStatusUpdate')
    User.findByIdAndUpdate(socket.userId, { status: 'online' }, { new: true }).then(user => {
      if (user) {
        console.log(`User ${user.username} is now online.`);
        io.emit('userStatusUpdate', { userId: user._id, status: 'online' });
      }
    }).catch(err => console.error('Error updating user status to online:', err));


    // Client requests to join a specific chat room
    socket.on('joinChat', (chatId) => {
      if (chatId) {
        socket.join(chatId);
        console.log(`${socket.username} (${socket.userId}) joined chat room: ${chatId}`);
      }
    });

    // Client requests to leave a specific chat room
    socket.on('leaveChat', (chatId) => {
      if (chatId) {
        socket.leave(chatId);
        console.log(`${socket.username} (${socket.userId}) left chat room: ${chatId}`);
      }
    });


    socket.on('sendMessage', async (messageData) => {
      try {
        const { chat_id, content, fileAttachment, mentions } = messageData;
        const sender_id = socket.userId; // Get sender from authenticated socket
        const sender_username = socket.username;

        if (!chat_id || (!content && !fileAttachment) || !sender_id) {
          return socket.emit('sendMessageError', { message: 'Invalid message data' });
        }

        // Parse mentions from content if not provided
        let parsedMentions = mentions || [];
        if (!parsedMentions && content) {
          const mentionPattern = /@(\w+)/g;
          const matches = content.match(mentionPattern);
          if (matches) {
            const usernames = [...new Set(matches.map(match => match.substring(1)))];
            
            // Find users by usernames in the chat
            const chat = await Chat.findById(chat_id).populate('participants');
            if (chat) {
              parsedMentions = chat.participants
                .filter(participant => usernames.includes(participant.username))
                .map(participant => participant._id);
            }
          }
        }

        // Save message to DB
        const newMessage = new Message({
          chat_id,
          sender_id,
          content: content || '', // Allow empty content if file is present
          fileAttachment: fileAttachment || undefined,
          mentions: parsedMentions
        });
        await newMessage.save();

        // Populate sender info for frontend display
        const populatedMessage = {
          _id: newMessage._id,
          chat_id: newMessage.chat_id.toString(), // Convert ObjectId to string
          sender_id: newMessage.sender_id.toString(), // Convert ObjectId to string
          sender_username: sender_username, // Use username from socket
          content: newMessage.content,
          fileAttachment: newMessage.fileAttachment,
          mentions: newMessage.mentions,
          timestamp: newMessage.timestamp.toISOString(),
          is_read: newMessage.is_read,
        };

        // Get chat participants to send notifications
        const chat = await Chat.findById(chat_id).populate('participants');
        
        if (chat && chat.participants) {
          // Get all participants except the sender
          const recipients = chat.participants.filter(p => p._id.toString() !== sender_id);
          
          // Send notifications to all recipients (except sender)
          for (const recipient of recipients) {
            // Find recipient's socket (if connected)
            const recipientSocket = Array.from(io.sockets.sockets.values())
              .find(s => s.userId === recipient._id.toString());
            
            // Update recipient's unseen messages in database
            // Use findOneAndUpdate to avoid conflicts
            const recipientUser = await User.findById(recipient._id);
            if (recipientUser) {
              // Remove existing entry for this chat if exists
              recipientUser.unseenMessages = recipientUser.unseenMessages.filter(
                msg => msg.chatId.toString() !== chat_id.toString()
              );
              
              // Add new entry
              recipientUser.unseenMessages.push({
                chatId: chat_id,
                latestMessageContent: content,
                count: 1,
                timestamp: new Date()
              });
              
              await recipientUser.save();
            }
            
            // If recipient is connected, send notification
            if (recipientSocket) {
              recipientSocket.emit('notificationReceived', {
                chatId: chat_id,
                message: populatedMessage,
                senderUsername: sender_username,
                timestamp: new Date()
              });
              console.log(`Notification sent to user ${recipient._id} for chat ${chat_id}`);
            }
          }
        }

        // Emit message to all participants in the specific chat room
        // `io.to(chat_id)` will send to everyone in that room
        io.to(chat_id).emit('chatMessage', populatedMessage);

        console.log(`Message sent to chat ${chat_id} by ${sender_username}: "${content}"`);

      } catch (error) {
        console.error('Error sending message via Socket.IO:', error.message);
        socket.emit('sendMessageError', { message: 'Failed to send message', error: error.message });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`User disconnected via Socket.IO: ${socket.userId} (${socket.username}). Reason: ${reason}`);
      // A user has disconnected, update their status to 'offline'
      User.findByIdAndUpdate(socket.userId, { status: 'offline' }, { new: true }).then(user => {
        if (user) {
          console.log(`User ${user.username} is now offline.`);
          // Optional: io.emit('userStatusUpdate', { userId: user._id, status: 'offline' });
        }
      }).catch(err => console.error('Error updating user status to offline:', err));
    });
  });
};


/**
 * Returns the Socket.IO server instance.
 * @returns {Server|null} The Socket.IO server instance or null if not initialized.
 */
const getIO = () => {
    if (!io) {
        console.warn('Socket.IO not initialized!');
    }
    return io;
};

module.exports = { initSocketIO, getIO };