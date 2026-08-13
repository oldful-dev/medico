// ──────────────────────────────────────────────
//  Assignment Eligibility Guard
//
//  Operational assignment (booking caregiver, SOS responder) may only
//  target real Caregiver records — never Admin/management accounts
//  (Shareholder, CEO, etc). Caregivers are inherently operational by
//  table design (a model separate from Admin), so existence is the
//  eligibility bar: an id that doesn't resolve to a Caregiver row is
//  rejected outright, closing the gap where any raw id (including an
//  Admin id) could previously be written straight onto a booking/SOS
//  alert with zero validation.
// ──────────────────────────────────────────────

const prisma = require('../config/database');

async function assertCaregiverIsAssignable(caregiverId) {
    if (!caregiverId) {
        const err = new Error('caregiverId is required');
        err.statusCode = 400;
        throw err;
    }

    const caregiver = await prisma.caregiver.findUnique({
        where: { id: caregiverId },
        select: { id: true, name: true, phone: true, isAvailable: true },
    });

    if (!caregiver) {
        const err = new Error('Assignment rejected: selected staff member is not a valid operational profile. Management/Admin accounts cannot be assigned.');
        err.statusCode = 400;
        throw err;
    }

    return caregiver;
}

module.exports = { assertCaregiverIsAssignable };
