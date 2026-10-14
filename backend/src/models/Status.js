import mongoose from 'mongoose';

const statusSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      default: '',
      maxlength: 300,
    },
    media: {
      type: String, // base64 or URL
      default: '',
    },
    bgColor: {
      type: String,
      default: '#6366f1',
    },
    viewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      index: { expires: 0 }, // automatic MongoDB TTL expiration
    },
  },
  {
    timestamps: true,
  }
);

export const Status = mongoose.model('Status', statusSchema);
