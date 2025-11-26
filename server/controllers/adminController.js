const Chat = require('../models/Chat');
const User = require('../models/User');
const Message = require('../models/Message');

/**
 * Remove member from group chat
 * @route   DELETE /api/admin/chats/:chatId/members/:userId
 * @access  Admin/Manager only
 */
const removeGroupMember = async (req, res) => {
  try {
    const { chatId, userId } = req.params;
    const adminId = req.userId;

    // Validate inputs
    if (!chatId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID and User ID are required'
      });
    }

    // Find the chat
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Verify it's a group chat
    if (chat.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove members from private chats'
      });
    }

    // Check if admin is part of the chat
    if (!chat.participants.includes(adminId)) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member of the chat to remove participants'
      });
    }

    // Check if user is in the chat
    if (!chat.participants.includes(userId)) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of this chat'
      });
    }

    // Don't allow removing the admin themselves
    if (userId === adminId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove yourself from the chat'
      });
    }

    // Remove user from participants
    chat.participants = chat.participants.filter(
      participantId => participantId.toString() !== userId
    );

    // Save the updated chat
    await chat.save();

    // Get user details for notification
    const removedUser = await User.findById(userId, 'username');

    // Send notification to removed user via socket
    const socketService = require('../services/socketService');
    socketService.emitToUser(userId, 'removedFromChat', {
      chatId: chat._id,
      chatName: chat.name,
      removedBy: adminId
    });

    res.status(200).json({
      success: true,
      message: `Successfully removed ${removedUser?.username || 'user'} from the chat`,
      data: {
        chatId: chat._id,
        removedUserId: userId,
        remainingParticipants: chat.participants.length
      }
    });

  } catch (error) {
    console.error('Remove group member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while removing group member'
    });
  }
};

/**
 * Create group chat (Admin only)
 * @route   POST /api/admin/groups
 * @access  Admin only
 */
const createGroup = async (req, res) => {
  try {
    const { name, description, participants, category, tags, isPrivate } = req.body;
    const adminId = req.userId;

    // Validate required fields
    if (!name || !participants || !Array.isArray(participants)) {
      return res.status(400).json({
        success: false,
        message: 'Group name and participants array are required'
      });
    }

    // Validate participants
    if (participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Group must have at least one participant'
      });
    }

    // Verify all participants exist
    const validParticipants = await User.find({ _id: { $in: participants } });
    if (validParticipants.length !== participants.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more participants do not exist'
      });
    }

    // Add admin to participants if not already included
    if (!participants.includes(adminId)) {
      participants.push(adminId);
    }

    // Create group chat
    const groupChat = new Chat({
      type: 'group',
      name: name.trim(),
      description: description?.trim() || '',
      participants: participants,
      groupAdmin: adminId,
      category: category || 'general',
      tags: tags || [],
      isPrivate: isPrivate || false
    });

    await groupChat.save();

    // Populate participant details for response
    await groupChat.populate('participants', 'username email department status');
    await groupChat.populate('groupAdmin', 'username email department status');

    // Notify all participants via socket
    const socketService = require('../services/socketService');
    participants.forEach(participantId => {
      socketService.emitToUser(participantId, 'addedToGroup', {
        chatId: groupChat._id,
        chatName: groupChat.name,
        addedBy: adminId
      });
    });

    res.status(201).json({
      success: true,
      message: `Group "${name}" created successfully`,
      data: groupChat
    });

  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating group'
    });
  }
};

/**
 * Add members to existing group (Admin only)
 * @route   POST /api/admin/groups/:chatId/members
 * @access  Admin only
 */
