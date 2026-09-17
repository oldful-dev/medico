// One-off manual send: WHATSAPP_CHANNEL template to a fixed list of real
// numbers. Run yourself: node scripts/send-whatsapp-channel-invite.js
require('dotenv').config();
const wa = require('../src/services/whatsapp');

const RECIPIENTS = [
    { phone: '9154116263', name: 'Test Account' },
    { phone: '9380328900', name: 'Dhemaan G. Aditya' },
    { phone: '9353380710', name: 'Arjun AJ' },
    { phone: '7362973003', name: 'Adarsh Arya' },
    { phone: '8296217168', name: 'Mamatha' },
    { phone: '7257975680', name: 'Akanksha Singh' },
];

async function run() {
    const results = [];
    for (const { phone, name } of RECIPIENTS) {
        try {
            const ok = await wa.sendWhatsAppChannelInvite({ phone, name, linkSlug: 'follow-channel' });
            results.push({ phone, name, ok });
            console.log(`${ok ? '✅' : '❌'} ${name} (${phone})`);
        } catch (err) {
            results.push({ phone, name, ok: false, error: err.message });
            console.log(`❌ ${name} (${phone}) — ${err.message}`);
        }
    }
    console.log('\n--- Summary ---');
    results.forEach(r => console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.name} (${r.phone})${r.error ? ' :: ' + r.error : ''}`));
}

run().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
