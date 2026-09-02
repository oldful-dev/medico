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

// GET /api/labs/packages?search=&page=
// Paginated pass-through of Redcliffe center-package-data (~1732 items, 15/page).
// The Redcliffe list row already carries `parameter` (param count) and
// `category_for_web`; per-package detail (grouped parameters) is fetched
// on-demand by the detail screen, so no N+1 enrichment here.
const getPackages = async (req, res, next) => {
    try {
        const { search } = req.query;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const { data, count, page_size } = await rc.getPackages(search || '', page);

        const packages = (data || []).filter(pkg => pkg.code).map(pkg => ({
            code: pkg.code,
            name: pkg.name,
            cost: pkg.package_center_prices?.package_price ?? pkg.cost ?? 0,
            discounted_cost: pkg.package_center_prices?.offer_price ?? pkg.discounted_cost ?? null,
            tests_count: pkg.parameter ?? pkg.tests_count ?? null,
            packages_count: pkg.packages_count ?? 1,
            fasting: !!(pkg.fasting_time ?? pkg.fasting ?? pkg.is_fasting),
            type: pkg.type ?? null,
            description: pkg.description ?? null,
            fasting_time: pkg.fasting_time ?? null,
            tat_time: pkg.tat_time ?? null,
            specimen_instructions: pkg.specimen_instructions || null,
            test_category: pkg.test_category ?? null,
            category_for_web: pkg.category_for_web ?? [],
        }));

        sendPaginatedResponse(res, packages, count || packages.length, page, page_size || 15);
    } catch (error) {
        if (error.response?.status === 400) {
            return sendPaginatedResponse(res, [], 0, 1, 15);
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
        const { status, search, userId } = req.query;

        const where = {};
        if (status) where.status = status;
        if (userId) where.userId = userId;
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
                    booking: { select: { bookingCode: true } },
                    payments: { select: { status: true }, where: { status: 'SUCCESS' }, take: 1 },
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

// POST /api/labs/booking/:id/cancel
const cancelLabOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const order = await prisma.labOrder.findUnique({ where: { id } });
        if (!order) return sendResponse(res, 404, null, 'Lab order not found');
        if (order.userId !== userId) return sendResponse(res, 403, null, 'Unauthorized');

        // Can only cancel if not yet sample collected
        if (['SAMPLE_COLLECTED', 'REPORT_GENERATED'].includes(order.status)) {
            return sendResponse(res, 400, null, 'Cannot cancel after sample collection');
        }

        const updated = await prisma.labOrder.update({
            where: { id },
            data: { status: 'FAILED' }
        });

        logger.info(`Lab order ${id} cancelled by user ${userId}`);
        sendResponse(res, 200, updated, 'Lab order cancelled successfully');
    } catch (error) {
        logger.error('cancelLabOrder error:', error.message);
        next(error);
    }
};

// PUT /api/labs/booking/:id/reschedule (ADMIN ONLY)
const rescheduleLabOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { date, time, reason } = req.body;
        const adminId = req.user.id;

        if (!date || !time) {
            return sendResponse(res, 400, null, 'Date and time are required');
        }

        const order = await prisma.labOrder.findUnique({ where: { id } });
        if (!order) return sendResponse(res, 404, null, 'Lab order not found');

        // Can only reschedule if confirmed or already rescheduled (not yet sample collected)
        if (!['CONFIRMED', 'RESCHEDULED'].includes(order.status)) {
            return sendResponse(res, 400, null, 'Cannot reschedule at this stage');
        }

        const updated = await prisma.labOrder.update({
            where: { id },
            data: {
                status: 'RESCHEDULED',
                rescheduledDate: new Date(date),
                rescheduledTime: time,
                rescheduleReason: reason || null,
                rescheduledBy: adminId,
                rescheduledAt: new Date(),
            },
            include: { user: { select: { id: true, name: true } } }
        });

        // Emit activity update to user
        const { emitToUser } = require('../services/socket.service');
        const { sendPushToUser } = require('../utils/notifications');

        emitToUser(updated.userId, 'activity_update_created', {
            id: `reschedule_${id}_${Date.now()}`,
            eventType: 'service_rescheduled',
            serviceType: 'Blood Test',
            staffName: 'Admin',
            staffId: adminId,
            staffPhone: '',
            staffPhotoUrl: null,
            statusDetail: `Your appointment has been rescheduled to ${date} at ${time}`,
            createdAt: new Date(),
        });

        // Send FCM push
        try {
            await sendPushToUser(updated.userId, {
                title: 'Appointment Rescheduled',
                body: `Your blood test has been rescheduled to ${date} at ${time}`,
                data: {
                    type: 'lab_rescheduled',
                    labOrderId: id,
                },
            });
        } catch (pushErr) {
            logger.warn('Failed to send reschedule FCM:', pushErr.message);
        }

        logger.info(`Lab order ${id} rescheduled by admin ${adminId}`);
        sendResponse(res, 200, updated, 'Lab order rescheduled successfully');
    } catch (error) {
        logger.error('rescheduleLabOrder error:', error.message);
        next(error);
    }
};