const addGroupMembers = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { participants } = req.body;
    const adminId = req.userId;

    // Validate inputs
    if (!chatId || !participants || !Array.isArray(participants)) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID and participants array are required'
      });
    }

    if (participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one participant must be provided'
      });
    }

    // Find the chat
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Verify it's a group chat
    if (chat.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'Cannot add members to private chats'
      });
    }

    // Check if admin is part of the chat
    if (!chat.participants.includes(adminId)) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member of the chat to add participants'
      });
    }

    // Verify all new participants exist
    const validParticipants = await User.find({ _id: { $in: participants } });
    if (validParticipants.length !== participants.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more participants do not exist'
      });
    }

    // Filter out existing participants
    const newParticipants = participants.filter(
      participantId => !chat.participants.includes(participantId)
    );

    if (newParticipants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All provided participants are already in the group'
      });
    }

    // Add new participants
    chat.participants.push(...newParticipants);
    await chat.save();

    // Populate participant details for response
    await chat.populate('participants', 'username email department status');
    await chat.populate('groupAdmin', 'username email department status');

    // Notify new members via socket
    const socketService = require('../services/socketService');
    newParticipants.forEach(participantId => {
      socketService.emitToUser(participantId, 'addedToGroup', {
        chatId: chat._id,
        chatName: chat.name,
        addedBy: adminId
      });
    });

    res.status(200).json({
      success: true,
      message: `Successfully added ${newParticipants.length} member(s) to the group`,
      data: {
        chatId: chat._id,
        newParticipants: newParticipants,
        totalParticipants: chat.participants.length
      }
    });

  } catch (error) {
    console.error('Add group members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding group members'
    });
  }
};

/**
 * Publish announcement to multiple groups (Admin only)
 * @route   POST /api/admin/announce
 * @access  Admin only
 */
const publishAnnouncement = async (req, res) => {
  try {
    const { message, groupIds, priority, messageType } = req.body;
    const adminId = req.userId;

    // Validate inputs
    if (!message || !groupIds || !Array.isArray(groupIds)) {
      return res.status(400).json({
        success: false,
        message: 'Message and group IDs array are required'
      });
    }

    if (groupIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one group must be selected'
      });
    }

    // Verify all groups exist and are group chats
    const validGroups = await Chat.find({ 
      _id: { $in: groupIds },
      type: 'group'
    });

    if (validGroups.length !== groupIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more groups do not exist or are not group chats'
      });
    }

    // Get admin details
    const admin = await User.findById(adminId, 'username email');

    // Create announcement messages for each group
    const messagePromises = validGroups.map(async (group) => {
      const Message = require('../models/Message');
      const announcement = new Message({
        chat_id: group._id,
        sender_id: adminId,
        sender_username: admin.username,
        content: message.trim(),
        messageType: messageType || 'announcement',
        priority: priority || 'important',
        is_read: false,
        timestamp: new Date()
      });

      await announcement.save();
      return {
        chatId: group._id,
        chatName: group.name,
        messageId: announcement._id
      };
    });

    const results = await Promise.all(messagePromises);

    // Collect all unique participants from all groups
    const allParticipants = new Set();
    validGroups.forEach(group => {
      group.participants.forEach(participantId => {
        if (participantId.toString() !== adminId) {
          allParticipants.add(participantId.toString());
        }
      });
    });

    // Send real-time notifications via socket
    const socketService = require('../services/socketService');
    allParticipants.forEach(participantId => {
      socketService.emitToUser(participantId, 'newAnnouncement', {
        message: message.trim(),
        sender: admin.username,
        groups: results,
        priority: priority || 'important',
        timestamp: new Date()
      });
    });

    res.status(201).json({
      success: true,
      message: `Announcement published to ${groupIds.length} group(s) successfully`,
      data: {
        announcement: message,
        publishedTo: results,
        totalRecipients: allParticipants.size,
        sender: admin.username,
        priority: priority || 'important'
      }
    });

  } catch (error) {
    console.error('Publish announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while publishing announcement'
    });
  }
};

/**
 * Delete group chat (Admin only)
 * @route   DELETE /api/admin/groups/:chatId
 * @access  Admin only
 */
