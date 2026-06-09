const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Scan & ECG service...');
    const scanEcg = await prisma.service.upsert({
        where: { slug: 'scan-ecg' },
        update: {
            name: 'Scan & ECG',
            icon: '📸',
            tagline: 'ECG and Scan services at home',
            pricingText: 'From ₹0 (Zero Payment)',
            basePrice: 0,
            route: '/scan-ecg',
            sortOrder: 13,
            serviceType: 'BLOOD_TEST',
            isEnabled: true,
        },
        create: {
            name: 'Scan & ECG',
            slug: 'scan-ecg',
            icon: '📸',
            tagline: 'ECG and Scan services at home',
            pricingText: 'From ₹0 (Zero Payment)',
            basePrice: 0,
            route: '/scan-ecg',
            sortOrder: 13,
            serviceType: 'BLOOD_TEST',
            isEnabled: true,
        }
    });
    console.log('Upserted service:', scanEcg);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
