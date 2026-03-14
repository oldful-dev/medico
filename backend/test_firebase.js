const { auth } = require('./src/config/firebase');

async function testFirebase() {
    try {
        console.log("Testing Firebase Admin SDK...");
        // Just try to list users (will likely return empty but confirms auth works)
        const listUsers = await auth.listUsers(1);
        console.log("✅ Firebase Admin is working. Users found:", listUsers.users.length);
        process.exit(0);
    } catch (error) {
        console.error("❌ Firebase Admin Test Failed:", error.message);
        process.exit(1);
    }
}

testFirebase();
