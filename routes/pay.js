const express = require("express");
const router = express.Router();

router.get("/pay", (req, res) => {
  const { amount, name } = req.query;

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).send("Invalid amount");
  }

  const upiUrl =
    `upi://pay` +
    `?pa=7350998157@upi` +
    `&pn=Yashwant%20Nagarkar` +
    `&am=${amount}` +
    `&cu=INR` +
    `&tn=${encodeURIComponent(name || "Settlement")}`;

  res.redirect(302, upiUrl);
});

module.exports = router;
