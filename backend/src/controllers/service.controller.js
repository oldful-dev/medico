// ──────────────────────────────────────────────
//  Service Management Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse, sendPaginatedResponse, paginate } = require('../utils/helpers');
const { uploadFile, deleteFile } = require('../utils/storage.service');
const { syncDbServicesToUIConfig } = require('../utils/sduiSync');
const { createAuditLog } = require('../middleware/audit');
const { logger } = require('../config/logger');
const { getBenefitCodeForService } = require('../config/benefitMapping');

// GET /api/services
const getServices = async (req, res, next) => {
    try {
        const { isEnabled, search } = req.query;
        const where = {};
        if (isEnabled !== undefined) where.isEnabled = isEnabled === 'true';
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
            ];
        }

        const services = await prisma.service.findMany({
            where,
            orderBy: { sortOrder: 'asc' },
        });

        sendResponse(res, 200, services);
    } catch (error) {
        next(error);
    }
};

// GET /api/services/:id
const getServiceById = async (req, res, next) => {
    try {
        const service = await prisma.service.findUnique({
            where: { id: req.params.id },
        });
        if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
        sendResponse(res, 200, service);
    } catch (error) {
        next(error);
    }
};

// POST /api/services
const createService = async (req, res, next) => {
    try {
        const { name, slug, icon, tagline, description, pricingText, basePrice, route, sortOrder, isEnabled, serviceType, formFieldsJson, headline, subhead, checkoutGroup, isDynamic, category, categoryId, paymentMode } = req.body;

        let parsedBasePrice = basePrice;
        if (parsedBasePrice === undefined && pricingText) {
            const match = pricingText.match(/[\d,]+/);
            if (match) {
                parsedBasePrice = parseInt(match[0].replace(/,/g, ''), 10);
            }
        }

        // A raw P2002 unique-constraint error just says "slug taken" with no
        // way to tell the admin WHY — often it's a service that was
        // "deleted" but actually got soft-disabled instead, because it had
        // active bookings (see deleteService below). Checking first lets us
        // say exactly what's blocking them instead of a Prisma stack trace.
        if (slug) {
            const conflict = await prisma.service.findUnique({
                where: { slug },
                select: { id: true, name: true, category: true, isEnabled: true },
            });
            if (conflict) {
                return sendResponse(
                    res, 409, null,
                    conflict.isEnabled
                        ? `Slug "${slug}" is already used by "${conflict.name}" (category: ${conflict.category}). Choose a different slug, or delete/rename that service first.`
                        : `Slug "${slug}" is already used by "${conflict.name}" (category: ${conflict.category}), which is disabled but still exists — likely because it had bookings and was soft-disabled instead of deleted. Force-delete it from its own page first, or choose a different slug.`
                );
            }
        }

        const service = await prisma.service.create({
            data: {
                name,
                slug,
                icon,
                tagline,
                description,
                pricingText,
                basePrice: parsedBasePrice !== undefined && parsedBasePrice !== null ? parseFloat(parsedBasePrice) : undefined,
                route,
                sortOrder: sortOrder !== undefined && sortOrder !== null ? parseInt(sortOrder, 10) : undefined,
                isEnabled: isEnabled !== undefined && isEnabled !== null ? (isEnabled === true || isEnabled === 'true') : undefined,
                serviceType,
                formFieldsJson,
                headline,
                subhead,
                checkoutGroup,
                isDynamic: isDynamic !== undefined && isDynamic !== null ? (isDynamic === true || isDynamic === 'true') : undefined,
                category,
                categoryId: categoryId || null,
                paymentMode: paymentMode || 'INQUIRY',
            },
        });

        // Sync with corresponding ServiceCharge serviceFee if basePrice was set
        if (service.basePrice !== undefined && service.basePrice !== null) {
            try {
                const serviceCategory = service.slug.toUpperCase().replace(/-/g, '_');
                await prisma.serviceCharge.upsert({
                    where: { serviceCategory },
                    update: { serviceFee: service.basePrice },
                    create: {
                        serviceCategory,
                        serviceFee: service.basePrice,
                        bookingFee: 299, // default fallback fees
                        platformFee: 50,
                        taxPercentage: 18,
                        isActive: true
                    }
                });
            } catch (syncErr) {
                console.error('Failed to sync ServiceCharge serviceFee during service creation:', syncErr);
            }
        }

        await syncDbServicesToUIConfig();

        sendResponse(res, 201, service, 'Service created successfully');
    } catch (error) {
        next(error);
    }
};

