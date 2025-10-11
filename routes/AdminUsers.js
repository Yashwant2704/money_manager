const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Friend = require('../models/Friend');

// Admin: get all users with their friends
router.get('/users', async (req, res) => {
  try {
    // Get all users
    const users = await User.find({}, 'email name _id'); // Add fields as needed

    // For each user, get friends
    const userFriendsData = await Promise.all(users.map(async user => {
      const friends = await Friend.find({ user: user._id }, 'name mail balance');
      return {
        ...user.toObject(),
        friends
      };
    }));

    res.json(userFriendsData);
  } catch (err) {
    console.error("Error fetching users for admin:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
