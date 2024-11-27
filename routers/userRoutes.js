const express = require('express');
const router = express.Router();

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

const { 
    userLogin, 
    userRegistration,
    verifyToken,
    getUserWishlist,
    addTenderToWishlist,
    removeTenderFromWishlist,
    getUserComparison,
    addTenderToComparison,
    removeTenderFromComparison
} = require('../controllers/userController');

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
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid or expired token.' });
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

// Public routes (no authentication required)
router.post('/login', asyncHandler(userLogin));
router.post('/register', asyncHandler(userRegistration));
router.get('/verify-token', asyncHandler(verifyToken));

// Protected routes (authentication required)
router.get('/user-wishlist', authenticateToken, asyncHandler(getUserWishlist));
router.get('/add-to-wishlist', authenticateToken, asyncHandler(addTenderToWishlist));
router.delete('/remove-from-wishlist', authenticateToken, asyncHandler(removeTenderFromWishlist));
router.get('/user-comparison', authenticateToken, asyncHandler(getUserComparison));
router.get('/add-to-comparison', authenticateToken, asyncHandler(addTenderToComparison));
router.get('/remove-from-comparison', authenticateToken, asyncHandler(removeTenderFromComparison));

module.exports = router;
