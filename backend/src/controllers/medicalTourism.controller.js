// ──────────────────────────────────────────────
//  Medical Tourism Enquiry Tracking
//
//  Enquiries are ordinary Bookings against the "medical-tourism" Service —
//  the same paid-consultation flow every other service uses (payment,
//  formDataJson holding the patient/medical/travel-support fields). This
//  controller only manages the EXTRA tracking Medical Tourism needs beyond
//  a generic Booking (see MedicalTourismEnquiry in schema.prisma): a status
//  pipeline distinct from BookingStatus, coordinator assignment, internal
//  notes, and a follow-up date — created lazily on first admin action so a
//  brand-new enquiry doesn't need special-cased creation at booking time.
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate } = require('../utils/helpers');
const { refreshSignedUrl } = require('../utils/storage.service');

// GET /api/admin/medical-tourism/enquiries
const getEnquiries = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { status, search } = req.query;

        const where = { service: { slug: 'medical-tourism' } };
        if (search) {
            where.OR = [
                { bookingCode: { contains: search, mode: 'insensitive' } },
                { user: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }
        if (status) {
            where.medicalTourismEnquiry = { status };
        }

        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: { select: { id: true, name: true, phone: true, email: true } },
                    payments: { select: { status: true, amount: true, razorpayPaymentId: true, createdAt: true } },
                    medicalTourismEnquiry: {
                        include: { assignedCoordinator: { select: { id: true, name: true, email: true } } },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.booking.count({ where }),
        ]);

        sendPaginatedResponse(res, bookings, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/medical-tourism/enquiries/:id
const getEnquiryById = async (req, res, next) => {
    try {
        const booking = await prisma.booking.findFirst({
            where: { id: req.params.id, service: { slug: 'medical-tourism' } },
            include: {
                user: true,
                payments: true,
                medicalTourismEnquiry: {
                    include: { assignedCoordinator: { select: { id: true, name: true, email: true } } },
                },
            },
        });
        if (!booking) return res.status(404).json({ success: false, message: 'Enquiry not found' });
        sendResponse(res, 200, booking);
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/medical-tourism/enquiries/:id
// Body: { status?, assignedCoordinatorId?, internalNotes?, followUpDate? }
const updateEnquiry = async (req, res, next) => {
    try {
        const { status, assignedCoordinatorId, internalNotes, followUpDate } = req.body;

        const booking = await prisma.booking.findFirst({
            where: { id: req.params.id, service: { slug: 'medical-tourism' } },
        });
        if (!booking) return res.status(404).json({ success: false, message: 'Enquiry not found' });

        const enquiry = await prisma.medicalTourismEnquiry.upsert({
            where: { bookingId: booking.id },
            update: {
                ...(status !== undefined && { status }),
                ...(assignedCoordinatorId !== undefined && { assignedCoordinatorId: assignedCoordinatorId || null }),
                ...(internalNotes !== undefined && { internalNotes }),
                ...(followUpDate !== undefined && { followUpDate: followUpDate ? new Date(followUpDate) : null }),
            },
            create: {
                bookingId: booking.id,
                status: status || 'NEW',
                assignedCoordinatorId: assignedCoordinatorId || null,
                internalNotes: internalNotes || null,
                followUpDate: followUpDate ? new Date(followUpDate) : null,
            },
            include: { assignedCoordinator: { select: { id: true, name: true, email: true } } },
        });

        sendResponse(res, 200, enquiry, 'Enquiry updated');
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/medical-tourism/enquiries/:id/documents/:index/view-url
// Medical reports are uploaded to the "health-reports" private folder, whose
// signed URL expires in 30 minutes — the URL stored in formDataJson.medical_
// reports goes dead well before an admin gets around to reviewing it. Same
// fix as HealthReport's own view-url endpoint (user.controller.js): re-sign
// on demand instead of relying on the stale stored URL.
const getDocumentViewUrl = async (req, res, next) => {
    try {
        const booking = await prisma.booking.findFirst({
            where: { id: req.params.id, service: { slug: 'medical-tourism' } },
            select: { formDataJson: true },
        });
        if (!booking) return res.status(404).json({ success: false, message: 'Enquiry not found' });

        const reports = booking.formDataJson?.medical_reports;
        const index = parseInt(req.params.index, 10);
        if (!Array.isArray(reports) || !reports[index]) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        const freshUrl = await refreshSignedUrl(reports[index]);
        if (!freshUrl) return res.status(500).json({ success: false, message: 'Could not generate a view link' });

        sendResponse(res, 200, { url: freshUrl });
    } catch (error) {
        next(error);
    }
};

module.exports = { getEnquiries, getEnquiryById, updateEnquiry, getDocumentViewUrl };
