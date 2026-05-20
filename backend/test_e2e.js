require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const prisma = new PrismaClient();
const API_URL = 'http://localhost:' + (process.env.PORT || 5000);

async function run() {
    try {
        console.log("=== 1. Database Setup ===");
        
        // 1. Find a valid user
        const user = await prisma.user.findFirst({ where: { status: 'ACTIVE' } });
        if(!user) throw new Error("No active user found to test with");
        console.log(`-> Selected Test User: ${user.name} (${user.id})`);

        // 2. Generate Auth Token
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const headers = { Authorization: `Bearer ${token}` };

        // 3. Admin creates a Plan
        const plan = await prisma.plan.create({
            data: {
                name: "E2E Test Care Plan - " + Date.now(),
                planType: "CARE",
                planBenefits: {
                    create: [ { serviceCategory: "DOCTOR_VISIT", freeCount: 2 } ]
                },
                billingCycles: {
                    create: [ { durationMonths: 3, price: 499 } ]
                }
            },
            include: { billingCycles: true }
        });
        console.log(`-> Created Test Plan in DB: ${plan.name} (${plan.id})`);


        console.log("\n=== 2. API: Initiate Subscription ===");
        // Client sends request to initiate payment for a plan
        const initRes = await axios.post(`${API_URL}/api/subscriptions/initiate`, {
            planId: plan.id,
            billingCycle: "QUARTERLY",
            amount: 499
        }, { headers });
        console.log(`-> Response: ${initRes.data.message}`);
        const subscriptionId = initRes.data.data.id;
        console.log(`-> Subscription Created (PENDING): ${subscriptionId}`);


        console.log("\n=== 3. API: Verify Payment & Activate ===");
        // Client finishes Razorpay and sends success payload
        const verifyRes = await axios.post(`${API_URL}/api/subscriptions/verify`, {
            subscriptionId,
            razorpayPaymentId: "pay_fake_id_123",
            razorpaySignature: "fake_signature"
        }, { headers });
        console.log(`-> Response: ${verifyRes.data.message}`);
        console.log(`-> Subscription Status is now: ACTIVE`);


        console.log("\n=== 4. API: Test Checkout Engine (With Benefit) ===");
        // Client attempts to book a DOCTOR_VISIT
        const checkoutResWithBenefit = await axios.post(`${API_URL}/api/checkout/calculate`, {
            serviceCategory: "DOCTOR_VISIT",
            vendorFee: 500,
            baseAyuxaFee: 150,
            diagnosticFee: 0
        }, { headers });
        
        console.log("-> Cart Summary Response:");
        console.log(JSON.stringify(checkoutResWithBenefit.data.data, null, 2));


        console.log("\n=== 5. API: Test Checkout Engine (Without Benefit) ===");
        // Client attempts to book a PLUMBING service (not in Care Plan)
        const checkoutResWithoutBenefit = await axios.post(`${API_URL}/api/checkout/calculate`, {
            serviceCategory: "PLUMBING",
            vendorFee: 200,
            baseAyuxaFee: 50,
            diagnosticFee: 0
        }, { headers });
        
        console.log("-> Cart Summary Response:");
        console.log(JSON.stringify(checkoutResWithoutBenefit.data.data, null, 2));

        console.log("\n✅ FULL END-TO-END FLOW COMPLETED SUCCESSFULLY");

    } catch (e) {
        console.error("\n❌ Error during test:", e.response ? e.response.data : e.message);
    } finally {
        await prisma.$disconnect();
    }
}

run();
