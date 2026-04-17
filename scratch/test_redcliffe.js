// scratch/test_redcliffe.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Manually parse .env to avoid module dependency
const envPath = 'd:/codes/MERN/medico/backend/.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) envVars[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
});

const REDCLIFFE_BASE_URL = 'https://apiv3.redcliffelabs.com';
const REDCLIFFE_API_KEY = envVars.REDCLIFFE_API_KEY;

async function testConnection() {
    console.log('Testing Redcliffe v3 Connection...');
    console.log('API Key Found:', !!REDCLIFFE_API_KEY);

    const configs = [
        { path: '/api/external/v3/center-package-data/', headers: { 'Authorization': `Bearer ${REDCLIFFE_API_KEY}` } },
        { path: '/api/v3/external/center-package-data/', headers: { 'Authorization': `Bearer ${REDCLIFFE_API_KEY}` } },
        { path: '/api/external/v2/center-package-data/', headers: { 'Authorization': `Bearer ${REDCLIFFE_API_KEY}` } },
        { path: '/api/external/v3/center-package-data/', headers: { 'key': REDCLIFFE_API_KEY } },
        { path: '/api/external/v2/center-package-data/', headers: { 'key': REDCLIFFE_API_KEY } }
    ];

    for (const config of configs) {
        console.log(`\n--- Path: ${config.path} | Headers: ${JSON.stringify(Object.keys(config.headers))} ---`);
        try {
            const response = await axios.get(`${REDCLIFFE_BASE_URL}${config.path}`, {
                headers: { ...config.headers, 'Content-Type': 'application/json' }
            });
            console.log('✅ SUCCESS!');
            console.log('First package:', response.data.data?.[0]?.name || 'No data');
            return;
        } catch (error) {
            console.log('❌ FAILED Status:', error.response?.status);
            console.log('Data:', JSON.stringify(error.response?.data).slice(0, 100));
        }
    }
}

testConnection();
