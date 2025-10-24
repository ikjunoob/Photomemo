const express = require('express')
const router = express.Router()
const Post = require('../models/Posts')
const jwt = require('jsonwebtoken')
const { presignGet } = require('../src/s3')
const mongoose = require('mongoose')

const authenticateToken = (req, res, next) => {

    let token = null;

    if (req.cookies?.token) token = req.cookies.token

    if (!token && req.headers.authorization) {
        const h = req.headers.authorization;

        if (h.toLowerCase().startsWith('bearer')) token = h.slice(7)
    }

    if (!token) return res.status(401).json({ message: '토큰이 없습니다.' })

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET)
        next()
    } catch (error) {
        return res.status(403).json({ message: '유효하지 않은 토큰입니다.' })
    }

}

const ensureObjectId = (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "잘못된 id 형식입니다." })
    }
    next()
}

const pickDefined = (obj) => {
    Object.fromEntries(
        Object.entries(obj)
            .filter(([, v]) => v !== undefined)
    )
}

router.post('/', authenticateToken, async (req, res) => {
    try {
        const { title, content, fileUrl = [], imageUrl } = req.body

        const latest = await Post.findOne().sort({ number: -1 })

        const nextNumber = latest ? latest.number + 1 : 1

        const post = await Post.create({
            number: nextNumber,
            title,
            content,
            fileUrl,
            imageUrl
        })

        res.status(201).json(post)
    } catch (error) {
        console.error('POST /api/posts 실패:', error)
        res.status(500).json({ message: '서버 오류가 발생했습니다.' })

    }
})



module.exports = router