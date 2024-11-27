const Tender = require('../models/tenderModel');

const allTenders = async (req, res) => {
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

    res.json({
        status: 'success',
        code: 200,
        data : allTenders
    });
}

const highlightTenders = async (req, res) => {
    const tendersByWorks = await Tender.aggregate([
        {
            $group: {
                _id: "$tender_category",  // Group by "tender_category"
                count: { $sum: 1 },       // Count the number of documents in each group
                docs: { $push: "$$ROOT" } // Collect all documents in each group
            }
        },
        {
            $project: {
                _id: 1,
                count: 1,                // Include the count
                docs: { $slice: ["$docs", 20] } // Limit to the first 20 documents
            }
        }
    ]);

    const reachingDeadlineTenders = await Tender.find({}).sort({ bid_end_date: 1 }).limit(20);
    const bestValuedTenders = await Tender.find({}).sort({ tender_value: -1 }).limit(20);

    res.json({
        status: 'success',
        code: 200,
        data : {
            tendersByWorks: tendersByWorks,
            reachingDeadlineTenders: reachingDeadlineTenders,
            bestValuedTenders: bestValuedTenders
        }})
};

const searchTenders = async (req, res) => {
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
}

module.exports = {allTenders, highlightTenders, searchTenders};