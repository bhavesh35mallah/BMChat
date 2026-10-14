import { Message } from '../models/Message.js';
import { Group } from '../models/Group.js';

// @desc    Get message history between current user and target user
// @route   GET /api/chat/messages/:targetUserId
// @access  Private
export const getMessages = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const currentUserId = req.user._id;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: targetUserId },
        { sender: targetUserId, recipient: currentUserId },
      ],
      deletedForUsers: { $ne: currentUserId },
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'name email avatar')
      .populate('recipient', 'name email avatar');

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error('Get Messages Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch messages',
    });
  }
};

// @desc    Send a message (REST fallback for socket)
// @route   POST /api/chat/messages
// @access  Private
export const sendMessage = async (req, res) => {
  try {
    const {
      recipient,
      text,
      image,
      audio,
      file,
      replyTo,
      poll,
      codeSnippet,
      game,
      disappearingSeconds,
    } = req.body;
    const sender = req.user._id;

    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: 'Recipient is required',
      });
    }

    if (!text && !image && !audio && !file && !poll && !codeSnippet && !game) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty',
      });
    }

    let expiresAt = undefined;
    if (disappearingSeconds && Number(disappearingSeconds) > 0) {
      expiresAt = new Date(Date.now() + Number(disappearingSeconds) * 1000);
    }

    const newMessage = await Message.create({
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

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'name email avatar')
      .populate('recipient', 'name email avatar');

    return res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    console.error('Send Message Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send message',
    });
  }
};

// @desc    Delete message for me only
// @route   DELETE /api/chat/messages/:messageId/me
// @access  Private
export const deleteMessageForMe = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (!message.deletedForUsers) {
      message.deletedForUsers = [];
    }
    if (!message.deletedForUsers.some((id) => id.toString() === currentUserId.toString())) {
      message.deletedForUsers.push(currentUserId);
      await message.save();
    }

    return res.status(200).json({
      success: true,
      messageId: message._id,
      message: 'Message deleted for you',
    });
  } catch (error) {
    console.error('Delete Message For Me Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete message for everyone (sender or group admin)
// @route   DELETE /api/chat/messages/:messageId/everyone
// @access  Private
export const deleteMessageForEveryone = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    let canDelete = message.sender.toString() === currentUserId.toString();
    if (!canDelete && message.group) {
      const group = await Group.findById(message.group);
      if (group) {
        const isPrimary = group.admin?.toString() === currentUserId.toString();
        const isCoAdmin = (group.admins || []).some((a) => a.toString() === currentUserId.toString());
        if (isPrimary || isCoAdmin) canDelete = true;
      }
    }

    if (!canDelete) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete for everyone' });
    }

    message.isDeleted = true;
    message.deletedForEveryone = true;
    message.text = '🚫 This message was deleted';
    message.image = '';
    message.audio = '';
    message.file = null;
    message.poll = undefined;
    message.codeSnippet = undefined;
    message.game = undefined;
    await message.save();

    return res.status(200).json({
      success: true,
      messageId: message._id,
      message: 'Message deleted for everyone',
    });
  } catch (error) {
    console.error('Delete Message For Everyone Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear conversation between current user and target user
// @route   DELETE /api/chat/messages/:targetUserId
// @access  Private
export const clearMessages = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const currentUserId = req.user._id;

    await Message.deleteMany({
      $or: [
        { sender: currentUserId, recipient: targetUserId },
        { sender: targetUserId, recipient: currentUserId },
      ],
    });

    return res.status(200).json({
      success: true,
      message: 'Conversation history cleared successfully',
    });
  } catch (error) {
    console.error('Clear Messages Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to clear conversation',
    });
  }
};

// @desc    Global search across all messages of current user
// @route   GET /api/chat/search?q=keyword
// @access  Private
export const searchAllMessages = async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user._id;

    if (!q || !q.trim()) {
      return res.status(200).json({ success: true, messages: [] });
    }

    const messages = await Message.find({
      $or: [{ sender: currentUserId }, { recipient: currentUserId }],
      text: { $regex: q.trim(), $options: 'i' },
      isDeleted: false,
      deletedForUsers: { $ne: currentUserId },
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('sender', 'name email avatar')
      .populate('recipient', 'name email avatar');

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error('Search All Messages Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to search messages',
    });
  }
};
