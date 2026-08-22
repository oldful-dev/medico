// One-off: Physio & Fitness and Fitness & Wellness had Service.route values
// (/physio-fitness, /fitness-wellness) that don't point at the actual
// correctly-coded, independently-priced screens (/physio, /fitness) —
// /physio-fitness is a dead-code file with a wrong slug + hardcoded ₹0
// logic, and /fitness-wellness has no screen file at all. Both admin
// service tiles were landing on the wrong/broken screen, which is why
// both showed the same price regardless of which was tapped.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const updates = [
    { slug: 'physio-fitness', route: '/physio' },
    { slug: 'fitness-wellness', route: '/fitness' },
  ];

  for (const { slug, route } of updates) {
    const updated = await prisma.service.updateMany({
      where: { slug },
      data: { route },
    });
    console.log(`${slug} => route set to ${route} (${updated.count} row(s))`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
