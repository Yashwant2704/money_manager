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
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f14; padding:24px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="
          background:#1a1a24;
          border-radius:14px;
          overflow:hidden;
          font-family:Segoe UI, Arial, sans-serif;
          box-shadow:0 10px 30px rgba(0,0,0,0.35);
        "
      >

        <!-- HEADER -->
        <tr>
          <td
            style="
              padding:24px;
              background:linear-gradient(90deg,#5a2ca0,#8b4df5);
              color:#ffffff;
            "
          >
            <h2 style="margin:0; font-size:22px;">Payment Reminder</h2>
            <p style="margin:6px 0 0; font-size:13px; opacity:0.9;">
              YMoneyManager
            </p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:24px; color:#eaeaf0;">

            <p style="font-size:15px; margin-top:0;">
              Hello <strong>${friend.name}</strong>,
            </p>

            <p style="font-size:14px; color:#cfcfe6;">
              You owe me some money. Here are the details:
            </p>

            <!-- BALANCE -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="
                margin:20px 0;
                background:#12121a;
                border-radius:12px;
                border:1px solid #2a2a3d;
              "
            >
              <tr>
                <td align="center" style="padding:18px;">
                  <p style="margin:0; font-size:13px; color:#9fa0c3;">
                    Current Balance
                  </p>
                  <p
                    style="
                      margin:8px 0 0;
                      font-size:30px;
                      font-weight:600;
                      color:${friend.balance >= 0 ? "#4cd964" : "#ff5c5c"};
                    "
                  >
                    ₹${friend.balance}
                  </p>
                </td>
              </tr>
            </table>

            <!-- TRANSACTIONS TABLE -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="
                border-collapse:separate;
                border-spacing:0;
                background:#14141c;
                border-radius:12px;
                overflow:hidden;
                margin-top:16px;
              "
            >
              <thead>
                <tr>
                  <th
                    style="
                      padding:14px 16px;
                      text-align:left;
                      color:#ffffff;
                      font-size:15px;
                      font-weight:600;
                      background:linear-gradient(90deg,#5a2ca0,#8b4df5);
                    "
                  >
                    Date
                  </th>
                  <th
                    style="
                      padding:14px 16px;
                      text-align:left;
                      color:#ffffff;
                      font-size:15px;
                      font-weight:600;
                      background:linear-gradient(90deg,#6a38b8,#9a5cff);
                    "
                  >
                    Amount
                  </th>
                  <th
                    style="
                      padding:14px 16px;
                      text-align:left;
                      color:#ffffff;
                      font-size:15px;
                      font-weight:600;
                      background:linear-gradient(90deg,#5a2ca0,#8b4df5);
                    "
                  >
                    Note
                  </th>
                </tr>
              </thead>

              <tbody>
                ${(friend.transactions || []).map(txn => `
                  <tr>
                    <td
                      style="
                        padding:14px 16px;
                        font-size:14px;
                        color:#eaeaf0;
                        border-bottom:1px solid #2a2a3d;
                      "
                    >
                      ${new Date(txn.date).toLocaleDateString("en-GB")}
                    </td>
                    <td
                      style="
                        padding:14px 16px;
                        font-size:14px;
                        color:#ffffff;
                        border-bottom:1px solid #2a2a3d;
                      "
                    >
                      ₹${txn.amount}
                    </td>
                    <td
                      style="
                        padding:14px 16px;
                        font-size:14px;
                        color:#cfcfe6;
                        border-bottom:1px solid #2a2a3d;
                      "
                    >
                      ${txn.note}
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>

            <!-- QR -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
              <tr>
                <td align="center">
                  <p style="font-size:14px; color:#cfcfe6; margin-bottom:10px;">
                    Scan to pay via UPI
                  </p>
                  <img
                    src="${qrImageUrl}"
                    width="200"
                    height="200"
                    alt="UPI QR"
                    style="border-radius:12px; border:2px solid #984bf7; padding:10px"
                  />
                  <p style="font-size:12px; color:#9fa0c3; margin-top:8px;">
                    Google Pay • PhonePe • Paytm • BHIM
                  </p>
                </td>
              </tr>
            </table>

            <!-- FOOTER TEXT -->
            <p style="font-size:14px; color:#cfcfe6; margin-bottom:0;">
              Regards,<br/>
              <strong>${user.name}</strong>
            </p>

          </td>
        </tr>

        <!-- FOOTER BAR -->
        <tr>
          <td
            style="
              background:#12121a;
              padding:12px;
              text-align:center;
              font-size:12px;
              color:#9fa0c3;
            "
          >
            Sent via YMoneyManager
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
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
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
        style="
          background:#1a1a24;
          border-radius:14px;
          overflow:hidden;
          font-family:Segoe UI, Arial, sans-serif;
          box-shadow:0 10px 30px rgba(0,0,0,0.35);
        "
      >

        <!-- HEADER -->
        <tr>
          <td
            style="
              padding:24px;
              background:linear-gradient(90deg,#5a2ca0,#8b4df5);
              color:#ffffff;
            "
          >
            <h2 style="margin:0; font-size:22px;">Payment Reminder</h2>
            <p style="margin:6px 0 0; font-size:13px; opacity:0.9;">
              YMoneyManager
            </p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:24px; color:#eaeaf0;">

            <p style="font-size:15px; margin-top:0;">
              Hello <strong>${friend.name}</strong>,
            </p>

            <p style="font-size:14px; color:#cfcfe6;">
              You owe me some money. Here are the details:
            </p>

            <!-- BALANCE -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="
                margin:20px 0;
                background:#12121a;
                border-radius:12px;
                border:1px solid #2a2a3d;
              "
            >
              <tr>
                <td align="center" style="padding:18px;">
                  <p style="margin:0; font-size:13px; color:#9fa0c3;">
                    Current Balance
                  </p>
                  <p
                    style="
                      margin:8px 0 0;
                      font-size:30px;
                      font-weight:600;
                      color:${friend.balance >= 0 ? "#4cd964" : "#ff5c5c"};
                    "
                  >
                    ₹${friend.balance}
                  </p>
                </td>
              </tr>
            </table>

            <!-- TRANSACTIONS TABLE -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="
                border-collapse:separate;
                border-spacing:0;
                background:#14141c;
                border-radius:12px;
                overflow:hidden;
                margin-top:16px;
              "
            >
              <thead>
                <tr>
                  <th
                    style="
                      padding:14px 16px;
                      text-align:left;
                      color:#ffffff;
                      font-size:15px;
                      font-weight:600;
                      background:linear-gradient(90deg,#5a2ca0,#8b4df5);
                    "
                  >
                    Date
                  </th>
                  <th
                    style="
                      padding:14px 16px;
                      text-align:left;
                      color:#ffffff;
                      font-size:15px;
                      font-weight:600;
                      background:linear-gradient(90deg,#6a38b8,#9a5cff);
                    "
                  >
                    Amount
                  </th>
                  <th
                    style="
                      padding:14px 16px;
                      text-align:left;
                      color:#ffffff;
                      font-size:15px;
                      font-weight:600;
                      background:linear-gradient(90deg,#5a2ca0,#8b4df5);
                    "
                  >
                    Note
                  </th>
                </tr>
              </thead>

              <tbody>
                ${(friend.transactions || []).map(txn => `
                  <tr>
                    <td
                      style="
                        padding:14px 16px;
                        font-size:14px;
                        color:#eaeaf0;
                        border-bottom:1px solid #2a2a3d;
                      "
                    >
                      ${new Date(txn.date).toLocaleDateString("en-GB")}
                    </td>
                    <td
                      style="
                        padding:14px 16px;
                        font-size:14px;
                        color:#ffffff;
                        border-bottom:1px solid #2a2a3d;
                      "
                    >
                      ₹${txn.amount}
                    </td>
                    <td
                      style="
                        padding:14px 16px;
                        font-size:14px;
                        color:#cfcfe6;
                        border-bottom:1px solid #2a2a3d;
                      "
                    >
                      ${txn.note}
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>

            <!-- QR -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
              <tr>
                <td align="center">
                  <p style="font-size:14px; color:#cfcfe6; margin-bottom:10px;">
                    Scan to pay via UPI
                  </p>
                  <img
                    src="${qrImageUrl}"
                    width="200"
                    height="200"
                    alt="UPI QR"
                    style="border-radius:12px; border:2px solid #984bf7; padding:10px"
                  />
                  <p style="font-size:12px; color:#9fa0c3; margin-top:8px;">
                    Google Pay • PhonePe • Paytm • BHIM
                  </p>
                </td>
              </tr>
            </table>

            <!-- FOOTER TEXT -->
            <p style="font-size:14px; color:#cfcfe6; margin-bottom:0;">
              Regards,<br/>
              <strong>${user.name}</strong>
            </p>

          </td>
        </tr>

        <!-- FOOTER BAR -->
        <tr>
          <td
            style="
              background:#12121a;
              padding:12px;
              text-align:center;
              font-size:12px;
              color:#9fa0c3;
            "
          >
            Sent via YMoneyManager
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
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
