const User = require('../models/User');

// @desc    Mark messages in a chat as read for a user
// @route   POST /api/notifications/markAsRead
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const { chatId } = req.body;
    const userId = req.userId;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID is required'
      });
    }

    // Remove or update the unseen messages entry for this chat
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $pull: { unseenMessages: { chatId: chatId } }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Messages marked as read successfully',
      data: {
        unseenMessages: updatedUser.unseenMessages
      }
    });

  } catch (error) {
    console.error('Mark as read error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while marking messages as read'
    });
  }
};

// @desc    Get all unseen messages for a user
// @route   GET /api/notifications/unseen
// @access  Private
const getUnseenMessages = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId)
      .populate('unseenMessages.chatId', 'name type participants')
      .select('unseenMessages');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Unseen messages retrieved successfully',
      data: user.unseenMessages
    });

  } catch (error) {
    console.error('Get unseen messages error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving unseen messages'
    });
  }
};

module.exports = {
  markAsRead,
  getUnseenMessages
};
