// ──────────────────────────────────────────────
//  AYUXA Service Charge Management Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/audit');

const FEE_FIELDS = ['serviceFee', 'bookingFee', 'platformFee', 'convenienceFee', 'emergencyFee', 'visitFee', 'nightCharge', 'surgeCharge', 'taxPercentage'];

// Pricing is category-level only — the 4 real Service.category values.
// Per-service override rows (scope: SERVICE, keyed by slug) used to be
// creatable too, which is how a flat dropdown mixing 4 categories with
// every enabled service's slug ended up showing "all services" with no
// scoping. calculateCheckout already falls back category -> serviceType
// (see checkout.controller.js), so a category-level row is enough to price
// every service in it; a specific service can still get its own basePrice
// on its own admin page (Home Essentials / Diagnostic & Fitness / etc.)
// without needing a separate ServiceCharge row.
const VALID_CATEGORIES = ['CARE', 'DIAGNOSTICS_FITNESS', 'HOME_ESSENTIALS', 'TOURS_TRAVEL'];

// GET /api/admin/service-charges
const getServiceCharges = async (req, res, next) => {
    try {
        const charges = await prisma.serviceCharge.findMany({
            orderBy: { serviceCategory: 'asc' },
        });

        // ── Unified Pricing Console (read-only, Slice 1) ──
        // Enrich each row with the live matched Service (for SERVICE-scope rows)
        // and the services covered (for CATEGORY/SERVICE_TYPE-scope rows), plus a
        // computed conflict flag. Purely additive — no write, no change to the
        // raw fee fields calculateCheckout reads.
        const serviceIds = charges.filter(c => c.serviceId).map(c => c.serviceId);
        const matchedServices = serviceIds.length
            ? await prisma.service.findMany({
                where: { id: { in: serviceIds } },
                select: { id: true, name: true, slug: true, category: true, serviceType: true, basePrice: true, pricingText: true, formFieldsJson: true },
            })
            : [];
        const serviceById = new Map(matchedServices.map(s => [s.id, s]));

        const allServices = await prisma.service.findMany({
            select: { id: true, name: true, slug: true, category: true, serviceType: true, basePrice: true, pricingText: true },
        });

        const enriched = charges.map(charge => {
            const scope = charge.scope || 'SERVICE';
            let matchedService = null;
            let coveredFull = [];

            if (scope === 'SERVICE' && charge.serviceId) {
                matchedService = serviceById.get(charge.serviceId) || null;
            } else if (scope === 'CATEGORY') {
                coveredFull = allServices.filter(s => s.category === charge.serviceCategory);
            } else if (scope === 'SERVICE_TYPE') {
                coveredFull = allServices.filter(s => s.serviceType === charge.serviceCategory);
            }
            const coveredServices = coveredFull.map(s => ({ id: s.id, name: s.name, slug: s.slug }));

            // A CATEGORY/SERVICE_TYPE row can still resolve to exactly one real
            // service today (e.g. a ServiceType only one live service uses) — that
            // case is a genuine 1:1 price relationship wearing a "shared default"
            // label, and must still be conflict-checked, not skipped just because
            // its nominal scope isn't SERVICE.
            const effectiveService = matchedService || (coveredFull.length === 1 ? coveredFull[0] : null);

            const chargeFee = Number(charge.serviceFee) || 0;
            const liveBasePrice = effectiveService ? (Number(effectiveService.basePrice) || 0) : (Number(charge.basePrice) || 0);
            const hasConflict = chargeFee > 0 && liveBasePrice > 0 && chargeFee !== liveBasePrice;

            return {
                ...charge,
                matchedService,
                coveredServices,
                hasConflict,
            };
        });

        sendResponse(res, 200, enriched);
    } catch (error) {
        next(error);
    }
};

// GET /api/admin/service-charges/:id
const getServiceChargeById = async (req, res, next) => {
    try {
        const charge = await prisma.serviceCharge.findUnique({
            where: { id: req.params.id },
        });
        if (!charge) return res.status(404).json({ success: false, message: 'Service charge configuration not found' });
        sendResponse(res, 200, charge);
    } catch (error) {
        next(error);
    }
};

