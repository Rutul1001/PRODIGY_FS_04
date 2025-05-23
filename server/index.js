const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const chatRoomRoutes = require('./routes/chatRooms');
const User = require('./models/User');
const Message = require('./models/Message');
const ChatRoom = require('./models/ChatRoom');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chatrooms', chatRoomRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user to their rooms
  socket.on('join-user', async (userId) => {
    try {
      await User.findByIdAndUpdate(userId, { isOnline: true });
      
      const chatRooms = await ChatRoom.find({ members: userId });
      chatRooms.forEach(room => {
        socket.join(room._id.toString());
      });

      socket.userId = userId;
      
      // Emit online status to all rooms
      chatRooms.forEach(room => {
        socket.to(room._id.toString()).emit('user-online', userId);
      });
    } catch (error) {
      console.error('Error joining user:', error);
    }
  });

  // Join specific room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.userId} joined room ${roomId}`);
    
    // Notify others in the room
    socket.to(roomId).emit('user-joined-room', {
      userId: socket.userId,
      roomId: roomId
    });
  });

  // Leave specific room
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    console.log(`User ${socket.userId} left room ${roomId}`);
    
    // Notify others in the room
    socket.to(roomId).emit('user-left-room', {
      userId: socket.userId,
      roomId: roomId
    });
  });

  // Handle new message
  socket.on('send-message', async (messageData) => {
    try {
      const message = new Message({
        content: messageData.content,
        sender: messageData.sender,
        chatRoom: messageData.chatRoom
      });

      await message.save();
      await message.populate('sender', 'username avatar');

      io.to(messageData.chatRoom).emit('new-message', message);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    socket.to(data.chatRoom).emit('user-typing', {
      userId: data.userId,
      username: data.username
    });
  });

  socket.on('stop-typing', (data) => {
    socket.to(data.chatRoom).emit('user-stop-typing', data.userId);
  });

  // Handle new room creation
  socket.on('room-created', async (roomData) => {
    try {
      // Join creator to the room
      socket.join(roomData._id);
      
      // If it's a public room, notify all users
      if (!roomData.isPrivate) {
        socket.broadcast.emit('new-public-room', roomData);
      }
    } catch (error) {
      console.error('Error handling room creation:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    
    if (socket.userId) {
      try {
        await User.findByIdAndUpdate(socket.userId, { 
          isOnline: false,
          lastSeen: new Date()
        });
        
        // Emit offline status to all rooms
        const chatRooms = await ChatRoom.find({ members: socket.userId });
        chatRooms.forEach(room => {
          socket.to(room._id.toString()).emit('user-offline', socket.userId);
        });
      } catch (error) {
        console.error('Error updating user offline status:', error);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
