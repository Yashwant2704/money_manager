const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Generate impersonation token for a user
router.post('/impersonate/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create impersonation token (longer expiry for convenience)
    const impersonationToken = jwt.sign(
      { 
        id: user._id,
        email: user.email,
        impersonated: true,
        originalAdmin: req.user?.id || 'admin' // Track who is impersonating
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({ 
      token: impersonationToken,
      user: {
        id: user._id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Impersonation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Stop impersonation (return to admin)
router.post('/stop-impersonate', (req, res) => {
  // This endpoint can be used to clear impersonation state
  // The frontend will handle removing the impersonation token
  res.json({ message: 'Impersonation stopped' });
});

module.exports = router;
