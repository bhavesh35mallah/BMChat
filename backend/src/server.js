import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import { Message } from './models/Message.js';
import { User } from './models/User.js';
import { Group } from './models/Group.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
  maxHttpBufferSize: 1e7, // 10MB limit for image attachments
});

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
// Support base64 image uploads up to 10MB
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/groups', groupRoutes);

// Health check and diagnostics endpoint
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  res.status(200).json({
    status: 'ok',
    database: dbStatusMap[dbState] || 'unknown',
    mongoUriConfigured: !!process.env.MONGO_URI,
    smtpConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend static assets in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
      return res.sendFile(path.join(frontendDistPath, 'index.html'));
    }
    next();
  });
}

// 404 Handler for undefined API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// In-Memory map to track active online users: userId -> Set of socketIds
const onlineUsers = new Map();

io.on('connection', (socket) => {
  let authenticatedUserId = null;

  // Client identifies itself upon connecting
  socket.on('setup_user', (userId) => {
    if (!userId) return;
    authenticatedUserId = userId;

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Broadcast updated online list
    io.emit('online_users', Array.from(onlineUsers.keys()));
    console.log(`👤 User connected: ${userId} (Socket: ${socket.id})`);
  });

  // Realtime message sending (supports text, image, audio note, file, reply, disappearing timer)
  socket.on('send_message', async (data, callback) => {
    try {
      const {
        sender,
        recipient,
        text,
        image,
        audio,
        file,
        replyTo,
        disappearingSeconds,
        poll,
        codeSnippet,
        game,
      } = data;

      if (!recipient || (!text && !image && !audio && !file && !poll && !codeSnippet && !game)) {
        if (callback) callback({ success: false, message: 'Invalid payload' });
        return;
      }

      let expiresAt = null;
      if (disappearingSeconds && Number(disappearingSeconds) > 0) {
        expiresAt = new Date(Date.now() + Number(disappearingSeconds) * 1000);
      }

      // Persist to MongoDB
      const newMsg = await Message.create({
        sender,
        recipient,
        text: text || '',
        image: image || '',
        audio: audio || '',
        file: file || null,
        replyTo: replyTo || null,
        expiresAt,
        poll: poll || undefined,
        codeSnippet: codeSnippet || undefined,
        game: game || undefined,
      });

      const populatedMsg = await Message.findById(newMsg._id)
        .populate('sender', 'name email avatar')
        .populate('recipient', 'name email avatar');

      // Send to recipient's sockets if online
      if (onlineUsers.has(recipient)) {
        const recipientSockets = onlineUsers.get(recipient);
        recipientSockets.forEach((sId) => {
          io.to(sId).emit('receive_message', populatedMsg);
        });
      }

      // Send back to all sender's sockets (including current)
      if (onlineUsers.has(sender)) {
        const senderSockets = onlineUsers.get(sender);
        senderSockets.forEach((sId) => {
          io.to(sId).emit('receive_message', populatedMsg);
        });
      }

      if (callback) callback({ success: true, message: populatedMsg });
    } catch (err) {
      console.error('Socket send_message error:', err);
      if (callback) callback({ success: false, message: err.message });
    }
  });

  // Delete message ("Delete for Everyone") - allowed for sender or group admin
  socket.on('delete_message', async ({ messageId, userId }, callback) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) {
        if (callback) callback({ success: false, message: 'Message not found' });
        return;
      }

      let canDeleteForEveryone = msg.sender.toString() === userId.toString();

      // If not sender, check if user is an admin of the group
      if (!canDeleteForEveryone && msg.group) {
        const group = await Group.findById(msg.group);
        if (group) {
          const isPrimary = group.admin?.toString() === userId.toString();
          const isCoAdmin = (group.admins || []).some((adm) => (adm?._id || adm)?.toString() === userId.toString());
          if (isPrimary || isCoAdmin) {
            canDeleteForEveryone = true;
          }
        }
      }

      if (!canDeleteForEveryone) {
        if (callback) callback({ success: false, message: 'Not authorized to delete this message for everyone' });
        return;
      }

      msg.isDeleted = true;
      msg.deletedForEveryone = true;
      msg.text = '🚫 This message was deleted';
      msg.image = '';
      msg.audio = '';
      msg.file = null;
      msg.poll = undefined;
      msg.codeSnippet = undefined;
      msg.game = undefined;
      await msg.save();

      if (msg.group) {
        io.to(`group_${msg.group}`).emit('message_deleted', { messageId: msg._id });
      } else {
        const sId = msg.sender ? msg.sender.toString() : null;
        const rId = msg.recipient ? msg.recipient.toString() : null;
        [sId, rId].filter(Boolean).forEach((partyId) => {
          if (onlineUsers.has(partyId)) {
            onlineUsers.get(partyId).forEach((sockId) => {
              io.to(sockId).emit('message_deleted', { messageId: msg._id });
            });
          }
        });
      }

      if (callback) callback({ success: true, messageId: msg._id });
    } catch (err) {
      console.error('Socket delete_message error:', err);
      if (callback) callback({ success: false, message: err.message });
    }
  });

  // Delete message for me only
  socket.on('delete_message_for_me', async ({ messageId, userId }, callback) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) {
        if (callback) callback({ success: false, message: 'Message not found' });
        return;
      }

      if (!msg.deletedForUsers) {
        msg.deletedForUsers = [];
      }
      if (!msg.deletedForUsers.some((id) => id.toString() === userId.toString())) {
        msg.deletedForUsers.push(userId);
        await msg.save();
      }

      if (callback) callback({ success: true, messageId });
    } catch (err) {
      console.error('Socket delete_message_for_me error:', err);
      if (callback) callback({ success: false, message: err.message });
    }
  });

  // Toggle bookmark/star on a message
  socket.on('toggle_star', async ({ messageId, userId }, callback) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;

      const idx = msg.starredBy.findIndex((id) => id.toString() === userId);
      let isStarred = false;
      if (idx > -1) {
        msg.starredBy.splice(idx, 1);
      } else {
        msg.starredBy.push(userId);
        isStarred = true;
      }

      await msg.save();
      if (callback) callback({ success: true, isStarred, starredBy: msg.starredBy });
    } catch (err) {
      console.error('Socket toggle_star error:', err);
      if (callback) callback({ success: false, message: err.message });
    }
  });

  // Typing indicator
  socket.on('typing', ({ sender, recipient, isTyping }) => {
    if (onlineUsers.has(recipient)) {
      const recipientSockets = onlineUsers.get(recipient);
      recipientSockets.forEach((sId) => {
        io.to(sId).emit('user_typing', { sender, isTyping });
      });
    }
  });

  // Mark messages as read
  socket.on('mark_read', async ({ readerId, senderId }) => {
    try {
      await Message.updateMany(
        { sender: senderId, recipient: readerId, status: 'sent' },
        { status: 'read' }
      );

      // Notify the sender that their messages have been read
      if (onlineUsers.has(senderId)) {
        const senderSockets = onlineUsers.get(senderId);
        senderSockets.forEach((sId) => {
          io.to(sId).emit('messages_read', { readerId, senderId });
        });
      }
    } catch (err) {
      console.error('Socket mark_read error:', err);
    }
  });

  // Emoji reaction on a message
  socket.on('add_reaction', async ({ messageId, emoji, userId }, callback) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;

      const existingIndex = msg.reactions.findIndex(
        (r) => r.user.toString() === userId && r.emoji === emoji
      );

      if (existingIndex > -1) {
        msg.reactions.splice(existingIndex, 1);
      } else {
        msg.reactions = msg.reactions.filter((r) => r.user.toString() !== userId);
        msg.reactions.push({ user: userId, emoji });
      }

      await msg.save();

      const populatedMsg = await Message.findById(msg._id)
        .populate('sender', 'name email avatar')
        .populate('recipient', 'name email avatar');

      if (msg.group) {
        io.to(`group_${msg.group}`).emit('message_reaction_updated', {
          messageId: msg._id,
          reactions: msg.reactions,
          updatedMessage: populatedMsg,
        });
      } else {
        const sId = msg.sender ? msg.sender.toString() : null;
        const rId = msg.recipient ? msg.recipient.toString() : null;
        [sId, rId].filter(Boolean).forEach((partyId) => {
          if (onlineUsers.has(partyId)) {
            onlineUsers.get(partyId).forEach((sockId) => {
              io.to(sockId).emit('message_reaction_updated', {
                messageId: msg._id,
                reactions: msg.reactions,
                updatedMessage: populatedMsg,
              });
            });
          }
        });
      }

      if (callback) callback({ success: true, reactions: msg.reactions });
    } catch (err) {
      console.error('Socket add_reaction error:', err);
      if (callback) callback({ success: false, message: err.message });
    }
  });

  // Group Rooms & Group Chat
  socket.on('join_group', (groupId) => {
    if (groupId) {
      socket.join(`group_${groupId}`);
    }
  });

  socket.on('leave_group', (groupId) => {
    if (groupId) {
      socket.leave(`group_${groupId}`);
    }
  });

  socket.on('send_group_message', async (data, callback) => {
    try {
      const {
        sender,
        groupId,
        text,
        image,
        audio,
        file,
        replyTo,
        disappearingSeconds,
        poll,
        codeSnippet,
        game,
      } = data;

      if (!groupId || (!text && !image && !audio && !file && !poll && !codeSnippet && !game)) {
        if (callback) callback({ success: false, message: 'Invalid payload' });
        return;
      }

      let expiresAt = null;
      if (disappearingSeconds && Number(disappearingSeconds) > 0) {
        expiresAt = new Date(Date.now() + Number(disappearingSeconds) * 1000);
      }

      const newMsg = await Message.create({
        sender,
        group: groupId,
        text: text || '',
        image: image || '',
        audio: audio || '',
        file: file || null,
        replyTo: replyTo || null,
        expiresAt,
        poll: poll || undefined,
        codeSnippet: codeSnippet || undefined,
        game: game || undefined,
      });

      const populatedMsg = await Message.findById(newMsg._id)
        .populate('sender', 'name email avatar');

      io.to(`group_${groupId}`).emit('receive_group_message', populatedMsg);
      if (callback) callback({ success: true, message: populatedMsg });
    } catch (err) {
      console.error('Socket send_group_message error:', err);
      if (callback) callback({ success: false, message: err.message });
    }
  });

  // Edit Message Socket Event
  socket.on('edit_message', async ({ messageId, newText, userId }, callback) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      if (msg.sender.toString() !== userId) {
        if (callback) callback({ success: false, message: 'Not authorized to edit' });
        return;
      }
      msg.text = newText;
      msg.isEdited = true;
      await msg.save();

      const populatedMsg = await Message.findById(msg._id)
        .populate('sender', 'name email avatar')
        .populate('recipient', 'name email avatar');

      if (msg.group) {
        io.to(`group_${msg.group}`).emit('message_edited', {
          messageId: msg._id,
          newText,
          isEdited: true,
          updatedMessage: populatedMsg,
        });
      } else {
        const sId = msg.sender ? msg.sender.toString() : null;
        const rId = msg.recipient ? msg.recipient.toString() : null;
        [sId, rId].filter(Boolean).forEach((partyId) => {
          if (onlineUsers.has(partyId)) {
            onlineUsers.get(partyId).forEach((sockId) => {
              io.to(sockId).emit('message_edited', {
                messageId: msg._id,
                newText,
                isEdited: true,
                updatedMessage: populatedMsg,
              });
            });
          }
        });
      }
      if (callback) callback({ success: true, message: populatedMsg });
    } catch (err) {
      console.error('Socket edit_message error:', err);
      if (callback) callback({ success: false, message: err.message });
    }
  });

  // Vote on Interactive Poll
  socket.on('vote_poll', async ({ messageId, optionIndex, userId }, callback) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg || !msg.poll || msg.poll.isClosed) return;

      const option = msg.poll.options[optionIndex];
      if (!option) return;

      const existingVoteIdx = option.votes.findIndex((v) => v.toString() === userId);
      if (existingVoteIdx > -1) {
        option.votes.splice(existingVoteIdx, 1);
      } else {
        msg.poll.options.forEach((opt) => {
          opt.votes = opt.votes.filter((v) => v.toString() !== userId);
        });
        option.votes.push(userId);
      }

      await msg.save();

      if (msg.group) {
        io.to(`group_${msg.group}`).emit('poll_updated', { messageId: msg._id, poll: msg.poll });
      } else {
        const sId = msg.sender ? msg.sender.toString() : null;
        const rId = msg.recipient ? msg.recipient.toString() : null;
        [sId, rId].filter(Boolean).forEach((partyId) => {
          if (onlineUsers.has(partyId)) {
            onlineUsers.get(partyId).forEach((sockId) => {
              io.to(sockId).emit('poll_updated', { messageId: msg._id, poll: msg.poll });
            });
          }
        });
      }
      if (callback) callback({ success: true, poll: msg.poll });
    } catch (err) {
      console.error('Socket vote_poll error:', err);
      if (callback) callback({ success: false, message: err.message });
    }
  });

  // Play In-Chat Mini-Game (Tic-Tac-Toe move)
  socket.on('play_game_move', async ({ messageId, cellIndex, userId }, callback) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg || !msg.game || msg.game.status !== 'playing') return;

      const { game } = msg;
      if (game.turn && game.turn.toString() !== userId) {
        if (callback) callback({ success: false, message: 'Not your turn' });
        return;
      }
      if (game.board[cellIndex] !== '') {
        if (callback) callback({ success: false, message: 'Cell already occupied' });
        return;
      }

      const isPlayerX = game.playerX.toString() === userId;
      const symbol = isPlayerX ? 'X' : 'O';
      game.board[cellIndex] = symbol;

      const winLines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
      ];

      let hasWon = false;
      for (const [a, b, c] of winLines) {
        if (game.board[a] && game.board[a] === game.board[b] && game.board[a] === game.board[c]) {
          hasWon = true;
          break;
        }
      }

      if (hasWon) {
        game.status = 'won';
        game.winner = symbol;
      } else if (game.board.every((cell) => cell !== '')) {
        game.status = 'draw';
      } else {
        game.turn = isPlayerX ? game.playerO : game.playerX;
      }

      await msg.save();

      if (msg.group) {
        io.to(`group_${msg.group}`).emit('game_updated', { messageId: msg._id, game: msg.game });
      } else {
        const sId = msg.sender ? msg.sender.toString() : null;
        const rId = msg.recipient ? msg.recipient.toString() : null;
        [sId, rId].filter(Boolean).forEach((partyId) => {
          if (onlineUsers.has(partyId)) {
            onlineUsers.get(partyId).forEach((sockId) => {
              io.to(sockId).emit('game_updated', { messageId: msg._id, game: msg.game });
            });
          }
        });
      }
      if (callback) callback({ success: true, game: msg.game });
    } catch (err) {
      console.error('Socket play_game_move error:', err);
      if (callback) callback({ success: false, message: err.message });
    }
  });

  // WebRTC Audio & Video Calling Signaling
  socket.on('call_user', ({ recipientId, callerId, callerName, callerAvatar, callType, offer }) => {
    if (onlineUsers.has(recipientId)) {
      onlineUsers.get(recipientId).forEach((sId) => {
        io.to(sId).emit('incoming_call', {
          callerId,
          callerName,
          callerAvatar,
          callType,
          offer,
        });
      });
    }
  });

  socket.on('answer_call', ({ callerId, recipientId, answer }) => {
    if (onlineUsers.has(callerId)) {
      onlineUsers.get(callerId).forEach((sId) => {
        io.to(sId).emit('call_answered', { answer, recipientId });
      });
    }
  });

  socket.on('reject_call', ({ callerId }) => {
    if (onlineUsers.has(callerId)) {
      onlineUsers.get(callerId).forEach((sId) => {
        io.to(sId).emit('call_rejected');
      });
    }
  });

  socket.on('end_call', ({ targetUserId }) => {
    if (onlineUsers.has(targetUserId)) {
      onlineUsers.get(targetUserId).forEach((sId) => {
        io.to(sId).emit('call_ended');
      });
    }
  });

  socket.on('send_ice_candidate', ({ targetUserId, candidate }) => {
    if (onlineUsers.has(targetUserId)) {
      onlineUsers.get(targetUserId).forEach((sId) => {
        io.to(sId).emit('receive_ice_candidate', { candidate });
      });
    }
  });

  // Disconnect handling with lastSeen update
  socket.on('disconnect', async () => {
    if (authenticatedUserId && onlineUsers.has(authenticatedUserId)) {
      const userSockets = onlineUsers.get(authenticatedUserId);
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(authenticatedUserId);
        const lastSeen = new Date();
        try {
          await User.findByIdAndUpdate(authenticatedUserId, { lastSeen });
          io.emit('user_last_seen', { userId: authenticatedUserId, lastSeen });
        } catch (e) {
          console.error('Error updating lastSeen:', e);
        }
      }
      io.emit('online_users', Array.from(onlineUsers.keys()));
      console.log(`🔌 User disconnected: ${authenticatedUserId} (Socket: ${socket.id})`);
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server with Socket.io running on port ${PORT}`);
  console.log(`📡 Endpoints: http://localhost:${PORT}/api/auth & /api/chat`);
});
