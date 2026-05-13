/**
 * ZeptoMail Test Script
 * Tests transactional email sending via ZeptoMail
 * Reference: src/utils/zeptomail.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { SendMailClient } = require("zeptomail");

const url = "https://api.zeptomail.in/v1.1/email";
const token = process.env.ZEPTOMAIL_API_KEY;
const SENDER_EMAIL = process.env.ZEPTOMAIL_SENDER_EMAIL;
const SENDER_NAME = process.env.ZEPTOMAIL_SENDER_NAME;

// Test recipient — change to your email
const TEST_EMAIL = "vishal@getniv.com";

console.log("========================================");
console.log("  ZeptoMail Email Test");
console.log("========================================\n");

console.log("📋 Configuration:");
console.log("   API Key:", token ? token.substring(0, 30) + "..." : "❌ NOT SET");
console.log("   Sender Email:", SENDER_EMAIL);
console.log("   Sender Name:", SENDER_NAME);
console.log("   Test Recipient:", TEST_EMAIL);
console.log("\n");

if (!token) {
    console.error("❌ ZEPTOMAIL_API_KEY not set in .env");
    process.exit(1);
}

const client = new SendMailClient({ url, token });

async function sendTestEmail(testName, emailData) {
    console.log(`🧪 ${testName}`);
    try {
        const response = await client.sendMail(emailData);
        console.log("   ✅ SUCCESS");
        console.log("   Response:", JSON.stringify(response?.data || response, null, 2).substring(0, 200));
        return true;
    } catch (error) {
        console.log("   ❌ FAILED");
        console.log("   Error:", JSON.stringify(error?.response?.data || error?.message || error, null, 2));
        return false;
    }
}

(async () => {
    let passed = 0;
    let failed = 0;

    // Test 1: Plain HTML email
    const result1 = await sendTestEmail("Test 1: Plain HTML Email", {
        from: { address: SENDER_EMAIL, name: SENDER_NAME },
        to: [{ email_address: { address: TEST_EMAIL, name: "Test User" } }],
        subject: "Ayuxa — ZeptoMail Test Email",
        htmlbody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1a7f5a;">Ayuxa Care — Email Test</h2>
                <p>This is a test email sent from the ZeptoMail integration test script.</p>
                <p><strong>Timestamp:</strong> ${new Date().toLocaleString('en-IN')}</p>
                <p><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
                <hr style="border: 1px solid #eee;" />
                <p style="color: #888; font-size: 12px;">Team Ayuxa Care</p>
            </div>
        `
    });
    result1 ? passed++ : failed++;

    await new Promise(r => setTimeout(r, 1500));

    // Test 2: OTP-style email
    const result2 = await sendTestEmail("Test 2: OTP Email", {
        from: { address: SENDER_EMAIL, name: SENDER_NAME },
        to: [{ email_address: { address: TEST_EMAIL, name: "Test User" } }],
        subject: "Your Ayuxa OTP Code",
        htmlbody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1a7f5a;">Your One-Time Password</h2>
                <p>Use the following OTP to verify your account:</p>
                <div style="font-size: 36px; font-weight: bold; color: #1a7f5a; letter-spacing: 10px; text-align: center; padding: 20px; background: #f0faf5; border-radius: 8px; margin: 20px 0;">
                    123456
                </div>
                <p style="color: #666;">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
                <p style="color: #888; font-size: 12px;">Team Ayuxa Care</p>
            </div>
        `
    });
    result2 ? passed++ : failed++;

    await new Promise(r => setTimeout(r, 1500));

    // Test 3: Order confirmation email
    const result3 = await sendTestEmail("Test 3: Order Confirmation Email", {
        from: { address: SENDER_EMAIL, name: SENDER_NAME },
        to: [{ email_address: { address: TEST_EMAIL, name: "Test User" } }],
        subject: "Order Confirmed — ORD-2026-001",
        htmlbody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1a7f5a;">Order Confirmed ✅</h2>
                <p>Dear <strong>John Doe</strong>, your order has been confirmed.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr style="background: #f0faf5;">
                        <td style="padding: 10px; border: 1px solid #eee;"><strong>Order ID</strong></td>
                        <td style="padding: 10px; border: 1px solid #eee;">ORD-2026-001</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #eee;"><strong>Service</strong></td>
                        <td style="padding: 10px; border: 1px solid #eee;">Doctor Visit</td>
                    </tr>
                    <tr style="background: #f0faf5;">
                        <td style="padding: 10px; border: 1px solid #eee;"><strong>Date</strong></td>
                        <td style="padding: 10px; border: 1px solid #eee;">${new Date().toLocaleDateString('en-IN')}</td>
                    </tr>
                </table>
                <p>For support, contact us at support@ayuxa.care</p>
                <p style="color: #888; font-size: 12px;">Team Ayuxa Care</p>
            </div>
        `
    });
    result3 ? passed++ : failed++;

    // Summary
    console.log("\n========================================");
    console.log("  Test Summary");
    console.log("========================================");
    console.log(`Total: 3 | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
    console.log("========================================\n");

    if (failed === 0) {
        console.log(`✓ All emails sent! Check inbox: ${TEST_EMAIL}`);
    } else {
        console.log("⚠ Some emails failed. Check API key and sender domain.");
    }
})();
