import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './AdminPanel.css';

const AdminPanel = () => {
  const [socket, setSocket] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.emit('admin-join');

    newSocket.on('conversations-list', (conversationsList) => {
      setConversations(conversationsList);
    });

    newSocket.on('new-conversation', (conversation) => {
      setConversations(prev => [...prev, conversation]);
      
      // Show notification for new conversation
      if (Notification.permission === 'granted') {
        new Notification(`New chat from ${conversation.clientName}`, {
          body: 'Click to view the conversation',
          icon: '/favicon.ico'
        });
      }
    });

    newSocket.on('message', (message) => {
      setConversations(prev => prev.map(conv => {
        if (conv.id === message.conversationId) {
          const updatedConv = {
            ...conv,
            messages: [...conv.messages, message],
            lastActivity: new Date()
          };
          
          // If this is the active conversation, update it
          if (activeConversation?.id === message.conversationId) {
            setActiveConversation(updatedConv);
          }
          
          return updatedConv;
        }
        return conv;
      }));
    });

    newSocket.on('user-typing', (data) => {
      if (activeConversation?.id === data.conversationId) {
        setIsTyping(data.isTyping);
      }
    });

    newSocket.on('conversation-updated', (conversation) => {
      setConversations(prev => prev.map(conv => 
        conv.id === conversation.id ? conversation : conv
      ));
      
      if (activeConversation?.id === conversation.id) {
        setActiveConversation(conversation);
      }
    });

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Filter conversations based on search and status
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.clientEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim() && activeConversation && socket) {
      const messageData = {
        text: messageInput,
        sender: 'admin',
        conversationId: activeConversation.id
      };
      
      // Create message object for immediate display
      const tempMessage = {
        id: Date.now(), // Temporary ID
        text: messageInput,
        sender: 'admin',
        timestamp: new Date(),
        conversationId: activeConversation.id
      };
      
      // Immediately update local state for active conversation
      setActiveConversation(prev => ({
        ...prev,
        messages: [...prev.messages, tempMessage]
      }));
      
      // Also update conversations list
      setConversations(prev => prev.map(conv => 
        conv.id === activeConversation.id 
          ? { ...conv, messages: [...conv.messages, tempMessage] }
          : conv
      ));
      
      // Send via socket
      socket.emit('send-message', messageData);
      setMessageInput('');
      socket.emit('typing-stop', { 
        sender: 'admin', 
        conversationId: activeConversation.id 
      });
    }
  };

  const handleTyping = () => {
    if (socket && activeConversation) {
      socket.emit('typing-start', { 
        sender: 'admin', 
        conversationId: activeConversation.id 
      });
    }
  };

  const handleStopTyping = () => {
    if (socket && activeConversation) {
      socket.emit('typing-stop', { 
        sender: 'admin', 
        conversationId: activeConversation.id 
      });
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getUnreadCount = (conversation) => {
    // Count messages from client that haven't been read
    return conversation.messages.filter(msg => 
      msg.sender === 'client' && !msg.read
    ).length;
  };

  const markAsRead = (conversationId) => {
    // In a real app, you'd send this to the backend
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? {
            ...conv,
            messages: conv.messages.map(msg => ({ ...msg, read: true }))
          }
        : conv
    ));
  };

  const activeConversationsCount = conversations.filter(c => c.status === 'active').length;
  const totalMessagesCount = conversations.reduce((total, conv) => total + conv.messages.length, 0);

  return (
    <div className="admin-panel">
      <div className="conversations-sidebar">
        <div className="sidebar-header">
          <h2>Chat Dashboard</h2>
          <div className="stats">
            <div className="stat-item">
              <span className="stat-number">{activeConversationsCount}</span>
              <span className="stat-label">Active</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{conversations.length}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
        </div>

        <div className="filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>
          
          <div className="status-filters">
            <button 
              className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button 
              className={`filter-btn ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              Active
            </button>
            <button 
              className={`filter-btn ${statusFilter === 'inactive' ? 'active' : ''}`}
              onClick={() => setStatusFilter('inactive')}
            >
              Closed
            </button>
          </div>
        </div>

        <div className="conversations-list">
          {filteredConversations.map(conversation => {
            const unreadCount = getUnreadCount(conversation);
            const lastMessage = conversation.messages[conversation.messages.length - 1];
            
            return (
              <div
                key={conversation.id}
                className={`conversation-item ${
                  activeConversation?.id === conversation.id ? 'active' : ''
                } ${conversation.status}`}
                onClick={() => {
                  setActiveConversation(conversation);
                  markAsRead(conversation.id);
                }}
              >
                <div className="conversation-avatar">
                  {conversation.clientName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                
                <div className="conversation-content">
                  <div className="conversation-header">
                    <strong>{conversation.clientName}</strong>
                    <span className="conversation-time">
                      {lastMessage ? getTimeAgo(lastMessage.timestamp) : getTimeAgo(conversation.createdAt)}
                    </span>
                  </div>
                  
                  <div className="conversation-preview">
                    {lastMessage?.text.slice(0, 60)}...
                  </div>
                  
                  <div className="conversation-footer">
                    <span className="client-email">{conversation.clientEmail}</span>
                    {unreadCount > 0 && (
                      <span className="unread-badge">{unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {filteredConversations.length === 0 && (
            <div className="no-conversations">
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <h4>No conversations</h4>
                <p>Waiting for clients to start chatting...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="conversation-view">
        {activeConversation ? (
          <>
            <div className="conversation-header">
              <div className="client-info">
                <div className="client-avatar">
                  {activeConversation.clientName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div className="client-details">
                  <h4>{activeConversation.clientName}</h4>
                  <span>{activeConversation.clientEmail}</span>
                </div>
              </div>
              
              <div className="conversation-actions">
                <div className={`status-badge ${activeConversation.status}`}>
                  {activeConversation.status}
                </div>
                <div className="conversation-meta">
                  <span>{activeConversation.messages.length} messages</span>
                  <span>Started {getTimeAgo(activeConversation.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="messages-container">
              <div className="welcome-message">
                <p>Conversation started with {activeConversation.clientName}</p>
                <small>{new Date(activeConversation.createdAt).toLocaleString()}</small>
              </div>
              
              {activeConversation.messages.map(message => (
                <div
                  key={message.id}
                  className={`message ${
                    message.sender === 'admin' ? 'admin-msg' : 'client-msg'
                  }`}
                >
                  <div className="message-avatar">
                    {message.sender === 'admin' ? 'Y' : activeConversation.clientName[0].toUpperCase()}
                  </div>
                  <div className="message-content">
                    <div className="message-text">{message.text}</div>
                    <div className="message-time">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="typing-indicator">
                  <div className="typing-avatar">
                    {activeConversation.clientName[0].toUpperCase()}
                  </div>
                  <div className="typing-content">
                    <span>{activeConversation.clientName} is typing</span>
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="message-form" onSubmit={sendMessage}>
              <div className="input-container">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    handleTyping();
                  }}
                  onBlur={handleStopTyping}
                  placeholder="Type your response..."
                  disabled={activeConversation.status === 'inactive'}
                />
                <button 
                  type="submit"
                  disabled={!messageInput.trim() || activeConversation.status === 'inactive'}
                  className="send-button"
                >
                  <span>Send</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="no-conversation">
            <div className="welcome-dashboard">
              <div className="welcome-icon">👋</div>
              <h2>Welcome to your Chat Dashboard</h2>
              <p>Select a conversation from the sidebar to start chatting with clients</p>
              <div className="dashboard-stats">
                <div className="dashboard-stat">
                  <span className="stat-value">{conversations.length}</span>
                  <span className="stat-label">Total Conversations</span>
                </div>
                <div className="dashboard-stat">
                  <span className="stat-value">{activeConversationsCount}</span>
                  <span className="stat-label">Active Now</span>
                </div>
                <div className="dashboard-stat">
                  <span className="stat-value">{totalMessagesCount}</span>
                  <span className="stat-label">Messages Today</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;