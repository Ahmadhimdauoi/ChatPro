const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');

/**
 * @desc    Pin a message in a chat
 * @route   POST /api/chats/:chatId/pin
 * @access  Private
 */
const pinMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { messageId } = req.body;
    const userId = req.userId;

    // Validate chat exists and user is participant
    const chat = await Chat.findOne({ 
      _id: chatId, 
      participants: userId 
    }).populate('pinnedMessageId');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found or access denied'
      });
    }

    // Validate message exists and belongs to chat
    const message = await Message.findOne({ 
      _id: messageId, 
      chat_id: chatId 
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found in this chat'
      });
    }

    // Update chat with pinned message
    chat.pinnedMessageId = messageId;
    await chat.save();

    // Populate the pinned message details
    const updatedChat = await Chat.findById(chatId)
      .populate({
        path: 'pinnedMessageId',
        populate: {
          path: 'sender_id',
          select: 'username'
        }
      });

    res.status(200).json({
      success: true,
      message: 'Message pinned successfully',
      data: {
        pinnedMessage: updatedChat.pinnedMessageId
      }
    });

  } catch (error) {
    console.error('Pin message error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while pinning message'
    });
  }
};

/**
 * @desc    Unpin a message in a chat
 * @route   DELETE /api/chats/:chatId/pin
 * @access  Private
 */
const unpinMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    // Validate chat exists and user is participant
    const chat = await Chat.findOne({ 
      _id: chatId, 
      participants: userId 
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found or access denied'
      });
    }

    // Remove pinned message
    chat.pinnedMessageId = null;
    await chat.save();

    res.status(200).json({
      success: true,
      message: 'Message unpinned successfully'
    });

  } catch (error) {
    console.error('Unpin message error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while unpinning message'
    });
  }
};

/**
 * @desc    Parse mentions in message content
 * @route   POST /api/chats/parse-mentions
 * @access  Private
 */
const parseMentions = async (req, res) => {
  try {
    const { content, chatId } = req.body;
    const userId = req.userId;

    if (!content || !chatId) {
      return res.status(400).json({
        success: false,
        message: 'Content and chatId are required'
      });
    }

    // Find mentioned users (@username pattern)
    const mentionPattern = /@(\w+)/g;
    const matches = content.match(mentionPattern);
    
    if (!matches) {
      return res.status(200).json({
        success: true,
        data: { mentionedUsers: [] }
      });
    }

    // Get unique usernames from mentions
    const usernames = [...new Set(matches.map(match => match.substring(1)))];
    
    // Find users by usernames in the chat
    const chat = await Chat.findById(chatId).populate('participants');
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const mentionedUsers = chat.participants.filter(participant => 
      usernames.includes(participant.username)
    );

    res.status(200).json({
      success: true,
      data: { 
        mentionedUsers: mentionedUsers.map(user => ({
          _id: user._id,
          username: user.username
        }))
      }
    });

  } catch (error) {
    console.error('Parse mentions error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while parsing mentions'
    });
  }
};

/**
 * @desc    Get users available for mention in a chat
 * @route   GET /api/chats/:chatId/mentionable-users
 * @access  Private
 */
const getMentionableUsers = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.userId;

    const chat = await Chat.findById(chatId).populate('participants');
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Return all participants except current user
    const mentionableUsers = chat.participants
      .filter(participant => participant._id.toString() !== userId)
      .map(participant => ({
        _id: participant._id,
        username: participant.username,
        department: participant.department
      }));

    res.status(200).json({
      success: true,
      data: { mentionableUsers }
    });

  } catch (error) {
    console.error('Get mentionable users error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching mentionable users'
    });
  }
};

module.exports = {
  pinMessage,
  unpinMessage,
  parseMentions,
  getMentionableUsers
};
