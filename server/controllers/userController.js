const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (requires authentication)
const getUsers = async (req, res) => {
  try {
    // Find all users, excluding sensitive fields and '__v'
    const users = await User.find({ _id: { $ne: req.userId } }).select('-password_hash -__v -createdAt -updatedAt');

    res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: users,
    });
  } catch (error) {
    console.error('Get Users error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getUsers,
};