const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  amount: Number,
  note: String,
  date: { type: Date, default: Date.now },
  mirrored: { type: Boolean, default: false },
  addedBy: { type: String, default: "" },
  sharedId: { type: String, default: null }
});

const friendSchema = new mongoose.Schema({
  name: String,
  mail: String,
  balance: { type: Number, default: 0 },
  transactions: [transactionSchema],
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  linkedUserId: { type: String, default: "" }
});

module.exports = mongoose.model('Friend', friendSchema);
