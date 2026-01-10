const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOTPEmail } = require('../utils/emailService');

// Step 1: Request OTP
router.post('/request-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email: email.toLowerCase() });

    // Save new OTP to database
    await OTP.create({
      email: email.toLowerCase(),
      otp: otp
    });

    // Send OTP via email
    const emailResult = await sendOTPEmail(email, otp);

    if (!emailResult.success) {
      return res.status(500).json({ message: 'Failed to send OTP email. Please try again.' });
    }

    res.status(200).json({ 
      message: 'OTP sent successfully to your email',
      email: email 
    });

  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// Step 2: Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({ 
      email: email.toLowerCase(),
      otp: otp 
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    res.status(200).json({ 
      message: 'OTP verified successfully',
      email: email 
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});
// Step 3: Reset Password
router.post('/reset-password', async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
  
      console.log('🔧 Reset attempt:', { email, otpLength: otp?.length, newPasswordLength: newPassword?.length });
  
      if (!email || !otp || !newPassword) {
        return res.status(400).json({ message: 'All fields are required' });
      }
  
      // 1. Verify OTP
      const otpRecord = await OTP.findOne({ 
        email: email.toLowerCase(),
        otp 
      });
  
      if (!otpRecord) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }
  
      // 2. Find user
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // 3. **CRITICAL FIX**: Set PLAINTEXT password - let pre('save') middleware hash it
      user.password = newPassword; // ← PLAINTEXT, NOT hashed!
      await user.save(); // ← pre('save') will hash it automatically
      
      console.log('✅ Password reset SUCCESS for:', email);
  
      // 4. Delete used OTP
      await OTP.deleteOne({ _id: otpRecord._id });
  
      res.status(200).json({ 
        message: 'Password reset successfully! You can now login.' 
      });
  
    } catch (error) {
      console.error('💥 Reset password ERROR:', error);
      res.status(500).json({ message: 'Server error. Please try again.' });
    }
  });
  

module.exports = router;
