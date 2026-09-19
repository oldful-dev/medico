// Seeds the 7 Home Essentials Service rows that never existed at all — their
// mobile screens (app/<slug>/index.tsx) already hardcoded these exact slugs
// and benefitMapping.js already had real benefit-code entries waiting for
// them, but no Service row backed any of them. Every user opening these
// screens got getServiceBySlug() = undefined, generic fallback copy, and
// "Service initialization incomplete" on every booking attempt (same
// symptom class fixed for Fitness/Physio/Nurse Care earlier, and for
// Plumbing & Electrical's wrong-slug bug fixed alongside this script).
//
// Pattern matches the existing "plumbing" row: isDynamic:false,
// checkoutGroup:'D' (submit-request/inquiry, no upfront payment), a simple
// formFieldsJson (benefits + address_picker + datetime + comments).
//
// Run: node scripts/seed-missing-home-essentials.js
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
    { slug: 'anything-else', name: 'Anything Else', icon: '🧩', title: 'Anything Else', sortOrder: 16 },
    { slug: 'appliance-repair', name: 'Appliance Repair', icon: '🔧', title: 'Appliance Repair', sortOrder: 17 },
    { slug: 'bank-paperwork', name: 'Bank Paperwork', icon: '🏦', title: 'Bank Paperwork', sortOrder: 18 },
    { slug: 'driving-cab', name: 'Driver & Cab', icon: '🚗', title: 'Driver & Cab', sortOrder: 19 },
    { slug: 'grocery-run', name: 'Grocery Run', icon: '🛒', title: 'Grocery Run', sortOrder: 20 },
    { slug: 'paper-legal', name: 'Paperwork & Legal', icon: '📄', title: 'Paperwork & Legal', sortOrder: 21 },
    { slug: 'sanitisation', name: 'Washroom Sanitation', icon: '🧴', title: 'Washroom Sanitation', sortOrder: 22 },
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

    console.log('\nFinal HOME_ESSENTIALS services:');
    const all = await prisma.service.findMany({ where: { category: 'HOME_ESSENTIALS' }, select: { name: true, slug: true, route: true } });
    all.forEach(s => console.log(`  ${s.name} (${s.slug}) -> ${s.route}`));
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
