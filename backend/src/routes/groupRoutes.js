import express from 'express';
import {
  createGroup,
  getUserGroups,
  getGroupMessages,
  addMembers,
  removeMember,
  makeAdmin,
  dismissAdmin,
  leaveGroup,
  deleteGroup,
} from '../controllers/groupController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', createGroup);
router.get('/', getUserGroups);
router.get('/:groupId/messages', getGroupMessages);
router.put('/:groupId/members', addMembers);
router.delete('/:groupId/members/:memberId', removeMember);
router.put('/:groupId/admins/:memberId', makeAdmin);
router.delete('/:groupId/admins/:memberId', dismissAdmin);
router.post('/:groupId/leave', leaveGroup);
router.delete('/:groupId', deleteGroup);

export default router;

