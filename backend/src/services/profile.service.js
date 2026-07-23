// ──────────────────────────────────────────────
//  Staff Profile Service (Enterprise Layer)
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { createAuditLog } = require('../middleware/audit');

// Metadata Cache (Simple TTL Implementation)
let metadataCache = {
    data: null,
    expiry: 0
};

/**
 * Normalize status based on model-specific fields
 */
const normalizeStatus = (staff, role) => {
    if (role === 'management') {
        return staff.isActive ? 'ACTIVE' : 'INACTIVE';
    }
    
    // Caregiver logic
    if (staff.policeVerification === 'PENDING') return 'PENDING';
    if (staff.policeVerification === 'REJECTED') return 'INACTIVE';
    
    if (staff.isAvailable) return 'ACTIVE';
    return 'BUSY';
};

/**
 * Get all staff profiles with combined logic
 */
const getProfiles = async ({ role, search, specialization, sortBy = 'createdAt', order = 'desc', page = 1, limit = 20 }) => {
    const skip = (page - 1) * limit;
    const isManagement = role === 'management';
    
    // ── Build Structured Query ──
    const where = { AND: [] };

    // 1. Search Filter (Cross-field OR)
    if (search && search.trim()) {
        const term = search.trim();
        where.AND.push({
            OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { phone: { contains: term } },
                { email: { contains: term, mode: 'insensitive' } },
            ]
        });
    }

    // 2. Specialized Tab/Role Filters
    if (isManagement) {
        where.AND.push({ isStaffProfile: true });
    } else {
        const roleFilters = [];
        if (role === 'doctor') {
            roleFilters.push({ specialization: { contains: 'Doctor', mode: 'insensitive' } });
        } else if (role === 'nurse') {
            roleFilters.push({ specialization: { contains: 'Nurse', mode: 'insensitive' } });
        } else if (role === 'shareholder') {
            roleFilters.push({ specialization: { contains: 'Shareholder', mode: 'insensitive' } });
        } else if (role === 'caregiver') {
            // Exclude Doctors, Nurses, and Shareholders
            roleFilters.push({ specialization: { not: { contains: 'Doctor' }, mode: 'insensitive' } });
            roleFilters.push({ specialization: { not: { contains: 'Nurse' }, mode: 'insensitive' } });
            roleFilters.push({ specialization: { not: { contains: 'Shareholder' }, mode: 'insensitive' } });
        }

        // 3. User-selected Specialization Filter (Dropdown)
        if (specialization) {
            roleFilters.push({ specialization: specialization });
        }

        if (roleFilters.length > 0) {
            where.AND.push(...roleFilters);
        }
    }

    const queryOptions = {
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        include: { city: { select: { name: true } } }
    };

    let items = [];
    let total = 0;

    if (isManagement) {
        // Query Admins
        [items, total] = await Promise.all([
            prisma.admin.findMany(queryOptions),
            prisma.admin.count({ where })
        ]);
    } else {
        [items, total] = await Promise.all([
            prisma.caregiver.findMany(queryOptions),
            prisma.caregiver.count({ where })
        ]);
    }

    // Standardize Output
    const normalized = items.map(item => {
        let displayRole = isManagement ? item.role : (item.specialization || 'Caregiver');
        if (isManagement && item.documentsJson) {
            try {
                const docs = typeof item.documentsJson === 'string'
                    ? JSON.parse(item.documentsJson)
                    : item.documentsJson;
                if (docs && docs.title) {
                    displayRole = docs.title;
                }
            } catch (e) {}
        }
        return {
            id: item.id,
            name: item.name,
            role: displayRole,
            email: item.email || item.phone, // Contact fallback
            phone: item.phone,
            city: item.city?.name || 'Global',
            status: normalizeStatus(item, role),
            profileImageUrl: item.profileImageUrl,
            documentsJson: item.documentsJson,
            createdAt: item.createdAt,
        };
    });

    return { data: normalized, total };
};

/**
 * Fetch dynamic metadata (Roles & Specializations)
 * Prioritizes UIConfig override ('sdui_staff_metadata') for active configurability.
 */
