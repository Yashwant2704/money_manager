const express = require("express");
const axios = require("axios");
const router = express.Router();
require("dotenv").config();

router.post("/", async (req, res) => {
  const { friend } = req.body;

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
      <p style="margin-top: 30px; font-size: 16px;">
        You can make payment on the following QR code:
      </p>
      <img src="https://ymoneymanager.netlify.app/assets/qr-DzhZyERJ.jpg" alt="QR Code" style="width: 100%; max-width: 300px; margin: 20px 0;" />
      <p style="font-size: 16px; margin-top: 20px;">Regards,<br/><strong>Yashwant</strong></p>
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

module.exports = router;
