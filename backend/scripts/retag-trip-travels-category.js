// One-off: Trips & Travels was tagged category: 'HOME_ESSENTIALS' (and
// serviceType: 'HOME_ESSENTIALS'), which made it show up in the admin's
// Home Essentials CRUD page even though it's a fully bespoke hand-built
// screen (mobile/app/trip-travels/index.tsx), not a Home Essentials-style
// form-builder service. Part of the admin-services-restructure: Tours &
// Travel becomes its own admin section. Only `category` (the free string
// used for admin-side grouping) is changed here — `serviceType` is left
// as HOME_ESSENTIALS because mobile/app/(tabs)/index.tsx's essentials
// grid filter and sduiSync.js's homeEssentialDbSvcs filter both key off
// serviceType, and trip-travels is already explicitly excluded from that
// grid by slug regardless (see index.tsx line ~420), so changing
// serviceType is unnecessary and riskier than just fixing `category`.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.service.updateMany({
    where: { slug: 'trip-travels' },
    data: { category: 'TOURS_TRAVEL' },
  });
  console.log(`trip-travels => category set to TOURS_TRAVEL (${updated.count} row(s))`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
