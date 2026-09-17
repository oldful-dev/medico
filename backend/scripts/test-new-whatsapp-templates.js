// One-off manual test: sends every new/updated marketing WhatsApp template
// to a single real number. Run yourself: node scripts/test-new-whatsapp-templates.js
//
// Skips WELCOME_FLOW_FAMILY (33001) — still PENDING approval at Fast2SMS as
// of this session, sending would just fail with a template-not-approved error.
require('dotenv').config();
const wa = require('../src/services/whatsapp');

const PHONE = '7362973003';
const NAME = 'Test User';

async function run() {
    const results = [];

    async function attempt(label, fn) {
        try {
            const ok = await fn();
            results.push({ label, ok });
            console.log(`${ok ? '✅' : '❌'} ${label}`);
        } catch (err) {
            results.push({ label, ok: false, error: err.message });
            console.log(`❌ ${label} — ${err.message}`);
        }
    }

    await attempt('ANNOUNCEMENT_UPDATE (32999)', () =>
        wa.sendAnnouncementUpdate({ phone: PHONE, name: NAME, linkSlug: 'test-update', mediaUrl: null })
    );

    await attempt('PROMO_OFFER (33003)', () =>
        wa.sendPromoOffer({ phone: PHONE, name: NAME, discount: '20%' })
    );

    await attempt('WELLNESS_REMINDER_FAMILY (33121)', () =>
        wa.sendWellnessReminderFamily({ phone: PHONE, name: NAME })
    );

    await attempt('WHATSAPP_CHANNEL (33122)', () =>
        wa.sendWhatsAppChannelInvite({ phone: PHONE, name: NAME, linkSlug: 'test-channel' })
    );

    // Requires a real image URL (birthday graphic) — mediaRequired: true.
    // No image asset has been uploaded to GCS in this session; pass one via
    // env var to actually test this, otherwise it will fail at Fast2SMS
    // with a missing-media error (expected, not a bug).
    await attempt('BIRTHDAY_WISHES_FAMILY (33000)', () =>
        wa.sendBirthdayWishesFamily({ phone: PHONE, mediaUrl: process.env.TEST_BIRTHDAY_IMAGE_URL || null })
    );

    console.log('\n--- Summary ---');
    results.forEach(r => console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.label}${r.error ? ' :: ' + r.error : ''}`));
}

run().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
