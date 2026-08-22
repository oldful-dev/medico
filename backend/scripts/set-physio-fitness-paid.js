// One-off: switch Physio & Fitness and Fitness & Wellness from INQUIRY
// (free/request-only) to PAID (real Razorpay checkout), per explicit
// request to make them behave like Doctor Visit/Hospital Trip/Nurse Care.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SLUGS = ['physio-fitness', 'fitness-wellness'];

async function main() {
  for (const slug of SLUGS) {
    const updated = await prisma.service.updateMany({
      where: { slug },
      data: { paymentMode: 'PAID' },
    });
    console.log(`${slug} => updated ${updated.count} row(s) to paymentMode: PAID`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
