const express = require('express');
const { getUsers } = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect this route to ensure only authenticated users can access the user list
router.get('/', protect, getUsers);

module.exports = router;