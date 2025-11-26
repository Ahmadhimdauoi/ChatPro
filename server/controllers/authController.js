const User = require('../models/User');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Helper function to generate a JWT token
const generateToken = (id, username, email) => {
  return jwt.sign({ userId: id, username, email }, process.env.JWT_SECRET, {
    expiresIn: '1h', // Token expires in 1 hour
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  const { username, email, password, department } = req.body;

  if (!username || !email || !password || !department) {
    return res.status(400).json({ success: false, message: 'Please enter all fields' });
  }

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User with that email already exists' });
    }

    user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    // Hash password automatically handled by pre-save hook in User model
    user = new User({
      username,
      email,
      password_hash: password, // The pre-save hook will hash this
      department,
      status: 'offline', // Default status on registration
    });

    await user.save();

    const token = generateToken(user._id, user.username, user.email);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          department: user.department,
          status: user.status,
          role: user.role, // Add role field
          permissions: user.permissions, // Add permissions field
        },
        token,
      },
    });

  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please enter all fields' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user._id, user.username, user.email);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          department: user.department,
          status: user.status,
          role: user.role, // Add role field
          permissions: user.permissions, // Add permissions field
        },
        token,
      },
    });

  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
};
