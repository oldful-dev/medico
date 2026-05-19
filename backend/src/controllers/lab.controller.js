// ──────────────────────────────────────────────
//  Lab Controller  (Redcliffe Labs integration)
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, paginate, sendPaginatedResponse } = require('../utils/helpers');
const { logger } = require('../config/logger');
const rc = require('../services/redcliffe.service');

// GET /api/labs/serviceability?lat=&lng=
const checkServiceability = async (req, res, next) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) return sendResponse(res, 400, null, 'lat and lng are required');
        const result = await rc.checkServiceability(lat, lng);
        sendResponse(res, 200, result);
    } catch (error) {
        // Redcliffe returns 400 for non-serviceable locations
        if (error.response?.status === 400) {
            return sendResponse(res, 200, { status: 'failure', message: 'Location is non-serviceable' });
        }
        logger.error('checkServiceability error:', error.message);
        next(error);
    }
};

// GET /api/labs/location/search?q=
const searchLocation = async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q) return sendResponse(res, 400, null, 'Query parameter q is required');
        const result = await rc.searchLocation(q);
        // Ensure we send only the array of locations
        const locations = result.data || [];
        sendResponse(res, 200, locations);
    } catch (error) {
        logger.error('searchLocation error:', error.message);
        next(error);
    }
};

// GET /api/labs/location/latlng?eloc=
const getLatLng = async (req, res, next) => {
    try {
        const { eloc } = req.query;
        if (!eloc) return sendResponse(res, 400, null, 'eloc is required');
        const data = await rc.getLatLngFromEloc(eloc);
        sendResponse(res, 200, data);
    } catch (error) {
        logger.error('getLatLng error:', error.message);
        next(error);
    }
};

// GET /api/labs/time-slots?date=&lat=&lng=&gender=
const getTimeSlots = async (req, res, next) => {
    try {
        const { date, lat, lng, gender } = req.query;
        if (!date || !lat || !lng) return sendResponse(res, 400, null, 'date, lat and lng are required');
        const result = await rc.getTimeSlots(date, lat, lng, gender);
        // Ensure we send only the array of slots to the frontend
        const slots = result.data || [];
        sendResponse(res, 200, slots);
    } catch (error) {
        // If Redcliffe returns 400, it usually means no slots for that criteria
        if (error.response?.status === 400) {
            return sendResponse(res, 200, [], 'No slots available for the selected criteria');
        }
        logger.error('getTimeSlots error:', error.message);
        next(error);
    }
};

// GET /api/labs/packages?search=
const getPackages = async (req, res, next) => {
    try {
        const { search } = req.query;
        const result = await rc.getPackages(search || '');
        // Redcliffe returns { status: 'success', data: [...] }
        // We only want to send the array [...] to the frontend
        const packages = (result.data || []).filter(pkg => pkg.code).map(pkg => ({
            code: pkg.code,
            name: pkg.name,
            cost: pkg.package_center_prices?.package_price ?? pkg.cost ?? 0,
            discounted_cost: pkg.package_center_prices?.offer_price ?? pkg.discounted_cost ?? null,
            tests_count: pkg.parameter ?? pkg.tests_count ?? null,
            fasting: !!(pkg.fasting_time ?? pkg.fasting ?? pkg.is_fasting),
            type: pkg.type ?? null,
        }));
        sendResponse(res, 200, packages);
    } catch (error) {
        if (error.response?.status === 400) {
            return sendResponse(res, 200, [], 'No packages found');
        }
        logger.error('getPackages error:', error.message);
        next(error);
    }
};

// GET /api/labs/packages/:code
const getPackageDetails = async (req, res, next) => {
    try {
        const { code } = req.params;
        const data = await rc.getPackageDetails(code);
        sendResponse(res, 200, data);
    } catch (error) {
        logger.error('getPackageDetails error:', error.message);
        next(error);
    }
};

