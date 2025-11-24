const jwt = require('jsonwebtoken');
require('dotenv').config();

const protect = (req, res, next) => {
  let token;

  console.log('🔐 Auth middleware - Request headers:', req.headers.authorization ? '✅ Authorization header found' : '❌ No Authorization header');
  console.log('🔐 Auth middleware - Authorization header value:', req.headers.authorization ? req.headers.authorization.substring(0, 30) + '...' : 'N/A');

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('🔐 Auth middleware - Token extracted:', token ? '✅' : '❌');

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('🔐 Auth middleware - Token verified:', decoded ? '✅' : '❌');
      console.log('🔐 Auth middleware - Decoded userId:', decoded.userId);

      // Attach user ID from token to request object
      // This will be useful for knowing who is making the request
      req.userId = decoded.userId;
      req.username = decoded.username; // Also attach username for convenience

      console.log('🔐 Auth middleware - req.userId set:', req.userId);
      next();
    } catch (error) {
      console.error('Auth middleware error:', error.message);
      res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    console.log('❌ Auth middleware - No token found in request');
    res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

module.exports = { protect };
