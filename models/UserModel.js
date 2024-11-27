const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// make jwt token
async function tokenMaker(user) {
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
    return token;
}

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    empId: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: mongoose.Schema.Types.String,
        default: 'emp',
        enum: ['emp', 'admin', 'manager', 'trial']
    },
    wishlist: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tender'
        }
    ],
    incomparison: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tender'
        }
    ],
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        required: false
    }
}, {
    timestamps: true
});

// Custom validation for incomparison array
userSchema.path('incomparison').validate(function(array) {
    return array.length <= 5;
}, 'The incomparison array cannot have more than 5 items.');

// Check for unique items in incomparison array
userSchema.pre('save', function(next) {
    if (this.incomparison && new Set(this.incomparison).size !== this.incomparison.length) {
        return next(new Error('Duplicate entries found in the incomparison array.'));
    }
    next();
});

// Remove password before profile sharing
userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    delete user._id;
    delete user.approvedBy;
    delete user.createdAt;
    delete user.updatedAt;
    return user;
};

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.statics.login = async function(email, password) {
    const user = await User.findOne({ email }).populate('approvedBy wishlist incomparison');
    if (!user) {
        throw new Error('User not found');
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
        throw new Error('Invalid password');
    }
    
    if (user.approvedBy === null) {
        throw new Error('User is not approved for use yet');
    }
    const token = await tokenMaker(user);

    user.password = undefined;
    user._id = undefined;

    return {
        user,
        token
    };
}

const User = mongoose.model('User', userSchema, 'User');
module.exports = User;