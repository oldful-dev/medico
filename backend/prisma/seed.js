// ──────────────────────────────────────────────
//  Database Seed Script
//  Run: npm run prisma:seed
// ──────────────────────────────────────────────

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // ─── 1. Cities ────────────────────────────
    const cities = await Promise.all([
        prisma.city.upsert({ where: { code: 'BLR' }, update: {}, create: { name: 'Bangalore', code: 'BLR', stateCode: 'KA-29', isEnabled: true } }),
        prisma.city.upsert({ where: { code: 'HYD' }, update: {}, create: { name: 'Hyderabad', code: 'HYD', stateCode: 'TS-36', isEnabled: true } }),
        prisma.city.upsert({ where: { code: 'CHN' }, update: {}, create: { name: 'Chennai', code: 'CHN', stateCode: 'TN-33', isEnabled: true } }),
        prisma.city.upsert({ where: { code: 'MUM' }, update: {}, create: { name: 'Mumbai', code: 'MUM', stateCode: 'MH-27', isEnabled: true } }),
        prisma.city.upsert({ where: { code: 'DEL' }, update: {}, create: { name: 'Delhi', code: 'DEL', stateCode: 'DL-07', isEnabled: true } }),
        prisma.city.upsert({ where: { code: 'PNE' }, update: {}, create: { name: 'Pune', code: 'PNE', stateCode: 'MH-27', isEnabled: false, isComingSoon: true } }),
    ]);

    console.log(`✅ ${cities.length} cities seeded`);

    // ─── 2. Super Admin ───────────────────────
    const passwordHash = await bcrypt.hash('admin123', 12);
    const superAdmin = await prisma.admin.upsert({
        where: { email: 'superadmin@medico.care' },
        update: {},
        create: {
            name: 'Super Admin',
            email: 'superadmin@medico.care',
            phone: '+919999999999',
            passwordHash,
            role: 'SUPER_ADMIN',
        },
    });

    // City admins
    await prisma.admin.upsert({
        where: { email: 'blr.admin@medico.care' },
        update: {},
        create: {
            name: 'Bangalore Admin',
            email: 'blr.admin@medico.care',
            passwordHash,
            role: 'CITY_ADMIN',
            cityId: cities[0].id,
        },
    });

    console.log('✅ Admins seeded');

    // ─── 3. Services ──────────────────────────
    const serviceData = [
        { name: 'Doctor Home Visit', slug: 'doctor-home-visit', icon: '🩺', tagline: 'Expert doctors at your doorstep', pricingText: '₹799 / visit', route: '/services/doctor-visit', sortOrder: 1, serviceType: 'DOCTOR_HOME_VISIT' },
        { name: 'Hospital Trip', slug: 'hospital-trip', icon: '🏥', tagline: 'Safe & comfortable hospital trips', pricingText: '₹499 / trip', route: '/services/hospital-trip', sortOrder: 2, serviceType: 'HOSPITAL_TRIP' },
        { name: 'Home Nurse', slug: 'home-nurse', icon: '👩‍⚕️', tagline: 'Professional nursing care at home', pricingText: '₹1,299 / day', route: '/services/home-nurse', sortOrder: 3, serviceType: 'HOME_NURSE' },
        { name: 'Insurance', slug: 'insurance', icon: '🛡️', tagline: 'Comprehensive health insurance plans', pricingText: 'From ₹199/mo', route: '/services/insurance', sortOrder: 4, serviceType: 'INSURANCE' },
        { name: 'Blood Test', slug: 'blood-test', icon: '🩸', tagline: 'Lab tests at home, reports online', pricingText: '₹299 / test', route: '/services/blood-test', sortOrder: 5, serviceType: 'BLOOD_TEST' },
        { name: 'Medicines', slug: 'medicines', icon: '💊', tagline: 'Doorstep medicine delivery', pricingText: 'As per MRP', route: '/services/medicines', sortOrder: 6, serviceType: 'MEDICINES' },
        { name: 'Physio & Fitness', slug: 'physio-fitness', icon: '🏋️', tagline: 'Personalized physiotherapy sessions', pricingText: '₹699 / session', route: '/services/physio', sortOrder: 7, serviceType: 'PHYSIO_FITNESS' },
        { name: 'Equipment Rental', slug: 'equipment-rental', icon: '🦽', tagline: 'Medical equipment on rent', pricingText: 'From ₹99/day', route: '/services/equipment', sortOrder: 8, serviceType: 'EQUIPMENT_RENTAL' },
        { name: 'Home Essentials', slug: 'home-essentials', icon: '🏠', tagline: 'Daily essentials delivered', pricingText: 'Varies', route: '/services/essentials', sortOrder: 9, serviceType: 'HOME_ESSENTIALS', isEnabled: false },
        { name: 'Club & Events', slug: 'club-events', icon: '🎭', tagline: 'Social clubs & wellness events', pricingText: '₹199 / event', route: '/services/events', sortOrder: 10, serviceType: 'CLUB_EVENTS' },
        { name: 'Tiffin', slug: 'tiffin', icon: '🍱', tagline: 'Healthy meals for seniors', pricingText: '₹149 / meal', route: '/services/tiffin', sortOrder: 11, serviceType: 'TIFFIN' },
        { name: 'Tech Helper', slug: 'tech-helper', icon: '💻', tagline: 'Technology assistance for seniors', pricingText: '₹399 / visit', route: '/services/tech-helper', sortOrder: 12, serviceType: 'TECH_HELPER' },
        { name: 'Paperwork & Legal', slug: 'paperwork-legal', icon: '📋', tagline: 'Legal & paperwork assistance', pricingText: 'From ₹999', route: '/services/legal-help', sortOrder: 13, serviceType: 'PAPERWORK_LEGAL', isEnabled: false },
    ];

    for (const s of serviceData) {
        await prisma.service.upsert({
            where: { slug: s.slug },
            update: {},
            create: s,
        });
    }

    console.log(`✅ ${serviceData.length} services seeded`);

    // ─── 4. Plans ─────────────────────────────
    const planData = [
        { name: 'Basic Care', description: 'Essential healthcare services', benefits: 'Doctor Visit (2/mo), Blood Test (1/mo), 24/7 SOS', quarterlyPrice: 2999, biannualPrice: 5499, yearlyPrice: 9999, sortOrder: 1 },
        { name: 'Care Plus', description: 'Enhanced healthcare coverage', benefits: 'All Basic + Home Nurse (2/mo), Insurance, Physio', quarterlyPrice: 4999, biannualPrice: 9499, yearlyPrice: 16999, sortOrder: 2 },
        { name: 'Premium Care', description: 'Complete healthcare package', benefits: 'Unlimited services, Priority booking, Dedicated manager', quarterlyPrice: 7999, biannualPrice: 14999, yearlyPrice: 27999, sortOrder: 3 },
        { name: 'Family Plan', description: 'Healthcare for the whole family', benefits: 'Premium for 2 members + Tiffin + Tech Helper', quarterlyPrice: 11999, biannualPrice: 22999, yearlyPrice: 42999, sortOrder: 4, isVisible: false },
    ];

    for (const p of planData) {
        await prisma.plan.upsert({
            where: { name: p.name },
            update: {},
            create: p,
        });
    }

    console.log(`✅ ${planData.length} plans seeded`);

    // ─── 5. Legal Documents ───────────────────
    const legalDocs = [
        { type: 'TERMS_AND_CONDITIONS', title: 'Terms & Conditions', content: '<h1>Terms & Conditions</h1><p>Please read these terms carefully before using Medico services...</p>', status: 'PUBLISHED', publishedAt: new Date() },
        { type: 'PRIVACY_POLICY', title: 'Privacy Policy', content: '<h1>Privacy Policy</h1><p>Medico respects your privacy. This policy explains how we handle your data...</p>', status: 'PUBLISHED', publishedAt: new Date() },
        { type: 'REFUND_POLICY', title: 'Refund Policy', content: '<h1>Refund Policy</h1><p>Refunds are processed within 5-7 business days...</p>', status: 'PUBLISHED', publishedAt: new Date() },
        { type: 'DISCLAIMER', title: 'Disclaimer', content: '<h1>Medical Disclaimer</h1><p>Medico services are not a substitute for emergency medical care...</p>', status: 'PUBLISHED', publishedAt: new Date() },
    ];

    for (const doc of legalDocs) {
        const existing = await prisma.legalDocument.findFirst({ where: { type: doc.type } });
        if (!existing) {
            await prisma.legalDocument.create({ data: doc });
        }
    }

    console.log('✅ Legal documents seeded');

    // ─── 6. Wellness Store Categories ─────────
    const categories = [
        { name: 'Mobility Aids', slug: 'mobility-aids', sortOrder: 1 },
        { name: 'Health Monitors', slug: 'health-monitors', sortOrder: 2 },
        { name: 'Supplements', slug: 'supplements', sortOrder: 3 },
        { name: 'Personal Care', slug: 'personal-care', sortOrder: 4 },
    ];

    for (const cat of categories) {
        await prisma.category.upsert({
            where: { slug: cat.slug },
            update: {},
            create: cat,
        });
    }

    console.log('✅ Store categories seeded');

    // ─── 7. Notification Templates ────────────
    const templates = [
        { name: 'Welcome Email', channel: 'EMAIL', subject: 'Welcome to Medico! 🎉', bodyTemplate: 'Dear {{name}}, Welcome to Medico Healthcare! Your ID: {{userId}}' },
        { name: 'OTP Verification', channel: 'WHATSAPP', bodyTemplate: 'Your Medico OTP is {{otp}}. Valid for 5 minutes.' },
        { name: 'Booking Confirmation', channel: 'WHATSAPP', bodyTemplate: 'Hi {{name}}, your {{service}} booking is confirmed for {{date}} at {{time}}.' },
        { name: 'SOS Alert Admin', channel: 'WHATSAPP', bodyTemplate: '🚨 SOS ALERT: {{userName}} ({{userId}}) triggered SOS from {{location}}' },
        { name: 'Plan Expiry Reminder', channel: 'EMAIL', subject: 'Your plan expires soon!', bodyTemplate: 'Dear {{name}}, your {{planName}} plan expires in {{daysLeft}} days.' },
    ];

    for (const tpl of templates) {
        const existing = await prisma.notificationTemplate.findFirst({ where: { name: tpl.name } });
        if (!existing) {
            await prisma.notificationTemplate.create({ data: tpl });
        }
    }

    console.log('✅ Notification templates seeded');

    // ─── 8. Coupons ───────────────────────────
    const coupons = [
        { code: 'WELCOME50', description: '50% off on first booking', discountType: 'percentage', discountValue: 50, maxDiscount: 500, usageLimit: 1000 },
        { code: 'MEDICO200', description: '₹200 flat off', discountType: 'flat', discountValue: 200, minOrderValue: 500 },
        { code: 'SENIOR10', description: '10% senior citizen discount', discountType: 'percentage', discountValue: 10, maxDiscount: 1000 },
    ];

    for (const coupon of coupons) {
        await prisma.coupon.upsert({
            where: { code: coupon.code },
            update: {},
            create: coupon,
        });
    }

    console.log('✅ Coupons seeded');

    console.log('\n🎉 Database seeded successfully!');
    console.log('──────────────────────────────────');
    console.log('Super Admin Login:');
    console.log('  Email: superadmin@medico.care');
    console.log('  Password: admin123');
    console.log('──────────────────────────────────');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
