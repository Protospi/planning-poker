const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Store room data
const rooms = new Map();
// Store socket to user mapping
const socketToUser = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinRoom', ({ roomId, userName }) => {
    console.log(`${userName} joining room ${roomId}`);
    
    // Leave previous room if any
    const prevRoomId = [...socket.rooms].find(room => room !== socket.id);
    if (prevRoomId) {
      handleLeaveRoom(socket, prevRoomId);
    }

    socket.join(roomId);
    socketToUser.set(socket.id, { roomId, userName });
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, []);
    }

    // Add participant to room
    const roomParticipants = rooms.get(roomId);
    if (!roomParticipants.find(p => p.name === userName)) {
      roomParticipants.push({ name: userName, vote: null });
      rooms.set(roomId, roomParticipants);
    }

    // Broadcast room update to all participants
    io.to(roomId).emit('roomUpdate', roomParticipants);
  });

  socket.on('vote', ({ roomId, userName, vote }) => {
    console.log(`${userName} voted in room ${roomId}`);
    const roomParticipants = rooms.get(roomId);
    if (roomParticipants) {
      const updatedParticipants = roomParticipants.map(p => 
        p.name === userName ? { ...p, vote } : p
      );
      rooms.set(roomId, updatedParticipants);

      // Broadcast room update
      io.to(roomId).emit('roomUpdate', updatedParticipants);
    }
  });

  socket.on('revealVotes', ({ roomId }) => {
    io.to(roomId).emit('votesRevealed');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const userInfo = socketToUser.get(socket.id);
    if (userInfo) {
      handleLeaveRoom(socket, userInfo.roomId);
      socketToUser.delete(socket.id);
    }
  });
});

function handleLeaveRoom(socket, roomId) {
  const userInfo = socketToUser.get(socket.id);
  if (userInfo && rooms.has(roomId)) {
    const roomParticipants = rooms.get(roomId);
    const updatedParticipants = roomParticipants.filter(p => p.name !== userInfo.userName);
    
    if (updatedParticipants.length === 0) {
      rooms.delete(roomId);
    } else {
      rooms.set(roomId, updatedParticipants);
      io.to(roomId).emit('roomUpdate', updatedParticipants);
    }
  }
}

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 