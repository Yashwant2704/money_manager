const express = require("express");
const router = express.Router();

/**
 * Helpers
 */

// allow only alphabets, single word
const sanitizePayeeName = (name) => {
  if (!name) return "Yashwant";
  return name
    .replace(/[^a-zA-Z]/g, "")   // remove spaces, numbers, symbols
    .substring(0, 20);           // safety cap
};

// strict-safe transaction note
const sanitizeTxnNote = () => {
  return "Payment"; // safest across all banks & wallets
};

// detect wallet UPI (Mobikwik, Amazon Pay, etc.)
const isWalletUpi = (ua = "") => {
  const walletKeywords = [
    "mobikwik",
    "amazon",
    "freecharge",
    "payzapp",
    "wallet"
  ];
  ua = ua.toLowerCase();
  return walletKeywords.some(k => ua.includes(k));
};

router.get("/pay", (req, res) => {
  const { amount, name } = req.query;

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).send("Invalid amount");
  }

  const userAgent = req.headers["user-agent"] || "";
  const wallet = isWalletUpi(userAgent);

  // 🔐 Auto-sanitized values
  const pn = wallet
    ? "Yashwant"                     // downgrade for wallet UPI
    : sanitizePayeeName("Yashwant"); // bank-safe

  const tn = sanitizeTxnNote();      // ALWAYS simple

  const upiUrl =
    `upi://pay` +
    `?pa=7350998157@upi` +
    `&pn=${encodeURIComponent(pn)}` +
    `&am=${Number(amount).toFixed(2)}` +
    `&cu=INR` +
    `&tn=${encodeURIComponent(tn)}`;

  // Retry-safe redirect
  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, upiUrl);
});

module.exports = router;