// POST /api/labs/booking/:id/admin-cancel (ADMIN ONLY)
// Unlike cancelLabOrder (user-facing, restricted to the order's own owner), this
// lets an admin cancel on the customer's behalf and also notifies Redcliffe via
// updateBooking, which the user-facing cancel path currently does not do.
const adminCancelLabOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminId = req.user.id;

        const order = await prisma.labOrder.findUnique({ where: { id } });
        if (!order) return sendResponse(res, 404, null, 'Lab order not found');

        if (['SAMPLE_COLLECTED', 'REPORT_GENERATED', 'FAILED'].includes(order.status)) {
            return sendResponse(res, 400, null, 'Cannot cancel at this stage');
        }

        // Tell Redcliffe if a real booking exists there yet (best-effort — a
        // PENDING/HOLD_CREATED order may not have a confirmed Redcliffe booking).
        if (order.redcliffeBookingId) {
            try {
                await rc.updateBooking({
                    booking_id: parseInt(order.redcliffeBookingId, 10),
                    booking_status: 'cancelled',
                    remark: reason || 'Cancelled by Ayuxa admin',
                });
            } catch (rcErr) {
                logger.warn(`[adminCancelLabOrder] Redcliffe cancel failed for ${id}: ${rcErr.message}`);
            }
        }

        const updated = await prisma.labOrder.update({
            where: { id },
            data: { status: 'FAILED' },
        });

        const { emitToUser } = require('../services/socket.service');
        const { sendPushToUser } = require('../utils/notifications');

        emitToUser(updated.userId, 'activity_update_created', {
            id: `cancel_${id}_${Date.now()}`,
            eventType: 'service_rescheduled',
            serviceType: 'Blood Test',
            staffName: 'Admin',
            staffId: adminId,
            staffPhone: '',
            staffPhotoUrl: null,
            statusDetail: reason ? `Your booking was cancelled: ${reason}` : 'Your booking has been cancelled.',
            createdAt: new Date(),
        });

        try {
            await sendPushToUser(updated.userId, {
                title: 'Booking Cancelled',
                body: reason ? `Your blood test booking was cancelled: ${reason}` : 'Your blood test booking has been cancelled.',
                data: { type: 'lab_cancelled', labOrderId: id },
            });
        } catch (pushErr) {
            logger.warn('Failed to send cancel FCM:', pushErr.message);
        }

        logger.info(`Lab order ${id} cancelled by admin ${adminId}`);
        sendResponse(res, 200, updated, 'Lab order cancelled successfully');
    } catch (error) {
        logger.error('adminCancelLabOrder error:', error.message);
        next(error);
    }
};

// GET /api/labs/booking/:id/invoice
// LabOrder payments use Payment.labOrderId, not Payment.bookingId, so they were
// structurally invisible to the generic Booking invoice endpoint. This mirrors
// booking.controller.js's downloadInvoice using the same shared PDF generator.
const getLabOrderInvoice = async (req, res, next) => {
    try {
        const { generateInvoicePDF } = require('../utils/pdfGenerator');

        const order = await prisma.labOrder.findUnique({
            where: { id: req.params.id },
            include: {
                user: { select: { name: true, phone: true } },
                payments: {
                    where: { status: 'SUCCESS' },
                    include: { invoice: true },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!order) return sendResponse(res, 404, null, 'Lab order not found');

        const isAdmin = req.user && (req.user.role || req.user.isStaffProfile === true || req.baseUrl.includes('/admin') || req.path.includes('/admin/'));
        if (order.userId !== req.user.id && !isAdmin) {
            return sendResponse(res, 403, null, 'Not authorized');
        }

        const payment = (order.payments || [])[0];
        const pkg = order.packages?.[0];
        const address = order.address || {};
        const description = `${pkg?.name || 'Blood Test'} (${order.clientRefId})`;

        const invoiceData = payment && payment.invoice ? {
            ...payment.invoice,
            billingName: order.user?.name || order.patient?.name || 'Customer',
            billingAddress: address.line1 || 'N/A',
            billingPhone: order.user?.phone || order.patient?.phone || 'N/A',
            description,
        } : {
            invoiceNumber: `INV-${order.clientRefId}`,
            invoiceDate: order.createdAt || new Date(),
            billingName: order.user?.name || order.patient?.name || 'Customer',
            billingAddress: address.line1 || 'N/A',
            billingPhone: order.user?.phone || order.patient?.phone || 'N/A',
            description,
            subtotal: Number(payment?.amount || pkg?.cost || 0),
            gstRate: 18,
            gstAmount: Math.round(Number(payment?.amount || pkg?.cost || 0) * 0.18 * 100) / 100,
            totalAmount: Number(payment?.amount || pkg?.cost || 0),
        };

        const pdfBuffer = await generateInvoicePDF(invoiceData);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename=Invoice_${order.clientRefId}.pdf`,
            'Content-Length': pdfBuffer.length,
        });

        return res.end(pdfBuffer);
    } catch (error) {
        logger.error('getLabOrderInvoice error:', error.message);
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
    cancelLabOrder,
    rescheduleLabOrder,
    adminCancelLabOrder,
    getLabOrderInvoice,
};
