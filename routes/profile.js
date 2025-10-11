const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const express = require("express");
const router = express.Router();
const User = require('../models/Friend'); // Update path if needed

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() }); // Store file in memory for direct Cloudinary upload

// Upload new QR for user
router.post('/profile/upload-qr', auth, upload.single('qr'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  // Upload to cloudinary
  const result = await cloudinary.uploader.upload_stream(
    { resource_type: 'image', folder: 'user_qr_codes', public_id: `qr_${req.user.id}` },
    async (error, cloudRes) => {
      if (error) return res.status(500).json({ message: 'Cloudinary error', error });

      // Save cloudinary URL to user
      const user = await User.findByIdAndUpdate(
        req.user.id, { qrCodeUrl: cloudRes.secure_url }, { new: true }
      );
      res.json({ qrCodeUrl: user.qrCodeUrl });
    }
  ).end(req.file.buffer);
});

// Fetch QR by current user
router.get('/profile/qr', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user || !user.qrCodeUrl) {
    return res.status(404).json({ message: "QR code not found" });
  }
  res.json({ qrCodeUrl: user.qrCodeUrl });
});
