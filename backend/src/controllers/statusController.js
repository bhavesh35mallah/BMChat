import { Status } from '../models/Status.js';

// @desc    Get all active statuses from the last 24h
// @route   GET /api/status
// @access  Private
export const getAllStatuses = async (req, res) => {
  try {
    const now = new Date();
    const statuses = await Status.find({ expiresAt: { $gt: now } })
      .populate('user', 'name avatar email lastSeen')
      .populate('viewers', 'name avatar')
      .sort({ createdAt: -1 });

    // Group statuses by user
    const userStatusMap = new Map();

    statuses.forEach((status) => {
      if (!status.user) return;
      const userId = status.user._id.toString();

      if (!userStatusMap.has(userId)) {
        userStatusMap.set(userId, {
          user: status.user,
          statuses: [],
          latestTimestamp: status.createdAt,
          allViewed: true,
        });
      }

      const group = userStatusMap.get(userId);
      const isViewedByMe = status.viewers?.some(
        (v) => (v?._id || v)?.toString() === req.user._id.toString()
      );
      if (!isViewedByMe && userId !== req.user._id.toString()) {
        group.allViewed = false;
      }

      group.statuses.push({
        _id: status._id,
        text: status.text,
        media: status.media,
        bgColor: status.bgColor,
        viewers: status.viewers,
        createdAt: status.createdAt,
        expiresAt: status.expiresAt,
        viewed: isViewedByMe,
      });
    });

    const result = Array.from(userStatusMap.values());
    res.status(200).json({ success: true, statuses: result });
  } catch (error) {
    console.error('Error fetching statuses:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new status
// @route   POST /api/status
// @access  Private
export const createStatus = async (req, res) => {
  try {
    const { text, media, bgColor } = req.body;

    if (!text?.trim() && !media) {
      return res.status(400).json({ success: false, message: 'Status content cannot be empty' });
    }

    const newStatus = await Status.create({
      user: req.user._id,
      text: text?.trim() || '',
      media: media || '',
      bgColor: bgColor || '#6366f1',
    });

    const populated = await Status.findById(newStatus._id).populate('user', 'name avatar email');

    res.status(201).json({ success: true, status: populated });
  } catch (error) {
    console.error('Error creating status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark a status as viewed
// @route   POST /api/status/:id/view
// @access  Private
export const viewStatus = async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    if (!status.viewers.includes(req.user._id)) {
      status.viewers.push(req.user._id);
      await status.save();
    }

    res.status(200).json({ success: true, statusId: status._id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a status
// @route   DELETE /api/status/:id
// @access  Private
export const deleteStatus = async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    if (status.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this status' });
    }

    await Status.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Status deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
