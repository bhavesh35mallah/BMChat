import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { OTP } from '../models/OTP.js';
import { sendOTPEmail } from '../utils/sendEmail.js';

// Helper to generate signed JWT token
export const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'supersecretjwtkey_for_mern_auth_learning_2026',
    {
      expiresIn: process.env.JWT_EXPIRE || '30d',
    }
  );
};

// @desc    Register a new user (Password-based)
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, bio, avatar } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your name',
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address',
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const emailExists = await User.findOne({ email: normalizedEmail });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        alreadyRegistered: true,
        message: 'An account with this email already exists',
      });
    }

    // Create user in MongoDB
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      bio: bio || undefined,
      avatar: avatar || '',
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration',
    });
  }
};

// @desc    Send OTP for Registration (Email-based)
// @route   POST /api/auth/send-register-otp
// @access  Public
export const sendRegisterOTP = async (req, res) => {
  try {
    const { name, email, identifier } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your name',
      });
    }

    const targetEmail = (email || identifier || '').trim().toLowerCase();

    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(targetEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address format',
      });
    }

    // Check if email already registered
    const existingUser = await User.findOne({ email: targetEmail });
    if (existingUser) {
      console.log(`⚠️ [REGISTER REJECTED] Email "${targetEmail}" is already registered.`);
      return res.status(400).json({
        success: false,
        alreadyRegistered: true,
        message: 'An account with this email already exists. Please sign in instead.',
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Clear old registration OTPs for this email
    await OTP.deleteMany({
      $or: [{ identifier: targetEmail }, { email: targetEmail }],
      purpose: 'register',
    });

    await OTP.create({
      identifier: targetEmail,
      email: targetEmail,
      type: 'email',
      otp,
      purpose: 'register',
      name: name.trim(),
    });

    const emailResult = await sendOTPEmail({
      email: targetEmail,
      otp,
      purpose: 'register',
      name: name.trim(),
    });

    return res.status(200).json({
      success: true,
      deliveryType: 'email',
      target: targetEmail,
      message: `Verification code sent to ${targetEmail}`,
      devOtp: otp,
      delivered: emailResult?.mode === 'smtp',
      mode: emailResult?.mode || 'simulated',
      error: emailResult?.error || null,
    });
  } catch (error) {
    console.error('Send Register OTP Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send registration verification code',
    });
  }
};

// @desc    Verify OTP and complete Registration (Email-based)
// @route   POST /api/auth/verify-register-otp
// @access  Public
export const verifyRegisterOTP = async (req, res) => {
  try {
    const { email, identifier, otp, password, name } = req.body;

    if (!otp || !otp.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the verification code',
      });
    }

    const targetEmail = (email || identifier || '').trim().toLowerCase();

    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the email address used during registration',
      });
    }

    // Check if user already exists
    const exists = await User.findOne({ email: targetEmail });
    if (exists) {
      await OTP.deleteMany({ identifier: targetEmail, purpose: 'register' });
      return res.status(400).json({
        success: false,
        alreadyRegistered: true,
        message: 'An account with this email already exists. Please log in.',
      });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({
      $or: [{ identifier: targetEmail }, { email: targetEmail }],
      otp: otp.trim(),
      purpose: 'register',
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code',
      });
    }

    // Password is required for all registrations
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password is required and must be at least 6 characters long',
      });
    }

    const userName = (name || otpRecord.name || targetEmail.split('@')[0]).trim();

    const user = await User.create({
      name: userName,
      email: targetEmail,
      password,
    });

    // Remove used OTP
    await OTP.deleteMany({
      $or: [{ identifier: targetEmail }, { email: targetEmail }],
      purpose: 'register',
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'Account verified and registered successfully!',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Verify Register OTP Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Verification failed',
    });
  }
};

