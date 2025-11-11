import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveAuthToStorage, fetchMe } from '../api/client'
const KakaoCallback = ({ onAuthed }) => {

    const navigate = useNavigate()

    useEffect(() => {

        // 1
        const params = new URLSearchParams(window.location.search)
        const token = params.get('token')

        // 2
        if (!token) {
            navigate('/admin/login?error=kakao', { replace: true })
            return
        }

        // 3
        saveAuthToStorage({ token })

            (async () => {
                try {
                    const me = await fetchMe()

                    saveAuthToStorage({ user: me, token })

                    onAuthed?.({ user: me, token })

                    if (me.role === 'admin') {
                        navigate('/admin/dashboard', { replace: true })
                    } else {

                        navigate('/user/dashboard', { replace: true })
                    }
                } catch (error) {
                    console.error('kakao callback error ', error)
                    navigate('/admin/login?error=kakao', { replace: true })
                }
            })()


    }, [navigate, onAuthed])

    return (
        <div>
            <p>카카오 로그인 처리중입니다...</p>
        </div>
    )
}

export default KakaoCallback