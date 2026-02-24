// ──────────────────────────────────────────────
//  Caregiver Management Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate } = require('../utils/helpers');
const { uploadToCloudinary } = require('../utils/fileUpload');

// GET /api/caregivers
const getCaregivers = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req.query);
        const { cityId, isAvailable, policeVerification, shiftType, search } = req.query;

        const where = {};
        if (req.cityFilter) where.cityId = req.cityFilter;
        if (cityId) where.cityId = cityId;
        if (isAvailable !== undefined) where.isAvailable = isAvailable === 'true';
        if (policeVerification) where.policeVerification = policeVerification;
        if (shiftType) where.shiftType = shiftType;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { specialization: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [caregivers, total] = await Promise.all([
            prisma.caregiver.findMany({
                where,
                skip,
                take: limit,
                include: {
                    city: { select: { name: true } },
                    _count: { select: { bookings: true } },
                },
                orderBy: { performanceRating: 'desc' },
            }),
            prisma.caregiver.count({ where }),
        ]);

        sendPaginatedResponse(res, caregivers, total, page, limit);
    } catch (error) {
        next(error);
    }
};

// GET /api/caregivers/:id
const getCaregiverById = async (req, res, next) => {
    try {
        const caregiver = await prisma.caregiver.findUnique({
            where: { id: req.params.id },
            include: {
                city: true,
                bookings: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: { select: { name: true } },
                        service: { select: { name: true } },
                    },
                },
                _count: { select: { bookings: true, sosAlerts: true } },
            },
        });
        if (!caregiver) return res.status(404).json({ success: false, message: 'Caregiver not found' });
        sendResponse(res, 200, caregiver);
    } catch (error) {
        next(error);
    }
};

// POST /api/caregivers
const createCaregiver = async (req, res, next) => {
    try {
        const {
            name, phone, email, specialization, qualification, cityId,
            shiftType, salary, payoutNotes,
        } = req.body;

        const caregiver = await prisma.caregiver.create({
            data: { name, phone, email, specialization, qualification, cityId, shiftType, salary, payoutNotes },
        });

        sendResponse(res, 201, caregiver, 'Caregiver created successfully');
    } catch (error) {
        next(error);
    }
};

// PUT /api/caregivers/:id
const updateCaregiver = async (req, res, next) => {
    try {
        const caregiver = await prisma.caregiver.update({
            where: { id: req.params.id },
            data: req.body,
        });
        sendResponse(res, 200, caregiver, 'Caregiver updated');
    } catch (error) {
        next(error);
    }
};

// PUT /api/caregivers/:id/verification
const updateVerification = async (req, res, next) => {
    try {
        const { policeVerification } = req.body;
        const caregiver = await prisma.caregiver.update({
            where: { id: req.params.id },
            data: { policeVerification },
        });
        sendResponse(res, 200, caregiver, 'Verification updated');
    } catch (error) {
        next(error);
    }
};

// PUT /api/caregivers/:id/availability
const toggleAvailability = async (req, res, next) => {
    try {
        const caregiver = await prisma.caregiver.findUnique({ where: { id: req.params.id } });
        const updated = await prisma.caregiver.update({
            where: { id: req.params.id },
            data: { isAvailable: !caregiver.isAvailable },
        });
        sendResponse(res, 200, updated, `Caregiver ${updated.isAvailable ? 'available' : 'unavailable'}`);
    } catch (error) {
        next(error);
    }
};

// POST /api/caregivers/:id/documents  (upload documents)
const uploadDocuments = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'Files required' });
        }

        const uploads = await Promise.all(
            req.files.map(async (file) => {
                const { url } = await uploadToCloudinary(file.buffer, 'caregiver-docs');
                return { name: file.originalname, url, type: file.mimetype };
            })
        );

        const caregiver = await prisma.caregiver.findUnique({ where: { id: req.params.id } });
        const existingDocs = (caregiver.documentsJson || []);
        const allDocs = [...existingDocs, ...uploads];

        const updated = await prisma.caregiver.update({
            where: { id: req.params.id },
            data: { documentsJson: allDocs },
        });

        sendResponse(res, 200, updated, 'Documents uploaded');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/caregivers/:id
const deleteCaregiver = async (req, res, next) => {
    try {
        await prisma.caregiver.delete({ where: { id: req.params.id } });
        sendResponse(res, 200, null, 'Caregiver deleted');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCaregivers, getCaregiverById, createCaregiver, updateCaregiver,
    updateVerification, toggleAvailability, uploadDocuments, deleteCaregiver,
};
