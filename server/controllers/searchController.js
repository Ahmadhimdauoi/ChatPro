const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');

/**
 * @desc    Search across chats and messages
 * @route   GET /api/search?q=query&limit=20&page=1
 * @access  Private
 */
const searchContent = async (req, res) => {
  try {
    const { q: query, limit = 20, page = 1, type = 'all' } = req.query;
    const userId = req.userId;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const searchQuery = query.trim();
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const skip = (pageNum - 1) * limitNum;

    const results = {
      chats: [],
      messages: [],
      users: [],
      total: 0
    };

    // Search chats (chat names, descriptions)
    if (type === 'all' || type === 'chats') {
      const chatResults = await Chat.find({
        $and: [
          { participants: userId },
          {
            $or: [
              { name: { $regex: searchQuery, $options: 'i' } },
              { description: { $regex: searchQuery, $options: 'i' } },
              { tags: { $in: [new RegExp(searchQuery, 'i')] } }
            ]
          }
        ]
      })
      .populate('participants', 'username department')
      .populate('groupAdmin', 'username')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .limit(limitNum);

      results.chats = chatResults;
    }

    // Search messages (message content)
    if (type === 'all' || type === 'messages') {
      // First, get all chat IDs the user has access to
      const userChats = await Chat.find({ participants: userId }).select('_id');
      const chatIds = userChats.map(chat => chat._id);

      const messageResults = await Message.find({
        $and: [
          { chat_id: { $in: chatIds } },
          { content: { $regex: searchQuery, $options: 'i' } }
        ]
      })
      .populate('sender_id', 'username department')
      .populate('chat_id', 'name type')
      .sort({ timestamp: -1 })
      .limit(limitNum)
      .skip(skip);

      results.messages = messageResults;
    }

    // Search users (for @mentions)
    if (type === 'all' || type === 'users') {
      const userResults = await User.find({
        $and: [
          { _id: { $ne: userId } }, // Exclude current user
          {
            $or: [
              { username: { $regex: searchQuery, $options: 'i' } },
              { email: { $regex: searchQuery, $options: 'i' } },
              { department: { $regex: searchQuery, $options: 'i' } }
            ]
          }
        ]
      })
      .select('username email department status')
      .sort({ username: 1 })
      .limit(limitNum);

      results.users = userResults;
    }

    // Calculate total results count
    results.total = results.chats.length + results.messages.length + results.users.length;

    res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: {
        query: searchQuery,
        results,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: results.total,
          hasMore: results.messages.length === limitNum
        }
      }
    });

  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during search'
    });
  }
};

/**
 * @desc    Get search suggestions/autocomplete
 * @route   GET /api/search/suggestions?q=query
 * @access  Private
 */
const getSearchSuggestions = async (req, res) => {
  try {
    const { q: query } = req.query;
    const userId = req.userId;

    if (!query || query.trim().length < 2) {
      return res.status(200).json({
        success: true,
        data: { suggestions: [] }
      });
    }

    const searchQuery = query.trim();
    const suggestions = [];

    // Get recent chats that match
    const chatSuggestions = await Chat.find({
      $and: [
        { participants: userId },
        {
          $or: [
            { name: { $regex: `^${searchQuery}`, $options: 'i' } },
            { description: { $regex: `^${searchQuery}`, $options: 'i' } }
          ]
        }
      ]
    })
    .select('name description type')
    .limit(5);

    // Get user suggestions for mentions
    const userSuggestions = await User.find({
      $and: [
        { _id: { $ne: userId } },
        {
          $or: [
            { username: { $regex: `^${searchQuery}`, $options: 'i' } },
            { email: { $regex: `^${searchQuery}`, $options: 'i' } }
          ]
        }
      ]
    })
    .select('username email department')
    .limit(5);

    suggestions.push(
      ...chatSuggestions.map(chat => ({
        type: 'chat',
        text: chat.name || `Private Chat`,
        subtitle: chat.description || chat.type,
        id: chat._id
      })),
      ...userSuggestions.map(user => ({
        type: 'user',
        text: user.username,
        subtitle: `${user.department} • ${user.email}`,
        id: user._id
      }))
    );

    res.status(200).json({
      success: true,
      data: { suggestions }
    });

  } catch (error) {
    console.error('Search suggestions error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while getting suggestions'
    });
  }
};

module.exports = {
  searchContent,
  getSearchSuggestions
};
