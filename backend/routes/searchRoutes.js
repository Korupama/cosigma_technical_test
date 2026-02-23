const express = require('express');
const multer = require('multer');
const { searchRelated } = require('../controllers/searchController');

const router = express.Router();

// Configure multer for in-memory PDF file upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    },
});

// POST /api/search - Find related text in a PDF
router.post('/search', upload.single('pdf'), searchRelated);

module.exports = router;
