// Recreates "Legal Work" (slug: legal-work) — deleted at some point after
// this session's earlier fixes (confirmed gone via direct DB lookup before
// writing this). 7 form fields covering a real legal-paperwork-intake flow,
// matching the existing pattern used by paper-work/bank-paperwork (benefits
// + address_picker + datetime + comments), extended with fields specific to
// a legal-assistance request.
//
// Run: node scripts/seed-legal-work.js
const prisma = require('../src/config/database');

const FORM_FIELDS_JSON = {
    layout: {
        cta_text: '₹299 Platform Fee + Actuals',
        description: 'Get expert help with legal documents and paperwork.',
        header_style: 'cream_flat',
    },
    version: 1,
    sections: [{
        id: 'dynamic_section',
        title: 'Legal Work',
        card_style: 'default',
        sort_order: 1,
        fields: [
            {
                id: 'benefits', type: 'benefits', label: 'Service Benefits List', required: true, placeholder: '',
                options: [
                    { id: 'covered_under_your_ayuxa_health_plan_benefits', label: 'Covered under your Ayuxa health plan benefits', sort_order: 1 },
                    { id: 'certified_and_safe_professionals', label: 'Verified legal & paperwork specialists', sort_order: 2 },
                    { id: '247_dedicated_support_tracking', label: '24/7 dedicated support tracking', sort_order: 3 },
                ],
            },
            {
                id: 'document_type', type: 'dropdown', label: 'Type of Document / Matter', required: true, placeholder: 'Select document type',
                options: [
                    { id: 'will_estate', label: 'Will / Estate Planning', sort_order: 1 },
                    { id: 'property', label: 'Property / Land Documents', sort_order: 2 },
                    { id: 'power_of_attorney', label: 'Power of Attorney', sort_order: 3 },
                    { id: 'affidavit', label: 'Affidavit / Notary', sort_order: 4 },
                    { id: 'contract_review', label: 'Contract Review', sort_order: 5 },
                    { id: 'other', label: 'Other / Not Sure', sort_order: 6 },
                ],
            },
            {
                id: 'urgency', type: 'radio', label: 'How urgent is this?', required: true, placeholder: '',
                options: [
                    { id: 'standard', label: 'Standard (within a week)', sort_order: 1 },
                    { id: 'urgent', label: 'Urgent (within 48 hours)', sort_order: 2 },
                ],
            },
            {
                id: 'document_upload', type: 'file_upload', label: 'Upload Existing Documents (if any)', required: false, placeholder: 'PDF or photo of the document, up to 10MB',
            },
            { id: 'address_picker', type: 'address_picker', label: 'Confirm Address', required: true, placeholder: '' },
            { id: 'datetime', type: 'datetime', label: 'Schedule Appointment', required: true, placeholder: 'Select Date & Time' },
            { id: 'comments', type: 'comments', label: 'Comments / Requirements', required: true, placeholder: 'Describe the legal matter or paperwork you need help with...' },
        ],
    }],
};

async function main() {
    const existing = await prisma.service.findUnique({ where: { slug: 'legal-work' } });
    if (existing) {
        console.log('legal-work already exists — not overwriting. Current route:', existing.route);
        return;
    }

    const created = await prisma.service.create({
        data: {
            name: 'Legal Work',
            slug: 'legal-work',
            icon: '⚖️',
            route: '/dynamic/home-essentials/legal-work',
            headline: 'Legal Work',
            subhead: 'Get expert help with legal documents and paperwork.',
            description: '',
            pricingText: '₹299 Platform Fee + Actuals',
            sortOrder: 21,
            isEnabled: true,
            isDynamic: true,
            category: 'HOME_ESSENTIALS',
            serviceType: 'HOME_ESSENTIALS',
            paymentMode: 'INQUIRY',
            checkoutGroup: 'A',
            basePrice: 299,
            formFieldsJson: FORM_FIELDS_JSON,
        },
    });
    console.log('Created:', JSON.stringify({ id: created.id, slug: created.slug, route: created.route }, null, 2));
}

main()
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
