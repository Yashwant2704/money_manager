const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Group = require('../models/Group');
const GroupExpense = require('../models/GroupExpense');
const Friend = require('../models/Friend');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Protect all routes!
router.use(auth);

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Build the participant list for a group: "me" (the owner) + every
// active (non-removed) member. This is the universe every expense's
// shares must add up across.
const getParticipants = async (group, userId) => {
  const me = await User.findById(userId).select('name email');
  const participants = [
    { id: 'me', name: me?.name || 'You' },
    ...group.members
      .filter((m) => !m.removed)
      .map((m) => ({ id: m.friendId.toString(), name: m.name }))
  ];
  return participants;
};

// Split totalAmount evenly across participantIds, distributing the
// leftover cent(s) to the first participant so the shares always sum
// exactly to totalAmount (avoids the classic 3-way-split rounding bug).
const splitEqually = (totalAmount, participants) => {
  const n = participants.length;
  const base = Math.floor((totalAmount / n) * 100) / 100;
  const shares = participants.map((p) => ({
    payerId: p.id,
    name: p.name,
    amount: base
  }));
  const distributed = round2(base * n);
  const remainder = round2(totalAmount - distributed);
  if (remainder !== 0) {
    shares[0].amount = round2(shares[0].amount + remainder);
  }
  return shares;
};

// Compute each participant's net balance within a group from its
// non-deleted expenses (settlements included — they're just expenses
// under the hood, see models/GroupExpense.js).
// Positive balance = they are owed money. Negative = they owe money.
const computeBalances = (participants, expenses) => {
  const balances = {};
  participants.forEach((p) => (balances[p.id] = 0));

  expenses
    .filter((e) => !e.isDeleted)
    .forEach((e) => {
      if (balances[e.paidBy] === undefined) balances[e.paidBy] = 0;
      balances[e.paidBy] = round2(balances[e.paidBy] + e.totalAmount);
      e.shares.forEach((s) => {
        if (balances[s.payerId] === undefined) balances[s.payerId] = 0;
        balances[s.payerId] = round2(balances[s.payerId] - s.amount);
      });
    });

  return participants.map((p) => ({
    id: p.id,
    name: p.name,
    balance: balances[p.id] ?? 0
  }));
};

// Greedy debt simplification: repeatedly match the biggest creditor
// with the biggest debtor. Minimizes the number of payments needed to
// settle the whole group, without requiring every pair to pay each
// other directly.
const simplifyDebts = (balances) => {
  const creditors = balances
    .filter((b) => b.balance > 0.01)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.balance - a.balance);
  const debtors = balances
    .filter((b) => b.balance < -0.01)
    .map((b) => ({ ...b, balance: -b.balance }))
    .sort((a, b) => b.balance - a.balance);

  const plan = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = round2(Math.min(debtor.balance, creditor.balance));

    if (amount > 0.01) {
      plan.push({
        from: debtor.id,
        fromName: debtor.name,
        to: creditor.id,
        toName: creditor.name,
        amount
      });
    }

    debtor.balance = round2(debtor.balance - amount);
    creditor.balance = round2(creditor.balance - amount);

    if (debtor.balance <= 0.01) i++;
    if (creditor.balance <= 0.01) j++;
  }

  return plan;
};

const summarizeSpend = (expenses) => {
  const real = expenses.filter((e) => !e.isDeleted && !e.isSettlement);
  const totalSpend = round2(real.reduce((sum, e) => sum + e.totalAmount, 0));
  const byCategory = {};
  real.forEach((e) => {
    byCategory[e.category] = round2((byCategory[e.category] || 0) + e.totalAmount);
  });
  return { totalSpend, byCategory, entryCount: real.length };
};

// ---------------------------------------------------------------
// GET /api/groups — list all groups for the current user, each with
// a computed total (sum of what's owed to "me" minus what "me" owes).
// ---------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const groups = await Group.find({ user: req.user.id, archived: false }).lean();

    const groupsWithBalances = await Promise.all(
      groups.map(async (group) => {
        const expenses = await GroupExpense.find({
          group: group._id,
          isDeleted: false
        }).lean();

        const participants = await getParticipants(group, req.user.id);
        const balances = computeBalances(participants, expenses);
        const mine = balances.find((b) => b.id === 'me');

        return {
          ...group,
          memberCount: group.members.filter((m) => !m.removed).length,
          myBalance: mine ? mine.balance : 0,
          expenseCount: expenses.filter((e) => !e.isSettlement).length
        };
      })
    );

    res.json(groupsWithBalances);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------
