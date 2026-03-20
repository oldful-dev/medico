// ──────────────────────────────────────────────
//  Lab Controller  (Redcliffe Labs integration)
// ──────────────────────────────────────────────

const { sendResponse } = require('../utils/helpers');
const { logger } = require('../config/logger');
const rc = require('../utils/redcliffe.service');

// GET /api/labs/location/search?q=
const searchLocation = async (req, res, next) => {
    try {
        const { q } = req.query;
        if (!q) return sendResponse(res, 400, null, 'Query parameter q is required');
        const data = await rc.searchLocation(q);
        sendResponse(res, 200, data);
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
        const data = await rc.getTimeSlots(date, lat, lng, gender);
        sendResponse(res, 200, data);
    } catch (error) {
        logger.error('getTimeSlots error:', error.message);
        next(error);
    }
};

// GET /api/labs/packages?search=
const getPackages = async (req, res, next) => {
    try {
        const { search } = req.query;
        const data = await rc.getPackages(search || '');
        sendResponse(res, 200, data);
    } catch (error) {
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
        if (!booking_date)                                    missing.push('booking_date');
        if (!collection_date)                                 missing.push('collection_date');
        if (collection_slot === undefined)                    missing.push('collection_slot');
        if (!package_code || !package_code.length)           missing.push('package_code');
        if (!customer_name)                                   missing.push('customer_name');
        if (!customer_age)                                    missing.push('customer_age');
        if (!customer_gender)                                 missing.push('customer_gender');
        if (!customer_phonenumber)                            missing.push('customer_phonenumber');
        if (!customer_whatsapppnumber)                        missing.push('customer_whatsapppnumber');
        if (!customer_address)                                missing.push('customer_address');
        if (!customer_landmark)                               missing.push('customer_landmark');
        if (!pincode)                                         missing.push('pincode');
        if (is_credit === undefined || is_credit === null)    missing.push('is_credit');
        if (!customer_latitude)                               missing.push('customer_latitude');
        if (!customer_longitude)                              missing.push('customer_longitude');

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
        const data = await rc.getBookingStatus({ booking_id: req.params.id });
        sendResponse(res, 200, data);
    } catch (error) {
        logger.error('getLabBookingStatus error:', error.message);
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

module.exports = {
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
};
