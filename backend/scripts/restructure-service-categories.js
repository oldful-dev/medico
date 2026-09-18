// Full category restructuring, per explicit instruction: exactly 4 top-level
// categories (CARE, DIAGNOSTICS_FITNESS, HOME_ESSENTIALS, TOURS_TRAVEL), no
// duplicate/repeated services, and every home-screen tile that was previously
// config-only (no backing Service row) gets a real one so it's manageable
// from its category's admin page.
//
// What this does:
//   1. Resolves the ac-repair / ac-repairs duplicate: keeps ac-repair
//      (isDynamic: true, has a real form), fixes its broken route
//      ("AC Repair " -> /appliance-repair), deletes ac-repairs.
//   2. Creates real Service rows (category: CARE) for the 3 Quick Services
//      tiles that only ever existed as home_config entries: Hospital Trip,
//      Home Doctor (doctor-visit — note: doctor-visit already may not exist
//      as a Service; only created if missing), Home Aide (caregiver-support).
//      Home Nurse already exists as "Nurse Care" (nurse-care) — left as-is.
//   3. Creates real Service rows (category: TOURS_TRAVEL) for Meetups and
//      Trip & Travels, which only existed as config/legacy references.
//   4. Re-runs sduiSync so home_config's items get correctly matched to
//      these new rows instead of remaining orphaned config-only entries.
//
// Run: node scripts/restructure-service-categories.js
const prisma = require('../src/config/database');
const { syncDbServicesToUIConfig } = require('../src/utils/sduiSync');

async function ensureService(data) {
    const existing = await prisma.service.findUnique({ where: { slug: data.slug } });
    if (existing) {
        console.log(`Service "${data.slug}" already exists — skipping create.`);
        return existing;
    }
    const created = await prisma.service.create({ data });
    console.log(`Created Service "${data.name}" (${data.slug}), category=${data.category}`);
    return created;
}

async function main() {
    // 1. Resolve AC Repair duplicate.
    const keep = await prisma.service.findUnique({ where: { slug: 'ac-repair' } });
    const remove = await prisma.service.findUnique({ where: { slug: 'ac-repairs' } });
    if (keep) {
        await prisma.service.update({ where: { id: keep.id }, data: { route: '/appliance-repair' } });
        console.log('Fixed ac-repair route -> /appliance-repair');
    }
    if (remove) {
        const chargeRow = await prisma.serviceCharge.findUnique({ where: { serviceCategory: 'AC_REPAIRS' } });
        if (chargeRow) {
            console.log('Deleting orphaned ServiceCharge row "AC_REPAIRS" (will be replaced by HOME_ESSENTIALS category charge).');
            await prisma.serviceCharge.delete({ where: { id: chargeRow.id } });
        }
        await prisma.service.delete({ where: { id: remove.id } });
        console.log('Deleted duplicate service "ac-repairs".');
    }

    // 2. CARE category — fill in the Quick Services tiles with no Service row.
    await ensureService({
        name: 'Hospital Trip', slug: 'hospital-trip', route: '/hospital-trip',
        headline: 'Hospital Trip', subhead: 'Hospital Trip', icon: '🏥',
        sortOrder: 1, isEnabled: true, isDynamic: false,
        category: 'CARE', serviceType: 'HOSPITAL_TRIP', paymentMode: 'INQUIRY', basePrice: 0,
    });
    await ensureService({
        name: 'Home Doctor', slug: 'doctor-visit', route: '/doctor-visit',
        headline: 'Home Doctor', subhead: 'Home Doctor', icon: '🩺',
        sortOrder: 2, isEnabled: true, isDynamic: false,
        category: 'CARE', serviceType: 'DOCTOR_HOME_VISIT', paymentMode: 'INQUIRY', basePrice: 0,
    });
    await ensureService({
        name: 'Home Aide', slug: 'caregiver-support', route: '/caregiver-support',
        headline: 'Home Aide', subhead: 'Home Aide', icon: '🧑‍⚕️',
        sortOrder: 4, isEnabled: true, isDynamic: false,
        category: 'CARE', serviceType: 'OTHER', paymentMode: 'INQUIRY', basePrice: 0,
    });
    // Home Nurse already exists as "Nurse Care" — just re-tag its category
    // to CARE if it isn't already (it should be, but confirm).
    const nurseCare = await prisma.service.findUnique({ where: { slug: 'nurse-care' } });
    if (nurseCare && nurseCare.category !== 'CARE') {
        await prisma.service.update({ where: { id: nurseCare.id }, data: { category: 'CARE' } });
        console.log('Re-tagged nurse-care category -> CARE');
    }

    // 3. TOURS_TRAVEL category.
    await ensureService({
        name: 'Local Meetups', slug: 'meetup', route: '/meetup',
        headline: 'Local Meetups', subhead: 'Local Meetups', icon: '🧑‍🤝‍🧑',
        sortOrder: 1, isEnabled: true, isDynamic: false,
        category: 'TOURS_TRAVEL', serviceType: 'CLUB_EVENTS', paymentMode: 'INQUIRY', basePrice: 0,
    });
    await ensureService({
        name: 'Trip & Travels', slug: 'trip-travels', route: '/trip-travels',
        headline: 'Trip & Travels', subhead: 'Travel planning, booking assistance, and full concierge support.', icon: '✈️',
        sortOrder: 2, isEnabled: true, isDynamic: false,
        category: 'TOURS_TRAVEL', serviceType: 'HOME_ESSENTIALS', paymentMode: 'INQUIRY', basePrice: 0,
    });

    console.log('Running sync...');
    await syncDbServicesToUIConfig();

    console.log('\nFinal service list:');
    const all = await prisma.service.findMany({ select: { name: true, slug: true, category: true }, orderBy: { category: 'asc' } });
    all.forEach(s => console.log(`  [${s.category}] ${s.name} (${s.slug})`));
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
