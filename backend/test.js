require("dotenv").config();
const twilio = require("twilio");
const readline = require("readline");

// Twilio client
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// CLI input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Phone number to test
const phone = "+917362973003"; // change to your number

async function runOTPFlow() {
    try {

        // STEP 1: Send OTP
        console.log("Sending OTP...");

        const send = await client.verify.v2
            .services(process.env.TWILIO_VERIFY_SERVICE_SID)
            .verifications.create({
                to: phone,
                channel: "sms"
            });

        console.log("OTP status:", send.status);

        // STEP 2: Ask user for OTP
        rl.question("Enter OTP received on phone: ", async (code) => {

            const check = await client.verify.v2
                .services(process.env.TWILIO_VERIFY_SERVICE_SID)
                .verificationChecks.create({
                    to: phone,
                    code: code
                });

            console.log("Verification result:", check.status);

            if (check.status === "approved") {
                console.log("✅ OTP Verified Successfully");
            } else {
                console.log("❌ Invalid OTP");
            }

            rl.close();
        });

    } catch (err) {
        console.error("Error:", err.message);
        rl.close();
    }
}

runOTPFlow();