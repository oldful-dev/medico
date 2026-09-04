const prisma = require('../config/database');
const { sendResponse } = require('../utils/helpers');
const { getDeliveryFeeConfig, DELIVERY_FEE_CONFIG_KEY } = require('../utils/deliveryFee');

// --- Banner CMS ---

// GET /api/wellness/banners
const getWellnessBanners = async (req, res, next) => {
    try {
        const banners = await prisma.banner.findMany({
            where: {
                category: 'WELLNESS',
                isActive: true
            },
            orderBy: { order: 'asc' }
        });
        sendResponse(res, 200, banners);
    } catch (error) {
        next(error);
    }
};

// --- Maintenance Toggle ---

// GET /api/wellness/status
const getWellnessStatus = async (req, res, next) => {
    try {
        let config = await prisma.uIConfig.findUnique({
            where: { key: 'WELLNESS_STORE_STATUS' }
        });

        // Auto-seed if missing
        if (!config) {
            config = await prisma.uIConfig.create({
                data: {
                    key: 'WELLNESS_STORE_STATUS',
                    label: 'Wellness Store Enabled',
                    isVisible: true, // true = open, false = coming soon
                }
            });
        }

        sendResponse(res, 200, {
            isEnabled: config.isVisible
        });
    } catch (error) {
        next(error);
    }
};

// PUT /api/wellness/status (Admin Only)
const toggleWellnessStatus = async (req, res, next) => {
    try {
        const { isEnabled } = req.body;
        const config = await prisma.uIConfig.upsert({
            where: { key: 'WELLNESS_STORE_STATUS' },
            update: { isVisible: isEnabled },
            create: {
                key: 'WELLNESS_STORE_STATUS',
                label: 'Wellness Store Enabled',
                isVisible: isEnabled
            }
        });

        sendResponse(res, 200, {
            isEnabled: config.isVisible
        }, 'Wellness store status updated');
    } catch (error) {
        next(error);
    }
};

// --- Delivery Fee Config ---

// GET /api/wellness/delivery-fee (Admin)
const getDeliveryFeeConfigHandler = async (req, res, next) => {
    try {
        const config = await getDeliveryFeeConfig();
        sendResponse(res, 200, config);
    } catch (error) {
        next(error);
    }
};

// PUT /api/wellness/delivery-fee (Admin only)
const updateDeliveryFeeConfig = async (req, res, next) => {
    try {
        const { prepaidThreshold, prepaidFee, codThreshold, codFee } = req.body;
        const nums = { prepaidThreshold, prepaidFee, codThreshold, codFee };
        for (const [key, val] of Object.entries(nums)) {
            if (val === undefined) continue;
            if (typeof val !== 'number' || val < 0 || Number.isNaN(val)) {
                return res.status(400).json({ success: false, message: `${key} must be a non-negative number` });
            }
        }

        const current = await getDeliveryFeeConfig();
        const updated = { ...current, ...Object.fromEntries(Object.entries(nums).filter(([, v]) => v !== undefined)) };

        await prisma.uIConfig.upsert({
            where: { key: DELIVERY_FEE_CONFIG_KEY },
            update: { configJson: updated },
            create: { key: DELIVERY_FEE_CONFIG_KEY, label: 'Wellness Delivery Fee', configJson: updated },
        });

        sendResponse(res, 200, updated, 'Delivery fee config updated');
    } catch (error) {
        next(error);
    }
};

// --- Delhivery Integration ---

// POST /api/wellness/shipping/rates
const getShippingRates = async (req, res, next) => {
    try {
        const { pincode, weight } = req.body;

        if (!pincode || !weight) {
            return res.status(400).json({ success: false, message: 'Pincode and weight required' });
        }

        // Mock Delhivery API Call
        // In reality, you would use axios.post('https://track.delhivery.com/api/cmu/create.json', ...)
        
        let shippingCharge = 79; // Default MVP base charge
        if (weight > 1) {
            shippingCharge += 20 * Math.ceil(weight - 1);
        }

        sendResponse(res, 200, {
            shippingCharge,
            estimatedDays: 3,
            pincode,
            weight
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/wellness/shipping/create  (admin only — see wellness.routes.js)
const createShipment = async (req, res, next) => {
    try {
        const { orderId, total, pincode, weight } = req.body;

        // Mock Delhivery Order Creation
        // Generate a random AWB for MVP demonstration
        const awbCode = 'AWB' + Math.floor(Math.random() * 100000000);
        const trackingUrl = `https://track.delhivery.com/tracking/${awbCode}`;
        
        // Save to DB
        await prisma.productOrder.update({
            where: { id: orderId },
            data: {
                awbCode,
                trackingUrl,
                courierName: 'Delhivery',
                shippingStatus: 'SHIPMENT_CREATED'
            }
        });

        sendResponse(res, 201, {
            orderId,
            awbCode,
            trackingUrl,
            courierName: 'Delhivery',
            status: 'SHIPMENT_CREATED'
        }, 'Shipment created successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getWellnessBanners,
    getWellnessStatus,
    toggleWellnessStatus,
    getShippingRates,
    createShipment,
    getDeliveryFeeConfigHandler,
    updateDeliveryFeeConfig,
};
