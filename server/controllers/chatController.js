const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User'); // To check participant existence and for population

// Helper to check if a private chat already exists between two users
const findExistingPrivateChat = async (participant1Id, participant2Id) => {
  const chat = await Chat.findOne({
    type: 'private',
    participants: {
      $all: [participant1Id, participant2Id],
      $size: 2, // Ensure only these two participants
    },
  });
  return chat;
};

// @desc    Create a new chat (private or group)
// @route   POST /api/chats
// @access  Private
const createChat = async (req, res) => {
  const { type, name, participants } = req.body; // Participants are an array of user IDs
  const currentUserId = req.userId;

  if (!type || !participants || !Array.isArray(participants) || participants.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid chat data provided.' });
  }

  // Ensure the current user is always a participant
  if (!participants.includes(currentUserId.toString())) {
    participants.push(currentUserId.toString());
  }

  // Validate participants exist
  const uniqueParticipants = [...new Set(participants)];
  const existingUsers = await User.find({ _id: { $in: uniqueParticipants } });
  if (existingUsers.length !== uniqueParticipants.length) {
    return res.status(400).json({ success: false, message: 'One or more participants not found.' });
  }

  try {
    let chat;
    if (type === 'private') {
      if (uniqueParticipants.length !== 2) {
        return res.status(400).json({ success: false, message: 'Private chat must have exactly two participants.' });
      }

      // Check if a private chat between these two users already exists
      const existingChat = await findExistingPrivateChat(uniqueParticipants[0], uniqueParticipants[1]);
      if (existingChat) {
        // If it exists, return the existing chat
        return res.status(200).json({
          success: true,
          message: 'Existing private chat retrieved.',
          data: existingChat,
        });
      }

      chat = new Chat({ type, participants: uniqueParticipants });

    } else if (type === 'group') {
      if (!name || name.trim() === '') {
        return res.status(400).json({ success: false, message: 'Group chat must have a name.' });
      }
      if (uniqueParticipants.length < 2) { // A group chat technically needs at least two if one is the creator
        return res.status(400).json({ success: false, message: 'Group chat must have at least two participants.' });
      }
      chat = new Chat({ type, name: name.trim(), participants: uniqueParticipants });

    } else {
      return res.status(400).json({ success: false, message: 'Invalid chat type.' });
    }

    await chat.save();

    // Populate participants for the response
    const populatedChat = await Chat.findById(chat._id)
      .populate('participants', 'username status email') // Select relevant fields
      .lean(); // Use .lean() for plain JS objects

    res.status(201).json({
      success: true,
      message: `${type} chat created successfully.`,
      data: populatedChat,
    });

  } catch (error) {
    console.error('Create Chat error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all chats for the authenticated user
// @route   GET /api/chats
// @access  Private
const getUserChats = async (req, res) => {
  try {
    const currentUserId = req.userId;

    // Find all chats where the current user is a participant
    let chats = await Chat.find({ participants: currentUserId })
      .populate('participants', 'username status') // Populate participant details
      .sort({ updatedAt: -1 }) // Sort by last update (e.g., last message)
      .lean(); // Use .lean() for performance when not saving back

    // For each chat, fetch the last message
    // This is less efficient than embedding lastMessage in Chat schema, but simpler for now
    for (let i = 0; i < chats.length; i++) {
      const lastMessage = await Message.findOne({ chat_id: chats[i]._id })
        .sort({ timestamp: -1 }) // Get the latest message
        .populate('sender_id', 'username') // Populate sender username
        .lean();

      if (lastMessage) {
        chats[i].lastMessage = {
          _id: lastMessage._id,
          chat_id: lastMessage.chat_id.toString(),
          sender_id: lastMessage.sender_id._id.toString(),
          sender_username: lastMessage.sender_id.username,
          content: lastMessage.content,
          timestamp: lastMessage.timestamp.toISOString(),
          is_read: lastMessage.is_read,
        };
      }
    }

    res.status(200).json({
      success: true,
      message: 'User chats fetched successfully.',
      data: chats,
    });
  } catch (error) {
    console.error('Get User Chats error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get messages for a specific chat
// @route   GET /api/chats/:chatId/messages
// @access  Private
const getChatMessages = async (req, res) => {
  const { chatId } = req.params;
  const currentUserId = req.userId;

  try {
    // First, verify that the current user is a participant in this chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(currentUserId)) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this chat.' });
    }

    // Fetch messages for the chat, sorted by timestamp
    const messages = await Message.find({ chat_id: chatId })
      .populate('sender_id', 'username') // Populate sender's username
      .sort('timestamp') // Sort by timestamp ascending
      .lean();

    // Format messages for frontend, including sender_username
    const formattedMessages = messages.map(msg => ({
      _id: msg._id,
      chat_id: msg.chat_id.toString(),
      sender_id: msg.sender_id._id.toString(),
      sender_username: msg.sender_id.username,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
      is_read: msg.is_read,
    }));

    res.status(200).json({
      success: true,
      message: 'Chat messages fetched successfully.',
      data: formattedMessages,
    });

  } catch (error) {
    console.error('Get Chat Messages error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createChat,
  getUserChats,
  getChatMessages,
};