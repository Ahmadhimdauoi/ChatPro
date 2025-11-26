const express = require('express');
const { searchContent, getSearchSuggestions } = require('../controllers/searchController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// All search routes require authentication
router.use(protect);

/**
 * @route   GET /api/search
 * @desc    Search across chats, messages, and users
 * @access  Private
 */
router.get('/', searchContent);

/**
 * @route   GET /api/search/suggestions
 * @desc    Get search suggestions/autocomplete
 * @access  Private
 */
router.get('/suggestions', getSearchSuggestions);

module.exports = router;
