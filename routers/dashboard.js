const express = require('express');
const router = express.Router();

const { allTenders, 
    highlightTenders
} = require('../controllers/dashboard');

// Utility function to handle errors in async routes
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

router.get('/all-tenders', asyncHandler(allTenders));
router.get('/highlight-tenders', asyncHandler(highlightTenders));

module.exports = router;