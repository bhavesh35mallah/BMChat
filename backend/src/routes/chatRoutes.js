import express from 'express';
import {
  getMessages,
  sendMessage,
  clearMessages,
  searchAllMessages,
  deleteMessageForMe,
  deleteMessageForEveryone,
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All chat routes are protected by JWT
router.use(protect);

router.get('/search', searchAllMessages);
router.get('/messages/:targetUserId', getMessages);
router.post('/messages', sendMessage);
router.delete('/messages/:targetUserId', clearMessages);
router.delete('/message/:messageId/me', deleteMessageForMe);
router.delete('/message/:messageId/everyone', deleteMessageForEveryone);

export default router;
