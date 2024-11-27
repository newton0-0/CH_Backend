const express = require('express');
const router = express.Router();

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

const {
    approveUser,
    rejectUser,
    hideTender,
    searchUser,
    unapprovedUsers
} = require('../controllers/adminController');

dotenv.config(); // Load environment variables

// Middleware to authenticate and extract user_id from the token
const authenticateToken = (req, res, next) => {
    // Get the token from the Authorization header
    const token = req.headers['authorization']?.split(' ')[1]; // Assumes token is in the form 'Bearer <token>'
    console.log(req.headers);
    console.log(token);
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Verify and decode the token
    jwt.decode(token, { complete: true }, (err, decoded) => {
        if (err || !decoded || !decoded.payload || decoded.payload.role !== 'admin') {
            return res.status(401).json({ message: 'Invalid or unauthorized token.' });
        }

        // Attach the user_id from the decoded token to the request object
        req.user_id = decoded.payload.user_id;

        // Pass the request to the next middleware or route handler
        next();
    });

};

// Utility function to handle errors in async routes
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// Protected routes (authentication required)
router.get('/pending-users', authenticateToken, asyncHandler(unapprovedUsers));
router.post('/approve-user', authenticateToken, asyncHandler(approveUser));
router.get('/reject-user', authenticateToken, asyncHandler(rejectUser));
router.get('/hide-tender', authenticateToken, asyncHandler(hideTender));
router.get('/search-user', authenticateToken, asyncHandler(searchUser));

module.exports = router;