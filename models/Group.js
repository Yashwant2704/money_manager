const mongoose = require('mongoose');

// Snapshot of a member at the time they're added to the group.
// We store name here (not just a ref) because Friend docs are
// per-owner in this app — there's no single shared "person" entity
// to point every group member at. "you" always refers to the group
// owner (req.user.id) and is not stored as a member.
const groupMemberSchema = new mongoose.Schema({
  friendId: { type: mongoose.Schema.Types.ObjectId, ref: 'Friend', required: true },
  name: { type: String, required: true },
  removed: { type: Boolean, default: false } // soft-remove, keeps history intact
});

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    emoji: { type: String, default: '👥' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [groupMemberSchema],
    archived: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Group', groupSchema);
