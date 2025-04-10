const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config(); // <-- Load .env

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB using URI from .env
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
const friendRoutes = require('./routes/Friends');
app.use('/api/friends', friendRoutes);
const emailRoute = require("./routes/email");
app.use("/api/email", emailRoute);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
