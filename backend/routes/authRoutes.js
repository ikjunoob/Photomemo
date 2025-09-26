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

router.post('/login', async (req, res) => {
    try {
        // 1) req.body에서 email, password를 꺼낸다(기본값은 빈 문자열).
        const { email, password } = req.body

        // 2) 이메일을 소문자로 바꿔 활성화된 유저(isActive: true)만 조회한다.
        const user = await User.findOne({
            email: email.toLowerCase(),
            isActive: true,
        })

        // 3) 유저가 없거나 비밀번호가 틀리면 같은 에러 메시지를 반환한다.
        const invalidMsg1 = { message: '이메일이 올바르지 않습니다.' }
        const invalidMsg2 = { message: '비밀번호가 올바르지 않습니다.' }
        if (!user) {
            return res.status(400).json(invalidMsg1)
        }

        //비밀번호 비교 (User 모델에 comparePassword 메서드가 있다고 가정)
        const pw_ok = await user.comparePassword(password)
        if (!pw_ok) return res.status(400).json(invalidMsg2)

        // 이메일과 비밀번호가 틀렸을 때 loginAttempts를 하나씩 올려주는 조건문 넣기 응답 보내기
        // 비밀번호가 틀렸을 경우 (로그인 실패)
        if (!pw_ok) {
            const MAX_LOGIN_ATTEMPTS = 1000; // 최대 로그인 시도 횟수
            user.loginAttempts += 1;     // 시도 횟수 1 증가

            // 시도 횟수가 최대치를 넘으면 계정을 비활성화(잠금)합니다.
            if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
                user.isActive = false;
                await user.save(); // 변경된 내용을 DB에 저장합니다.
                return res.status(403).json({ message: `로그인 시도 횟수(${MAX_LOGIN_ATTEMPTS}회)를 초과하여 계정이 비활성화되었습니다.` });
            }

            // 아직 시도 횟수가 남아있을 경우
            await user.save(); // 변경된 내용을 DB에 저장합니다.
            const attemptsLeft = MAX_LOGIN_ATTEMPTS - user.loginAttempts;
            return res.status(401).json({ message: `비밀번호가 올바르지 않습니다. (남은 시도 횟수: ${attemptsLeft}회)` });
        }

        // 4) 성공 시 유저 문서에 isLoggined = true, lastLoginAt = 현재시간 으로 업데이트한다.
        const updated = await User.findByIdAndUpdate(
            user._id,
            {
                $set: {
                    isLoggined: true,
                    lastLoginAt: new Date()
                }
            },
            { new: true }
        )

        if (!updated) return res.status(500).json({ message: '로그인 상태 갱신 실패' })

        // 5) JWT 토큰을 발급하고, 쿠키(httpOnly, sameSite, secure, maxAge)를 설정한다.
        const token = makeToken(updated)

        res.cookie('token', token, {
            httpOnly: true,
            sameSite: "lax",
            secure: "production",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7일 유효 토큰
        })
        // 6) 응답으로는 민감정보가 제거된 user 객체와 token을 반환한다.
        return res.status(200).json({
            user: updated.toSafeJSON(),
            token
        })


    } catch (error) {
        res.status(500).json({ message: '로그인 처리 중 오류가 발생했습니다.', error: error.message });
    }

});

router.get('/me', async (req, res) => {
    try {
        const h = req.headers.authorization || ''

        const token = h.startsWith('Bearer') ? h.slice(7) : null

        if (!token) return res.status(401).json({ message: '인증 필요' })

        const payload = jwt.verify(token, process.env.JWT_SECRET)

        const user = await User.findById(payload.id)

        if (!user) return res.status(404).json({ message: '사용자 없음' })

        res.status(200).json(user.toSafeJSON())
    } catch (error) {
        res.status(401).json({ message: '토큰 무효', error: error.message })
    }
})

module.exports = router