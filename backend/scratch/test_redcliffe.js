// backend/scratch/test_redcliffe.js
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

let REDCLIFFE_BASE_URL = 'https://apiv3.redcliffelabs.com';
const REDCLIFFE_API_KEY = envVars.REDCLIFFE_API_KEY;
const HEADERS = { 'key': REDCLIFFE_API_KEY, 'Content-Type': 'application/json' };

async function testWithCenterID() {
    console.log(`🚀 Checking Bangalore Center ID Mapping...\n`);

    const ids = ['15', '1', '140', '133']; // Common Bangalore/HQ IDs
    for (const id of ids) {
        console.log(`Testing with Center ID: ${id}`);
        try {
            const res = await axios.get(`${REDCLIFFE_BASE_URL}/api/external/v2/center-package-data/`, {
                params: { search: '', center_id: id },
                headers: HEADERS
            });
            if (res.data.data?.length > 0) {
                console.log('   ✅ FOUND DATA! center_id', id, 'is active.');
                return;
            } else {
                console.log('   ❌ No data');
            }
        } catch (e) { console.log('   ❌ Request Failed'); }
    }
}

testWithCenterID();
