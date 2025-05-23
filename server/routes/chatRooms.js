const express = require('express');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Get available public rooms (not joined by user)
router.get('/available', auth, async (req, res) => {
  try {
    const chatRooms = await ChatRoom.find({
      isPrivate: false,
      members: { $ne: req.user._id }
    }).populate('members', 'username').populate('creator', 'username');

    res.json(chatRooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all chat rooms for user
router.get('/', auth, async (req, res) => {
  try {
    const chatRooms = await ChatRoom.find({
      members: req.user._id
    }).populate('members', 'username avatar isOnline').populate('creator', 'username');

    res.json(chatRooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new chat room
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;

    const chatRoom = new ChatRoom({
      name,
      description,
      creator: req.user._id,
      members: [req.user._id],
      isPrivate
    });

    await chatRoom.save();
    await chatRoom.populate('members', 'username avatar isOnline');
    await chatRoom.populate('creator', 'username');

    res.status(201).json(chatRoom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Join chat room
router.post('/:id/join', auth, async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findById(req.params.id);
    
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    if (!chatRoom.members.includes(req.user._id)) {
      chatRoom.members.push(req.user._id);
      await chatRoom.save();
    }

    await chatRoom.populate('members', 'username avatar isOnline');
    res.json(chatRoom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Join private room with code
router.post('/join-private', auth, async (req, res) => {
  try {
    const { roomCode } = req.body;

    const chatRoom = await ChatRoom.findOne({ roomCode, isPrivate: true });
    
    if (!chatRoom) {
      return res.status(404).json({ message: 'Invalid room code' });
    }

    if (chatRoom.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'You are already a member of this room' });
    }

    chatRoom.members.push(req.user._id);
    await chatRoom.save();
    await chatRoom.populate('members', 'username avatar isOnline');
    await chatRoom.populate('creator', 'username');

    res.json(chatRoom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send invitation to private room
router.post('/:id/invite', auth, async (req, res) => {
  try {
    const { userEmail } = req.body;
    
    const chatRoom = await ChatRoom.findById(req.params.id);
    if (!chatRoom || !chatRoom.isPrivate) {
      return res.status(404).json({ message: 'Private room not found' });
    }

    // Check if user is member of the room
    if (!chatRoom.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'You are not a member of this room' });
    }

    const invitedUser = await User.findOne({ email: userEmail });
    if (!invitedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (chatRoom.members.includes(invitedUser._id)) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    // Check if invitation already exists
    const existingInvitation = chatRoom.invitations.find(
      inv => inv.user.toString() === invitedUser._id.toString() && inv.status === 'pending'
    );

    if (existingInvitation) {
      return res.status(400).json({ message: 'Invitation already sent' });
    }

    chatRoom.invitations.push({
      user: invitedUser._id,
      invitedBy: req.user._id
    });

    await chatRoom.save();
    res.json({ message: 'Invitation sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user invitations
router.get('/invitations', auth, async (req, res) => {
  try {
    const chatRooms = await ChatRoom.find({
      'invitations.user': req.user._id,
      'invitations.status': 'pending'
    }).populate('creator', 'username')
      .populate('invitations.invitedBy', 'username');

    const invitations = chatRooms.map(room => ({
      roomId: room._id,
      roomName: room.name,
      roomDescription: room.description,
      invitedBy: room.invitations.find(inv => 
        inv.user.toString() === req.user._id.toString() && inv.status === 'pending'
      ).invitedBy,
      createdAt: room.invitations.find(inv => 
        inv.user.toString() === req.user._id.toString() && inv.status === 'pending'
      ).createdAt
    }));

    res.json(invitations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Accept/Decline invitation
router.post('/invitations/:roomId/:action', auth, async (req, res) => {
  try {
    const { roomId, action } = req.params;
    
    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const invitation = chatRoom.invitations.find(
      inv => inv.user.toString() === req.user._id.toString() && inv.status === 'pending'
    );

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    invitation.status = action === 'accept' ? 'accepted' : 'declined';

    if (action === 'accept') {
      chatRoom.members.push(req.user._id);
    }

    await chatRoom.save();
    
    if (action === 'accept') {
      await chatRoom.populate('members', 'username avatar isOnline');
      await chatRoom.populate('creator', 'username');
      res.json({ message: 'Invitation accepted', room: chatRoom });
    } else {
      res.json({ message: 'Invitation declined' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get messages for a chat room
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const messages = await Message.find({ chatRoom: req.params.id })
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Leave chat room
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const chatRoom = await ChatRoom.findById(req.params.id);
    
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // Remove user from members
    chatRoom.members = chatRoom.members.filter(
      member => member.toString() !== req.user._id.toString()
    );

    // If no members left and not the creator, delete the room
    if (chatRoom.members.length === 0 && chatRoom.creator.toString() !== req.user._id.toString()) {
      await ChatRoom.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Room deleted as no members left' });
    }

    await chatRoom.save();
    res.json({ message: 'Left room successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
