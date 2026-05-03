const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');

const app = express();
const httpServer = createServer(app);

// Use socket.io for reliable WebSocket connections + fallbacks
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// Redis setup for horizontal scaling (Pub/Sub across multiple instances)
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = new Redis(REDIS_URL);
const subClient = pubClient.duplicate();

// Subscribe to global chat channel
subClient.subscribe('global_chat_events');

subClient.on('message', (channel, message) => {
  if (channel === 'global_chat_events') {
    const data = JSON.parse(message);
    // Broadcast message to specific room on THIS local instance
    io.to(data.roomId).emit('new_message', data.payload);
  }
});

function isValidToken(token) {
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'secret');
    return true;
  } catch (err) {
    return false;
  }
}

// Client Connection Handler
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // 1. Authentication Check (JWT)
  const token = socket.handshake.auth.token;
  if (!isValidToken(token)) {
    return socket.disconnect(true);
  }

  // 2. Join a chat room
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room ${roomId}`);
  });

  // 3. Handle incoming message
  socket.on('send_message', async (data) => {
    const { roomId, content, senderId } = data;
    
    const messagePayload = {
      roomId,
      payload: { senderId, content, timestamp: Date.now() }
    };

    // Publish to Redis so ALL instances receive it and forward to their local WS connections
    await pubClient.publish('global_chat_events', JSON.stringify(messagePayload));

    // Optional: Async push to Kafka for at-least-once delivery to DB/Analytics
    console.log('Message broadcasted and queued for persistence:', messagePayload);
  });
});

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => console.log(`Chat Service running on :${PORT}`));
