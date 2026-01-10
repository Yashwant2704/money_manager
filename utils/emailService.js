const axios = require('axios');
require('dotenv').config();

const sendOTPEmail = async (email, otp) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', sans-serif; background-color: #1f1b24; color: #ffffff; padding: 20px; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #2a2a3a, #1f1b24); border-radius: 16px; padding: 40px; border: 2px solid #bb86fc; box-shadow: 0 8px 32px rgba(187, 134, 252, 0.2); }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #bb86fc; margin: 0; font-size: 2rem; }
        .otp-box { background: rgba(187, 134, 252, 0.1); border: 3px solid #bb86fc; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; backdrop-filter: blur(10px); }
        .otp-code { font-size: 48px; font-weight: bold; color: #bb86fc; letter-spacing: 12px; font-family: 'Courier New', monospace; text-shadow: 0 0 20px rgba(187, 134, 252, 0.5); }
        .highlight { color: #4caf50; font-size: 18px; margin-top: 10px; }
        .warning { background: rgba(255, 68, 68, 0.1); border: 1px solid #ff4444; border-radius: 8px; padding: 15px; margin: 20px 0; color: #ff6b6b; font-size: 14px; }
        .footer { text-align: center; margin-top: 40px; color: #aaa; font-size: 14px; border-top: 1px solid #444; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset</h1>
          <p>Y-MoneyManager</p>
        </div>
        
        <p style="font-size: 18px; margin-bottom: 20px;">Hello!</p>
        <p style="font-size: 16px; color: #e0e0e0;">You requested to reset your password. Use the OTP below:</p>
        
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
          <div class="highlight">Valid for 10 minutes only</div>
        </div>
        
        <div class="warning">
          <strong>⚠️ Security Notice:</strong><br/>
          Never share this OTP with anyone. Y-MoneyManager will <strong>never</strong> ask for your OTP.
        </div>
        
        <p style="font-size: 14px; color: #aaa;">
          If you didn't request this, please ignore this email.
        </p>
        
        <div class="footer">
          <p>© 2026 Y-MoneyManager. All rights reserved.</p>
          <p>Sent to: ${email}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Y-MoneyManager",
          email: "yashwantnagarkar04@gmail.com", // Your verified sender email
        },
        to: [{ email: email }],
        subject: `Your Password Reset OTP - Y-MoneyManager`,
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

    console.log('✅ Brevo OTP email sent successfully:', response.data.messageId);
    return { success: true };
  } catch (error) {
    console.error('❌ Brevo OTP email error:', error.response?.data || error.message);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};

module.exports = { sendOTPEmail };
