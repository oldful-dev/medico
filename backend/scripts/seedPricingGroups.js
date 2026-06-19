const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding/Updating pricing groups and checkout workflows...');

    // Group definitions
    const groupA = ['appliance-repair', 'plumbing-electrical', 'grocery-run'];
    const groupB = ['bill-payment'];
    const groupC = ['tech-helper'];
    const groupD = ['driving-cab', 'anything-else', 'bank-paperwork', 'paper-legal'];

    // 1. Update Service configurations in the database
    const services = await prisma.service.findMany();
    
    for (const service of services) {
        let checkoutGroup = 'D';
        let basePrice = 0;
        let pricingText = 'Zero Service Charge (Inquiry)';

        if (groupA.includes(service.slug)) {
            checkoutGroup = 'A';
            basePrice = 299;
            pricingText = '₹299 Service Charge + Vendor Bill';
        } else if (groupB.includes(service.slug)) {
            checkoutGroup = 'B';
            basePrice = 299;
            pricingText = '₹299 Service Charge (Max 2 Bills)';
        } else if (groupC.includes(service.slug)) {
            checkoutGroup = 'C';
            basePrice = 499;
            pricingText = '₹499 (Online) / ₹999 (Home)';
        } else if (groupD.includes(service.slug)) {
            checkoutGroup = 'D';
            basePrice = 0;
            pricingText = 'Zero Service Charge (Inquiry)';
        } else {
            // Default remaining services to Group D
            checkoutGroup = 'D';
            basePrice = 0;
            pricingText = 'Zero Service Charge (Inquiry)';
        }

        await prisma.service.update({
            where: { id: service.id },
            data: {
                checkoutGroup,
                basePrice,
                pricingText
            }
        });
        console.log(`Updated Service: ${service.name} (${service.slug}) -> Group ${checkoutGroup}, Base: ₹${basePrice}`);
    }

    // 2. Synchronize ServiceCharge configurations
    // The ServiceCharge table is keyed by serviceCategory (which matches the uppercase slugs/categories)
    const serviceCharges = [
        { category: 'APPLIANCE_REPAIR', bookingFee: 299, platformFee: 50, tax: 18 },
        { category: 'PLUMBING_ELECTRICAL', bookingFee: 299, platformFee: 50, tax: 18 },
        { category: 'GROCERY_RUN', bookingFee: 299, platformFee: 50, tax: 18 },
        { category: 'BILL_PAYMENT', bookingFee: 299, platformFee: 50, tax: 18 },
        { category: 'TECH_HELPER', bookingFee: 299, platformFee: 50, tax: 18 },
        { category: 'DRIVING_CAB', bookingFee: 0, platformFee: 0, tax: 18 },
        { category: 'ANYTHING_ELSE', bookingFee: 0, platformFee: 0, tax: 18 },
        { category: 'BANK_PAPERWORK', bookingFee: 0, platformFee: 0, tax: 18 },
        { category: 'PAPER_LEGAL', bookingFee: 0, platformFee: 0, tax: 18 }
    ];

    for (const sc of serviceCharges) {
        await prisma.serviceCharge.upsert({
            where: { serviceCategory: sc.category },
            update: {
                bookingFee: sc.bookingFee,
                platformFee: sc.platformFee,
                taxPercentage: sc.tax,
                serviceFee: 0, // no fixed override, respects Service basePrice
                isActive: true
            },
            create: {
                serviceCategory: sc.category,
                bookingFee: sc.bookingFee,
                platformFee: sc.platformFee,
                taxPercentage: sc.tax,
                serviceFee: 0,
                isActive: true
            }
        });
        console.log(`Updated ServiceCharge config: ${sc.category} -> Booking: ₹${sc.bookingFee}, Platform: ₹${sc.platformFee}`);
    }

    console.log('✅ Pricing groups and workflows successfully synced in the database!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
