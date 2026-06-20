// ──────────────────────────────────────────────
//  Public Team Controller
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { sendResponse } = require('../utils/helpers');

const getPublicTeam = async (req, res, next) => {
    try {
        // 1. Fetch active management/admins
        const admins = await prisma.admin.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                role: true,
                email: true,
                phone: true,
                profileImageUrl: true,
                documentsJson: true,
                createdAt: true
            },
            orderBy: { createdAt: 'asc' }
        });

        // 2. Fetch all caregivers who are not rejected
        const caregivers = await prisma.caregiver.findMany({
            where: {
                policeVerification: {
                    not: 'REJECTED'
                }
            },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                specialization: true,
                qualification: true,
                profileImageUrl: true,
                documentsJson: true,
                city: { select: { name: true } },
                createdAt: true
            },
            orderBy: { performanceRating: 'desc' }
        });

        // Helper to normalize the role/category and extra attributes
        const normalizeMember = (item, isManagement) => {
            let docs = {};
            if (item.documentsJson) {
                try {
                    docs = typeof item.documentsJson === 'string' 
                        ? JSON.parse(item.documentsJson) 
                        : item.documentsJson;
                } catch (e) {
                    docs = {};
                }
            }

            // Ensure fullBio is an array
            let fullBio = [];
            if (docs.fullBio) {
                if (Array.isArray(docs.fullBio)) {
                    fullBio = docs.fullBio;
                } else if (typeof docs.fullBio === 'string') {
                    fullBio = [docs.fullBio];
                }
            } else if (item.qualification) {
                fullBio = [`Qualification: ${item.qualification}`];
            }

            return {
                id: item.id,
                name: item.name,
                role: docs.title || (isManagement ? item.role : item.specialization) || 'Team Member',
                email: item.email || '',
                phone: item.phone || '',
                linkedin: docs.linkedin || '',
                image: item.profileImageUrl || 'https://www.Ayuxa.com/wp-content/uploads/2026/01/default-avatar.png',
                shortBio: docs.shortBio || item.qualification || '',
                fullBio: fullBio,
                city: item.city?.name || 'Global'
            };
        };

        const managementList = admins.map(admin => normalizeMember(admin, true));

        const shareholdersList = [];
        const doctorsList = [];
        const nursesList = [];
        const caregiversList = [];

        caregivers.forEach(cg => {
            const spec = (cg.specialization || '').toLowerCase();
            const member = normalizeMember(cg, false);

            if (spec.includes('shareholder')) {
                shareholdersList.push(member);
            } else if (spec.includes('doctor')) {
                doctorsList.push(member);
            } else if (spec.includes('nurse')) {
                nursesList.push(member);
            } else {
                caregiversList.push(member);
            }
        });

        sendResponse(res, 200, {
            management: managementList,
            shareholders: shareholdersList,
            doctors: doctorsList,
            nurses: nursesList,
            caregivers: caregiversList
        }, 'Public team directory retrieved successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPublicTeam
};
