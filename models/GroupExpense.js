const mongoose = require('mongoose');

// One person's slice of a group expense.
// payerId "me" is a sentinel meaning the group owner (req.user) paid.
const shareSchema = new mongoose.Schema({
  payerId: { type: String, required: true }, // "me" or a member's friendId (string)
  name: { type: String, required: true },
  amount: { type: Number, required: true }
});

const CATEGORIES = [
  'general',
  'food',
  'travel',
  'stay',
  'shopping',
  'entertainment',
  'utilities',
  'rent',
  'settlement'
];

const groupExpenseSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true },
    category: { type: String, enum: CATEGORIES, default: 'general' },
    totalAmount: { type: Number, required: true },
    paidBy: { type: String, required: true }, // "me" or a member's friendId (string)
    splitType: { type: String, enum: ['equal', 'custom'], default: 'equal' },
    shares: [shareSchema], // each participant's owed amount for this expense
    isSettlement: { type: Boolean, default: false }, // true = a "settle up" payment, not a real expense
    date: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('GroupExpense', groupExpenseSchema);
module.exports.CATEGORIES = CATEGORIES;
