const express = require("express");
const axios = require("axios");
const router = express.Router();
require("dotenv").config();

router.post("/", async (req, res) => {
  const { friend, user } = req.body;
  const QrUrl = "upi://pay?pa=7350998157@upi&pn=Yashwant%20Nagarkar";
  const upiQrData = `${QrUrl}&am=${friend.balance}&tn=${friend.name}%20Settle`;

  const qrImageUrl =
    "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" +
    encodeURIComponent(upiQrData);

  if (!friend || friend.balance <= 0) {
    return res.status(400).json({ message: "No balance to send email." });
  }

  const htmlContent = `
    <div style="font-family: 'Segoe UI', sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #7e5bef;">Hello ${friend.name},</h2>
      <p style="font-size: 16px;">You owe me some money, so here's your account details:</p>
      <div style="margin: 20px 0;">
        <strong style="font-size: 18px;">Current Balance:</strong>
        <p style="font-size: 24px; color: ${friend.balance >= 0 ? '#28a745' : '#dc3545'};">
          ₹${friend.balance}
        </p>
      </div>
      <h3 style="margin-bottom: 10px;">Details</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background-color: #f0f0f0;">
            <th style="padding: 10px; border: 1px solid #ddd;">Date</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Amount</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Note</th>
          </tr>
        </thead>
        <tbody>
          ${friend.transactions
            .map(
              (txn) => `
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">${new Date(txn.date).toLocaleDateString("en-GB")}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">₹${txn.amount}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${txn.note}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
      <div style="margin: 25px 0; text-align: center;">
  <p style="font-size: 15px; margin-bottom: 10px;">
    Scan to pay via UPI
  </p>
  <img
    src="${qrImageUrl}"
    alt="UPI QR Code"
    width="200"
    height="200"
    style="border: 1px solid #ddd; border-radius: 8px;"
  />
  <p style="font-size: 12px; color: #666; margin-top: 8px;">
    Works with Google Pay, PhonePe, Paytm, BHIM
  </p>
</div>

      <p style="margin-top:20px;">
        Regards,<br/>
        <strong>${user.name}</strong><br/>
        <small>via YMoneyManager</small>
      </p>
      </div>
  `;

  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "YMoney",
          email: "yashwantnagarkar04@gmail.com",
        },
        to: [{ email: friend.mail }],
        subject: `Hey ${friend.name}, you owe me some money!`,
        htmlContent,
      },
      {
        headers: {
          accept: "application/json",
          "api-key": process.env.BREVO_API_KEY,
          "content-type": "application/json",
        },
      }
    );

    res.status(200).json({ message: "Email sent successfully!" });
  } catch (err) {
    console.error("Email Error:", err.response?.data || err.message);
    res.status(500).json({ message: "Failed to send email." });
  }
});



router.post("/selected", async (req, res) => {
  const { friend, selectedTransactions, user } = req.body;
  const QrUrl = "upi://pay?pa=7350998157@upi&pn=Yashwant%20Nagarkar";
  const upiQrData = `${QrUrl}&am=${friend.balance}&tn=Yashwant%20Settle`;

  const qrImageUrl =
    "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" +
    encodeURIComponent(upiQrData);

  if (!friend || !selectedTransactions || selectedTransactions.length === 0) {
    return res.status(400).json({ message: "No selected transactions to send email." });
  }

  // Calculate balance from selected transactions
  // const totalSelectedBalance = selectedTransactions.reduce((sum, txn) => sum + txn.amount, 0);

  const htmlContent = `
    <div style="font-family: 'Segoe UI', sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #7e5bef;">Hello ${friend.name},</h2>
      <p style="font-size: 16px;">You owe me some money, so here's your account details:</p>
      <div style="margin: 20px 0;">
        <strong style="font-size: 18px;">Current Balance:</strong>
        <p style="font-size: 24px; color: ${friend.balance >= 0 ? '#28a745' : '#dc3545'};">
          ₹${friend.balance}
        </p>
      </div>
      <h3 style="margin-bottom: 10px;">Details</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background-color: #f0f0f0;">
            <th style="padding: 10px; border: 1px solid #ddd;">Date</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Amount</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Note</th>
          </tr>
        </thead>
        <tbody>
          ${selectedTransactions
            .map(
              (txn) => `
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">${new Date(txn.date).toLocaleDateString("en-GB")}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">₹${txn.amount}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${txn.note}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
      <div style="margin: 25px 0; text-align: center;">
  <p style="font-size: 15px; margin-bottom: 10px;">
    Scan to pay via UPI
  </p>
  <img
    src="${qrImageUrl}"
    alt="UPI QR Code"
    width="200"
    height="200"
    style="border: 1px solid #ddd; border-radius: 8px;"
  />
  <p style="font-size: 12px; color: #666; margin-top: 8px;">
    Works with Google Pay, PhonePe, Paytm, BHIM
  </p>
</div>

      <p style="margin-top:20px;">
        Regards,<br/>
        <strong>${user.name}</strong><br/>
        <small>via YMoneyManager</small>
      </p>
    </div>
  `;

  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "YMoney",
          email: "yashwantnagarkar04@gmail.com",
        },
        to: [{ email: friend.mail }],
        subject: `Hey ${friend.name}, you owe me some money!`,
        htmlContent,
      },
      {
        headers: {
          accept: "application/json",
          "api-key": process.env.BREVO_API_KEY,
          "content-type": "application/json",
        },
      }
    );

    res.status(200).json({ message: "Email sent successfully for selected transactions!" });
  } catch (err) {
    console.error("Email Error:", err.response?.data || err.message);
    res.status(500).json({ message: "Failed to send email for selected transactions." });
  }
});

module.exports = router;
