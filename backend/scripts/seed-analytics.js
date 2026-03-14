const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('📊 Seeding Analytics Data...');

    // 1. Get Cities and Services
    const cities = await prisma.city.findMany();
    const services = await prisma.service.findMany();
    const plans = await prisma.plan.findMany();

    if (cities.length === 0 || services.length === 0 || plans.length === 0) {
        console.log('❌ Please run basic seed first (npm run prisma:seed)');
        return;
    }

    // 2. Create Users
    const users = [];
    for (let i = 0; i < 25; i++) {
        const city = cities[Math.floor(Math.random() * cities.length)];
        const user = await prisma.user.upsert({
            where: { phone: `+9198765432${i.toString().padStart(2, '0')}` },
            update: {},
            create: {
                name: `Senior User ${i + 1}`,
                phone: `+9198765432${i.toString().padStart(2, '0')}`,
                email: `user${i + 1}@example.com`,
                cityId: city.id,
                uniqueUserId: `MED-${city.code}-26-${1000 + i}`,
                status: 'ACTIVE',
                healthTag: ['NORMAL', 'DIABETIC', 'HYPERTENSION', 'CARDIAC'][Math.floor(Math.random() * 4)]
            }
        });
        users.push(user);
    }
    console.log(`✅ ${users.length} users created`);

    // 3. Create Subscriptions & Payments
    for (const user of users.slice(0, 15)) {
        const plan = plans[Math.floor(Math.random() * plans.length)];
        const sub = await prisma.subscription.create({
            data: {
                userId: user.id,
                planId: plan.id,
                billingCycle: 'QUARTERLY',
                startDate: new Date(),
                expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                amount: plan.quarterlyPrice,
                status: 'ACTIVE'
            }
        });

        await prisma.payment.create({
            data: {
                userId: user.id,
                subscriptionId: sub.id,
                amount: plan.quarterlyPrice,
                status: 'SUCCESS',
                paymentMethod: 'UPI',
                razorpayOrderId: `order_sub_${sub.id.slice(0, 8)}`,
                razorpayPaymentId: `pay_sub_${sub.id.slice(0, 8)}`
            }
        });
    }
    console.log('✅ Subscriptions and payments created');

    // 4. Create Bookings & Payments
    for (let i = 0; i < 50; i++) {
        const user = users[Math.floor(Math.random() * users.length)];
        const service = services[Math.floor(Math.random() * services.length)];
        const amount = 499 + Math.floor(Math.random() * 1000);

        const booking = await prisma.booking.create({
            data: {
                userId: user.id,
                serviceId: service.id,
                cityId: user.cityId,
                bookingCode: `BK-${2000 + i}`,
                scheduledDate: new Date(),
                status: Math.random() > 0.3 ? 'COMPLETED' : 'PENDING',
                amount: amount
            }
        });

        if (Math.random() > 0.1) {
            await prisma.payment.create({
                data: {
                    userId: user.id,
                    bookingId: booking.id,
                    amount: amount,
                    status: 'SUCCESS',
                    paymentMethod: 'CARD',
                    razorpayOrderId: `order_bk_${booking.id.slice(0, 8)}`,
                    razorpayPaymentId: `pay_bk_${booking.id.slice(0, 8)}`
                }
            });
        }
    }
    console.log('✅ Bookings and payments created');

    // 5. Create some SOS Alerts
    for (let i = 0; i < 3; i++) {
        const user = users[Math.floor(Math.random() * users.length)];
        await prisma.sOSAlert.create({
            data: {
                userId: user.id,
                cityId: user.cityId,
                status: 'ACTIVE',
                latitude: 12.9716,
                longitude: 77.5946,
                addressSnapshot: 'Bangalore, MG Road'
            }
        });
    }
    console.log('✅ SOS alerts created');

    console.log('\n🎉 Analytics data seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
