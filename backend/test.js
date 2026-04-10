require("dotenv").config();
const axios = require("axios");

// 🔐 Replace with your Fast2SMS API Key
const API_KEY = process.env.FAST2SMS_API_KEY;

const sendSMS = async () => {
    try {
        const response = await axios.post(
            "https://www.fast2sms.com/dev/bulkV2",
            {
                route: "q", // q = quick (transactional/auth)
                message: "Your Oldful OTP is 123456",
                language: "english",
                flash: 0,
                numbers: "7362973003", // comma-separated for multiple
            },
            {
                headers: {
                    authorization: API_KEY,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("✅ SMS Sent:", response.data);
    } catch (error) {
        console.error("❌ Error:", error.response?.data || error.message);
    }
};

sendSMS();