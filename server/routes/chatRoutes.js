const express = require('express');
const { createChat, getUserChats, getChatMessages } = require('../controllers/chatController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// All chat routes require authentication
router.use(protect);

router.post('/', createChat); // Create a new chat
router.get('/', getUserChats); // Get all chats for the authenticated user
router.get('/:chatId/messages', getChatMessages); // Get messages for a specific chat

module.exports = router;