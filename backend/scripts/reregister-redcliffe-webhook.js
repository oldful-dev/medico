// The Redcliffe webhook has been registered at https://api.oldful.com/webhooks/redcliffe
// since 2026-04-20 — that domain is not this app's real production domain
// (api.ayuxacare.com, confirmed via mobile/services/api/apiClient.ts) at
// all, so every webhook event (booking_created, phleboassigned, pickup,
// samplesync, consolidatereport, reportvalues, cancelled) has silently
// never reached us for 5 months. This re-registers all 5 currently-active
// hook types to the correct URL.
//
// Correct mounted path: server.js -> app.use('/api/webhooks', webhookRoutes)
// -> router.post('/redcliffe', ...) => /api/webhooks/redcliffe
//
// Run: node scripts/reregister-redcliffe-webhook.js
require('dotenv').config();
const axios = require('axios');

const CORRECT_URL = 'https://api.ayuxacare.com/api/webhooks/redcliffe';
const HOOK_TYPES = ['booking_created', 'cancelled', 'phleboassigned', 'consolidatereport', 'reportvalues'];

async function main() {
    const res = await axios.post(
        'https://apiv3.redcliffelabs.com/api/v1/webhook/create-update-webhook/',
        { url_link: CORRECT_URL, hook_type_list: HOOK_TYPES },
        { headers: { key: process.env.REDCLIFFE_API_KEY } }
    );
    console.log('Register response:', JSON.stringify(res.data, null, 2));

    const verify = await axios.get('https://apiv3.redcliffelabs.com/api/v1/webhook/list-added-webhooks/', {
        headers: { key: process.env.REDCLIFFE_API_KEY },
    });
    console.log('Verified webhooks now registered:');
    for (const w of verify.data.results) {
        console.log(`  ${w.hook_type_data.name}: ${w.url_link} (active: ${w.is_active})`);
    }
}

main().catch((e) => {
    console.error('ERROR', e.response?.status, JSON.stringify(e.response?.data) || e.message);
    process.exitCode = 1;
});
