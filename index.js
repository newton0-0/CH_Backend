require('dotenv').config();

const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const mongoose = require('mongoose'); // Import mongoose

const Tender = require('./models/tenderModel'); // Import the Mongoose model

const dashboardRoutes = require('./routers/dashboard');
const userRoutes = require('./routers/userRoutes');

const app = express();

// Apply rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
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
app.use(cors({
    origin: "*", // Allow multiple origins if provided
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

// Search Tenders API
router.get('/search-tenders', async (req, res) => {
    const { search, page = 1, quantity = 10, sorting = 'asc', sortBy = 'tender_title' } = req.query;

    try {
        // Build the search query based on the search value
        const searchQuery = {
            $or: [
                { tender_title: { $regex: search, $options: 'i' } },
                { tender_reference_number: { $regex: search, $options: 'i' } },
                { tender_id: { $regex: search, $options: 'i' } }
            ]
        };

        // Retrieve tenders with pagination, sorting, and limiting
        const tenders = await Tender.find(searchQuery)
            .skip((page - 1) * quantity)
            .limit(parseInt(quantity))
            .sort({ [sortBy]: sorting === 'asc' ? 1 : -1 });

        if (tenders.length === 0) {
            return res.status(404).json({ message: 'No tenders found matching your search.' });
        }

        res.json(tenders);
    } catch (error) {
        console.error('Error searching tenders:', error);
        res.status(500).json({ error: 'Server error while searching tenders.' });
    }
});

// Differentiating Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/user', userRoutes);

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