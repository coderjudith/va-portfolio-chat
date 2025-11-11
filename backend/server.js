const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Simple CORS configuration that works
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: "*"
}));
app.use(express.json());

// Add a simple health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Chat server is running!',
    status: 'OK'
  });
});

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

      // Send to appropriate recipients
      if (messageData.sender === 'admin') {
        // Admin sending to client
        socket.to(messageData.conversationId).emit('message', message);
        // Also send back to admin
        socket.emit('message', {
          ...message,
          conversationId: messageData.conversationId
        });
      } else {
        // Client sending to admin
        if (adminSocketId) {
          io.to(adminSocketId).emit('message', {
            ...message,
            conversationId: socket.id,
            clientName: conversation.clientName
          });
        }
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

  // Handle disconnect - SIMPLIFIED (no auto-inactive)
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.id === adminSocketId) {
      adminSocketId = null;
      console.log('Admin disconnected');
    }
    // Don't mark conversations as inactive automatically
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});