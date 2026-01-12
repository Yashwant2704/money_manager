const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI, {  })
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Auth and friends routes
const friendRoutes = require('./routes/Friends');
const authRoutes = require('./routes/auth');
const adminFriendsRoutes = require('./routes/AdminFriends');
const adminImpersonationRoutes = require('./routes/AdminImpersonation');
const passwordResetRoutes = require('./routes/passwordReset');

app.use('/api/friends', friendRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminFriendsRoutes);
app.use('/api/admin', require('./routes/AdminUsers'));
app.use('/api/admin', adminImpersonationRoutes);
app.use('/api/password-reset', passwordResetRoutes);

const emailRoute = require("./routes/email");
app.use("/api/email", emailRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
