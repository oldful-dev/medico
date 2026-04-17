require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const axios = require('axios');

const BASE_URL = 'https://apiv3.redcliffelabs.com';
const API_KEY = process.env.REDCLIFFE_API_KEY;

async function testPackages() {
    console.log('🧪 Testing Redcliffe Package Discovery...\n');
    
    const headers = { 'key': API_KEY, 'Content-Type': 'application/json' };

    try {
        // Test 1: Empty Search (Should be "Get All")
        console.log('1. Testing Empty Search (Get All)...');
        const res1 = await axios.get(`${BASE_URL}/api/external/v2/center-package-data/`, { 
            params: { search: '' },
            headers
        });
        console.log(`   Result: ${JSON.stringify(res1.data)}\n`);

    } catch (e) {
        console.log(`❌ FAILED Status: ${e.response?.status}`);
        console.log(`Data: ${JSON.stringify(e.response?.data)}`);
    }

    try {
        // Test 2: Specific Search for a common test like "Sugar"
        console.log('2. Testing Specific Search ("Sugar")...');
        const res2 = await axios.get(`${BASE_URL}/api/external/v2/center-package-data/`, { 
            params: { search: 'Sugar' },
            headers
        });
        console.log(`   Result: ${JSON.stringify(res2.data)}\n`);

    } catch (e) {
        console.log(`❌ FAILED Status: ${e.response?.status}`);
        console.log(`Data: ${JSON.stringify(e.response?.data)}`);
    }
}

testPackages();
