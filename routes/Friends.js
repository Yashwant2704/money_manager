const express = require('express');
const router = express.Router();
const Friend = require('../models/Friend');

// Get all friends
router.get('/', async (req, res) => {
  const friends = await Friend.find();
  res.json(friends);
});

// Add a new friend
router.post('/add', async (req, res) => {
  const { name } = req.body;
  const newFriend = new Friend({ name });
  await newFriend.save();
  res.json(newFriend);
});

// Add/Subtract Money
router.post('/transaction/:id', async (req, res) => {
  const { amount, note } = req.body;
  const friend = await Friend.findById(req.params.id);
  friend.balance += amount;
  friend.transactions.push({ amount, note });
  await friend.save();
  res.json(friend);
});

module.exports = router;