// POST /api/labs/book
// Step 1 of booking flow — creates a temporary booking (locked for 30 mins).
// Must be followed by POST /api/labs/booking/:id/confirm to make it permanent.
const bookLabTest = async (req, res, next) => {
    try {
        const {
            booking_date,
            collection_date,
            collection_slot,
            package_code,
            customer_name,
            customer_age,
            customer_gender,
            customer_email,
            customer_phonenumber,
            customer_whatsapppnumber,
            customer_address,
            address_line2,
            customer_landmark,
            pincode,
            is_credit,
            customer_latitude,
            customer_longitude,
            additional_member,
            center_discount,
            reference_data,
        } = req.body;

        // Validate required fields
        const missing = [];
        if (!booking_date) missing.push('booking_date');
        if (!collection_date) missing.push('collection_date');
        if (collection_slot === undefined) missing.push('collection_slot');
        if (!package_code || !package_code.length) missing.push('package_code');
        if (!customer_name) missing.push('customer_name');
        if (!customer_age) missing.push('customer_age');
        if (!customer_gender) missing.push('customer_gender');
        if (!customer_phonenumber) missing.push('customer_phonenumber');
        if (!customer_whatsapppnumber) missing.push('customer_whatsapppnumber');
        if (!customer_address) missing.push('customer_address');
        if (!customer_landmark) missing.push('customer_landmark');
        if (!pincode) missing.push('pincode');
        if (is_credit === undefined || is_credit === null) missing.push('is_credit');
        if (!customer_latitude) missing.push('customer_latitude');
        if (!customer_longitude) missing.push('customer_longitude');

        if (missing.length) {
            return sendResponse(res, 400, null, `Missing required fields: ${missing.join(', ')}`);
        }

        const payload = {
            booking_date,
            collection_date,
            collection_slot,
            package_code,
            customer_name,
            customer_age,
            customer_gender,
            customer_email: customer_email || '',
            customer_phonenumber,
            customer_altphonenumber: customer_phonenumber,
            customer_whatsapppnumber,
            customer_address,
            address_line2: address_line2 || '',
            customer_landmark,
            pincode,
            is_credit,
            customer_latitude,
            customer_longitude,
            additional_member: additional_member || [],
            ...(center_discount !== undefined && { center_discount }),
            ...(reference_data && { reference_data }),
        };

        const data = await rc.createTempBooking(payload);
        sendResponse(res, 201, data, 'Temporary booking created. Confirm within 30 minutes.');
    } catch (error) {
        logger.error('bookLabTest error:', error.message);
        next(error);
    }
};

// POST /api/labs/booking/:id/confirm
// Step 2 of booking flow — confirms (true) or cancels (false) the temporary booking.
const confirmLabBooking = async (req, res, next) => {
    try {
        const booking_id = parseInt(req.params.id);
        const { is_confirmed } = req.body;
        if (is_confirmed === undefined) return sendResponse(res, 400, null, 'is_confirmed is required');
        const data = await rc.confirmBooking(booking_id, is_confirmed);
        sendResponse(res, 200, data);
    } catch (error) {
        logger.error('confirmLabBooking error:', error.message);
        next(error);
    }
};

// GET /api/labs/booking/:id
const getLabBookingStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        logger.info(`Fetching Lab status for ID: ${id}`);

        // First, try to fetch from our internal LabOrder table
        // This handles UUIDs (our internal IDs) and client references (LAB-XXXX)
        let labOrder;

        if (id.startsWith('LAB-')) {
            // Internal client reference (LAB-EBEF9C95)
            labOrder = await prisma.labOrder.findUnique({
                where: { clientRefId: id },
                include: { payments: { take: 1, orderBy: { createdAt: 'desc' } } }
            });
        } else if (id.length === 36 && id.includes('-')) {
            // UUID format (our internal ID)
            labOrder = await prisma.labOrder.findUnique({
                where: { id },
                include: { payments: { take: 1, orderBy: { createdAt: 'desc' } } }
            });
        }

        // If found in our DB, return it directly
        if (labOrder) {
            return sendResponse(res, 200, labOrder);
        }

        // Otherwise, try Redcliffe API (for numeric Redcliffe IDs or external lookups)
        let params = {};
        if (/^\d+$/.test(id)) {
            params.booking_id = parseInt(id);
        } else {
            params.booking_id = id;
        }

        const result = await rc.getBookingStatus(params);
        sendResponse(res, 200, result);
    } catch (error) {
        logger.error('getLabBookingStatus error:', error.response?.data || error.message);
        // If we get a 400 from Redcliffe, respond with a helpful message
        if (error.response?.status === 400) {
            return sendResponse(res, 400, null, `Redcliffe Status Error: ${error.response?.data?.message || 'Invalid ID'}`);
        }
        next(error);
    }
};

