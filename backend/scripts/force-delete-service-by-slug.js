// Generic tool: force-delete any Service row by slug, including its
// bookings. Use this whenever a slug is stuck because a service was
// "deleted" from the admin UI but actually got soft-disabled instead
// (deleteService keeps a service with active bookings and just sets
// isEnabled: false unless force:true is passed — see
// src/controllers/service.controller.js). createService/updateService now
// return a clear 409 naming the blocking service when this happens, so you
// know the slug to pass here.
//
// Run: node scripts/force-delete-service-by-slug.js <slug>
const prisma = require('../src/config/database');
const { syncDbServicesToUIConfig } = require('../src/utils/sduiSync');

async function main() {
    const slug = process.argv[2];
    if (!slug) {
        console.error('Usage: node scripts/force-delete-service-by-slug.js <slug>');
        process.exitCode = 1;
        return;
    }

    const service = await prisma.service.findUnique({ where: { slug } });
    if (!service) {
        console.log(`No service with slug "${slug}" found — it's already free to use.`);
        return;
    }

    const bookingsCount = await prisma.booking.count({ where: { serviceId: service.id } });

    console.log('Found:');
    console.log({
        id: service.id,
        name: service.name,
        category: service.category,
        isEnabled: service.isEnabled,
        bookingsCount,
    });

    if (bookingsCount > 0) {
        console.log(`Deleting ${bookingsCount} booking(s) tied to this service...`);
        await prisma.booking.deleteMany({ where: { serviceId: service.id } });
    }

    await prisma.service.delete({ where: { id: service.id } });
    console.log('Service deleted. Running sync...');
    await syncDbServicesToUIConfig();
    console.log(`Done — "${slug}" is now free.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