// PUT /api/services/:id
const updateService = async (req, res, next) => {
    try {
        const { changeReason } = req.body;
        const oldService = await prisma.service.findUnique({ where: { id: req.params.id } });

        const data = { ...req.body };
        delete data.changeReason;
        if (data.pricingText !== undefined && data.basePrice === undefined) {
            const match = data.pricingText.match(/[\d,]+/);
            if (match) {
                data.basePrice = parseInt(match[0].replace(/,/g, ''), 10);
            } else {
                data.basePrice = null;
            }
        }

        if (data.basePrice !== undefined && data.basePrice !== null) {
            data.basePrice = parseFloat(data.basePrice);
        }
        if (data.sortOrder !== undefined && data.sortOrder !== null) {
            data.sortOrder = parseInt(data.sortOrder, 10);
        }
        if (data.isEnabled !== undefined && data.isEnabled !== null) {
            data.isEnabled = data.isEnabled === true || data.isEnabled === 'true';
        }
        if (data.isDynamic !== undefined && data.isDynamic !== null) {
            data.isDynamic = data.isDynamic === true || data.isDynamic === 'true';
        }

        // Slug is hardcoded into the compiled mobile app for a Core
        // (isDynamic: false) service — native screens call
        // useServiceInitialization('this-exact-slug'), so an admin-side
        // rename can't be reflected there without a new app release.
        // Enforced server-side, not just disabled in the admin UI, since
        // this is the exact bug class (mismatched hardcoded slug ->
        // "Service initialization incomplete") this session spent hours
        // tracing and fixing across a dozen screens.
        if (data.slug && oldService && !oldService.isDynamic && data.slug !== oldService.slug) {
            return sendResponse(
                res, 409, null,
                `"${oldService.name}" is a Core (hardcoded) service — its slug ("${oldService.slug}") is baked into the mobile app's native screen and cannot be changed here without shipping a new app release. If you need a different slug, that screen's code must be updated to match first.`
            );
        }

        // Same friendly pre-check as createService — see the comment there.
        if (data.slug && data.slug !== oldService?.slug) {
            const conflict = await prisma.service.findUnique({
                where: { slug: data.slug },
                select: { id: true, name: true, category: true, isEnabled: true },
            });
            if (conflict && conflict.id !== req.params.id) {
                return sendResponse(
                    res, 409, null,
                    conflict.isEnabled
                        ? `Slug "${data.slug}" is already used by "${conflict.name}" (category: ${conflict.category}). Choose a different slug, or delete/rename that service first.`
                        : `Slug "${data.slug}" is already used by "${conflict.name}" (category: ${conflict.category}), which is disabled but still exists — likely because it had bookings and was soft-disabled instead of deleted. Force-delete it from its own page first, or choose a different slug.`
                );
            }
        }

        const service = await prisma.service.update({
            where: { id: req.params.id },
            data,
        });

        // Audit the price change itself — separate from the generic
        // auditMiddleware attached at the route, which never populates
        // oldValue/newValue (see middleware/audit.js).
        if (oldService && oldService.basePrice !== service.basePrice) {
            await createAuditLog({
                adminId: req.user?.id,
                action: 'SERVICE_PRICE_UPDATED',
                entity: 'Service',
                entityId: service.id,
                oldValue: { basePrice: oldService.basePrice },
                newValue: { basePrice: service.basePrice, ...(changeReason && { reason: changeReason }) },
                ipAddress: req.ip,
            });
        }

        // Sync with corresponding ServiceCharge serviceFee if basePrice was updated
        if (service.basePrice !== undefined && service.basePrice !== null) {
            try {
                const serviceCategory = service.slug.toUpperCase().replace(/-/g, '_');
                const oldCharge = await prisma.serviceCharge.findUnique({ where: { serviceCategory } });
                await prisma.serviceCharge.upsert({
                    where: { serviceCategory },
                    update: { serviceFee: service.basePrice },
                    create: {
                        serviceCategory,
                        serviceFee: service.basePrice,
                        bookingFee: 299, // default fallback fees
                        platformFee: 50,
                        taxPercentage: 18,
                        isActive: true
                    }
                });
                if (!oldCharge || oldCharge.serviceFee !== service.basePrice) {
                    // This is a system cascade, not a direct admin edit of ServiceCharge —
                    // tagged distinctly so it reads as "caused by the Service edit above"
                    // rather than an independent fee change.
                    await createAuditLog({
                        adminId: req.user?.id,
                        action: 'PRICE_SYNC',
                        entity: 'ServiceCharge',
                        entityId: oldCharge?.id || null,
                        oldValue: { serviceFee: oldCharge?.serviceFee ?? null },
                        newValue: { serviceFee: service.basePrice, syncedFrom: `Service:${service.id}` },
                        ipAddress: req.ip,
                    });
                }
            } catch (syncErr) {
                console.error('Failed to sync ServiceCharge serviceFee during service update:', syncErr);
            }
        }

        await syncDbServicesToUIConfig();
        sendResponse(res, 200, service, 'Service updated successfully');
    } catch (error) {
        next(error);
    }
};

