import { Routes, Route } from 'react-router-dom'
import './App.scss'

import Landing from './pages/Landing'
import AuthPanel from './components/AuthPanel'


function App() {

  return (
    <div className='page'>
      <Routes>
        <Route path='/' element={<Landing/>}/>
        <Route path='/admin/login' element={<AuthPanel/>}/>
      </Routes>
      
    </div>
  )
}

export default App
