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
        prisma.city.upsert({ where: { code: 'NDA' }, update: {}, create: { name: 'Noida', code: 'NDA', stateCode: 'UP-16', isEnabled: true } }),
        prisma.city.upsert({ where: { code: 'GZB' }, update: {}, create: { name: 'Ghaziabad', code: 'GZB', stateCode: 'UP-14', isEnabled: true } }),
        prisma.city.upsert({ where: { code: 'LKO' }, update: {}, create: { name: 'Lucknow', code: 'LKO', stateCode: 'UP-32', isEnabled: true } }),
    ]);

    console.log(`✅ ${cities.length} cities seeded`);

    // ─── 2. Super Admin ───────────────────────
    const passwordHash = await bcrypt.hash('admin123', 12);
    const superAdmin = await prisma.admin.upsert({
        where: { email: 'superadmin@ayuxa.com' },
        update: {},
        create: {
            name: 'Super Admin',
            email: 'superadmin@ayuxa.com',
            phone: '+919999999999',
            passwordHash,
            role: 'SUPER_ADMIN',
        },
    });

    // City admins
    await prisma.admin.upsert({
        where: { email: 'blr.admin@ayuxa.com' },
        update: {},
        create: {
            name: 'Bangalore Admin',
            email: 'blr.admin@ayuxa.com',
            passwordHash,
            role: 'CITY_ADMIN',
            cityId: cities[0].id,
        },
    });

    console.log('✅ Admins seeded');

    // ─── 3. Services ──────────────────────────
    const serviceData = [
        { name: 'Doctor Home Visit', slug: 'doctor-visit', icon: '🩺', tagline: 'Expert doctors at your doorstep', pricingText: '₹799 / visit', basePrice: 799, route: '/doctor-visit', sortOrder: 1, serviceType: 'DOCTOR_HOME_VISIT' },
        { name: 'Doctor Home Visit', slug: 'doctor-home-visit', icon: '🩺', tagline: 'Expert doctors at your doorstep', pricingText: '₹799 / visit', basePrice: 799, route: '/services/doctor-visit', sortOrder: 1, serviceType: 'DOCTOR_HOME_VISIT' },
        { name: 'Hospital Trip', slug: 'hospital-trip', icon: '🏥', tagline: 'Safe & comfortable hospital trips', pricingText: '₹499 / trip', basePrice: 499, route: '/hospital-trip', sortOrder: 2, serviceType: 'HOSPITAL_TRIP' },
        { name: 'Nurse Care', slug: 'nurse-care', icon: '👩‍⚕️', tagline: 'Professional nursing care at home', pricingText: '₹1,299 / day', basePrice: 1299, route: '/nurse-care', sortOrder: 3, serviceType: 'HOME_NURSE' },
        { name: 'Insurance', slug: 'insurance', icon: '🛡️', tagline: 'Comprehensive health insurance plans', pricingText: 'From ₹199/mo', basePrice: 199, route: '/insurance', sortOrder: 4, serviceType: 'INSURANCE' },
        { name: 'Blood Test', slug: 'blood-test', icon: '🩸', tagline: 'Lab tests at home, reports online', pricingText: '₹299 / test', basePrice: 299, route: '/blood-test', sortOrder: 5, serviceType: 'BLOOD_TEST' },
        { name: 'Medicines', slug: 'order-medicines', icon: '💊', tagline: 'Doorstep medicine delivery', pricingText: 'As per MRP', basePrice: 0, route: '/order-medicines', sortOrder: 6, serviceType: 'MEDICINES' },
        { name: 'Physio & Fitness', slug: 'physio-fitness', icon: '🏋️', tagline: 'Personalized physiotherapy sessions', pricingText: '₹699 / session', basePrice: 699, route: '/physio-fitness', sortOrder: 7, serviceType: 'PHYSIO_FITNESS' },
        { name: 'Medical Equipment', slug: 'medical-equipment', icon: '🦽', tagline: 'Medical equipment on rent', pricingText: 'From ₹99/day', basePrice: 99, route: '/medical-equipment', sortOrder: 8, serviceType: 'EQUIPMENT_RENTAL' },
        { name: 'Meal Service', slug: 'meal-service', icon: '🍱', tagline: 'Healthy meals for seniors', pricingText: '₹149 / meal', basePrice: 149, route: '/meal-service', sortOrder: 9, serviceType: 'TIFFIN' },
        { name: 'Tech Helper', slug: 'tech-helper', icon: '💻', tagline: 'Technology assistance for seniors', pricingText: '₹399 / visit', basePrice: 399, route: '/tech-helper', sortOrder: 10, serviceType: 'TECH_HELPER' },
        { name: 'Home Essentials', slug: 'home-essentials', icon: '🏠', tagline: 'Daily essentials delivered', pricingText: 'Varies', basePrice: 0, route: '/all-home-essentials', sortOrder: 11, serviceType: 'HOME_ESSENTIALS', isEnabled: true },
        { name: 'Club & Events', slug: 'club-events', icon: '🎭', tagline: 'Social clubs & wellness events', pricingText: '₹199 / event', basePrice: 199, route: '/services/events', sortOrder: 12, serviceType: 'CLUB_EVENTS' },
    ];

    const homeEssentialsSubServices = [
        { name: 'AC & Appliance Repair', slug: 'appliance-repair', icon: '🛠️', tagline: 'Expert repairs for AC, Fridge, etc.', pricingText: '₹149 / booking', basePrice: 149, route: '/appliance-repair', sortOrder: 101, serviceType: 'HOME_ESSENTIALS', isEnabled: true },
        { name: 'Plumbing & Electrical', slug: 'plumbing-electrical', icon: '🚰', tagline: 'Certified plumbers & electricians', pricingText: '₹99 / booking', basePrice: 99, route: '/plumbing-electrical', sortOrder: 102, serviceType: 'HOME_ESSENTIALS', isEnabled: true },
        { name: 'Deep Cleaning', slug: 'deep-cleaning', icon: '🧹', tagline: 'Full home & toilet cleaning', pricingText: '₹499 / booking', basePrice: 499, route: '/deep-cleaning', sortOrder: 103, serviceType: 'HOME_ESSENTIALS', isEnabled: true },
        { name: 'Driver & Cab', slug: 'driving-cab', icon: '🚗', tagline: 'Reliable drivers for local/outstation', pricingText: '₹299 / booking', basePrice: 299, route: '/driving-cab', sortOrder: 104, serviceType: 'HOME_ESSENTIALS', isEnabled: true },
        { name: 'Bill Payment', slug: 'bill-payment', icon: '🧾', tagline: 'Utility bills & tax payments', pricingText: '₹49 / bill', basePrice: 49, route: '/bill-payment', sortOrder: 105, serviceType: 'HOME_ESSENTIALS', isEnabled: true },
        { name: 'Bank Paperwork', slug: 'bank-paperwork', icon: '🏦', tagline: 'KYC, forms & bank assistance', pricingText: '₹199 / visit', basePrice: 199, route: '/bank-paperwork', sortOrder: 106, serviceType: 'HOME_ESSENTIALS', isEnabled: true },
        { name: 'Grocery Run', slug: 'grocery-run', icon: '🛒', tagline: 'Fresh groceries at your door', pricingText: '₹99 / run', basePrice: 99, route: '/grocery-run', sortOrder: 107, serviceType: 'HOME_ESSENTIALS', isEnabled: true },
        { name: 'Anything Else', slug: 'anything-else', icon: '❓', tagline: 'Need help with something else?', pricingText: 'Contact Us', basePrice: 0, route: '/anything-else', sortOrder: 108, serviceType: 'HOME_ESSENTIALS', isEnabled: true },
        { name: 'Paperwork & Legal', slug: 'paper-legal', icon: '📋', tagline: 'Legal & paperwork assistance', pricingText: 'From ₹999', basePrice: 999, route: '/paper-legal', sortOrder: 109, serviceType: 'HOME_ESSENTIALS', isEnabled: true },
        { name: 'Trip & Travels', slug: 'trip-travels', icon: '✈️', tagline: 'Travel planning & assistance', pricingText: 'Custom', basePrice: 0, route: '/trip-travels', sortOrder: 110, serviceType: 'HOME_ESSENTIALS', isEnabled: true },
        { name: 'Smart Upgrade', slug: 'smart-upgrade', icon: '✨', tagline: 'Make your home elderly-friendly', pricingText: 'Custom Quote', basePrice: 0, route: '/smart-upgrade', sortOrder: 111, serviceType: 'HOME_ESSENTIALS', isEnabled: true }
    ];

    for (const s of serviceData) {
        await prisma.service.upsert({
            where: { slug: s.slug },
            update: { ...s },
            create: s,
        });
    }

    for (const s of homeEssentialsSubServices) {
        await prisma.service.upsert({
            where: { slug: s.slug },
            update: { ...s },
            create: s,
        });
    }

    console.log(`✅ ${serviceData.length + homeEssentialsSubServices.length} total services seeded/updated`);

    const planData = [
        { name: 'Care Plan', description: 'Ayuxa Care Plan - Comprehensive healthcare coverage', benefits: 'Doctor Visit (4/mo), Blood Test (2/mo), Home Nurse (2/mo), Physio (2/mo), 24/7 SOS Call, Priority Booking', quarterlyPrice: 599, biannualPrice: 999, yearlyPrice: 1999, sortOrder: 1, tierLevel: 0, planType: 'CARE' },
        { name: 'Care Plus', description: 'Ayuxa Care Plus - Expanded benefits & support', benefits: 'Doctor Visit (6/mo), Blood Test (3/mo), Home Nurse (4/mo), Physio (4/mo), 24/7 SOS Call, Priority Booking', quarterlyPrice: 899, biannualPrice: 1499, yearlyPrice: 2999, sortOrder: 2, tierLevel: 1, planType: 'CARE' },
        { name: 'Premium Care', description: 'Ayuxa Premium Care - The ultimate medical care coverage', benefits: 'Unlimited Doctor Visits, Blood Test (6/mo), Home Nurse (8/mo), Physio (8/mo), 24/7 SOS Call, Dedicated Care Manager', quarterlyPrice: 1299, biannualPrice: 1999, yearlyPrice: 3999, sortOrder: 3, tierLevel: 2, planType: 'CARE' },
        { name: 'HomeMaker Plan', description: 'Ayuxa HomeMaker Plan - Complete home care solution', benefits: 'All Care Plan services + Meal Service (20/mo), Home Essentials (4/mo), Tech Helper (4/mo), Unlimited SOS', quarterlyPrice: 1499, biannualPrice: 2499, yearlyPrice: 4799, sortOrder: 4, tierLevel: 0, planType: 'HOMEMAKER' },
        { name: 'HomeMaker Plus', description: 'Ayuxa HomeMaker Plus - Enhanced home care with extra assistance', benefits: 'All Care Plus services + Meal Service (30/mo), Home Essentials (6/mo), Tech Helper (6/mo), Unlimited SOS', quarterlyPrice: 1999, biannualPrice: 3499, yearlyPrice: 6799, sortOrder: 5, tierLevel: 1, planType: 'HOMEMAKER' },
        { name: 'Premium HomeMaker', description: 'Ayuxa Premium HomeMaker - VIP home and medical care solution', benefits: 'All Premium Care services + Unlimited Meal Service, Unlimited Home Essentials & Tech Helper, Dedicated Butler Service', quarterlyPrice: 2999, biannualPrice: 4999, yearlyPrice: 9799, sortOrder: 6, tierLevel: 2, planType: 'HOMEMAKER' },
    ];

    for (const p of planData) {
        await prisma.plan.upsert({
            where: { name: p.name },
            update: {
                description: p.description,
                benefits: p.benefits,
                quarterlyPrice: p.quarterlyPrice,
                biannualPrice: p.biannualPrice,
                yearlyPrice: p.yearlyPrice,
                sortOrder: p.sortOrder,
                tierLevel: p.tierLevel,
                planType: p.planType,
            },
            create: p,
        });
    }

    console.log(`✅ ${planData.length} plans seeded/updated`);

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

    // ─── 9. Service Charges ───────────────────
    const serviceCharges = [
        { serviceCategory: 'DOCTOR_HOME_VISIT', bookingFee: 199, platformFee: 50, taxPercentage: 6, isSubscriptionEligible: true, isActive: true },
        { serviceCategory: 'BLOOD_TEST', bookingFee: 99, platformFee: 50, taxPercentage: 6, isSubscriptionEligible: true, isActive: true },
        { serviceCategory: 'HOME_NURSE', bookingFee: 399, platformFee: 50, taxPercentage: 6, isSubscriptionEligible: true, isActive: true },
        { serviceCategory: 'PLUMBING_ELECTRICAL', bookingFee: 299, platformFee: 50, taxPercentage: 6, isSubscriptionEligible: true, isActive: true },
    ];

    for (const sc of serviceCharges) {
        await prisma.serviceCharge.upsert({
            where: { serviceCategory: sc.serviceCategory },
            update: {
                bookingFee: sc.bookingFee,
                platformFee: sc.platformFee,
                taxPercentage: sc.taxPercentage,
                isSubscriptionEligible: sc.isSubscriptionEligible,
                isActive: sc.isActive
            },
            create: sc,
        });
    }

    console.log('✅ Service charges seeded');

    // ─── 10. Demo Staff Profiles (for ActivityUpdate seeding) ─────────
    // These are stand-alone seed records. In production, admin assigns real staff via the UI.
    const demoStaff = [
        { staffId: 'AYX-DOC-0041', name: 'Dr. Priya Sharma',   phone: '+919876543210', role: 'doctor_assigned',    photoUrl: null },
        { staffId: 'AYX-LAB-0119', name: 'Rajan Mehta',         phone: '+918765432109', role: 'sample_collected',   photoUrl: null },
        { staffId: 'AYX-NRS-0088', name: 'Anita Verma',         phone: '+917654321098', role: 'nurse_assigned',     photoUrl: null },
        { staffId: 'AYX-CGR-0033', name: 'Suresh Kumar',        phone: '+916543210987', role: 'caregiver_assigned', photoUrl: null },
        { staffId: 'AYX-DEL-0055', name: 'Vikram Logistics',    phone: '+915432109876', role: 'out_for_delivery',   photoUrl: null },
        { staffId: 'AYX-BIL-0001', name: 'Ayuxa Billing',       phone: '+918000123456', role: 'payment_confirmed',  photoUrl: null },
    ];

    // Find any existing confirmed lab order to attach demo activity updates
    const demoOrder = await prisma.labOrder.findFirst({ where: { status: 'CONFIRMED' } });
    if (demoOrder) {
        // Delete existing demo activity updates for this order to keep seed idempotent
        await prisma.activityUpdate.deleteMany({ where: { labOrderId: demoOrder.id } });

        const activitySeeds = [
            { eventType: 'appointment_confirmed', serviceType: 'Blood Test',   staffIdx: 1, eta: '15 mins',  statusDetail: 'Phlebotomist confirmed and en route' },
            { eventType: 'sample_collected',      serviceType: 'Blood Test',   staffIdx: 1, eta: null,       statusDetail: 'Sample dispatched to lab for processing' },
            { eventType: 'payment_confirmed',      serviceType: 'Blood Test',   staffIdx: 5, eta: null,       statusDetail: '₹850 received · Ref #PAY9921' },
        ];

        for (const a of activitySeeds) {
            const s = demoStaff[a.staffIdx];
            await prisma.activityUpdate.create({
                data: {
                    labOrderId:   demoOrder.id,
                    eventType:    a.eventType,
                    serviceType:  a.serviceType,
                    staffName:    s.name,
                    staffId:      s.staffId,
                    staffPhone:   s.phone,
                    staffPhotoUrl: s.photoUrl,
                    eta:          a.eta,
                    statusDetail: a.statusDetail,
                },
            });
        }
        console.log(`✅ Demo activity updates seeded for order ${demoOrder.clientRefId}`);
    } else {
        console.log('ℹ️  No CONFIRMED lab order found — activity update demo skipped (run after a booking is confirmed)');
    }

    // ─── Banners ──────────────────────────────
    const banners = await Promise.all([
        prisma.banner.upsert({
            where: { id: 'banner_01' },
            update: {},
            create: {
                id: 'banner_01',
                imageUrl: 'https://images.unsplash.com/photo-1631217314830-e41d473b8eb0?w=800',
                heading: 'Share Your Travel Plan',
                subheading: 'Tell us where you want to go and we\'ll assist you',
                ctaText: 'Share Now',
                ctaRoute: '/trip-travels',
                order: 1,
                isActive: true,
            },
        }),
        prisma.banner.upsert({
            where: { id: 'banner_02' },
            update: {},
            create: {
                id: 'banner_02',
                imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800',
                heading: 'Health Checkup at Home',
                subheading: 'Complete wellness packages delivered to your doorstep',
                ctaText: 'Book Now',
                ctaRoute: '/blood-test',
                order: 2,
                isActive: true,
            },
        }),
        prisma.banner.upsert({
            where: { id: 'banner_03' },
            update: {},
            create: {
                id: 'banner_03',
                imageUrl: 'https://images.unsplash.com/photo-1579154204601-01d82b27d100?w=800',
                heading: 'Expert Medical Advice',
                subheading: 'Connect with qualified doctors for consultation',
                ctaText: 'Consult Now',
                ctaRoute: '/doctor-visit',
                order: 3,
                isActive: true,
            },
        }),
    ]);

    console.log(`✅ ${banners.length} banners seeded`);

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
