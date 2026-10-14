import { Group } from '../models/Group.js';
import { Message } from '../models/Message.js';

// Helper to check if a user is an admin of the group (primary admin or co-admin)
export const isGroupAdmin = (group, userId) => {
  if (!group || !userId) return false;
  const uId = userId.toString();
  const primaryAdmin = (group.admin?._id || group.admin)?.toString();
  if (primaryAdmin === uId) return true;
  return (group.admins || []).some((adm) => (adm?._id || adm)?.toString() === uId);
};

// Helper for consistent group population
const populateGroup = (query) => {
  return query
    .populate('admin', 'name email avatar')
    .populate('admins', 'name email avatar')
    .populate('members', 'name email avatar lastSeen');
};

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
export const createGroup = async (req, res) => {
  try {
    const { name, avatar, description, members } = req.body;
    const admin = req.user._id;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Group name is required' });
    }

    // Ensure admin is included in members
    const memberSet = new Set(members || []);
    memberSet.add(admin.toString());

    const newGroup = await Group.create({
      name: name.trim(),
      avatar: avatar || '',
      description: description || '',
      admin,
      admins: [admin],
      members: Array.from(memberSet),
    });

    const populatedGroup = await populateGroup(Group.findById(newGroup._id));

    return res.status(201).json({
      success: true,
      group: populatedGroup,
    });
  } catch (error) {
    console.error('Create Group Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create group',
    });
  }
};

// @desc    Get all groups current user belongs to
// @route   GET /api/groups
// @access  Private
export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await populateGroup(
      Group.find({
        $or: [{ members: userId }, { admin: userId }, { admins: userId }],
      }).sort({ updatedAt: -1 })
    );

    return res.status(200).json({
      success: true,
      groups,
    });
  } catch (error) {
    console.error('Get User Groups Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch groups',
    });
  }
};

// @desc    Get group message history (filtered for current user)
// @route   GET /api/groups/:groupId/messages
// @access  Private
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const currentUserId = req.user._id;

    const messages = await Message.find({
      group: groupId,
      deletedForUsers: { $ne: currentUserId },
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'name email avatar');

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error('Get Group Messages Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch group messages',
    });
  }
};

// @desc    Add members to group (Admin only)
// @route   PUT /api/groups/:groupId/members
// @access  Private
export const addMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { members } = req.body; // array of userIds
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!isGroupAdmin(group, userId)) {
      return res.status(403).json({ success: false, message: 'Only group admins can add members' });
    }

    const currentMemberIds = new Set(group.members.map((m) => m.toString()));
    (members || []).forEach((id) => currentMemberIds.add(id.toString()));

    group.members = Array.from(currentMemberIds);
    await group.save();

    const populatedGroup = await populateGroup(Group.findById(group._id));

    return res.status(200).json({
      success: true,
      group: populatedGroup,
      message: 'Members added successfully',
    });
  } catch (error) {
    console.error('Add Members Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove member from group (Admin only)
// @route   DELETE /api/groups/:groupId/members/:memberId
// @access  Private
export const removeMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Only admin can remove members
    if (!isGroupAdmin(group, userId)) {
      return res.status(403).json({ success: false, message: 'Only group admins can remove members' });
    }

    if (group.admin.toString() === memberId) {
      return res.status(400).json({ success: false, message: 'Primary group creator cannot be removed' });
    }

    group.members = group.members.filter((m) => m.toString() !== memberId);
    if (group.admins && group.admins.length > 0) {
      group.admins = group.admins.filter((a) => a.toString() !== memberId);
    }
    await group.save();

    const populatedGroup = await populateGroup(Group.findById(group._id));

    return res.status(200).json({
      success: true,
      group: populatedGroup,
      message: 'Member removed successfully',
    });
  } catch (error) {
    console.error('Remove Member Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Make member a group admin (Admin only)
// @route   PUT /api/groups/:groupId/admins/:memberId
// @access  Private
export const makeAdmin = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!isGroupAdmin(group, userId)) {
      return res.status(403).json({ success: false, message: 'Only group admins can assign new admins' });
    }

    const isMember = group.members.some((m) => m.toString() === memberId);
    if (!isMember) {
      return res.status(400).json({ success: false, message: 'User must be a member of the group first' });
    }

    if (!group.admins) {
      group.admins = [group.admin];
    }

    if (!group.admins.some((a) => a.toString() === memberId)) {
      group.admins.push(memberId);
      await group.save();
    }

    const populatedGroup = await populateGroup(Group.findById(group._id));

    return res.status(200).json({
      success: true,
      group: populatedGroup,
      message: 'Member promoted to group admin',
    });
  } catch (error) {
    console.error('Make Admin Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Dismiss member as group admin (Admin only)
// @route   DELETE /api/groups/:groupId/admins/:memberId
// @access  Private
export const dismissAdmin = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!isGroupAdmin(group, userId)) {
      return res.status(403).json({ success: false, message: 'Only group admins can dismiss other admins' });
    }

    if (group.admin.toString() === memberId) {
      return res.status(400).json({ success: false, message: 'Primary group creator cannot be demoted' });
    }

    group.admins = (group.admins || []).filter((a) => a.toString() !== memberId);
    await group.save();

    const populatedGroup = await populateGroup(Group.findById(group._id));

    return res.status(200).json({
      success: true,
      group: populatedGroup,
      message: 'Admin privileges removed',
    });
  } catch (error) {
    console.error('Dismiss Admin Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Leave group
// @route   POST /api/groups/:groupId/leave
// @access  Private
export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    group.members = group.members.filter((m) => m.toString() !== userId.toString());
    group.admins = (group.admins || []).filter((a) => a.toString() !== userId.toString());

    // If primary creator leaves, assign next available co-admin or member as primary admin
    if (group.admin.toString() === userId.toString()) {
      if (group.admins.length > 0) {
        group.admin = group.admins[0];
      } else if (group.members.length > 0) {
        group.admin = group.members[0];
        group.admins = [group.members[0]];
      } else {
        await Group.findByIdAndDelete(groupId);
        await Message.deleteMany({ group: groupId });
        return res.status(200).json({
          success: true,
          deleted: true,
          message: 'Group deleted as last member left',
        });
      }
    }

    await group.save();

    return res.status(200).json({
      success: true,
      message: 'Left group successfully',
    });
  } catch (error) {
    console.error('Leave Group Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete group (Admin only)
// @route   DELETE /api/groups/:groupId
// @access  Private
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!isGroupAdmin(group, userId)) {
      return res.status(403).json({ success: false, message: 'Only group admins can delete the group' });
    }

    await Group.findByIdAndDelete(groupId);
    await Message.deleteMany({ group: groupId });

    return res.status(200).json({
      success: true,
      message: 'Group deleted successfully',
    });
  } catch (error) {
    console.error('Delete Group Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
