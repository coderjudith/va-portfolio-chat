import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './ChatWidget.css';

const ChatWidget = () => {
  const [socket, setSocket] = useState(null);
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [clientInfo, setClientInfo] = useState({ name: '', email: '' });
  const [showForm, setShowForm] = useState(true);
  const messagesEndRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_SOCKET_URL);
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };

    const handleTyping = (data) => {
      setIsTyping(data.isTyping);
    };

    socket.on('message', handleMessage);
    socket.on('user-typing', handleTyping);

    return () => {
      socket.off('message', handleMessage);
      socket.off('user-typing', handleTyping);
    };
  }, [socket]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStartChat = (e) => {
    e.preventDefault();
    if (clientInfo.name && clientInfo.email) {
      socket.emit('client-join', clientInfo);
      setShowForm(false);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (inputMessage.trim() && socket) {
      const messageData = {
        text: inputMessage,
        sender: 'client'
      };
      
      socket.emit('send-message', messageData);
      setInputMessage('');
      socket.emit('typing-stop', { sender: 'client' });
    }
  };

  const handleTyping = () => {
    if (socket && !showForm) {
      socket.emit('typing-start', { sender: 'client' });
    }
  };

  const handleStopTyping = () => {
    if (socket && !showForm) {
      socket.emit('typing-stop', { sender: 'client' });
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="chat-widget">
      {/* Chat Button */}
      {!isOpen && (
        <button 
          className="chat-button"
          onClick={() => setIsOpen(true)}
        >
          💬 Chat with me
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <h3>Live Chat</h3>
            <button 
              className="close-button"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.sender === 'client' ? 'client-message' : 'admin-message'}`}
              >
                <div className="message-content">
                  {message.text}
                </div>
                <div className="message-time">
                  {formatTime(message.timestamp)}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="typing-indicator">
                <span>Admin is typing</span>
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {showForm ? (
            <div className="chat-form">
              <h4>Start a conversation</h4>
              <form onSubmit={handleStartChat}>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={clientInfo.name}
                  onChange={(e) => setClientInfo(prev => ({...prev, name: e.target.value}))}
                  required
                />
                <input
                  type="email"
                  placeholder="Your Email"
                  value={clientInfo.email}
                  onChange={(e) => setClientInfo(prev => ({...prev, email: e.target.value}))}
                  required
                />
                <button type="submit">Start Chat</button>
              </form>
            </div>
          ) : (
            <form className="chat-input-form" onSubmit={sendMessage}>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => {
                  setInputMessage(e.target.value);
                  handleTyping();
                }}
                onBlur={handleStopTyping}
                placeholder="Type your message..."
              />
              <button type="submit">Send</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatWidget;