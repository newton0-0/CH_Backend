require('dotenv').config(); // Load environment variables

const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const mongoose = require('mongoose'); // Import mongoose
const Tender = require('./tenderModel'); // Import the Mongoose model
const { spawn } = require('child_process');

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
    origin: '*', // Replace with your frontend URL
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Allow credentials to be included in requests
}));

// MongoDB connection
const mongoUri = process.env.mongoUri; // MongoDB connection string

const connectToMongoDB = async () => {
    try {
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
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
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

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

// Run the crawler
router.get('/run-crawler', async (req, res) => {
    const pythonProcess = spawn('python', ['crawler.py'], {timeout: 3000000});
    let outputData = '';

    pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Error: ${data}`);
    });

    pythonProcess.on('close', async (code) => {
        console.log(`Python script finished with code ${code}`);
        if (code === 0) {
            try {
                const tenders = JSON.parse(outputData);
                res.json(tenders);
            } catch (error) {
                console.error(`Failed to parse output: ${error}`);
                res.status(500).send('Failed to parse Python script output');
            }
        } else {
            res.status(500).send('Python script exited with an error');
        }
    });
});

// Get all tenders with pagination, sorting, and limiting
router.get('/all-tenders', asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1); // Default to 1
    const quantity = Math.max(1, parseInt(req.query.quantity, 10) || 20); // Default to 10
    const sorting = req.query.sorting === 'desc' ? -1 : 1; // Determine sorting order
    const sortBy = req.query.sortBy || 'tender_title'; // Default sort field

    const allTenders = await Tender.find()
        .skip((page - 1) * quantity)
        .limit(quantity)
        .sort({ [sortBy]: sorting });

    if (allTenders.length === 0) {
        return res.status(404).json({ message: 'No tenders found.' });
    }

    console.log(`Retrieved ${allTenders.length} tenders from page ${page}.`);
    res.json(allTenders);
}));

// Use the router
app.use('/api', router);

// Start the server
const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Connect to MongoDB
connectToMongoDB();