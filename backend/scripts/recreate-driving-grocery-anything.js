// Deletes and recreates Driver & Cab, Grocery Run, and Anything Else from
// scratch — they were seeded earlier this session with isDynamic:false
// (locking their slug in admin) even though no native wrapper file backs
// any of them any more; everything routes through the shared
// /dynamic/home-essentials/[slug] catch-all now. Recreating with
// isDynamic:true fixes the lock and gives each one a real, purpose-built
// form instead of the generic 4-field template they had before.
//
// Run: node scripts/recreate-driving-grocery-anything.js
const prisma = require('../src/config/database');

const BENEFITS_FIELD = {
    id: 'benefits', type: 'benefits', label: 'Service Benefits List', required: false, placeholder: '',
    options: [
        { id: 'covered_under_your_ayuxa_health_plan_benefits', label: 'Covered under your Ayuxa health plan benefits', sort_order: 1 },
        { id: 'certified_and_safe_professionals', label: 'Verified, background-checked drivers & helpers', sort_order: 2 },
        { id: '247_dedicated_support_tracking', label: '24/7 dedicated support tracking', sort_order: 3 },
    ],
};

const SERVICES = [
    {
        slug: 'driving-cab',
        name: 'Driver & Cab',
        icon: '🚗',
        sortOrder: 23,
        headline: 'Driver & Cab',
        subhead: 'A trusted driver for errands, appointments, or a full day out.',
        pricingText: 'Submit Request',
        fields: [
            BENEFITS_FIELD,
            {
                id: 'trip_type', type: 'radio', label: 'Type of Trip', required: true, placeholder: '',
                options: [
                    { id: 'one_way', label: 'One-Way Drop', sort_order: 1 },
                    { id: 'round_trip', label: 'Round Trip (Wait & Return)', sort_order: 2 },
                    { id: 'full_day', label: 'Full Day (up to 8 hrs)', sort_order: 3 },
                ],
            },
            { id: 'pickup_location', type: 'address_picker', label: 'Pickup Address', required: true, placeholder: '' },
            { id: 'drop_location', type: 'text_input', label: 'Drop Location', required: true, placeholder: 'Where are they headed?' },
            { id: 'datetime', type: 'datetime', label: 'Pickup Date & Time', required: true, placeholder: 'Select Date & Time' },
            { id: 'passenger_count', type: 'number_input', label: 'Number of Passengers', required: false, placeholder: 'e.g. 2' },
            { id: 'comments', type: 'comments', label: 'Comments / Requirements', required: true, placeholder: 'Any mobility needs, luggage, or special instructions...' },
        ],
    },
    {
        slug: 'grocery-run',
        name: 'Grocery Run',
        icon: '🛒',
        sortOrder: 24,
        headline: 'Grocery Run',
        subhead: 'Groceries and daily essentials picked up and delivered to the door.',
        pricingText: 'Submit Request',
        fields: [
            BENEFITS_FIELD,
            { id: 'shopping_list', type: 'file_upload', label: 'Upload Shopping List (optional)', required: false, placeholder: 'Photo or PDF of the list' },
            { id: 'budget_estimate', type: 'number_input', label: 'Approximate Budget (₹)', required: false, placeholder: 'e.g. 1500' },
            {
                id: 'preferred_store', type: 'dropdown', label: 'Preferred Store (if any)', required: false, placeholder: 'Select a store',
                options: [
                    { id: 'any', label: 'No preference — nearest store', sort_order: 1 },
                    { id: 'supermarket', label: 'Supermarket / Big Bazaar type', sort_order: 2 },
                    { id: 'local_kirana', label: 'Local Kirana Store', sort_order: 3 },
                    { id: 'pharmacy', label: 'Pharmacy / Chemist', sort_order: 4 },
                ],
            },
            { id: 'address_picker', type: 'address_picker', label: 'Delivery Address', required: true, placeholder: '' },
            { id: 'datetime', type: 'datetime', label: 'Preferred Delivery Time', required: true, placeholder: 'Select Date & Time' },
            { id: 'comments', type: 'comments', label: 'Items / Comments', required: true, placeholder: 'List the items you need, or describe your request...' },
        ],
    },
    {
        slug: 'anything-else',
        name: 'Anything Else',
        icon: '🧩',
        sortOrder: 25,
        headline: 'Anything Else',
        subhead: "A request that doesn't fit anywhere else — tell us what you need.",
        pricingText: 'Submit Request',
        fields: [
            BENEFITS_FIELD,
            {
                id: 'info_banner_1', type: 'info_banner', label: "For anything not covered by our other Home Essentials services — we'll review your request and get back to you with a plan and price.", required: false, placeholder: '',
            },
            { id: 'request_title', type: 'text_input', label: 'What do you need help with?', required: true, placeholder: 'A short title for your request' },
            {
                id: 'urgency', type: 'radio', label: 'How urgent is this?', required: true, placeholder: '',
                options: [
                    { id: 'standard', label: 'Standard (within a few days)', sort_order: 1 },
                    { id: 'urgent', label: 'Urgent (within 24 hours)', sort_order: 2 },
                ],
            },
            { id: 'reference_photo', type: 'image_upload', label: 'Reference Photos (optional)', required: false, placeholder: '' },
            { id: 'address_picker', type: 'address_picker', label: 'Confirm Address', required: false, placeholder: '' },
            { id: 'comments', type: 'comments', label: 'Full Details', required: true, placeholder: 'Describe exactly what you need — the more detail, the faster we can help.' },
        ],
    },
];

async function main() {
    for (const svc of SERVICES) {
        const existing = await prisma.service.findUnique({ where: { slug: svc.slug } });
        if (existing) {
            await prisma.service.delete({ where: { id: existing.id } });
            console.log(`Deleted existing "${svc.slug}".`);
        }

        const created = await prisma.service.create({
            data: {
                name: svc.name,
                slug: svc.slug,
                icon: svc.icon,
                route: `/dynamic/home-essentials/${svc.slug}`,
                headline: svc.headline,
                subhead: svc.subhead,
                description: '',
                pricingText: svc.pricingText,
                sortOrder: svc.sortOrder,
                isEnabled: true,
                isDynamic: true,
                category: 'HOME_ESSENTIALS',
                serviceType: 'HOME_ESSENTIALS',
                paymentMode: 'INQUIRY',
                checkoutGroup: 'D',
                basePrice: 0,
                formFieldsJson: {
                    layout: { cta_text: svc.pricingText, description: svc.subhead, header_style: 'cream_flat' },
                    version: 1,
                    sections: [{
                        id: 'dynamic_section',
                        title: svc.headline,
                        card_style: 'default',
                        sort_order: 1,
                        fields: svc.fields,
                    }],
                },
            },
        });
        console.log(`Created "${created.name}" (${created.slug}) -> ${created.route}, isDynamic: ${created.isDynamic}`);
    }
}

main()
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
