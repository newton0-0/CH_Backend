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
    const authHeader = req.headers['authorization'];
    console.log(authHeader);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Access denied. Token is missing or improperly formatted.' });
    }

    const token = authHeader.split(' ')[1]; // Extract the token

    // Verify and decode the token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token has expired.' });
            }
            if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Invalid token.' });
            }
            return res.status(401).json({ message: 'Authentication failed.' });
        }

        // Role validation
        if (!decoded || decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden. Admin access required.' });
        }

        // Attach the user_id from the decoded token to the request object
        req.user_id = decoded.user_id;

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