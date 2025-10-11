const express = require('express');
const router = express.Router();
const Friend = require('../models/Friend');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// Protect all routes!
router.use(auth);

// Get all friends (of one user)
router.get('/', async (req, res) => {
  const friends = await Friend.find({ user: req.user.id });
  res.json(friends);
});



// POST /split - Create split transactions for multiple friends
router.post('/transaction/split', async (req, res) => {
  try {
    const { totalAmount, note, selectedFriends } = req.body;
    
    if (!totalAmount || !selectedFriends || selectedFriends.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate friends belong to user
    const friendIds = selectedFriends.map(sf => sf.friendId);
    const friends = await Friend.find({
      _id: { $in: friendIds },
      user: req.user.id
    });

    if (friends.length !== friendIds.length) {
      return res.status(400).json({ message: 'Invalid friends selected' });
    }

    // Calculate split amount per person (including user)
    const numberOfPeople = selectedFriends.length + 1; // +1 for the user
    const amountPerPerson = Math.round((totalAmount / numberOfPeople) * 100) / 100;

    // Create a list of friend names for the note
    const friendNames = selectedFriends.map(sf => sf.name).join(', ');

    // Update each friend's balance and add transaction
    const updatedFriends = [];
    
    for (const selectedFriend of selectedFriends) {
      const friend = await Friend.findById(selectedFriend.friendId);
      
      // Update friend's balance (they owe you this amount)
      friend.balance = Math.round((friend.balance + amountPerPerson) * 100) / 100;
      
      // Add transaction to friend's transaction array with proper note
      friend.transactions.push({
        amount: amountPerPerson,
        note: `${note} - Split between ${friendNames} and me`,
        date: new Date()
      });
      
      await friend.save();
      updatedFriends.push(friend);
    }

    res.status(201).json({
      message: `Split transaction created for ${numberOfPeople} people`,
      updatedFriends,
      splitDetails: {
        totalAmount,
        amountPerPerson,
        numberOfPeople,
        friendsInvolved: selectedFriends.length
      }
    });

  } catch (error) {
    console.error('Split transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});







// Get one friend by id
router.get('/:id', async (req, res) => {
  try {
    const friend = await Friend.findOne({ _id: req.params.id, user: req.user.id })
      .populate('user', 'username email'); // Populate user with selected fields
    if (!friend) return res.status(404).json({ message: 'Friend not found' });
    res.json(friend);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});


// Add a new friend
router.post('/add', async (req, res) => {
  const { name, mail } = req.body;
  const newFriend = new Friend({ name, mail, user: req.user.id });
  await newFriend.save();
  res.json(newFriend);
});

// Add/Subtract Money
router.post('/transaction/:id', async (req, res) => {
  const { amount, note } = req.body;
  const friend = await Friend.findOne({ _id: req.params.id, user: req.user.id });
  if (!friend) return res.status(404).json({ message: 'Friend not found' });
  friend.balance += amount;
  friend.transactions.push({ amount, note });
  await friend.save();
  res.json(friend);
});

// View transaction details
router.get('/transaction/:id', async (req, res) => {
  const friend = await Friend.findOne({ 'transactions._id': req.params.id, user: req.user.id });
  if (!friend) return res.status(404).json({ message: 'Transaction not found' });
  const transaction = friend.transactions.id(req.params.id);
  res.json(transaction);
});

router.delete('/transaction/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid transaction ID' });
    }
    const friend = await Friend.findOne({ 'transactions._id': req.params.id, user: req.user.id });
    if (!friend) return res.status(404).json({ message: 'Transaction not found' });
    const transaction = friend.transactions.id(req.params.id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    friend.balance -= transaction.amount;
    friend.transactions = friend.transactions.filter(
      txn => String(txn._id) !== String(req.params.id)
    );
    await friend.save();

    res.json({ message: 'Transaction deleted', updatedBalance: friend.balance });
  } catch (error) {
    console.error("Delete transaction error:", error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/transaction/:id', async (req, res) => {
  try {
    const friend = await Friend.findOne({ 'transactions._id': req.params.id, user: req.user.id });
    if (!friend) return res.status(404).json({ message: 'Transaction not found' });
    const txn = friend.transactions.id(req.params.id);
    if (!txn) return res.status(404).json({ message: 'Transaction not found' });

    if (req.body.amount !== undefined) {
      friend.balance = friend.balance - txn.amount + req.body.amount;
      txn.amount = req.body.amount;
    }
    if (req.body.note !== undefined) txn.note = req.body.note;
    if (req.body.date !== undefined) txn.date = new Date(req.body.date);

    await friend.save();
    res.json(txn);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
