const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const User = require('../models/User')

function makeToken(user) {
    return jwt.sign(
        {
            id: user._id.toString(),
            role: user.role,
            email: user.email
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '7d'
        }
    )
}

router.post('/register', async (req, res) => {
    try {
        const { email, password, displayName, role } = req.body

        if (!email || !password) {
            return res.status(400).json({ message: '이메일/비밀번호 필요' })
        }

        const exists = await User.findOne({
            email: email.toLowerCase()
        })

        if (exists) {
            return res.status(400).json({ message: '이미 가입된 메일' })
        }

        const passwordHash = await bcrypt.hash(password, 10)

        const validRoles = ['user', 'admin']
        const safeRole = validRoles.includes(role) ? role : 'user'

        const user = await User.create({
            email,
            displayName,
            passwordHash,
            role: safeRole
        })

        res.status(201).json({ user: user.toSafeJSON() })
    } catch (error) {
        return res.status(500).json({ message: '회원가입 실패', error: error.message })
    }
})

module.exports = router