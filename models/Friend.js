const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  amount: Number,
  note: String,
  date: { type: Date, default: Date.now },
});

const friendSchema = new mongoose.Schema({
  name: String,
  balance: { type: Number, default: 0 },
  transactions: [transactionSchema],
});

module.exports = mongoose.model('Friend', friendSchema);
