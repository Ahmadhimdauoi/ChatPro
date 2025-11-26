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

/**
 * Middleware to check if user has specific permission
 * @param {string} permission - The permission to check (e.g., 'canGenerateSummaries')
 */
const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const userId = req.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user has the required permission
      if (!user.permissions[permission]) {
        console.log(`❌ Permission check - User lacks permission: ${permission}`);
        return res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${permission}`
        });
      }

      console.log(`✅ Permission check - User has permission: ${permission}`);
      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while checking permissions'
      });
    }
  };
};

/**
 * Middleware to check if user can manage groups (Admin or Manager)
 */
const checkGroupManagement = async (req, res, next) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Allow Admin and Manager to manage groups
    if (user.role !== 'Admin' && user.role !== 'Manager') {
      console.log('❌ Group management - User is not Admin or Manager:', user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or Manager role required'
      });
    }

    console.log('✅ Group management - User can manage groups');
    next();
  } catch (error) {
    console.error('Group management middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking group management permissions'
    });
  }
};

module.exports = {
  checkAdminRole,
  checkPermission,
  checkGroupManagement
};
