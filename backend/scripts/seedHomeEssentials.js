const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Home Essential Services...');

    const homeEssentials = [
        { name: 'AC & Appliance Repair', slug: 'appliance-repair', icon: '🛠️', tagline: 'Expert repairs for AC, Fridge, etc.', pricingText: '₹149 / booking', basePrice: 149, route: '/appliance-repair', sortOrder: 1, serviceType: 'HOME_ESSENTIALS' },
        { name: 'Plumbing & Electrical', slug: 'plumbing-electrical', icon: '🚰', tagline: 'Certified plumbers & electricians', pricingText: '₹99 / booking', basePrice: 99, route: '/plumbing-electrical', sortOrder: 2, serviceType: 'HOME_ESSENTIALS' },
        { name: 'Deep Cleaning', slug: 'deep-cleaning', icon: '🧹', tagline: 'Full home & toilet cleaning', pricingText: '₹499 / booking', basePrice: 499, route: '/deep-cleaning', sortOrder: 3, serviceType: 'HOME_ESSENTIALS' },
        { name: 'Driver & Cab', slug: 'driving-cab', icon: '🚗', tagline: 'Reliable drivers for local/outstation', pricingText: '₹299 / booking', basePrice: 299, route: '/driving-cab', sortOrder: 4, serviceType: 'HOME_ESSENTIALS' },
        { name: 'Bill Payment', slug: 'bill-payment', icon: '🧾', tagline: 'Utility bills & tax payments', pricingText: '₹49 / bill', basePrice: 49, route: '/bill-payment', sortOrder: 5, serviceType: 'HOME_ESSENTIALS' },
        { name: 'Bank Paperwork', slug: 'bank-paperwork', icon: '🏦', tagline: 'KYC, forms & bank assistance', pricingText: '₹199 / visit', basePrice: 199, route: '/bank-paperwork', sortOrder: 6, serviceType: 'HOME_ESSENTIALS' },
        { name: 'Grocery Run', slug: 'grocery-run', icon: '🛒', tagline: 'Fresh groceries at your door', pricingText: '₹99 / run', basePrice: 99, route: '/grocery-run', sortOrder: 7, serviceType: 'HOME_ESSENTIALS' },
        { name: 'Anything Else', slug: 'anything-else', icon: '❓', tagline: 'Need help with something else?', pricingText: 'Contact Us', basePrice: 0, route: '/anything-else', sortOrder: 8, serviceType: 'HOME_ESSENTIALS' },
        { name: 'Paperwork & Legal', slug: 'paper-legal', icon: '📋', tagline: 'Legal & paperwork assistance', pricingText: 'From ₹999', basePrice: 999, route: '/paper-legal', sortOrder: 9, serviceType: 'HOME_ESSENTIALS' },
        { name: 'Trip & Travels', slug: 'trip-travels', icon: '✈️', tagline: 'Travel planning & assistance', pricingText: 'Custom', basePrice: 0, route: '/trip-travels', sortOrder: 10, serviceType: 'HOME_ESSENTIALS' },
        { name: 'Tech Helper', slug: 'tech-helper', icon: '💻', tagline: 'Technology assistance for seniors', pricingText: '₹399 / visit', basePrice: 399, route: '/tech-helper', sortOrder: 11, serviceType: 'HOME_ESSENTIALS' },
        { name: 'Smart Upgrade', slug: 'smart-upgrade', icon: '✨', tagline: 'Make your home elderly-friendly', pricingText: 'Custom Quote', basePrice: 0, route: '/smart-upgrade', sortOrder: 12, serviceType: 'HOME_ESSENTIALS' }
    ];

    for (const s of homeEssentials) {
        await prisma.service.upsert({
            where: { slug: s.slug },
            update: { ...s },
            create: { ...s }
        });
    }

    console.log('✅ 12 Home Essential Services seeded/updated!');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