const getMetadata = async () => {
    // Check local cache first
    if (metadataCache.data && Date.now() < metadataCache.expiry) {
        return metadataCache.data;
    }

    try {
        // 1. Check for UIConfig override
        const override = await prisma.uIConfig.findUnique({
            where: { key: 'sdui_staff_metadata' }
        });

        if (override?.configJson) {
            const data = override.configJson;
            metadataCache = { data, expiry: Date.now() + (1000 * 60 * 10) };
            return data;
        }

        // 2. Fallback to passive dynamic metadata
        const [specializations, admins] = await Promise.all([
            prisma.caregiver.findMany({ select: { specialization: true }, distinct: ['specialization'] }),
            prisma.admin.findMany({ select: { role: true }, distinct: ['role'] })
        ]);

        const data = {
            specializations: specializations.map(s => s.specialization).filter(Boolean),
            adminRoles: admins.map(a => a.role),
            staffRoles: ['doctor', 'nurse', 'caregiver', 'management', 'shareholder']
        };

        metadataCache = { data, expiry: Date.now() + (1000 * 60 * 10) };
        return data;
    } catch (err) {
        // Safe fallback in case of query errors
        return { specializations: [], adminRoles: [], staffRoles: ['doctor', 'nurse', 'caregiver', 'management'] };
    }
};

/**
 * Update system metadata override
 */
const updateMetadata = async (metadata) => {
    const updated = await prisma.uIConfig.upsert({
        where: { key: 'sdui_staff_metadata' },
        create: {
            key: 'sdui_staff_metadata',
            type: 'CUSTOM',
            label: 'Staff System Metadata',
            configJson: metadata,
            version: 1,
            isVisible: false
        },
        update: {
            configJson: metadata,
            version: { increment: 1 },
            publishedAt: new Date()
        }
    });

    // Invalidate local cache
    metadataCache = { data: null, expiry: 0 };
    return updated.configJson;
};

/**
 * Bulk Action: Update Status
 */
const bulkUpdateStatus = async (adminId, { ids, status, type }) => {
    const model = type === 'management' ? prisma.admin : prisma.caregiver;
    const updateData = type === 'management' 
        ? { isActive: status === 'ACTIVE' } 
        : { isAvailable: status === 'ACTIVE' };

    const results = await prisma.$transaction(
        ids.map(id => model.update({ where: { id }, data: updateData }))
    );

    // Audit Log for each
    await Promise.all(results.map(record => 
        createAuditLog({
            adminId,
            action: `BULK_STATUS_${status}`,
            entity: type === 'management' ? 'Admin' : 'Caregiver',
            entityId: record.id,
            newValue: updateData
        })
    ));

    return results;
};

/**
 * Bulk Action: Delete
 */
const bulkDelete = async (adminId, { ids, type }) => {
    const model = type === 'management' ? prisma.admin : prisma.caregiver;

    // Capture old values for audit
    const oldValues = await model.findMany({ where: { id: { in: ids } } });

    // Nullify references in related tables to avoid foreign key errors
    if (type === 'management') {
        await prisma.auditLog.updateMany({
            where: { adminId: { in: ids } },
            data: { adminId: null }
        });
    } else {
        await prisma.booking.updateMany({
            where: { caregiverId: { in: ids } },
            data: { caregiverId: null }
        });
        await prisma.sOSAlert.updateMany({
            where: { responderId: { in: ids } },
            data: { responderId: null }
        });
    }

    const result = await model.deleteMany({ where: { id: { in: ids } } });

    // Audit Log
    await Promise.all(oldValues.map(record => 
        createAuditLog({
            adminId,
            action: 'BULK_DELETE',
            entity: type === 'management' ? 'Admin' : 'Caregiver',
            entityId: record.id,
            oldValue: record
        })
    ));

    return result;
};

/**
 * Individual Action: Delete
 */
const deleteProfile = async (adminId, { id, type }) => {
    const model = type === 'management' ? prisma.admin : prisma.caregiver;
    const oldRecord = await model.findUnique({ where: { id } });
    
    if (!oldRecord) return null;

    // Nullify references in related tables to avoid foreign key errors
    if (type === 'management') {
        await prisma.auditLog.updateMany({
            where: { adminId: id },
            data: { adminId: null }
        });
    } else {
        await prisma.booking.updateMany({
            where: { caregiverId: id },
            data: { caregiverId: null }
        });
        await prisma.sOSAlert.updateMany({
            where: { responderId: id },
            data: { responderId: null }
        });
    }

    const result = await model.delete({ where: { id } });

    await createAuditLog({
        adminId,
        action: 'DELETE_PROFILE',
        entity: type === 'management' ? 'Admin' : 'Caregiver',
        entityId: id,
        oldValue: oldRecord
    });

    return result;
};

/**
 * Individual Action: Update
 */