// @desc    Authenticate user & get token (Password-based with Email)
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, identifier, password } = req.body;

    const rawTarget = identifier || email;
    if (!rawTarget || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address and password',
      });
    }

    const targetEmail = String(rawTarget).trim().toLowerCase();

    // Find user and explicitly include password field for verification
    const user = await User.findOne({ email: targetEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check your email.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Please try again.',
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during login',
    });
  }
};

// @desc    Send OTP for Login (Email-based)
// @route   POST /api/auth/send-login-otp
// @access  Public
export const sendLoginOTP = async (req, res) => {
  try {
    const { email, identifier } = req.body;

    const rawTarget = identifier || email;
    if (!rawTarget || !String(rawTarget).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address',
      });
    }

    const targetEmail = String(rawTarget).trim().toLowerCase();
    console.log(`🔑 [LOGIN ATTEMPT] Email: "${targetEmail}"`);

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(targetEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address format',
      });
    }

    // Verify user exists before sending login OTP
    const user = await User.findOne({ email: targetEmail });
    if (!user) {
      console.log(`⚠️ [LOGIN REJECTED] Email "${targetEmail}" is not registered yet.`);
      return res.status(400).json({
        success: false,
        notRegistered: true,
        message: 'This email is not registered yet. Please create an account first.',
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.deleteMany({
      $or: [{ identifier: targetEmail }, { email: targetEmail }],
      purpose: 'login',
    });

    await OTP.create({
      identifier: targetEmail,
      email: targetEmail,
      type: 'email',
      otp,
      purpose: 'login',
      name: user.name,
    });

    const emailResult = await sendOTPEmail({
      email: targetEmail,
      otp,
      purpose: 'login',
      name: user.name,
    });

    return res.status(200).json({
      success: true,
      deliveryType: 'email',
      target: targetEmail,
      message: `Login verification code sent to ${targetEmail}`,
      devOtp: otp,
      delivered: emailResult?.mode === 'smtp',
      mode: emailResult?.mode || 'simulated',
      error: emailResult?.error || null,
    });
  } catch (error) {
    console.error('Send Login OTP Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send login code',
    });
  }
};

// @desc    Verify OTP and Login (Email-based)
// @route   POST /api/auth/verify-login-otp
// @access  Public
export const verifyLoginOTP = async (req, res) => {
  try {
    const { email, identifier, otp } = req.body;

    const rawTarget = identifier || email;
    if (!rawTarget || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address and verification code',
      });
    }

    const targetEmail = String(rawTarget).trim().toLowerCase();

    // Check if user exists
    const user = await User.findOne({ email: targetEmail });
    if (!user) {
      return res.status(400).json({
        success: false,
        notRegistered: true,
        message: 'User account not found. Please register first.',
      });
    }

    const otpRecord = await OTP.findOne({
      $or: [{ identifier: targetEmail }, { email: targetEmail }],
      otp: otp.trim(),
      purpose: 'login',
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code',
      });
    }

    // Remove used OTP
    await OTP.deleteMany({
      $or: [{ identifier: targetEmail }, { email: targetEmail }],
      purpose: 'login',
    });

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Verify Login OTP Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Login verification failed',
    });
  }
};

// @desc    Get currently logged in user profile
// @route   GET /api/auth/me
// @access  Private (Requires Bearer token)
export const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile',
    });
  }
};

// @desc    Update user profile details
// @route   PUT /api/auth/profile
// @access  Private (Requires Bearer token)
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (req.body.name !== undefined) user.name = req.body.name.trim();
    if (req.body.bio !== undefined) user.bio = req.body.bio;
    if (req.body.avatar !== undefined) user.avatar = req.body.avatar;

    const updatedUser = await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        bio: updatedUser.bio,
        avatar: updatedUser.avatar,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile',
    });
  }
};

// @desc    Get list of all users to chat with (including current user for note-to-self)
// @route   GET /api/auth/users
// @access  Private
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select('name email avatar bio lastSeen createdAt')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Get All Users Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch users',
    });
  }
};
