const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

let mongoConnectionPromise = null;

function connectDB() {
    if (mongoose.connection.readyState === 1) {
        return Promise.resolve();
    }

    if (!mongoConnectionPromise) {
        mongoConnectionPromise = mongoose.connect(process.env.MONGO_URI)
            .then(() => {
                console.log("MongoDB connected successfully");
            })
            .catch(err => {
                console.error("MongoDB connection error:", err);
                mongoConnectionPromise = null;
                throw err;
            });
    }

    return mongoConnectionPromise;
}

app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        res.status(503).json({
            message: "Database unavailable"
        });
    }
});

// Routes
app.use("/api/friends", require("./routes/Friends"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/AdminFriends"));
app.use("/api/admin", require("./routes/AdminUsers"));
app.use("/api/admin", require("./routes/AdminImpersonation"));
app.use("/api/password-reset", require("./routes/passwordReset"));
app.use("/api", require("./routes/pay"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/email", require("./routes/email"));
app.use("/api/groups", require("./routes/Groups"));

app.post("/api/client-log", express.json(), (req, res) => {
    console.log("[CLIENT-LOG]", req.body);
    res.sendStatus(204);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});