const updateProfile = async (adminId, { id, type, data }) => {
    const model = type === 'management' ? prisma.admin : prisma.caregiver;
    const oldRecord = await model.findUnique({ where: { id } });
    
    if (!oldRecord) return null;

    // Sanitize data based on model
    const updateData = {};
    const allowedFields = type === 'management' 
        ? ['name', 'email', 'phone', 'role', 'cityId', 'isActive', 'profileImageUrl', 'documentsJson']
        : ['name', 'email', 'phone', 'specialization', 'qualification', 'profileImageUrl', 'cityId', 'isAvailable', 'documentsJson'];

    allowedFields.forEach(field => {
        if (data[field] !== undefined) {
            updateData[field] = data[field];
        }
    });

    if (type === 'management') {
        const VALID_ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'CARE_MANAGER', 'SUPPORT_AGENT', 'BILLING_EXECUTIVE'];
        
        let docsObj = {};
        if (updateData.documentsJson) {
            try {
                docsObj = typeof updateData.documentsJson === 'string'
                    ? JSON.parse(updateData.documentsJson)
                    : updateData.documentsJson;
                if (!docsObj || typeof docsObj !== 'object') docsObj = {};
            } catch (e) {
                docsObj = {};
            }
        } else if (oldRecord.documentsJson) {
            try {
                docsObj = typeof oldRecord.documentsJson === 'string'
                    ? JSON.parse(oldRecord.documentsJson)
                    : oldRecord.documentsJson;
                if (!docsObj || typeof docsObj !== 'object') docsObj = {};
            } catch (e) {
                docsObj = {};
            }
        }

        if (updateData.role) {
            if (!VALID_ADMIN_ROLES.includes(updateData.role)) {
                docsObj.title = updateData.role;
                updateData.documentsJson = docsObj;
                delete updateData.role;
            } else {
                delete docsObj.title;
                updateData.documentsJson = docsObj;
            }
        }
    }

    const result = await model.update({ 
        where: { id }, 
        data: updateData 
    });

    await createAuditLog({
        adminId,
        action: 'UPDATE_PROFILE',
        entity: type === 'management' ? 'Admin' : 'Caregiver',
        entityId: id,
        oldValue: oldRecord,
        newValue: updateData
    });

    return result;
};

/**
 * Individual Action: Create
 */
const createProfile = async (adminId, { type, data }) => {
    const { name, email, phone, cityId, password, ...rest } = data;
    
    // Check if city exists
    const city = await prisma.city.findUnique({ where: { id: cityId } });
    if (!city) throw new Error('Invalid City ID');

    let result;
    if (type === 'management') {
        const { hashPassword } = require('../utils/helpers');
        const passwordHash = await hashPassword(password || 'Medico@123');
        
        const VALID_ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'CARE_MANAGER', 'SUPPORT_AGENT', 'BILLING_EXECUTIVE'];
        let adminRole = 'CARE_MANAGER';
        let docsObj = rest.documentsJson || null;
        
        if (docsObj) {
            try {
                docsObj = typeof docsObj === 'string' ? JSON.parse(docsObj) : docsObj;
                if (!docsObj || typeof docsObj !== 'object') docsObj = {};
            } catch (e) {
                docsObj = {};
            }
        } else {
            docsObj = {};
        }

        if (rest.role) {
            if (VALID_ADMIN_ROLES.includes(rest.role)) {
                adminRole = rest.role;
                delete docsObj.title;
            } else {
                docsObj.title = rest.role;
                adminRole = 'CARE_MANAGER';
            }
        }

        const documentsJson = Object.keys(docsObj).length > 0 ? docsObj : (rest.documentsJson || null);

        result = await prisma.admin.create({
            data: {
                name,
                email: email.toLowerCase(),
                phone,
                cityId,
                passwordHash,
                role: adminRole,
                isActive: true,
                isStaffProfile: true,
                profileImageUrl: rest.profileImageUrl || null,
                documentsJson: documentsJson
            }
        });
    } else {
        result = await prisma.caregiver.create({
            data: {
                name,
                phone,
                email: email?.toLowerCase(),
                cityId,
                specialization: rest.specialization || 'Caregiver',
                qualification: rest.qualification,
                profileImageUrl: rest.profileImageUrl || null,
                documentsJson: rest.documentsJson || null,
                isAvailable: true
            }
        });
    }

    await createAuditLog({
        adminId,
        action: 'CREATE_PROFILE',
        entity: type === 'management' ? 'Admin' : 'Caregiver',
        entityId: result.id,
        newValue: result
    });

    return result;
};

module.exports = {
    getProfiles,
    getMetadata,
    bulkUpdateStatus,
    bulkDelete,
    deleteProfile,
    updateProfile,
    createProfile,
    updateMetadata
};
