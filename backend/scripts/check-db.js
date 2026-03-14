const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    try {
        const counts = {
            users: await prisma.user.count(),
            cities: await prisma.city.count(),
            services: await prisma.service.count(),
            bookings: await prisma.booking.count(),
            payments: await prisma.payment.count(),
            subscriptions: await prisma.subscription.count()
        };
        console.log('Database Counts:', JSON.stringify(counts, null, 2));
        
        if (counts.cities > 0) {
            const city = await prisma.city.findFirst();
            console.log('Sample City:', JSON.stringify(city, null, 2));
        }

    } catch (error) {
        console.error('Error checking data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
