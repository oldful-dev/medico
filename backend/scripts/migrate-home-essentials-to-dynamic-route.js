// Repoints every Home Essentials service's `route` from its dedicated
// wrapper file (e.g. /tech-helper) to the existing fully dynamic catch-all
// (/home-essentials-dynamic/<slug>). HomeEssentialsBookingScreen already
// renders 100% from each Service row (formFieldsJson, pricingText,
// basePrice, checkoutGroup) regardless of which route led there — this
// change is purely about the URL path, not the rendered content.
//
// This is the actual fix for the slug-drift bug class found repeatedly
// this session (plumbing/electrician, tech-help/tech-helper, etc.): once
// every service routes through the shared [slug] catch-all, there's no
// separate per-service file left to go stale when an admin edits the slug.
//
// Run: node scripts/migrate-home-essentials-to-dynamic-route.js
const prisma = require('../src/config/database');

const SERVICE_IDS = [
    '669d0d5b-d8fa-4aca-8922-96bca5297838', // washroom-sanitization -> /sanitisation
    'f20416b8-eacc-49bc-880b-a8207139934c', // appliances-repair-    -> /appliance-repair
    'db2fd74e-01be-4a1f-8856-5a6917c518bf', // paper-work            -> /bank-paperwork
    '99bec8bf-82d5-4d18-8569-d7663786137b', // plumbing              -> /plumbing-electrical
    '30210e82-b206-4487-b011-9949ceac374e', // legal-work            -> /paper-legal
    '142b5830-4fab-4b8e-a1f3-2d25ff34dc32', // depp-clean            -> /deep-cleaning
    'fd35359a-4abf-4dc9-872b-02af65d6fd98', // tech-helper           -> /tech-helper
    'd8c2f631-7ee2-4709-b3f9-66787fcf703f', // bill-payment          -> /bill-payment
    '324134ec-b85e-4bb7-90a4-41b5a99fec20', // driving-cab           -> /driving-cab
    '22231d04-f493-4b89-8a39-b920b9e514bf', // grocery-run           -> /grocery-run
    '909e5712-3096-4e0f-9990-79dd8a186529', // anything-else         -> /anything-else
];

async function main() {
    for (const id of SERVICE_IDS) {
        const svc = await prisma.service.findUnique({ where: { id }, select: { slug: true, name: true, route: true } });
        if (!svc) { console.log(`SKIP: ${id} not found`); continue; }
        const newRoute = `/home-essentials-dynamic/${svc.slug}`;
        await prisma.service.update({ where: { id }, data: { route: newRoute } });
        console.log(`${svc.name} (${svc.slug}): ${svc.route} -> ${newRoute}`);
    }
}

main()
    .catch((e) => { console.error(e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
