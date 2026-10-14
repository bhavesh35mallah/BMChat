import express from 'express';
import {
  getAllStatuses,
  createStatus,
  viewStatus,
  deleteStatus,
} from '../controllers/statusController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getAllStatuses);
router.post('/', createStatus);
router.route('/:id/view').post(viewStatus).put(viewStatus);
router.delete('/:id', deleteStatus);

export default router;
