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
  const { name, mail } = req.body;
  console.log(name, mail);
  const newFriend = new Friend({ name, mail });
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

// View transaction details
router.get('/transaction/:id', async (req, res) => {
  const friend = await Friend.findOne({ 'transactions._id': req.params.id });
  const transaction = friend.transactions.id(req.params.id);
  res.json(transaction);
});

router.delete('/transaction/:id', async (req, res) => {
  try {
    // Step 1: Find the Friend containing the transaction
    const friend = await Friend.findOne({ 'transactions._id': req.params.id });

    if (!friend) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Step 2: Find the specific transaction
    const transaction = friend.transactions.find(
      txn => txn._id.toString() === req.params.id
    );

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Step 3: Subtract transaction amount from balance
    friend.balance -= transaction.amount;

    // Step 4: Remove the transaction
    friend.transactions = friend.transactions.filter(
      txn => txn._id.toString() !== req.params.id
    );

    // Step 5: Save updated Friend document
    await friend.save();

    res.status(200).json({ 
      message: 'Transaction deleted successfully', 
      updatedBalance: friend.balance 
    });
  } catch (error) {
    console.error('Error deleting transaction:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});



module.exports = router;
