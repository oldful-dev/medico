const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const redcliffeService = require('../services/redcliffe.service');
const { v4: uuidv4 } = require('uuid');

/**
 * Creates the local pending record and hits Redcliffe to reserve a 30-min slot.
 * Endpoint: POST /api/v1/labs/bookings/hold
 */
exports.holdBooking = async (req, res) => {
    try {
        const { bookingType, patient, additionalMembers, address, packages, slot } = req.body;
        const userId = req.user.id;

        // 1. Generate idempotency key
        const clientRefId = `LAB-${uuidv4().substring(0, 8).toUpperCase()}`;

        // 2. Draft db payload
        const newOrderData = {
            userId,
            clientRefId,
            bookingType: bookingType === 'DROP_OFF' ? 'DROP_OFF' : 'HOME',
            status: 'PENDING',
            patient,
            additionalMembers: additionalMembers || [],
            address: address || {},
            packages,
            slot,
            // Calculate a temporary expiration just in case Redcliffe fails.
            holdExpiresAt: new Date(Date.now() + 30 * 60 * 1000) 
        };

        // 3. Create local order record BEFORE calling Redcliffe
        const labOrder = await prisma.labOrder.create({ data: newOrderData });

        // 4. Hit Redcliffe API Hold
        try {
            const rcResponse = await redcliffeService.holdBooking(labOrder, labOrder.bookingType);
            
            // 5. Update local record with redcliffe id and move to HOLD_CREATED
            const updatedOrder = await prisma.labOrder.update({
                where: { id: labOrder.id },
                data: {
                    redcliffeBookingId: String(rcResponse.booking_id || rcResponse.pk),
                    status: 'HOLD_CREATED'
                }
            });

            return res.status(201).json({
                success: true,
                message: 'Slot successfully reserved for 30 minutes.',
                order: updatedOrder
            });

        } catch (apiError) {
            // Revert or mark failed if external API fails
            await prisma.labOrder.update({
                where: { id: labOrder.id },
                data: { status: 'FAILED' }
            });
            throw new Error(`Redcliffe Hold Failed: ${apiError.message}`);
        }

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Server Error'
        });
    }
};
