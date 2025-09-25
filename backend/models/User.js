const { default: mongoose } = require("mongoose");

const bcrypt = require('bcrypt')

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            match: [EMAIL_REGEX, '유효한 이메일']
        },
        passwordHash: {
            type: String,
            required: true,
        },
        displayName: {
            type: String,
            trin: true,
            default: ""
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
            index: true
        },
        isActive: {
            type: Boolean,
            default: true
        },
        isLoggined: {
            type: Boolean,
            default: false
        }
    }
)