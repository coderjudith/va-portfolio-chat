import React, { useState, useEffect } from 'react'
import ChatWidget from './components/ChatWidget'
import AdminPanel from './components/AdminPanel'
import './App.css'

function App() {
  const [isAdmin, setIsAdmin] = useState(false)
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const adminKey = urlParams.get('admin')
    
    console.log('URL Parameters:', urlParams.toString())
    console.log('Admin key from URL:', adminKey)
    
    if (adminKey === 'secret123') {
      console.log('Admin access GRANTED!')
      setIsAdmin(true)
    } else {
      console.log('Admin access DENIED. Key was:', adminKey)
    }
  }, [])
  
  console.log('Rendering:', isAdmin ? 'AdminPanel' : 'ChatWidget')
  
  return (
    <div className="app">
      {isAdmin ? <AdminPanel /> : <ChatWidget />}
    </div>
  )
}

export default App