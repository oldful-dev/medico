require('dotenv').config();
const shiprocket = require('../src/services/shiprocket.service');
const { logger } = require('../src/config/logger');
const axios = require('axios');

async function run() {
    logger.info('🚀 Starting Shiprocket Integration Test Script...');

    // 1. Check if Shiprocket is configured and reachable
    const isAvail = await shiprocket.isAvailable();
    logger.info(`Credentials & reachability status: ${isAvail ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);

    if (!isAvail) {
        logger.error('Shiprocket service is not available. Please verify SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in .env.');
        process.exit(1);
    }

    // 2. Fetch token
    let token;
    try {
        token = await shiprocket.getToken();
        logger.info(`🔑 Auth token successfully retrieved: ${token.substring(0, 10)}...`);
    } catch (err) {
        logger.error(`Failed to get token: ${err.message}`);
        process.exit(1);
    }

    const BASE_URL = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';

    // 2b. Fetch active pickup locations
    let pickupLocationName = 'Primary';
    try {
        logger.info('🏢 Fetching pickup locations configured in Shiprocket...');
        let pickupRes = await axios.get(`${BASE_URL}/settings/company/pickup`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        let locations = pickupRes.data?.data?.shipping_address || [];
        logger.info(`Found ${locations.length} configured pickup location(s)`);

        if (locations.length === 0) {
            logger.info('➕ No pickup locations found. Attempting to programmatically register a "Primary" pickup location...');
            try {
                const addPickupPayload = {
                    pickup_location: 'Primary',
                    name: 'Ayuxa Medico Warehouse',
                    email: 'warehouse@ayuxacare.com',
                    phone: '9480198108',
                    address: '1st Main Rd, HSR Layout Sector 6',
                    address_2: 'Near Sector 6 Park',
                    city: 'Bangalore',
                    state: 'Karnataka',
                    country: 'India',
                    pin_code: 560001
                };
                const addRes = await axios.post(`${BASE_URL}/settings/company/addpickup`, addPickupPayload, {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
                });
                logger.info(`✅ Successfully registered pickup location! Response: ${JSON.stringify(addRes.data)}`);
                
                // Re-fetch locations
                pickupRes = await axios.get(`${BASE_URL}/settings/company/pickup`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                locations = pickupRes.data?.data?.shipping_address || [];
            } catch (addErr) {
                logger.error(`Failed to programmatically add pickup location: ${addErr.response?.data?.message || addErr.message}`);
                if (addErr.response?.data) {
                    logger.error(`Add Pickup Error Details: ${JSON.stringify(addErr.response.data)}`);
                }
            }
        }

        if (locations.length > 0) {
            logger.info(`Inspect first location: ${JSON.stringify(locations[0])}`);
            const loc = locations[0];
            pickupLocationName = loc.pickup_location || loc.pickup_code || loc.pickup_location_relation || 'Primary';
            logger.info(`Using pickup location: "${pickupLocationName}"`);
        } else {
            logger.error('❌ Cannot proceed with order creation because no pickup locations are configured in the Shiprocket account.');
            process.exit(1);
        }
    } catch (err) {
        logger.warn(`Failed to fetch/manage pickup locations: ${err.message}`);
    }

    // 3. Test Shipping Rates Calculation
    const pickupPincode = process.env.WAREHOUSE_PINCODE || '560001';
    const deliveryPincode = '110001'; // New Delhi pincode
    logger.info(`📦 Testing shipping rate from ${pickupPincode} to ${deliveryPincode}...`);
    try {
        const rates = await shiprocket.getShippingRates({
            pickupPostcode: pickupPincode,
            deliveryPostcode: deliveryPincode,
            weight: 0.5,
            length: 10,
            breadth: 10,
            height: 10,
            cod: 0,
        });

        logger.info(`Found ${rates.length} shipping rates:`);
        rates.slice(0, 3).forEach((r, idx) => {
            logger.info(`  ${idx + 1}. Courier: ${r.courierName} (ID: ${r.courierId}) | Rate: ₹${r.rate} | Days: ${r.estimatedDays}`);
        });

        if (rates.length === 0) {
            logger.warn('No active couriers found. Fallback rate will be applied in production.');
        }
    } catch (err) {
        logger.error(`Shipping rates estimation failed: ${err.message}`);
    }

    // 4. Create a Demo Order
    const orderCode = `TEST-ORD-${Date.now()}`;
    logger.info(`🛒 Creating a demo order with code: ${orderCode} using pickup location "${pickupLocationName}"...`);
    let createdOrderId = null;
    let createdShipmentId = null;

    try {
        const payload = {
            order_id: orderCode,
            order_date: new Date().toISOString().slice(0, 10),
            pickup_location: pickupLocationName,
            channel_id: '',
            comment: `Medico Demo Test Order`,
            billing_customer_name: 'Test Customer',
            billing_last_name: 'User',
            billing_address: '123 Test Street, Connaught Place',
            billing_address_2: 'Block B',
            billing_city: 'New Delhi',
            billing_pincode: deliveryPincode,
            billing_state: 'Delhi',
            billing_country: 'India',
            billing_email: 'test@example.com',
            billing_phone: '9480198108', // Use valid contact number
            shipping_is_billing: 1,
            order_items: [
                {
                    name: 'Demo Wellness Vitamin Box',
                    sku: 'VIT-BOX-DEMO',
                    units: 1,
                    selling_price: '499',
                    discount: '0',
                    tax: '90',
                    hsn: '',
                }
            ],
            payment_method: 'Prepaid',
            shipping_charges: 50,
            giftwrap_charges: 0,
            transaction_charges: 0,
            total_discount: 0,
            sub_total: 499,
            length: 10,
            breadth: 10,
            height: 10,
            weight: 0.5,
        };

        const res = await shiprocket.createOrder(payload);
        createdOrderId = res.shiprocketOrderId;
        createdShipmentId = res.shipmentId;
        logger.info(`✅ Demo order successfully created! SR Order ID: ${createdOrderId} | Shipment ID: ${createdShipmentId}`);
    } catch (err) {
        logger.error(`Failed to create demo order: ${err.response?.data?.message || err.message}`);
        if (err.response?.data) {
            logger.error(`Shiprocket Error Details: ${JSON.stringify(err.response.data)}`);
        }
        process.exit(1);
    }

    // 5. Generate AWB
    if (createdShipmentId) {
        logger.info(`🏷️ Assigning courier and generating AWB for Shipment ID: ${createdShipmentId}...`);
        try {
            const awbRes = await shiprocket.generateAWB(createdShipmentId);
            logger.info(`✅ AWB assigned successfully!`);
            logger.info(`  Courier: ${awbRes.courierName}`);
            logger.info(`  AWB Code: ${awbRes.awbCode}`);
            logger.info(`  Tracking URL: ${awbRes.trackingUrl}`);

            // 6. Test Tracking Retrieval
            if (awbRes.awbCode) {
                logger.info(`📍 Testing live tracking info retrieve for AWB: ${awbRes.awbCode}...`);
                const trackRes = await shiprocket.trackShipment(awbRes.awbCode);
                logger.info(`  Current tracking status: ${trackRes.currentStatus}`);
            }
        } catch (err) {
            logger.warn(`AWB generation failed (this is common if sandbox has zero balance): ${err.message}`);
        }
    }

    // 7. Cleanup (Cancel order to avoid active fake orders)
    if (createdOrderId) {
        logger.info(`🧹 Cleaning up: Cancelling demo order ID ${createdOrderId} on Shiprocket...`);
        try {
            const cancelled = await shiprocket.cancelOrder([createdOrderId]);
            logger.info(`Status: ${cancelled ? '✅ CANCELLED SUCCESSFULLY' : '❌ CANCELLATION FAILED'}`);
        } catch (err) {
            logger.error(`Cancellation failed: ${err.message}`);
        }
    }

    logger.info('🎉 Shiprocket Integration Test Script execution complete!');
}

run().catch(err => {
    logger.error(`Unhandled test script error: ${err.message}`);
});
