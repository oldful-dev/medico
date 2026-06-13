require('dotenv').config();
const delhivery = require('../src/services/delhivery.service');
const { logger } = require('../src/config/logger');

async function run() {
    logger.info('🚀 Starting Delhivery Integration Test Script...');

    // 1. Check if Delhivery is configured
    const isAvail = await delhivery.isAvailable();
    logger.info(`Credentials configured status: ${isAvail ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);

    if (!isAvail) {
        logger.error('Delhivery service is not configured. Please add DELHIVERY_API_TOKEN in .env.');
        process.exit(1);
    }

    // 2. Fetch token
    let token;
    try {
        token = await delhivery.getToken();
        logger.info(`🔑 Auth token successfully retrieved: ${token.substring(0, 10)}...`);
    } catch (err) {
        logger.error(`Failed to get token: ${err.message}`);
        process.exit(1);
    }

    // 3. Test Shipping Rates / Serviceability Calculation
    const pickupPincode = process.env.WAREHOUSE_PINCODE || '560001';
    const deliveryPincode = '560001'; // Bangalore pincode
    logger.info(`📦 Testing shipping serviceability/rate from ${pickupPincode} to ${deliveryPincode}...`);
    try {
        const rates = await delhivery.getShippingRates({
            pickupPostcode: pickupPincode,
            deliveryPostcode: deliveryPincode,
            weight: 0.5,
            cod: 0,
        });

        logger.info(`Found ${rates.length} shipping rates:`);
        rates.forEach((r, idx) => {
            logger.info(`  ${idx + 1}. Courier: ${r.courierName} | Rate: ₹${r.rate} | Days: ${r.estimatedDays} | COD: ${r.cod}`);
        });

        if (rates.length === 0) {
            logger.warn('Pincode is not serviceable by Delhivery.');
        }
    } catch (err) {
        logger.error(`Shipping rates calculation failed: ${err.message}`);
    }

    // 4. Create a Demo Order
    const orderCode = `TEST-DELH-${Date.now()}`;
    logger.info(`🛒 Booking a demo Delhivery shipment with order code: ${orderCode}...`);
    let createdOrderId = null;
    let createdShipmentId = null;

    try {
        const payload = {
            order_id: orderCode,
            weight: 0.5,
            length: 10,
            breadth: 10,
            height: 10,
            billing_customer_name: 'Test Delhivery Customer',
            billing_address: '123 Staging Road, Connaught Place',
            billing_pincode: deliveryPincode,
            billing_city: 'Bangalore',
            billing_state: 'Karnataka',
            billing_country: 'India',
            billing_phone: '9480198108',
            payment_method: 'Prepaid',
            sub_total: 499,
            order_items: [
                {
                    name: 'Demo Vitamin Pack',
                    units: 1,
                }
            ],
        };

        const res = await delhivery.createOrder(payload);
        createdOrderId = res.shiprocketOrderId;
        createdShipmentId = res.shipmentId;
        logger.info(`✅ Demo order booked! Mapped Order ID: ${createdOrderId} | Shipment ID: ${createdShipmentId}`);
    } catch (err) {
        logger.error(`Failed to create demo order: ${err.message}`);
        if (err.response?.data) {
            logger.error(`Error details: ${JSON.stringify(err.response.data)}`);
        }
        process.exit(1);
    }

    // 5. Generate AWB
    if (createdShipmentId) {
        logger.info(`🏷️ Generating AWB / Tracking details for waybill: ${createdShipmentId}...`);
        try {
            const awbRes = await delhivery.generateAWB(createdShipmentId);
            logger.info(`✅ AWB details retrieved successfully!`);
            logger.info(`  Courier: ${awbRes.courierName}`);
            logger.info(`  AWB Code: ${awbRes.awbCode}`);
            logger.info(`  Tracking URL: ${awbRes.trackingUrl}`);

            // 6. Test Tracking Retrieval
            if (awbRes.awbCode) {
                logger.info(`📍 Testing live tracking retrieval for waybill: ${awbRes.awbCode}...`);
                const trackRes = await delhivery.trackShipment(awbRes.awbCode);
                logger.info(`  Current tracking status: ${trackRes.currentStatus}`);
            }
        } catch (err) {
            logger.error(`AWB generation / Tracking retrieval failed: ${err.message}`);
        }
    }

    // 7. Cleanup (Cancel test shipment)
    if (createdOrderId) {
        logger.info(`🧹 Cleaning up: Cancelling demo Delhivery waybill ${createdOrderId}...`);
        try {
            const cancelled = await delhivery.cancelOrder([createdOrderId]);
            logger.info(`Status: ${cancelled ? '✅ CANCELLED SUCCESSFULLY' : '❌ CANCELLATION FAILED'}`);
        } catch (err) {
            logger.error(`Cancellation failed: ${err.message}`);
        }
    }

    logger.info('🎉 Delhivery Integration Test Script execution complete!');
}

run().catch(err => {
    logger.error(`Unhandled test script error: ${err.message}`);
});
