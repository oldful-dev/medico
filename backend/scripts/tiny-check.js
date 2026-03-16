const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const serviceCount = await prisma.service.count();
  console.log('Service Count:', serviceCount);
}
main().finally(() => prisma.$disconnect());
