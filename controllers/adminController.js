const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const User = require('../models/UserModel');
const Tender = require('../models/tenderModel');

// make jwt token
async function tokenMaker(user) {
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
    return token;
}

// decode jwt token
async function decodeToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
}

const unapprovedUsers = async (req, res) => {
    try {
        const users = await User.find({ approvedBy: null });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const approveUser = async (req, res) => {
    try {
        const user = await User.findById(req.body.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.approvedBy = req.user_id;
        user.role = req.body.role || 'emp';

        await user.save();
        res.status(200).json({ message: 'User approved successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const rejectUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const update = await User.findByIdAndUpdate(req.params.id, { approvedBy: null }, { new: true });
        if (!update) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User rejected successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const hideTender = async (req, res) => {
    try {
        // Extract tenderId from params or query
        const tenderId = req.params.tenderId || req.query.tenderId;

        // Validate tenderId
        if (!tenderId || !mongoose.Types.ObjectId.isValid(tenderId)) {
            return res.status(400).json({ message: 'Invalid or missing tenderId' });
        }

        // Find the tender by ID
        const tender = await Tender.findById(tenderId);
        if (!tender) {
            return res.status(404).json({ message: 'Tender not found' });
        }

        // Hide the tender
        tender.hidden = true;
        await tender.save().catch((err) => {
            return res.status(500).json({ message: 'Server error: ' + err.message });
        });

        res.status(200).json({ message: 'Tender hidden successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

const searchUser = async (req, res) => {
    const search = req.query.search || req.params.search;

    if (!search) {
        return res.status(400).json({ message: 'Search term is required' });
    }

    try {
        const users = await User.find(
            {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { empId: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ],
                approvedBy: { $ne: null }
            },
            'name empId email' // Only return relevant fields
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }

        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    unapprovedUsers,
    approveUser,
    rejectUser,
    hideTender,
    searchUser
};