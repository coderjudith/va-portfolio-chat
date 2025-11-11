import React, { useState } from 'react'
import ChatWidget from './components/ChatWidget'
import AdminPanel from './components/AdminPanel'
import './App.css'

function App() {
  const [isAdmin, setIsAdmin] = useState(false)

  return (
    <div className="app">
      <div className="mode-toggle">
        <button 
          className={!isAdmin ? 'active' : ''}
          onClick={() => setIsAdmin(false)}
        >
          Client View
        </button>
        <button 
          className={isAdmin ? 'active' : ''}
          onClick={() => setIsAdmin(true)}
        >
          Admin Panel
        </button>
      </div>

      {isAdmin ? <AdminPanel /> : <ChatWidget />}
    </div>
  )
}

export default App