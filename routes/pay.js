const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const SECRET = process.env.UPI_SIGN_SECRET;

// ---------- helpers ----------
const sanitizePayeeName = () => "Yashwant";
const sanitizeTxnNote = () => "Payment";

const verifySignature = ({ amount, ts, sig }) => {
  const payload = `${amount}|${ts}`;

  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex");

  const match = crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(sig)
  );

  console.log("[PAY] Signature check:", match ? "VALID" : "INVALID");

  return match;
};

const isIOS = (ua = "") => /iphone|ipad|ipod/i.test(ua);

// ---------- route ----------
router.get("/pay", (req, res) => {
  console.log("--------------------------------------------------");
  console.log("[PAY] Incoming request");

  const { amount, ts, sig } = req.query;

  console.log("[PAY] Query params:", { amount, ts, sig });
  console.log("[PAY] User-Agent:", req.headers["user-agent"]);

  // 1️⃣ basic validation
  if (!amount || !ts || !sig || isNaN(amount) || Number(amount) <= 0) {
    console.log("[PAY] ❌ Invalid request params");
    return res.status(400).send("Invalid request");
  }

  // 2️⃣ expiry check
  const age = Date.now() - Number(ts);
  console.log("[PAY] Link age (ms):", age);

  if (age > 5 * 60 * 1000) {
    console.log("[PAY] ❌ Link expired");
    return res.status(400).send("Link expired");
  }

  // 3️⃣ signature verification
  if (!verifySignature({ amount, ts, sig })) {
    console.log("[PAY] ❌ Signature mismatch");
    return res.status(403).send("Invalid signature");
  }

  const safeAmount = Number(amount).toFixed(2);

  const upiIntent =
    `upi://pay` +
    `?pa=yashwantnagarkar@ibl` +
    `&pn=${sanitizePayeeName()}` +
    `&am=${safeAmount}` +
    `&cu=INR` +
    `&tn=${sanitizeTxnNote()}`;

  console.log("[PAY] UPI intent generated:");
  console.log(upiIntent);

  res.setHeader("Cache-Control", "no-store");

  // 4️⃣ iOS handling
  if (isIOS(req.headers["user-agent"])) {
    console.log("[PAY] iOS device detected → sending HTML page");
    return res.send(`
      <html>
        <body style="font-family:sans-serif;text-align:center;padding:30px">
          <h3>Tap below to open UPI app</h3>
          <a href="${upiIntent}">Open UPI App</a>
        </body>
      </html>
    `);
  }

  // 5️⃣ Android / others
  console.log("[PAY] Non-iOS device → redirecting to UPI");
  res.redirect(302, upiIntent);
});

module.exports = router;