const deleteGroup = async (req, res) => {
  try {
    const { chatId } = req.params;
    const adminId = req.userId;

    // Validate input
    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: 'Group ID is required'
      });
    }

    // Find the chat
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Verify it's a group chat
    if (chat.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete private chats, only group chats can be deleted'
      });
    }

    // Check if admin is the group admin or system admin
    const admin = await User.findById(adminId);
    if (!admin || (admin.role !== 'Admin' && chat.groupAdmin.toString() !== adminId)) {
      return res.status(403).json({
        success: false,
        message: 'Only system admins or group admins can delete groups'
      });
    }

    // Store group name for notification
    const groupName = chat.name;

    // Delete all messages in the group
    await Message.deleteMany({ chat_id: chatId });

    // Delete the group chat
    await Chat.findByIdAndDelete(chatId);

    // Notify all participants that the group was deleted
    const socketService = require('../services/socketService');
    chat.participants.forEach(participantId => {
      socketService.emitToUser(participantId, 'groupDeleted', {
        chatId: chatId,
        groupName: groupName,
        deletedBy: adminId
      });
    });

    res.status(200).json({
      success: true,
      message: `Group "${groupName}" deleted successfully`,
      data: {
        deletedGroupId: chatId,
        deletedGroupName: groupName,
        deletedBy: adminId
      }
    });

  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting group'
    });
  }
};

/**
 * Get all groups for admin management
 * @route   GET /api/admin/groups
 * @access  Admin only
 */
const getAllGroups = async (req, res) => {
  try {
    const groups = await Chat.find({ type: 'group' })
      .populate('participants', 'username email department status')
      .populate('groupAdmin', 'username email department status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Groups retrieved successfully',
      data: groups
    });

  } catch (error) {
    console.error('Get all groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving groups'
    });
  }
};

/**
 * Get all users for admin management
 * @route   GET /api/admin/users
 * @access  Admin only
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password_hash')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: users
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving users'
    });
  }
};

/**
 * Update user role
 * @route   PUT /api/admin/users/:userId/role
 * @access  Admin only
 */
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ['Admin', 'Manager', 'Employee'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be Admin, Manager, or Employee'
      });
    }

    // Find and update user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow user to change their own role
    if (userId === req.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    // Update role (permissions will be set automatically by pre-save middleware)
    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User role updated to ${role} successfully`,
      data: {
        userId: user._id,
        username: user.username,
        newRole: user.role,
        permissions: user.permissions
      }
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user role'
    });
  }
};

/**
 * Delete user (Admin only)
 * @route   DELETE /api/admin/users/:userId
 * @access  Admin only
 */
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Don't allow user to delete themselves
    if (userId === req.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user from all chats
    await Chat.updateMany(
      { participants: userId },
      { $pull: { participants: userId } }
    );

    // Delete user's messages
    await Message.deleteMany({ sender_id: userId });

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: `User ${user.username} deleted successfully`,
      data: {
        deletedUserId: userId,
        deletedUsername: user.username
      }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user'
    });
  }
};

/**
 * Get system analytics
 * @route   GET /api/admin/analytics
 * @access  Admin/Manager only
 */
const getAnalytics = async (req, res) => {
  try {
    // Get basic stats
    const totalUsers = await User.countDocuments();
    const totalChats = await Chat.countDocuments();
    const totalMessages = await Message.countDocuments();

    // Get role distribution
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get chat type distribution
    const chatTypeStats = await Chat.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent activity
    const recentMessages = await Message.find()
      .populate('sender_id', 'username')
      .sort({ timestamp: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      message: 'Analytics retrieved successfully',
      data: {
        overview: {
          totalUsers,
          totalChats,
          totalMessages
        },
        roleDistribution: roleStats,
        chatTypeDistribution: chatTypeStats,
        recentActivity: recentMessages
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving analytics'
    });
  }
};

module.exports = {
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
};
