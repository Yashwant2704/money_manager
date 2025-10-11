const express = require('express');
const router = express.Router();
const Friend = require('../models/Friend');

// No auth middleware here - no token required

// Admin fetch all friends (no pagination/filtering for simplicity)
router.get('/friends', async (req, res) => {
  try {
    // const friends = await Friend.find({});
    const friends = await Friend.find().populate('user', 'email');
    res.json(friends);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/friends/:id', async (req, res) => {
  try {
    const friendId = req.params.id;
    if (!friendId || !friendId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid friend ID' });
    }
    // const friend = await Friend.findById(friendId);
    const friend = await Friend.findById(friendId).populate('user', 'email');
    if (!friend) {
      return res.status(404).json({ message: 'Friend not found' });
    }
    res.json(friend);
  } catch (error) {
    console.error("Error fetching friend by ID:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/friends/:id', async (req, res) => {
  try {
    const friendId = req.params.id;
    if (!friendId || !friendId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid friend ID' });
    }

    const updatedFriend = await Friend.findByIdAndUpdate(friendId, req.body, { new: true });
    if (!updatedFriend) {
      return res.status(404).json({ message: 'Friend not found' });
    }

    res.json(updatedFriend);
  } catch (error) {
    console.error("Error updating friend:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
