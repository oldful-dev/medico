/**
 * Backfill Script: Unified Pricing Console (Slice 1)
 *
 * Classifies every ServiceCharge row by scope (SERVICE / CATEGORY / SERVICE_TYPE)
 * using the exact same slug/name match predicate the existing sync already uses
 * (see serviceCharge.controller.js write-back block), then projects
 * Service.basePrice/pricingText onto SERVICE-scope rows for the merged admin view.
 *
 * This script is READ + WRITE only to the new ServiceCharge columns
 * (basePrice, pricingText, scope, serviceId). It never touches Service,
 * never touches the existing fee columns, and never deletes anything.
 * calculateCheckout's read path is unaffected — nothing it reads changes shape.
 *
 * A row is flagged CONFLICT (logged only, not written) when both
 * ServiceCharge.serviceFee and the matched Service.basePrice are > 0 and
 * differ — those need manual resolution in a later slice, not an
 * automatic pick, because Service.basePrice is a live underpayment floor
 * (booking.controller.js / payment.controller.js), not just display data.
 *
 * Usage:
 *   node scripts/backfill-pricing-console.js           (dry run — shows what would change)
 *   node scripts/backfill-pricing-console.js --execute  (actually updates the database)
 *
 * ⚠️  Requires the additive schema migration (basePrice/pricingText/scope/serviceId
 *     on ServiceCharge) to already be applied before running.
 */

require('dotenv').config();
const prisma = require('../src/config/database');
const { logger } = require('../src/config/logger');

const EXECUTE = process.argv.includes('--execute');

const SERVICE_TYPES = [
    'DOCTOR_HOME_VISIT', 'HOSPITAL_TRIP', 'HOME_NURSE', 'INSURANCE', 'BLOOD_TEST',
    'MEDICINES', 'PHYSIO_FITNESS', 'EQUIPMENT_RENTAL', 'HOME_ESSENTIALS',
    'CLUB_EVENTS', 'TIFFIN', 'TECH_HELPER', 'PAPERWORK_LEGAL', 'OTHER',
];

async function run() {
    const charges = await prisma.serviceCharge.findMany();
    const services = await prisma.service.findMany({
        select: { id: true, name: true, slug: true, category: true, serviceType: true, basePrice: true, pricingText: true },
    });

    const summary = { service: 0, category: 0, serviceType: 0, unmatched: 0, conflicts: [] };

    for (const charge of charges) {
        // Exact same predicate as serviceCharge.controller.js's existing write-back:
        // slug derived from serviceCategory, OR case-insensitive name match.
        const slugCandidate = charge.serviceCategory.toLowerCase().replace(/_/g, '-');
        const matchedService = services.find(
            s => s.slug === slugCandidate || s.name.toLowerCase() === charge.serviceCategory.toLowerCase()
        );

        let scope, serviceId = null, basePrice = null, pricingText = null;

        // Any row — SERVICE, CATEGORY, or SERVICE_TYPE scoped — can still resolve to
        // exactly one real service in practice (e.g. a serviceType shared by only one
        // service today). That single-service case must still get a conflict check;
        // otherwise a real drift (like DOCTOR_HOME_VISIT: serviceFee=2499 vs
        // doctor-visit.basePrice=799) silently hides behind a "shared default" label
        // with no warning anywhere.
        let coveredServices = [];
        if (matchedService) {
            scope = 'SERVICE';
            serviceId = matchedService.id;
            summary.service++;
            coveredServices = [matchedService];
        } else if (services.some(s => s.category === charge.serviceCategory)) {
            scope = 'CATEGORY';
            summary.category++;
            coveredServices = services.filter(s => s.category === charge.serviceCategory);
        } else if (SERVICE_TYPES.includes(charge.serviceCategory)) {
            scope = 'SERVICE_TYPE';
            summary.serviceType++;
            coveredServices = services.filter(s => s.serviceType === charge.serviceCategory);
            if (coveredServices.length === 0) {
                summary.unmatched++;
                logger.warn(`[PricingBackfill] ${charge.serviceCategory} is a valid ServiceType but no service currently uses it — orphan default.`);
            }
        } else {
            scope = 'SERVICE_TYPE'; // unmatched — flagged separately for admin review
            summary.unmatched++;
            logger.warn(`[PricingBackfill] Orphan ServiceCharge row matches no service/category/type: ${charge.serviceCategory}`);
        }

        if (coveredServices.length === 1) {
            // Resolves to exactly one real service regardless of nominal scope —
            // safe to project basePrice/pricingText and check for conflict.
            const only = coveredServices[0];
            if (scope !== 'SERVICE') {
                serviceId = only.id; // record which single service this shared-looking row actually maps to today
            }
            basePrice = only.basePrice;
            pricingText = only.pricingText;

            const chargeFee = Number(charge.serviceFee) || 0;
            const svcBase = Number(only.basePrice) || 0;
            if (chargeFee > 0 && svcBase > 0 && chargeFee !== svcBase) {
                // Genuine disagreement — do not auto-resolve. Service.basePrice stays
                // untouched (it's the live underpayment floor); this only flags it.
                summary.conflicts.push({
                    serviceCategory: charge.serviceCategory,
                    scope,
                    service: only.name,
                    serviceFee: chargeFee,
                    basePrice: svcBase,
                });
            }
        }

        logger.info(
            `[PricingBackfill] ${EXECUTE ? 'Writing' : 'Would write'} ${charge.serviceCategory} → scope=${scope}` +
            (serviceId ? ` serviceId=${serviceId} basePrice=${basePrice} pricingText=${JSON.stringify(pricingText)}` : '')
        );

        if (EXECUTE) {
            await prisma.serviceCharge.update({
                where: { id: charge.id },
                data: { scope, serviceId, basePrice, pricingText },
            });
        }
    }

    logger.info('[PricingBackfill] ── Summary ──');
    logger.info(`[PricingBackfill] SERVICE scope: ${summary.service}`);
    logger.info(`[PricingBackfill] CATEGORY scope: ${summary.category}`);
    logger.info(`[PricingBackfill] SERVICE_TYPE scope: ${summary.serviceType}`);
    logger.info(`[PricingBackfill] Unmatched (needs admin review): ${summary.unmatched}`);
    logger.info(`[PricingBackfill] Conflicts (serviceFee vs basePrice disagree): ${summary.conflicts.length}`);
    summary.conflicts.forEach(c =>
        logger.info(`[PricingBackfill]   - ${c.serviceCategory} (${c.service}): serviceFee=₹${c.serviceFee} vs basePrice=₹${c.basePrice}`)
    );

    if (!EXECUTE) {
        logger.info('[PricingBackfill] Dry run complete. Re-run with --execute to apply.');
    } else {
        logger.info('[PricingBackfill] Backfill complete.');
    }
}

run()
    .catch(err => {
        logger.error('[PricingBackfill] Failed:', err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
