// backend/scratch/test_redcliffe_booking.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) envVars[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
});

const REDCLIFFE_BASE_URL = 'https://apiv3.redcliffelabs.com';
const REDCLIFFE_API_KEY = envVars.REDCLIFFE_API_KEY;
const HEADERS = { 'key': REDCLIFFE_API_KEY, 'Content-Type': 'application/json' };

async function testBookingPayload() {
    console.log('🚀 Testing Booking Payload Validation...\n');

    // This is the payload that triggered the 500
    const payload = {
        booking_date: new Date().toISOString().split('T')[0],
        collection_date: '2026-04-30',
        collection_slot: 3,
        customer_name: 'Aram',
        customer_age: 30,
        customer_gender: 'male',
        customer_phonenumber: '8000494294',
        customer_whatsapppnumber: '8000494294', // Testing with double 'p'
        customer_address: '001, Stanza Living Bearbrook House',
        package_code: ['SU02'], // Some versions expect package_code instead of packages
        customer_longitude: 77.2,
        customer_latitude: 28.6,
        is_credit: true,
        pincode: '560011',
        reference_data: 'TEST-123'
    };

    try {
        const res = await axios.post(`${REDCLIFFE_BASE_URL}/api/external/v2/center-create-booking/`, payload, {
            headers: HEADERS
        });
        console.log('✅ SUCCESS!', res.data);
    } catch (error) {
        console.log('❌ FAILED Status:', error.response?.status);
        console.log('Response Detail:', JSON.stringify(error.response?.data));
    }
}

testBookingPayload();
