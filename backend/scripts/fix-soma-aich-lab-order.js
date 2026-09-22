// Soma Aich's blood test (LabOrder b57513b4-6815-4ad5-bf87-82ca54092a3d,
// Redcliffe booking 18952602) was stuck at CONFIRMED with an empty
// processedEvents array — every downstream webhook event (pickup,
// samplesync, consolidatereport) silently never arrived, because the
// registered webhook URL (https://api.oldful.com/webhooks/redcliffe, see
// redcliffe-api-tests/test_all_apis.js) points at a domain that isn't this
// app's real production domain (api.ayuxacare.com) at all.
//
// Confirmed directly against Redcliffe's live API: all 11 of her tests are
// completed, zero pending, and a report_url already exists. This script
// pulls that report and updates her LabOrder + notifies her — she
// shouldn't wait for the webhook-URL fix to get results Redcliffe already
// finished a day ago.
//
// Run: node scripts/fix-soma-aich-lab-order.js
const prisma = require('../src/config/database');
const axios = require('axios');
const { sendPushToUser } = require('../src/utils/pushNotification.service');

const LAB_ORDER_ID = 'b57513b4-6815-4ad5-bf87-82ca54092a3d';
const REDCLIFFE_BOOKING_ID = '18952602';

async function main() {
    const res = await axios.get(`https://apiv3.redcliffelabs.com/api/external/v2/get-consolidated-report/${REDCLIFFE_BOOKING_ID}`, {
        headers: { key: process.env.REDCLIFFE_API_KEY },
    });
    const reportUrl = res.data?.report_url;
    if (!reportUrl) {
        console.error('No report_url in Redcliffe response:', JSON.stringify(res.data));
        process.exitCode = 1;
        return;
    }
    console.log('Report URL:', reportUrl);

    const order = await prisma.labOrder.update({
        where: { id: LAB_ORDER_ID },
        data: {
            status: 'REPORT_GENERATED',
            reportUrl,
            processedEvents: { push: `${REDCLIFFE_BOOKING_ID}_consolidatereport_manual_backfill` },
        },
    });
    console.log('LabOrder updated:', order.status, order.reportUrl);

    try {
        await sendPushToUser(order.userId, {
            title: 'Your Lab Report is Ready!',
            body: 'Your blood test report is now available in the Ayuxa app.',
            data: { type: 'lab_report_ready', labOrderId: order.id },
        });
        console.log('Push notification sent.');
    } catch (err) {
        console.warn('Push notification failed (non-fatal):', err.message);
    }

    const { sendSMS } = require('../src/services/sms');
    const { sendLabReportReady } = require('../src/services/whatsapp');
    const user = await prisma.user.findUnique({ where: { id: order.userId }, select: { name: true, phone: true } });
    if (user?.phone) {
        const waSuccess = await sendLabReportReady({ phone: user.phone, name: user.name, userId: order.userId }).catch(() => false);
        if (!waSuccess) {
            await sendSMS({ template: 'LAB_REPORT_READY', mobile: user.phone, variables: [user.name], userId: order.userId }).catch((e) => console.warn('SMS failed:', e.message));
        }
        console.log('WhatsApp/SMS notification attempted, WA success:', waSuccess);
    }
}

main()
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
