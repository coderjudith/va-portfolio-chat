import React from 'react'
import ChatWidget from './components/ChatWidget'
import './App.css'

function App() {
  // Always show only ChatWidget - no admin panel toggle
  return (
    <div className="app">
      <ChatWidget />
    </div>
  )
}

export default App