// PUT /api/services/:id/toggle
const toggleService = async (req, res, next) => {
    try {
        const service = await prisma.service.findUnique({ where: { id: req.params.id } });
        const updated = await prisma.service.update({
            where: { id: req.params.id },
            data: { isEnabled: !service.isEnabled },
        });
        await syncDbServicesToUIConfig();
        sendResponse(res, 200, updated, `Service ${updated.isEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
        next(error);
    }
};

// PUT /api/services/reorder
const reorderServices = async (req, res, next) => {
    try {
        const { orderedIds } = req.body; // array of service IDs in desired order
        const updates = orderedIds.map((id, index) =>
            prisma.service.update({ where: { id }, data: { sortOrder: index + 1 } })
        );
        await prisma.$transaction(updates);
        sendResponse(res, 200, null, 'Services reordered');
    } catch (error) {
        next(error);
    }
};

// POST /api/services/:id/hero-image
const uploadHeroImage = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Image required' });
        const { url } = await uploadFile(req.file.buffer, 'service-images', req.file.originalname);
        const service = await prisma.service.update({
            where: { id: req.params.id },
            data: { heroImageUrl: url },
        });
        sendResponse(res, 200, service, 'Hero image uploaded');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/services/:id
const deleteService = async (req, res, next) => {
    try {
        const id = req.params.id;
        const force = req.query.force === 'true';
        const bookingsCount = await prisma.booking.count({ where: { serviceId: id } });

        // Core (isDynamic: false) services are backed by a hardcoded native
        // mobile screen that calls useServiceInitialization('this-exact-slug')
        // — that literal lives in the compiled app regardless of what happens
        // here, so deleting the row doesn't remove the dependency, it just
        // breaks it. If this ever needs to be recreated, it MUST reuse the
        // same slug or the mobile screen stays broken — surfaced explicitly
        // here (checked before the booking/benefit warnings) since the slug
        // itself is the one piece of information a hard delete truly loses.
        if (!force) {
            const coreCheck = await prisma.service.findUnique({ where: { id }, select: { slug: true, name: true, isDynamic: true, route: true } });
            if (coreCheck && !coreCheck.isDynamic) {
                return res.status(200).json({
                    success: false,
                    isWarning: true,
                    message: `"${coreCheck.name}" is a Core (hardcoded) service — its mobile screen${coreCheck.route ? ` (route: ${coreCheck.route})` : ''} has slug "${coreCheck.slug}" baked into its code and will keep looking for a service with that exact slug even after this row is deleted. If you recreate this service later, you MUST use slug "${coreCheck.slug}" again, or that screen will show "Service initialization incomplete" for every user. Force delete anyway?`,
                });
            }
        }

        if (bookingsCount > 0 && !force) {
            const updated = await prisma.service.update({
                where: { id },
                data: { isEnabled: false },
            });
            await syncDbServicesToUIConfig();
            return res.status(200).json({
                success: false,
                isWarning: true,
                message: `This service has ${bookingsCount} active bookings. Deleting it directly will break customer booking histories. We have disabled it instead. Would you like to force delete the service along with all its booking history?`,
                data: updated
            });
        }

        // Deleting a service has no FK link to PlanBenefit — that table only
        // stores a free-text benefitCode matched against the service's slug
        // at runtime (benefitMapping.js). Nothing in the schema would stop
        // this delete from silently orphaning a plan's quota promise (e.g.
        // "Tech Support 2/mo" staying listed on the Home Essentials plan
        // with no working screen left to redeem it on) — warn the same way
        // the booking-count check above does, before force is required.
        if (!force) {
            const serviceForSlug = await prisma.service.findUnique({ where: { id }, select: { slug: true, name: true } });
            const benefitCode = serviceForSlug ? getBenefitCodeForService(serviceForSlug.slug) : null;
            if (benefitCode) {
                const linkedBenefits = await prisma.planBenefit.findMany({
                    where: { benefitCode },
                    include: { plan: { select: { id: true, name: true, isVisible: true } } },
                });
                if (linkedBenefits.length > 0) {
                    const planIds = [...new Set(linkedBenefits.map(b => b.plan.id))];
                    const planNames = [...new Set(linkedBenefits.map(b => b.plan.name))].join(', ');
                    // Real, currently-paying impact — not just "a plan config
                    // exists somewhere" — so admin knows whether this affects
                    // 0 customers or 400 of them before deciding.
                    const activeSubscriberCount = await prisma.subscription.count({
                        where: { planId: { in: planIds }, status: 'ACTIVE', expiryDate: { gte: new Date() } },
                    });
                    return res.status(200).json({
                        success: false,
                        isWarning: true,
                        message: `Service "${serviceForSlug.name}" (slug: "${serviceForSlug.slug}") is promised as a benefit (${benefitCode}) on: ${planNames} — currently held by ${activeSubscriberCount} active subscriber${activeSubscriberCount === 1 ? '' : 's'}. Deleting it will leave that plan benefit pointing at nothing: subscribers will still see the quota on their plan but have no working screen to redeem it on. Force delete anyway?`,
                    });
                }
            }
        }

        // Only the real-delete path below purges the image — the
        // soft-disable path above keeps the service (and its icon) alive.
        const service = await prisma.service.findUnique({ where: { id }, select: { icon: true, heroImageUrl: true } });

        if (bookingsCount > 0 && force) {
            await prisma.booking.deleteMany({ where: { serviceId: id } });
        }

        await prisma.service.delete({ where: { id } });
        // Sync first — this removes the deleted service's icon reference
        // from UIConfig (confirmed: syncDbServicesToUIConfig drops items
        // whose backing Service row is gone) — then it's safe to purge the
        // actual file, since nothing else should still be pointing at it.
        await syncDbServicesToUIConfig();

        const urlsToPurge = [service?.icon, service?.heroImageUrl].filter(Boolean);
        await Promise.all(
            urlsToPurge.map(url =>
                deleteFile(url).catch(err =>
                    logger.warn(`[Service] Failed to purge image for deleted service ${id}:`, err.message)
                )
            )
        );

        res.status(200).json({
            success: true,
            message: 'Service deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getServices, getServiceById, createService, updateService,
    toggleService, reorderServices, uploadHeroImage, deleteService,
};
