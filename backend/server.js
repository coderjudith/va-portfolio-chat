const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Configure CORS for your portfolio domain
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://vachatwidget.netlify.app",  // Add this
      "https://va-portfolio-chat-production.up.railway.app"  // And this
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: [
    "http://localhost:3000", 
    "https://vachatwidget.netlify.app",  // Add this
    "https://va-portfolio-chat-production.up.railway.app"  // And this
  ],
  credentials: true
}));
app.use(express.json());

// Store active conversations
const conversations = new Map();
let adminSocketId = null;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Admin connects
  socket.on('admin-join', () => {
    adminSocketId = socket.id;
    console.log('Admin connected:', socket.id);
    
    const activeConversations = Array.from(conversations.values());
    socket.emit('conversations-list', activeConversations);
  });

  // Client starts a conversation
  socket.on('client-join', (clientData) => {
    const conversation = {
      id: socket.id,
      clientName: clientData.name,
      clientEmail: clientData.email,
      messages: [],
      status: 'active',
      createdAt: new Date()
    };
    
    conversations.set(socket.id, conversation);
    
    // Notify admin about new conversation
    if (adminSocketId) {
      io.to(adminSocketId).emit('new-conversation', conversation);
    }
    
    // Send welcome message to client
    const welcomeMessage = {
      id: Date.now(),
      text: "Hello! Thanks for reaching out. I'll get back to you as soon as possible. How can I help you today?",
      sender: 'admin',
      timestamp: new Date()
    };
    
    conversation.messages.push(welcomeMessage);
    socket.emit('message', welcomeMessage);
  });

  // Handle messages
  socket.on('send-message', (messageData) => {
    const conversation = conversations.get(
      messageData.sender === 'admin' ? messageData.conversationId : socket.id
    );

    if (conversation) {
      const message = {
        id: Date.now(),
        text: messageData.text,
        sender: messageData.sender,
        timestamp: new Date()
      };

      conversation.messages.push(message);

      // Send to appropriate recipient
      if (messageData.sender === 'admin') {
        // Admin sending to client
        socket.to(messageData.conversationId).emit('message', message);
      } else {
        // Client sending to admin
        if (adminSocketId) {
          io.to(adminSocketId).emit('message', {
            ...message,
            conversationId: socket.id,
            clientName: conversation.clientName
          });
        }
        
        // Also send to client (for their own message)
        socket.emit('message', message);
      }
    }
  });

  // Handle typing indicators
  socket.on('typing-start', (data) => {
    if (data.sender === 'client') {
      if (adminSocketId) {
        io.to(adminSocketId).emit('user-typing', {
          conversationId: socket.id,
          isTyping: true
        });
      }
    } else {
      socket.to(data.conversationId).emit('user-typing', {
        isTyping: true
      });
    }
  });

  socket.on('typing-stop', (data) => {
    if (data.sender === 'client') {
      if (adminSocketId) {
        io.to(adminSocketId).emit('user-typing', {
          conversationId: socket.id,
          isTyping: false
        });
      }
    } else {
      socket.to(data.conversationId).emit('user-typing', {
        isTyping: false
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.id === adminSocketId) {
      adminSocketId = null;
    } else {
      const conversation = conversations.get(socket.id);
      if (conversation) {
        conversation.status = 'inactive';
        if (adminSocketId) {
          io.to(adminSocketId).emit('conversation-updated', conversation);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for connections`);
});