const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
    const sub = await prisma.subscription.findFirst({ orderBy: { updatedAt: 'desc' } }); 
    console.log(sub.id, sub.expiryDate); 
    const newExpiry = new Date(sub.expiryDate); 
    newExpiry.setDate(newExpiry.getDate() + 60); 
    await prisma.subscription.update({ where: { id: sub.id }, data: { expiryDate: newExpiry } }); 
    console.log('Updated to', newExpiry); 
} 
main().catch(console.error).finally(() => prisma.$disconnect());
