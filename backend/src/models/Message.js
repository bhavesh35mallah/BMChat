import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    text: {
      type: String,
      default: '',
      trim: true,
    },
    image: {
      type: String,
      default: '',
    },
    audio: {
      type: String,
      default: '', // base64 audio/webm or audio/mp3 data URL
    },
    file: {
      name: { type: String, default: '' },
      size: { type: Number, default: 0 },
      type: { type: String, default: '' },
      data: { type: String, default: '' },
    },
    replyTo: {
      id: { type: String, default: '' },
      text: { type: String, default: '' },
      senderName: { type: String, default: '' },
      hasAttachment: { type: Boolean, default: false },
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedForEveryone: {
      type: Boolean,
      default: false,
    },
    deletedForUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    // Interactive Poll
    poll: {
      question: { type: String, default: '' },
      options: [
        {
          text: { type: String, required: true },
          votes: [
            {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User',
            },
          ],
        },
      ],
      isClosed: { type: Boolean, default: false },
    },
    // Rich Code Snippet
    codeSnippet: {
      code: { type: String, default: '' },
      language: { type: String, default: 'javascript' },
    },
    // In-Chat Interactive Mini-Game (e.g. Tic-Tac-Toe)
    game: {
      gameType: { type: String, default: '' }, // 'tictactoe'
      board: { type: [String], default: ['', '', '', '', '', '', '', '', ''] },
      turn: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, default: 'playing' }, // 'playing', 'won', 'draw'
      winner: { type: String, default: '' },
      playerX: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      playerO: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    starredBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['sent', 'read'],
      default: 'sent',
    },
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        emoji: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for high-performance querying
messageSchema.index({ sender: 1, recipient: 1, createdAt: 1 });
messageSchema.index({ group: 1, createdAt: 1 });
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // MongoDB TTL index to auto-remove expired messages!

export const Message = mongoose.model('Message', messageSchema);
