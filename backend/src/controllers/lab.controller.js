// ──────────────────────────────────────────────
//  Lab Controller  (Redcliffe Labs integration)
// ──────────────────────────────────────────────

const { sendResponse } = require('../utils/helpers');
const { bookLabTestSlot, getLabReport } = require('../utils/redcliffe.service');
const { logger } = require('../config/logger');

// Curated test catalogue — shown when REDCLIFFE_API_KEY is not yet configured
const FALLBACK_TESTS = [
    { id: 'CBC', name: 'Complete Blood Count (CBC)', price: 299, turnaround: '24 hours', requiresFasting: false },
    { id: 'SUGAR_FASTING', name: 'Blood Sugar Fasting', price: 149, turnaround: '12 hours', requiresFasting: true },
    { id: 'SUGAR_PP', name: 'Blood Sugar PP (Post-Prandial)', price: 149, turnaround: '12 hours', requiresFasting: false },
    { id: 'HBA1C', name: 'HbA1c (Glycated Haemoglobin)', price: 499, turnaround: '24 hours', requiresFasting: false },
    { id: 'LIPID', name: 'Lipid Profile', price: 499, turnaround: '24 hours', requiresFasting: true },
    { id: 'THYROID_T3T4TSH', name: 'Thyroid Profile (T3, T4, TSH)', price: 699, turnaround: '24 hours', requiresFasting: false },
    { id: 'URIC_ACID', name: 'Uric Acid', price: 249, turnaround: '12 hours', requiresFasting: false },
    { id: 'CREATININE', name: 'Creatinine (Kidney Function)', price: 299, turnaround: '24 hours', requiresFasting: false },
    { id: 'VITAMIN_D', name: 'Vitamin D (25-OH)', price: 999, turnaround: '48 hours', requiresFasting: false },
    { id: 'VITAMIN_B12', name: 'Vitamin B12', price: 799, turnaround: '48 hours', requiresFasting: false },
];

const FALLBACK_PACKAGES = [
    {
        id: 'PKG_FULL_BODY', name: 'Full Body Checkup', price: 1499,
        tests: ['CBC', 'SUGAR_FASTING', 'LIPID', 'THYROID_T3T4TSH', 'CREATININE', 'URIC_ACID'],
        turnaround: '48 hours', requiresFasting: true,
        description: 'Comprehensive health screening — ideal for annual checkups.',
    },
    {
        id: 'PKG_DIABETES', name: 'Diabetes Care Panel', price: 799,
        tests: ['SUGAR_FASTING', 'SUGAR_PP', 'HBA1C'],
        turnaround: '24 hours', requiresFasting: true,
        description: 'Monitor and manage blood sugar levels effectively.',
    },
    {
        id: 'PKG_CARDIAC', name: 'Heart Health Panel', price: 999,
        tests: ['LIPID', 'CBC', 'URIC_ACID'],
        turnaround: '24 hours', requiresFasting: true,
        description: 'Assess cardiovascular health risk factors.',
    },
    {
        id: 'PKG_THYROID', name: 'Thyroid Function Test', price: 699,
        tests: ['THYROID_T3T4TSH'],
        turnaround: '24 hours', requiresFasting: false,
        description: 'Complete thyroid function assessment.',
    },
    {
        id: 'PKG_SENIOR_WELLNESS', name: 'Senior Wellness Panel', price: 1999,
        tests: ['CBC', 'SUGAR_FASTING', 'HBA1C', 'LIPID', 'THYROID_T3T4TSH', 'CREATININE', 'VITAMIN_D', 'VITAMIN_B12'],
        turnaround: '48 hours', requiresFasting: true,
        description: 'Tailored for seniors — covers all critical health markers.',
    },
];

// GET /api/labs/tests
const getLabTests = async (req, res, next) => {
    try {
        return sendResponse(res, 200, FALLBACK_TESTS, 'Lab tests retrieved');
    } catch (error) {
        next(error);
    }
};

// GET /api/labs/packages
const getLabPackages = async (req, res, next) => {
    try {
        return sendResponse(res, 200, FALLBACK_PACKAGES, 'Lab packages retrieved');
    } catch (error) {
        next(error);
    }
};

// POST /api/labs/book
const bookLabTest = async (req, res, next) => {
    try {
        const { testIds, scheduledDate, addressLine } = req.body;

        if (!testIds || !Array.isArray(testIds) || testIds.length === 0) {
            return sendResponse(res, 400, null, 'testIds array is required');
        }
        if (!scheduledDate) {
            return sendResponse(res, 400, null, 'scheduledDate is required');
        }

        const result = await bookLabTestSlot({
            patientName: req.user.name,
            patientPhone: req.user.phone,
            testIds,
            scheduledDate,
            addressLine: addressLine || req.user.addresses?.[0]?.addressLine || '',
        });

        return sendResponse(res, 201, result, 'Lab test booked successfully');
    } catch (error) {
        logger.error('Lab booking error:', error.message);
        next(error);
    }
};

// GET /api/labs/booking/:id
const getLabBooking = async (req, res, next) => {
    try {
        const { id } = req.params;
        const report = await getLabReport(id);

        if (!report) {
            return sendResponse(res, 404, null, 'Lab booking report not found');
        }

        return sendResponse(res, 200, report, 'Lab booking retrieved');
    } catch (error) {
        next(error);
    }
};

module.exports = { getLabTests, getLabPackages, bookLabTest, getLabBooking };
