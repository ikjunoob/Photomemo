import React, { useEffect, useState } from 'react'
import "./style/AuthModal.scss"
const AuthModal = ({
    open,
    onClose,
    onAuthed
}) => {
    return (
        <div className='am-backdrop'>
            <div className="am-panel">
                <div className="am-tabs">
                    <button type='button' className='login on'>
                        로그인
                    </button>
                    <button type='button' className='register'>
                        회원가입
                    </button>
                </div>
                <form className='am-form'>
                    <input
                        type="text"
                        name='displayName'
                        placeholder='닉네임' />
                    <input
                        type="email"
                        name='email'
                        required
                        placeholder='이메일' />
                    <input
                        type="password"
                        name="password"
                        placeholder='비밀번호'
                        required
                    />
                    {/* 에러 메세지 출력 */}
                    <div className="am-msg warn">
                        유효성 검증 실패로 로그인이 차단되었습니다. 관리자에게 문의하세요
                    </div>
                    <div className="am-subtle">
                        로그인 실패 횟수 : 1/5
                        남은 시도 :0
                    </div>

                    <button type='submit' className="btn primary">
                        처리중...'가입하기' '로그인'
                    </button>
                </form>

                <button type='button' className='am-close' aria-label='닫기'>X</button>
            </div>

        </div>
    )
}

export default AuthModal