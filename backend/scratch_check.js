const prisma = require('./src/config/database');

async function main() {
  const service = await prisma.service.findFirst({
    where: { slug: 'blood-test' }
  });
  console.log('Blood Test Service:', JSON.stringify(service, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
