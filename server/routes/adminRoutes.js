const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { checkAdminRole, checkPermission, checkGroupManagement } = require('../middlewares/adminMiddleware');
const {
  removeGroupMember,
  createGroup,
  deleteGroup,
  addGroupMembers,
  publishAnnouncement,
  getAllGroups,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAnalytics
} = require('../controllers/adminController');

const router = express.Router();

// All admin routes require authentication
router.use(protect);

/**
 * @route   DELETE /api/admin/chats/:chatId/members/:userId
 * @desc    Remove member from group chat
 * @access  Admin/Manager only
 */
router.delete('/chats/:chatId/members/:userId', checkGroupManagement, removeGroupMember);

/**
 * @route   POST /api/admin/groups
 * @desc    Create new group chat
 * @access  Admin/Manager only
 */
router.post('/groups', checkGroupManagement, createGroup);

/**
 * @route   POST /api/admin/groups/:chatId/members
 * @desc    Add members to existing group
 * @access  Admin/Manager only
 */
router.post('/groups/:chatId/members', checkGroupManagement, addGroupMembers);

/**
 * @route   DELETE /api/admin/groups/:chatId
 * @desc    Delete group chat
 * @access  Admin only
 */
router.delete('/groups/:chatId', checkGroupManagement, deleteGroup);

/**
 * @route   GET /api/admin/groups
 * @desc    Get all groups for admin management
 * @access  Admin/Manager only
 */
router.get('/groups', checkGroupManagement, getAllGroups);

/**
 * @route   POST /api/admin/announce
 * @desc    Publish announcement to multiple groups
 * @access  Admin/Manager only
 */
router.post('/announce', checkGroupManagement, publishAnnouncement);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users for admin management
 * @access  Admin only (full list), Manager (limited view)
 */
router.get('/users', checkPermission('canManageGroups'), getAllUsers);

/**
 * @route   PUT /api/admin/users/:userId/role
 * @desc    Update user role
 * @access  Admin only
 */
router.put('/users/:userId/role', checkAdminRole, updateUserRole);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete user
 * @access  Admin only
 */
router.delete('/users/:userId', checkAdminRole, deleteUser);

/**
 * @route   GET /api/admin/analytics
 * @desc    Get system analytics
 * @access  Admin/Manager only
 */
router.get('/analytics', checkPermission('canViewAnalytics'), getAnalytics);

module.exports = router;
