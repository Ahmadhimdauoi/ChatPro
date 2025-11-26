const express = require('express');
const { markAsRead, getUnseenMessages } = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// All notification routes require authentication
router.use(protect);

router.post('/markAsRead', markAsRead); // Mark messages in a chat as read
router.get('/unseen', getUnseenMessages); // Get all unseen messages for a user

module.exports = router;
