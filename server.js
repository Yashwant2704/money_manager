const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Uncomment for debugging if needed
// mongoose.set("debug", true);

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

async function startServer() {
    try {
        // console.time("MongoDB Connect");

        await mongoose.connect(process.env.MONGO_URI);

        // console.timeEnd("MongoDB Connect");
        console.log("MongoDB connected successfully");

        // console.time("MongoDB Ping");
        await mongoose.connection.db.admin().ping();
        // console.timeEnd("MongoDB Ping");

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        mongoose.connection.on("error", (err) => {
            console.error("MongoDB Error:", err);
        });

        mongoose.connection.on("disconnected", () => {
            console.warn("MongoDB disconnected");
        });

    } catch (err) {
        console.error("Failed to connect to MongoDB");
        console.error(err);
        process.exit(1);
    }
}

startServer();