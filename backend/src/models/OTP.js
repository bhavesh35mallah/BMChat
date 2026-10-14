import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['email', 'phone'],
      default: 'email',
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['login', 'register'],
      default: 'login',
    },
    name: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600, // Auto-delete document after 600 seconds (10 minutes)
    },
  },
  {
    timestamps: true,
  }
);

otpSchema.index({ identifier: 1, purpose: 1 });
otpSchema.index({ email: 1, purpose: 1 });
otpSchema.index({ phone: 1, purpose: 1 });

export const OTP = mongoose.model('OTP', otpSchema);