// POST /api/labs/booking/:id/update
// Reschedule: pass booking_status="rescheduled", collection_date, collection_slot, remark
// Cancel:     pass booking_status="cancelled", remark
const updateLabBooking = async (req, res, next) => {
    try {
        const { booking_status, remark, collection_date, collection_slot } = req.body;
        if (!booking_status) return sendResponse(res, 400, null, 'booking_status is required');
        const data = await rc.updateBooking({
            booking_id: parseInt(req.params.id),
            booking_status,
            remark: remark || '',
            ...(collection_date && { collection_date }),
            ...(collection_slot !== undefined && { collection_slot }),
        });
        sendResponse(res, 200, data);
    } catch (error) {
        logger.error('updateLabBooking error:', error.message);
        next(error);
    }
};

// POST /api/labs/booking/:id/members
const addLabMember = async (req, res, next) => {
    try {
        const { additional_member } = req.body;
        if (!additional_member || !Array.isArray(additional_member) || !additional_member.length) {
            return sendResponse(res, 400, null, 'additional_member array is required');
        }
        const data = await rc.addMember(parseInt(req.params.id), additional_member);
        sendResponse(res, 200, data);
    } catch (error) {
        logger.error('addLabMember error:', error.message);
        next(error);
    }
};

// POST /api/labs/booking/:id/payment-mode
const updateLabPaymentMode = async (req, res, next) => {
    try {
        const { is_credit, remark } = req.body;
        if (is_credit === undefined) return sendResponse(res, 400, null, 'is_credit is required');
        const data = await rc.updatePaymentMode(parseInt(req.params.id), is_credit, remark || '');
        sendResponse(res, 200, data);
    } catch (error) {
        logger.error('updateLabPaymentMode error:', error.message);
        next(error);
    }
};

// POST /api/labs/booking/:id/packages
const updateLabPackage = async (req, res, next) => {
    try {
        const { packages, center_discount } = req.body;
        if (!packages || !Array.isArray(packages) || !packages.length) {
            return sendResponse(res, 400, null, 'packages array is required');
        }
        const data = await rc.updatePackage(parseInt(req.params.id), packages, center_discount || 0);
        sendResponse(res, 200, data);
    } catch (error) {
        logger.error('updateLabPackage error:', error.message);
        next(error);
    }
};

// GET /api/labs/booking/:id/digital-report
const getDigitalReport = async (req, res, next) => {
    try {
        const data = await rc.getDigitalReport(req.params.id);
        sendResponse(res, 200, data);
    } catch (error) {
        logger.error('getDigitalReport error:', error.message);
        next(error);
    }
};

// GET /api/labs/booking/:id/report
const getConsolidatedReport = async (req, res, next) => {
    try {
        const data = await rc.getConsolidatedReport(req.params.id);
        sendResponse(res, 200, data);
    } catch (error) {
        logger.error('getConsolidatedReport error:', error.message);
        next(error);
    }
};

// GET /api/labs/my-orders — Authenticated user's lab orders
const getUserLabOrders = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const orders = await prisma.labOrder.findMany({
            where: { userId },
            include: {
                payments: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { status: true, amount: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        sendResponse(res, 200, orders);
    } catch (error) {
        logger.error('getUserLabOrders error:', error.message);
        next(error);
    }
};

// GET /api/labs/admin/orders
const adminGetLabOrders = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { status, search } = req.query;

        const where = {};
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { clientRefId: { contains: search, mode: 'insensitive' } },
                { redcliffeBookingId: { contains: search, mode: 'insensitive' } },
                // JSON query for patient name if possible, or simple check
                { patient: { path: ['name'], string_contains: search } }
            ];
        }

        const [orders, total] = await Promise.all([
            prisma.labOrder.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: { select: { name: true, phone: true } },
                    booking: { select: { bookingCode: true } }
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.labOrder.count({ where }),
        ]);

        sendPaginatedResponse(res, orders, total, page, limit);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    checkServiceability,
    searchLocation,
    getLatLng,
    getTimeSlots,
    getPackages,
    getPackageDetails,
    bookLabTest,
    confirmLabBooking,
    getLabBookingStatus,
    updateLabBooking,
    addLabMember,
    updateLabPaymentMode,
    updateLabPackage,
    getDigitalReport,
    getConsolidatedReport,
    getUserLabOrders,
    adminGetLabOrders,
};
