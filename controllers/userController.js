const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');
const SmsModel = require('../models/SmsModel');

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

const userLogin = async (req, res) => {
    const { email, password } = req.body;

    try {
        const loginRes = await User.login(email, password);

        res.json({
            status: 'success',
            code: 200,
            data: loginRes.user,
            role: loginRes.user.role,
            token : `Bearer ${loginRes.token}`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

const userRegistration = async (req, res) => {
    try {
        const { empId, email, password, name } = req.body;
        const user = await User.create({ name, empId, email, password });

        res.status(200).json({
            status: 'success',
            code: 200,
            data : user
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
};

const verifyToken = async (req, res, next) => {
    const token = req.get('Authorization').split(' ')[1];
    console.log(token);
    try {
        const decoded = await jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(401).json({
                status: 'fail',
                code: 401,
                message: 'Unauthorized: Invalid token'
            });
        }
        console.log(decoded);
        const user = await User.findById(decoded.id);
        res.status(200).json({
            status: 'success',
            code: 200,
            message: 'Token is valid',
            role: user.role
        });
    } catch (error) {
        res.status(500).json({
            status: 'fail',
            code: 500,
            message: 'Server error: ' + error.message
        });
    }
};

const getUserWishlist = async (req, res) => {
    const token = req.get('Authorization').split(' ')[1]; // Extract the token from "Bearer
    const userId = await decodeToken(token);

    if (!userId) {
        return res.status(401).json({
            status: 'fail',
            code: 401,
            message: 'Unauthorized: Invalid token'
        });
    }

    try {
        const userWishlist = await User.findById(userId.id).select('wishlist').populate('wishlist');

        if (!userWishlist) {
            return res.status(404).json({
                status: 'fail',
                code: 404,
                message: 'User not found'
            });
        }

        res.json({
            status: 'success',
            code: 200,
            data: userWishlist.wishlist
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

const addTenderToWishlist = async (req, res) => {
    const tenderId = req.query.tenderId;

    // Check if Authorization header is provided
    if (!req.headers.authorization) {
        return res.status(401).json({
            status: 'fail',
            code: 401,
            message: 'Unauthorized: Authorization token is missing'
        });
    }

    const token = req.headers.authorization.split(' ')[1]; // Extract the token from "Bearer <token>"
    const userId = await decodeToken(token);

    if (!userId) {
        return res.status(401).json({
            status: 'fail',
            code: 401,
            message: 'Unauthorized: Invalid token'
        });
    }

    try {
        const addTenderToUserWishlist = await User.findByIdAndUpdate(
            userId.id,
            { $addToSet: { wishlist: tenderId } },
            { new: true }
        ).populate('wishlist');

        if (!addTenderToUserWishlist) {
            return res.status(404).json({
                status: 'fail',
                code: 404,
                message: 'User not found'
            });
        }

        res.json({
            status: 'success',
            code: 200,
            message: 'Tender added to wishlist',
            data: {
                email : addTenderToUserWishlist.email,
                updatedWishlist : addTenderToUserWishlist.wishlist
            }
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            status: 'fail',
            code: 500,
            message: 'Server error: ' + error.message
        });
    }
}

const removeTenderFromWishlist = async (req, res) => {
    const tenderId = req.query.tenderId;

    // Check if Authorization header is provided
    if (!req.headers.authorization) {
        return res.status(401).json({
            status: 'fail',
            code: 401,
            message: 'Unauthorized: Authorization token is missing'
        });
    }

    const token = req.headers.authorization.split(' ')[1]; // Extract the token from "Bearer <token>"
    const userId = await decodeToken(token);

    if (!userId) {
        return res.status(401).json({
            status: 'fail',
            code: 401,
            message: 'Unauthorized: Invalid token'
        });
    }

    try {
        const removeTenderFromWishlist = await User.findByIdAndUpdate(
            userId.id,
            { $pull: { wishlist: tenderId } },
            { new: true }
        ).populate('wishlist');

        if (!removeTenderFromWishlist) {
            return res.status(404).json({
                status: 'fail',
                code: 404,
                message: 'User not found'
            });
        }

        res.json({
            status: 'success',
            code: 200,
            message: 'Tender removed from wishlist',
            data: removeTenderFromWishlist
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            status: 'fail',
            code: 500,
            message: 'Server error: ' + error.message
        });
    }
}

const getUserComparison = async (req, res) => {
    const token = req.get('Authorization').split(' ')[1]; // Extract the token from "Bearer
    const userId = await decodeToken(token);    

    if (!userId) {
        return res.status(401).json({
            status: 'fail',
            code: 401,
            message: 'Unauthorized: Invalid token'
        });
    }

    try {
        const userComparison = await User.findById(userId.id).select('incomparison').populate('incomparison');

        if (!userComparison) {
            return res.status(404).json({
                status: 'fail',
                code: 404,
                message: 'User not found'
            });
        }
        
        res.json({
            status: 'success',
            code: 200,
            data: userComparison.incomparison
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

const addTenderToComparison = async (req, res) => {
    const tenderId = req.query.tenderId;

    // Check if Authorization header is provided
    if (!req.headers.authorization) {
        return res.status(401).json({
            status: 'fail',
            code: 401,
            message: 'Unauthorized: Authorization token is missing'
        });
    }

    const token = req.headers.authorization.split(' ')[1]; // Extract the token from "Bearer <token>"
    const userId = await decodeToken(token);

    if (!userId) {
        return res.status(401).json({
            status: 'fail',
            code: 401,
            message: 'Unauthorized: Invalid token'
        });
    }

    try {
        const addTenderForComparison = await User.findByIdAndUpdate(
            userId.id,
            { $addToSet: { incomparison: tenderId } },
            { new: true }
        ).populate('incomparison');

        if (!addTenderForComparison) {
            return res.status(404).json({
                status: 'fail',
                code: 404,
                message: 'User not found'
            });
        }

        res.json({
            status: 'success',
            code: 200,
            message: 'Tender added for comparison',
            data: {
                email : addTenderForComparison.email,
                updatedComparison : addTenderForComparison.incomparison
            }
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            status: 'fail',
            code: 500,
            message: 'Server error: ' + error.message
        });
    }
}

const removeTenderFromComparison = async (req, res) => {
    const tenderId = req.query.tenderId;

    // Check if Authorization header is provided
    if (!req.headers.authorization) {
        return res.status(401).json({
            status: 'fail',
            code: 401,
            message: 'Unauthorized: Authorization token is missing'
        });
    }

    const token = req.headers.authorization.split(' ')[1]; // Extract the token from "Bearer <token>"
    const userId = await decodeToken(token);

    if (!userId) {
        return res.status(401).json({
            status: 'fail',
            code: 401,
            message: 'Unauthorized: Invalid token'
        });
    }

    try {
        const removeTenderFromComparison = await User.findByIdAndUpdate(
            userId.id,
            { $pull: { incomparison: tenderId } },
            { new: true }
        ).populate('incomparison');

        if (!removeTenderFromComparison) {
            return res.status(404).json({
                status: 'fail',
                code: 404,
                message: 'User not found'
            });
        }

        res.json({
            status: 'success',
            code: 200,
            message: 'Tender removed from wishlist',
            data: removeTenderFromComparison
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            status: 'fail',
            code: 500,
            message: 'Server error: ' + error.message
        });
    }
}

const removeAllTendersFromComparison = async (req, res) => {
    try {
        const userId = await decodeToken(req.headers.authorization.split(' ')[1]); // Extract the token from "Bearer <token>"

        if (!userId) {
            return res.status(401).json({
                status: 'fail',
                code: 401,
                message: 'Unauthorized: Invalid token'
            });
        }

        const removeTenderFromComparison = await User.findByIdAndUpdate(
            userId.id,
            { $set: { incomparison: [] } },
            { new: true }
        ).populate('incomparison');

        if (!removeTenderFromComparison) {
            return res.status(404).json({
                status: 'fail',
                code: 404,
                message: 'User not found'
            });
        }

        res.json({
            status: 'success',
            code: 200,
            message: 'All tenders removed from comparison',
            data: removeTenderFromComparison
        });
    } catch (error) {
        console.error('Error removing all tenders from comparison:', error);
    }
};

const saveSms = async (req, res) => {
    try {
        const sms = await SmsModel.save(req.body);
        if (!sms) {
            return res.status(404).json({ message: 'SMS not saved' });
        }
        res.status(200).json({ message: 'SMS saved successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error saving SMS' });
    }
};


module.exports = {
    userLogin, 
    userRegistration,
    verifyToken,
    getUserWishlist,
    addTenderToWishlist,
    removeTenderFromWishlist,
    getUserComparison,
    addTenderToComparison,
    removeTenderFromComparison,
    removeAllTendersFromComparison,
    decodeToken,
    saveSms
};