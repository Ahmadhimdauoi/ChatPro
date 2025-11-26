const express = require('express');
const Message = require('../models/Message');
const { protect } = require('../middlewares/authMiddleware');
const { checkPermission } = require('../middlewares/adminMiddleware');

const router = express.Router();

// All summary routes require authentication
router.use(protect);

/**
 * @route   POST /api/chat/summarize
 * @desc    Generate AI summary of a conversation
 * @access  Private (Admin/Manager only)
 */
router.post('/summarize', checkPermission('canGenerateSummaries'), async (req, res) => {
  try {
    const { chatId } = req.body;
    const userId = req.userId;

    // Validate chat ID
    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID is required'
      });
    }

    // Fetch the last 50 messages for this chat
    const messages = await Message.find({ chat_id: chatId })
      .sort({ timestamp: -1 })
      .limit(50)
      .populate('sender_id', 'username')
      .lean();

    if (!messages || messages.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No messages found to summarize',
        data: { summary: 'No messages to summarize.' }
      });
    }

    // Format messages for AI processing
    const formattedMessages = messages.map(msg => ({
      content: msg.content,
      sender_username: msg.sender_id?.username || 'Unknown',
      timestamp: msg.timestamp
    }));

    // For now, return a simple summary (replace with actual AI integration)
    const summary = generateSimpleSummary(formattedMessages);

    res.status(200).json({
      success: true,
      message: 'Conversation summary generated successfully',
      data: { 
        summary,
        messageCount: messages.length,
        chatId
      }
    });

  } catch (error) {
    console.error('Conversation summary error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while generating conversation summary'
    });
  }
});

/**
 * Simple summary generation function (temporary placeholder)
 * Replace with actual Gemini AI integration
 */
function generateSimpleSummary(messages) {
  if (messages.length === 0) return 'No messages to summarize.';
  
  const participants = [...new Set(messages.map(m => m.sender_username))];
  const messageTypes = {
    questions: messages.filter(m => m.content.includes('?')).length,
    important: messages.filter(m => 
      m.content.toLowerCase().includes('important') || 
      m.content.toLowerCase().includes('urgent') ||
      m.content.toLowerCase().includes('deadline')
    ).length
  };

  const oldestMessage = messages[messages.length - 1];
  const newestMessage = messages[0];
  const timeSpan = newestMessage.timestamp - oldestMessage.timestamp;
  const hours = Math.floor(timeSpan / (1000 * 60 * 60));
  
  return `📊 **Conversation Summary**
  
**Participants:** ${participants.join(', ')}
**Messages:** ${messages.length} messages over ${hours} hours
**Key Activity:** ${messageTypes.questions} questions asked, ${messageTypes.important} important items

**Recent Topics:**
${messages.slice(0, 5).map(m => `• ${m.sender_username}: ${m.content.substring(0, 100)}...`).join('\n')}

*This is a basic summary. AI-powered summaries coming soon!*`;
}

module.exports = router;
