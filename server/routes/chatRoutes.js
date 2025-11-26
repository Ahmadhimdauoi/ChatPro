const express = require('express');
const { createChat, getUserChats, getChatMessages, sendMessage } = require('../controllers/chatController');
const { protect } = require('../middlewares/authMiddleware');
const { checkAdminRole } = require('../middlewares/adminMiddleware');

const router = express.Router();

// All chat routes require authentication
router.use(protect);

router.post('/', createChat); // Create a new chat (private or group)
router.post('/group', checkAdminRole, createChat); // Admin-only group creation
router.get('/', getUserChats); // Get all chats for the authenticated user
router.get('/:chatId/messages', getChatMessages); // Get messages for a specific chat
router.post('/:chatId/messages', sendMessage); // Send a message to a chat

module.exports = router;