// POST /api/admin/service-charges
const createServiceCharge = async (req, res, next) => {
    try {
        const {
            serviceCategory,
            serviceFee,
            bookingFee,
            platformFee,
            convenienceFee,
            emergencyFee,
            visitFee,
            nightCharge,
            surgeCharge,
            taxPercentage,
            isSubscriptionEligible,
            isActive,
            isRequestBased,
            onlineServiceFee,
            offlineServiceFee
        } = req.body;

        if (!VALID_CATEGORIES.includes(serviceCategory)) {
            return res.status(400).json({ success: false, message: `Invalid category "${serviceCategory}". Must be one of: ${VALID_CATEGORIES.join(', ')}.` });
        }

        const existing = await prisma.serviceCharge.findUnique({
            where: { serviceCategory }
        });
        if (existing) {
            return res.status(400).json({ success: false, message: `Configuration for ${serviceCategory} already exists.` });
        }

        const charge = await prisma.serviceCharge.create({
            data: {
                scope: 'CATEGORY',
                serviceCategory,
                serviceFee: isRequestBased ? 0 : parseFloat(serviceFee || 0),
                bookingFee: parseFloat(bookingFee || 0),
                platformFee: parseFloat(platformFee || 0),
                convenienceFee: parseFloat(convenienceFee || 0),
                emergencyFee: parseFloat(emergencyFee || 0),
                visitFee: parseFloat(visitFee || 0),
                nightCharge: parseFloat(nightCharge || 0),
                surgeCharge: parseFloat(surgeCharge || 0),
                taxPercentage: parseFloat(taxPercentage || 0),
                isSubscriptionEligible: isSubscriptionEligible !== undefined ? isSubscriptionEligible : true,
                isActive: isActive !== undefined ? isActive : true,
                isRequestBased: !!isRequestBased,
                onlineServiceFee: onlineServiceFee !== undefined && onlineServiceFee !== '' ? parseFloat(onlineServiceFee) : null,
                offlineServiceFee: offlineServiceFee !== undefined && offlineServiceFee !== '' ? parseFloat(offlineServiceFee) : null,
            },
        });

        sendResponse(res, 201, charge, 'Service charge configuration created successfully');
    } catch (error) {
        next(error);
    }
};

// PUT /api/admin/service-charges/:id
const updateServiceCharge = async (req, res, next) => {
    try {
        const {
            serviceFee,
            bookingFee,
            platformFee,
            convenienceFee,
            emergencyFee,
            visitFee,
            nightCharge,
            surgeCharge,
            taxPercentage,
            isSubscriptionEligible,
            isActive,
            isRequestBased,
            onlineServiceFee,
            offlineServiceFee,
            changeReason
        } = req.body;

        const existing = await prisma.serviceCharge.findUnique({
            where: { id: req.params.id }
        });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Service charge configuration not found' });
        }

        const data = {};
        if (isRequestBased !== undefined) {
            data.isRequestBased = !!isRequestBased;
            data.serviceFee = isRequestBased ? 0 : parseFloat(serviceFee ?? existing.serviceFee) || 0;
        } else if (serviceFee !== undefined) {
            data.serviceFee = parseFloat(serviceFee) || 0;
        }
        if (bookingFee !== undefined) data.bookingFee = parseFloat(bookingFee) || 0;
        if (platformFee !== undefined) data.platformFee = parseFloat(platformFee) || 0;
        if (convenienceFee !== undefined) data.convenienceFee = parseFloat(convenienceFee) || 0;
        if (emergencyFee !== undefined) data.emergencyFee = parseFloat(emergencyFee) || 0;
        if (visitFee !== undefined) data.visitFee = parseFloat(visitFee) || 0;
        if (nightCharge !== undefined) data.nightCharge = parseFloat(nightCharge) || 0;
        if (surgeCharge !== undefined) data.surgeCharge = parseFloat(surgeCharge) || 0;
        if (taxPercentage !== undefined) data.taxPercentage = parseFloat(taxPercentage) || 0;
        if (isSubscriptionEligible !== undefined) data.isSubscriptionEligible = isSubscriptionEligible;
        if (onlineServiceFee !== undefined) data.onlineServiceFee = onlineServiceFee === '' || onlineServiceFee === null ? null : parseFloat(onlineServiceFee);
        if (offlineServiceFee !== undefined) data.offlineServiceFee = offlineServiceFee === '' || offlineServiceFee === null ? null : parseFloat(offlineServiceFee);
        if (isActive !== undefined) data.isActive = isActive;

        const charge = await prisma.serviceCharge.update({
            where: { id: req.params.id },
            data,
        });

        const changedFields = FEE_FIELDS.filter(f => existing[f] !== charge[f]);
        if (changedFields.length > 0) {
            const oldValue = {}, newValue = {};
            for (const f of changedFields) { oldValue[f] = existing[f]; newValue[f] = charge[f]; }
            if (changeReason) newValue.reason = changeReason;
            await createAuditLog({
                adminId: req.user?.id,
                action: 'SERVICE_CHARGE_UPDATED',
                entity: 'ServiceCharge',
                entityId: charge.id,
                oldValue,
                newValue,
                ipAddress: req.ip,
            });
        }

        sendResponse(res, 200, charge, 'Service charge configuration updated successfully');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/admin/service-charges/:id
const deleteServiceCharge = async (req, res, next) => {
    try {
        await prisma.serviceCharge.delete({
            where: { id: req.params.id }
        });
        sendResponse(res, 200, null, 'Service charge configuration deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getServiceCharges,
    getServiceChargeById,
    createServiceCharge,
    updateServiceCharge,
    deleteServiceCharge,
};
