// One-off cleanup: fully removes all SERVICE_POLICY legal document rows
// (all versions/statuses), per client request to delete the
// "Service Scope & Operational Policy" page entirely.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.legalDocument.deleteMany({
    where: { type: 'SERVICE_POLICY' },
  });
  console.log(`Deleted ${result.count} SERVICE_POLICY document(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