// POST /api/groups — create a group
// body: { name, emoji, memberFriendIds: [friendId, ...] }
// ---------------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const { name, emoji, memberFriendIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }
    if (!Array.isArray(memberFriendIds) || memberFriendIds.length === 0) {
      return res.status(400).json({ message: 'Select at least one friend' });
    }

    const friends = await Friend.find({
      _id: { $in: memberFriendIds },
      user: req.user.id
    });

    if (friends.length !== memberFriendIds.length) {
      return res.status(400).json({ message: 'Invalid friends selected' });
    }

    const group = new Group({
      name: name.trim(),
      emoji: emoji || '👥',
      user: req.user.id,
      members: friends.map((f) => ({ friendId: f._id, name: f.name }))
    });

    await group.save();
    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------
// GET /api/groups/:id — full group detail: members, balances,
// non-deleted expenses, and spend summary.
// ---------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, user: req.user.id }).lean();
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const expenses = await GroupExpense.find({ group: group._id, isDeleted: false })
      .sort({ date: -1 })
      .lean();

    const participants = await getParticipants(group, req.user.id);
    const balances = computeBalances(participants, expenses);
    const spend = summarizeSpend(expenses);

    res.json({ ...group, participants, balances, expenses, spend });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------
// PUT /api/groups/:id — rename group / change emoji
// ---------------------------------------------------------------
router.put('/:id', async (req, res) => {
  try {
    const { name, emoji } = req.body;
    const group = await Group.findOne({ _id: req.params.id, user: req.user.id });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (name !== undefined) group.name = name.trim();
    if (emoji !== undefined) group.emoji = emoji;

    await group.save();
    res.json(group);
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------
// DELETE /api/groups/:id — archive a group (soft delete)
// ---------------------------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, user: req.user.id });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    group.archived = true;
    await group.save();
    res.json({ message: 'Group archived' });
  } catch (error) {
    console.error('Error archiving group:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------
// POST /api/groups/:id/members — add member(s) to an existing group
// body: { friendIds: [friendId, ...] }
// ---------------------------------------------------------------
router.post('/:id/members', async (req, res) => {
  try {
    const { friendIds } = req.body;
    if (!Array.isArray(friendIds) || friendIds.length === 0) {
      return res.status(400).json({ message: 'No friends provided' });
    }

    const group = await Group.findOne({ _id: req.params.id, user: req.user.id });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const friends = await Friend.find({ _id: { $in: friendIds }, user: req.user.id });
    if (friends.length !== friendIds.length) {
      return res.status(400).json({ message: 'Invalid friends selected' });
    }

    friends.forEach((f) => {
      const existing = group.members.find((m) => m.friendId.toString() === f._id.toString());
      if (existing) {
        existing.removed = false; // re-add if they'd been removed before
      } else {
        group.members.push({ friendId: f._id, name: f.name });
      }
    });

    await group.save();
    res.json(group);
  } catch (error) {
    console.error('Error adding members:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------
// DELETE /api/groups/:id/members/:friendId — soft-remove a member
// (kept in history so past expense shares still show their name)
// ---------------------------------------------------------------
router.delete('/:id/members/:friendId', async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, user: req.user.id });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const member = group.members.find((m) => m.friendId.toString() === req.params.friendId);
    if (!member) return res.status(404).json({ message: 'Member not found in group' });

    const expenses = await GroupExpense.find({ group: group._id, isDeleted: false }).lean();
    const participants = await getParticipants(group, req.user.id);
    const balances = computeBalances(participants, expenses);
    const theirs = balances.find((b) => b.id === req.params.friendId);

    if (theirs && Math.abs(theirs.balance) > 0.01) {
      return res.status(400).json({
        message: `Can't remove ${member.name} — they still have an outstanding balance of ₹${Math.abs(theirs.balance).toFixed(2)} in this group. Settle up first.`
      });
    }

    member.removed = true;
    await group.save();
    res.json(group);
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------
// POST /api/groups/:id/expenses — add a group expense
// body: {
//   description, category, totalAmount, paidBy,
//   splitType: "equal" | "custom",
//   customShares: [{ payerId, amount }]   // required if splitType === "custom"
//   participantIds: [id, ...]             // optional subset for equal split (default: everyone)
// }
// ---------------------------------------------------------------
router.post('/:id/expenses', async (req, res) => {
  try {
    const { description, category, totalAmount, paidBy, splitType, customShares, participantIds } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Description is required' });
    }
    const amount = Number(totalAmount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Enter a valid amount' });
    }
    if (!paidBy) {
      return res.status(400).json({ message: 'Select who paid' });
    }

    const group = await Group.findOne({ _id: req.params.id, user: req.user.id });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const allParticipants = await getParticipants(group, req.user.id);
    const validIds = new Set(allParticipants.map((p) => p.id));

    if (!validIds.has(paidBy)) {
      return res.status(400).json({ message: 'Payer is not a member of this group' });
    }

    let shares;

    if (splitType === 'custom') {
      if (!Array.isArray(customShares) || customShares.length === 0) {
        return res.status(400).json({ message: 'Provide a custom split' });
      }
      for (const s of customShares) {
        if (!validIds.has(s.payerId)) {
          return res.status(400).json({ message: 'Custom split includes someone outside this group' });
        }
      }
      const sum = round2(customShares.reduce((t, s) => t + Number(s.amount || 0), 0));
      if (Math.abs(sum - round2(amount)) > 0.01) {
        return res.status(400).json({
          message: `Custom split (₹${sum.toFixed(2)}) doesn't add up to the total (₹${amount.toFixed(2)})`
        });
      }
      shares = customShares.map((s) => {
        const p = allParticipants.find((ap) => ap.id === s.payerId);
        return { payerId: s.payerId, name: p?.name || s.payerId, amount: round2(Number(s.amount)) };
      });
    } else {
      const splitAmong = Array.isArray(participantIds) && participantIds.length > 0
        ? allParticipants.filter((p) => participantIds.includes(p.id))
        : allParticipants;

      if (splitAmong.length === 0) {
        return res.status(400).json({ message: 'No participants to split between' });
      }
      shares = splitEqually(round2(amount), splitAmong);
    }

    const expense = new GroupExpense({
      group: group._id,
      user: req.user.id,
      description: description.trim(),
      category: category || 'general',
      totalAmount: round2(amount),
      paidBy,
      splitType: splitType === 'custom' ? 'custom' : 'equal',
      shares,
      date: req.body.date ? new Date(req.body.date) : new Date()
    });

    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    console.error('Error adding group expense:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------
// PUT /api/groups/expenses/:expenseId — edit a group expense
// Accepts the same body shape as create; recomputes shares.
// ---------------------------------------------------------------
router.put('/expenses/:expenseId', async (req, res) => {
  try {
    const expense = await GroupExpense.findOne({ _id: req.params.expenseId, user: req.user.id });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    const group = await Group.findOne({ _id: expense.group, user: req.user.id });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const { description, category, totalAmount, paidBy, splitType, customShares, participantIds } = req.body;

    const allParticipants = await getParticipants(group, req.user.id);
    const validIds = new Set(allParticipants.map((p) => p.id));

    if (description !== undefined) expense.description = description.trim();
    if (category !== undefined) expense.category = category;

    const amount = totalAmount !== undefined ? Number(totalAmount) : expense.totalAmount;
    const payer = paidBy !== undefined ? paidBy : expense.paidBy;

    if (!validIds.has(payer)) {
      return res.status(400).json({ message: 'Payer is not a member of this group' });
    }

    if (splitType === 'custom') {
      if (!Array.isArray(customShares) || customShares.length === 0) {
        return res.status(400).json({ message: 'Provide a custom split' });
      }
      const sum = round2(customShares.reduce((t, s) => t + Number(s.amount || 0), 0));
      if (Math.abs(sum - round2(amount)) > 0.01) {
        return res.status(400).json({
          message: `Custom split (₹${sum.toFixed(2)}) doesn't add up to the total (₹${amount.toFixed(2)})`
        });
      }
      expense.shares = customShares.map((s) => {
        const p = allParticipants.find((ap) => ap.id === s.payerId);
        return { payerId: s.payerId, name: p?.name || s.payerId, amount: round2(Number(s.amount)) };
      });
      expense.splitType = 'custom';
    } else if (splitType === 'equal' || totalAmount !== undefined) {
      const splitAmong = Array.isArray(participantIds) && participantIds.length > 0
        ? allParticipants.filter((p) => participantIds.includes(p.id))
        : allParticipants;
      expense.shares = splitEqually(round2(amount), splitAmong);
      expense.splitType = 'equal';
    }

    expense.totalAmount = round2(amount);
    expense.paidBy = payer;

    await expense.save();
    res.json(expense);
  } catch (error) {
    console.error('Error updating group expense:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------
// DELETE /api/groups/expenses/:expenseId — soft delete
// ---------------------------------------------------------------
router.delete('/expenses/:expenseId', async (req, res) => {
  try {
    const expense = await GroupExpense.findOne({ _id: req.params.expenseId, user: req.user.id });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    expense.isDeleted = true;
    await expense.save();
    res.json({ message: 'Expense removed' });
  } catch (error) {
    console.error('Error deleting group expense:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------
// GET /api/groups/:id/settle-plan — simplified debt settlement plan
// ---------------------------------------------------------------
router.get('/:id/settle-plan', async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, user: req.user.id }).lean();
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const expenses = await GroupExpense.find({ group: group._id, isDeleted: false }).lean();
    const participants = await getParticipants(group, req.user.id);
    const balances = computeBalances(participants, expenses);
    const plan = simplifyDebts(balances);

    res.json({ balances, plan });
  } catch (error) {
    console.error('Error computing settle plan:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------
// POST /api/groups/:id/settle — record a settlement payment between
// two participants. Internally this is just a special expense, so
// it folds into balances/activity/exports automatically.
// body: { fromId, toId, amount }
// ---------------------------------------------------------------
router.post('/:id/settle', async (req, res) => {
  try {
    const { fromId, toId, amount } = req.body;
    const amt = round2(Number(amount));

    if (!fromId || !toId || fromId === toId || !amt || amt <= 0) {
      return res.status(400).json({ message: 'Invalid settlement details' });
    }

    const group = await Group.findOne({ _id: req.params.id, user: req.user.id });
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const participants = await getParticipants(group, req.user.id);
    const from = participants.find((p) => p.id === fromId);
    const to = participants.find((p) => p.id === toId);
    if (!from || !to) {
      return res.status(400).json({ message: 'Both people must be in this group' });
    }

    const settlement = new GroupExpense({
      group: group._id,
      user: req.user.id,
      description: `Settlement: ${from.name} paid ${to.name}`,
      category: 'settlement',
      totalAmount: amt,
      paidBy: fromId,
      splitType: 'custom',
      shares: [{ payerId: toId, name: to.name, amount: amt }],
      isSettlement: true,
      date: new Date()
    });

    await settlement.save();
    res.status(201).json(settlement);
  } catch (error) {
    console.error('Error recording settlement:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------
// GET /api/groups/:id/activity — combined feed of expenses and
// settlements, newest first. Includes soft-deleted entries flagged
// so the UI can show a "removed" state instead of just hiding them.
// ---------------------------------------------------------------
router.get('/:id/activity', async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, user: req.user.id }).lean();
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const expenses = await GroupExpense.find({ group: group._id })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    res.json(
      expenses.map((e) => ({
        ...e,
        type: e.isSettlement ? 'settlement' : e.isDeleted ? 'removed' : 'expense'
      }))
    );
  } catch (error) {
    console.error('Error fetching group activity:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.all('*', (req, res) => {
  res.status(405).json({ message: 'Method Not Allowed' });
});

module.exports = router;
