require('dotenv').config();

const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const mongoose = require('mongoose'); // Import mongoose

const dashboardRoutes = require('./routers/dashboard');
const userRoutes = require('./routers/userRoutes');
const adminRoutes = require('./routers/adminRoutes');

const app = express();

// Apply rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100000, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});

// Trust the first proxy
app.set('trust proxy', 1);

// Increase server timeout
app.use(function (req, res, next) {
    req.setTimeout(600000); // 10 minutes
    next();
});

app.use(limiter);
app.use(express.json()); // Middleware to parse JSON requests

// Middleware to log cross-origin requests
app.use((req, res, next) => {
    if (req.headers.origin) { // Check if the request has an origin header (indicates cross-origin)
        console.log(`[CORS] Cross-Origin Request Detected: 
        Origin: ${req.headers.origin}, 
        Method: ${req.method}, 
        Path: ${req.path}`);
    }
    next(); // Pass the request to the next middleware
});

app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || "*",
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'], // Allowed methods
    credentials: true, // Allow credentials in requests
    allowedHeaders: ['Content-Type', 'Authorization'], // Specify allowed headers
    exposedHeaders: ['Authorization'], // Headers exposed to the browser
}));


// MongoDB connection
const mongoUri = process.env.mongoUri; // MongoDB connection string
const port = process.env.PORT || 4000; // Port to run the server

const connectToMongoDB = async () => {
    try {
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        }).then(() => {
            app.listen(port, () => {
                console.log(`Server is running on port ${port}`);
            });
        })
        console.log('MongoDB connected successfully');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1); // Exit the process if the connection fails
    }
};

// Handle MongoDB connection errors and reconnections
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});
mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB connection lost, attempting to reconnect...');
    connectToMongoDB();
});

// Define routes
const router = express.Router();

// Utility function to handle errors in async routes
// const asyncHandler = (fn) => (req, res, next) =>
//     Promise.resolve(fn(req, res, next)).catch(next);

// Differentiating Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false,
        error: 'Internal Server Error' 
    });
});

// Connect to MongoDB
connectToMongoDB();