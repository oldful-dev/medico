// Re-verification found driving-cab, grocery-run, and anything-else STILL
// missing their Service rows despite being in the original
// seed-missing-home-essentials.js list — either that script never actually
// ran against production, or the rows were deleted afterward. Re-seeding
// just these 3 (idempotent — skips any that already exist).
//
// transportation is NOT included here: its screen
// (mobile/app/transportation/index.tsx) is a bare placeholder stub with no
// HomeEssentialsBookingScreen/slug wiring at all, so a Service row wouldn't
// fix anything — that one needs real screen development, not a data seed.
//
// Run: node scripts/seed-missing-home-essentials-v2.js
const prisma = require('../src/config/database');

const STANDARD_FIELDS = (title) => ({
    layout: { cta_text: 'Submit Request', description: title, header_style: 'cream_flat' },
    version: 1,
    sections: [{
        id: 'dynamic_section',
        title,
        card_style: 'default',
        sort_order: 1,
        fields: [
            {
                id: 'benefits', type: 'benefits', label: 'Service Benefits List', required: false, placeholder: '',
                options: [
                    { id: 'covered_under_your_ayuxa_health_plan_benefits', label: 'Covered under your Ayuxa health plan benefits', sort_order: 1 },
                    { id: 'certified_and_safe_professionals', label: 'Certified and safe professionals', sort_order: 2 },
                    { id: '247_dedicated_support_tracking', label: '24/7 dedicated support tracking', sort_order: 3 },
                ],
            },
            { id: 'address_picker', type: 'address_picker', label: 'Confirm Address', required: true, placeholder: '' },
            { id: 'datetime', type: 'datetime', label: 'Schedule Appointment', required: true, placeholder: 'Select Date & Time' },
            { id: 'comments', type: 'comments', label: 'Comments / Requirements', required: true, placeholder: 'Describe your requirements or any instructions here...' },
        ],
    }],
});

const NEW_SERVICES = [
    { slug: 'driving-cab', name: 'Driver & Cab', icon: '🚗', title: 'Driver & Cab', sortOrder: 23 },
    { slug: 'grocery-run', name: 'Grocery Run', icon: '🛒', title: 'Grocery Run', sortOrder: 24 },
    { slug: 'anything-else', name: 'Anything Else', icon: '🧩', title: 'Anything Else', sortOrder: 25 },
];

async function main() {
    for (const svc of NEW_SERVICES) {
        const existing = await prisma.service.findUnique({ where: { slug: svc.slug } });
        if (existing) {
            console.log(`Service "${svc.slug}" already exists — skipping.`);
            continue;
        }
        await prisma.service.create({
            data: {
                name: svc.name,
                slug: svc.slug,
                icon: svc.icon,
                route: `/${svc.slug}`,
                headline: svc.title,
                subhead: svc.title,
                description: '',
                pricingText: 'Submit Request',
                sortOrder: svc.sortOrder,
                isEnabled: true,
                isDynamic: false,
                category: 'HOME_ESSENTIALS',
                serviceType: 'HOME_ESSENTIALS',
                paymentMode: 'INQUIRY',
                checkoutGroup: 'D',
                basePrice: 0,
                formFieldsJson: STANDARD_FIELDS(svc.title),
            },
        });
        console.log(`Created Service "${svc.name}" (${svc.slug}).`);
    }
}

main()
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
