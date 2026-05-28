const prisma = require('../config/database');
const { sendResponse } = require('../utils/helpers');

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

// --- Shiprocket Integration ---

// POST /api/wellness/shipping/rates
const getShippingRates = async (req, res, next) => {
    try {
        const { pincode, weight } = req.body;

        if (!pincode || !weight) {
            return res.status(400).json({ success: false, message: 'Pincode and weight required' });
        }

        // Mock Shiprocket API Call
        // In reality, you would use axios.post('https://apiv2.shiprocket.in/v1/external/courier/generate/pickup', ...)
        
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

// POST /api/wellness/shipping/create
const createShipment = async (req, res, next) => {
    try {
        const { orderId, total, pincode, weight } = req.body;
        const userId = req.user.id;

        // Mock Shiprocket Order Creation
        // Generate a random AWB for MVP demonstration
        const awbCode = 'AWB' + Math.floor(Math.random() * 100000000);
        const trackingUrl = `https://shiprocket.co/tracking/${awbCode}`;
        
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
    createShipment
};
