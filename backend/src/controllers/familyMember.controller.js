const prisma = require('../config/database');
const { sendResponse } = require('../utils/helpers');
const { logger } = require('../config/logger');

// GET /api/users/:userId/family-members
const getFamilyMembers = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const members = await prisma.familyMember.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        sendResponse(res, 200, members, 'Family members fetched successfully');
    } catch (error) {
        next(error);
    }
};

// POST /api/users/:userId/family-members
const addFamilyMember = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { name, relation, gender, dateOfBirth, bloodGroup, allergies, chronicConditions, emergencyNotes } = req.body;

        if (!name || !relation) {
            return sendResponse(res, 400, null, 'Name and relation are required');
        }

        const member = await prisma.familyMember.create({
            data: {
                userId,
                name: name.trim(),
                relation,
                gender: gender || null,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                bloodGroup: bloodGroup?.trim() || null,
                allergies: allergies?.trim() || null,
                chronicConditions: chronicConditions?.trim() || null,
                emergencyNotes: emergencyNotes?.trim() || null,
            },
        });

        logger.info(`Family member added for user ${userId}: ${member.id}`);
        sendResponse(res, 201, member, 'Family member added successfully');
    } catch (error) {
        next(error);
    }
};

// PUT /api/users/:userId/family-members/:memberId
const updateFamilyMember = async (req, res, next) => {
    try {
        const { userId, memberId } = req.params;
        const { name, relation, gender, dateOfBirth, bloodGroup, allergies, chronicConditions, emergencyNotes } = req.body;

        const member = await prisma.familyMember.findUnique({ where: { id: memberId } });
        if (!member || member.userId !== userId) {
            return sendResponse(res, 404, null, 'Family member not found');
        }

        const updated = await prisma.familyMember.update({
            where: { id: memberId },
            data: {
                name: name ? name.trim() : undefined,
                relation: relation || undefined,
                gender: gender !== undefined ? gender : undefined,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
                bloodGroup: bloodGroup !== undefined ? bloodGroup : undefined,
                allergies: allergies !== undefined ? allergies : undefined,
                chronicConditions: chronicConditions !== undefined ? chronicConditions : undefined,
                emergencyNotes: emergencyNotes !== undefined ? emergencyNotes : undefined,
            },
        });

        logger.info(`Family member updated for user ${userId}: ${memberId}`);
        sendResponse(res, 200, updated, 'Family member updated successfully');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/users/:userId/family-members/:memberId
const deleteFamilyMember = async (req, res, next) => {
    try {
        const { userId, memberId } = req.params;

        const member = await prisma.familyMember.findUnique({ where: { id: memberId } });
        if (!member || member.userId !== userId) {
            return sendResponse(res, 404, null, 'Family member not found');
        }

        await prisma.familyMember.delete({ where: { id: memberId } });

        logger.info(`Family member deleted for user ${userId}: ${memberId}`);
        sendResponse(res, 200, null, 'Family member deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getFamilyMembers,
    addFamilyMember,
    updateFamilyMember,
    deleteFamilyMember,
};
