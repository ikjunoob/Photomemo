import './App.scss'
import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import AuthPanel from './components/AuthPanel'
import Landing from './pages/Landing'
import api from "./api/client"

function App() {

  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  })

  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [me, setMe] = useState(null)
  const isAuthed = !!token

  const handleAuthed = ({ user, token }) => {
    serUser(user)
    setToken(token)

    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('token', token)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    setMe(null)

    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }

  const fetchMe = async () => {
    try {
      const { data } = await api.get('/api/auth/me')
      setMe(data)

    } catch (error) {
      setMe({ error: error.response?.data || '실패' })
    }
  }



  return (
    <div className='page'>
      <Routes>
        <Route path='/' element={<Landing />} />
        <Route path='/admin/login' element={<AuthPanel />} />
      </Routes>

    </div>
  )
}

export default App
