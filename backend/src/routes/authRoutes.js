import express from 'express';
import {
  registerUser,
  loginUser,
  sendRegisterOTP,
  verifyRegisterOTP,
  sendLoginOTP,
  verifyLoginOTP,
  getMe,
  updateProfile,
  getAllUsers,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes (Password-based)
router.post('/register', registerUser);
router.post('/login', loginUser);

// Public routes (Email OTP-based)
router.post('/send-register-otp', sendRegisterOTP);
router.post('/verify-register-otp', verifyRegisterOTP);
router.post('/send-login-otp', sendLoginOTP);
router.post('/verify-login-otp', verifyLoginOTP);

// Protected routes (require JWT)
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.get('/users', protect, getAllUsers);

export default router;
