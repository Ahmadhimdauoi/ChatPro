const express = require('express');
const { uploadFile, getFileInfo } = require('../services/fileService');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// All file routes require authentication
router.use(protect);

/**
 * @route   POST /api/files/upload
 * @desc    Upload a file
 * @access  Private
 */
router.post('/upload', uploadFile, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileInfo = getFileInfo(req.file);

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: fileInfo
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during file upload'
    });
  }
});

module.exports = router;
