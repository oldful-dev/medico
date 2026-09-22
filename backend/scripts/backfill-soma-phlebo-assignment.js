// Soma Aich's LabOrder never got a phleboassigned ActivityUpdate — same
// root cause as her missing report (5-month webhook outage). Unlike the
// report, the normal webhook flow's phleboassigned handler only ever
// records a generic 'Redcliffe Labs' placeholder (see
// WEBHOOK_ACTIVITY_EVENTS in redcliffe.queue.js — the webhook payload
// itself carries no real name), but Redcliffe's corporate-phlebo-tracking
// API returns the ACTUAL phlebotomist name and a tracking link, so this
// backfill is more complete than what the automated path would have
// captured anyway.
//
// Run: node scripts/backfill-soma-phlebo-assignment.js
const prisma = require('../src/config/database');
const axios = require('axios');

const LAB_ORDER_ID = 'b57513b4-6815-4ad5-bf87-82ca54092a3d';
const REDCLIFFE_BOOKING_ID = '18952602';

async function main() {
    const res = await axios.get('https://apiv3.redcliffelabs.com/api/external/v2/corporate-phlebo-tracking/', {
        headers: { key: process.env.REDCLIFFE_API_KEY },
        params: { booking_id: REDCLIFFE_BOOKING_ID },
    });
    const info = res.data?.data;
    if (!info) {
        console.error('No phlebo-tracking data returned:', JSON.stringify(res.data));
        process.exitCode = 1;
        return;
    }
    console.log('Phlebo info:', JSON.stringify(info, null, 2));

    const order = await prisma.labOrder.findUnique({ where: { id: LAB_ORDER_ID } });
    if (!order) { console.error('LabOrder not found'); process.exitCode = 1; return; }

    const staffName = info.phlebo__user__fullname || 'Redcliffe Labs';
    const activity = await prisma.activityUpdate.create({
        data: {
            labOrderId: order.id,
            eventType: 'phlebo_assigned',
            serviceType: 'Blood Test',
            staffName,
            staffId: 'redcliffe-manual-backfill',
            staffPhone: '',
            statusDetail: `Phlebotomist assigned by the lab (backfilled from Redcliffe's tracking API — ${staffName}).`,
        },
    });
    console.log('ActivityUpdate created:', activity.id, staffName);

    if (info.tracking_link) {
        await prisma.labOrder.update({
            where: { id: order.id },
            data: { trackingLink: info.tracking_link },
        });
        console.log('trackingLink set:', info.tracking_link);
    }
}

main()
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
