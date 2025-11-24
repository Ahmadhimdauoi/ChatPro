const User = require('../models/User');

/**
 * Middleware to check if user has Admin role
 * Must be used after authentication middleware
 */
const checkAdminRole = async (req, res, next) => {
  try {
    // Get user ID from the authenticated request (set by auth middleware)
    const userId = req.userId; // Auth middleware sets req.userId directly
    console.log('🔐 Admin middleware - userId:', userId);
    
    if (!userId) {
      console.log('❌ Admin middleware - No userId found');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Find user and check role
    const user = await User.findById(userId);
    console.log('🔐 Admin middleware - user found:', user ? '✅' : '❌');
    console.log('🔐 Admin middleware - user role:', user?.role);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'Admin') {
      console.log('❌ Admin middleware - User is not Admin:', user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required'
      });
    }

    console.log('✅ Admin middleware - User is Admin, proceeding');
    // User is Admin, proceed to next middleware/route
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking admin role'
    });
  }
};

module.exports = checkAdminRole;
