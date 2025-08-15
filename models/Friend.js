const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  amount: Number,
  note: String,
  date: { type: Date, default: Date.now }
});

const friendSchema = new mongoose.Schema({
  name: String,
  mail: String,
  balance: { type: Number, default: 0 },
  transactions: [transactionSchema],
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

module.exports = mongoose.model('Friend', friendSchema);
