const prisma = require('../src/config/database');
const profileService = require('../src/services/profile.service');

async function verifyCustomRoles() {
    console.log('🧪 Starting custom roles CRUD verification test...');
    let testProfile = null;
    try {
        // 1. Get a city and a real admin
        const city = await prisma.city.findFirst();
        if (!city) {
            throw new Error('No cities found in database. Seed database first.');
        }
        console.log(`📍 Using City: ${city.name} (${city.id})`);

        const realAdmin = await prisma.admin.findFirst();
        const activeAdminId = realAdmin ? realAdmin.id : 'system-test-admin';
        console.log(`👤 Operating Admin ID: ${activeAdminId}`);

        // 2. Create Profile with Custom Role
        console.log('\n➕ Step 2: Creating management profile with custom role...');
        const createResult = await profileService.createProfile(activeAdminId, {
            type: 'management',
            data: {
                name: 'CTO Test Admin',
                email: 'ctotestadmin@example.com',
                phone: '1234567890',
                cityId: city.id,
                role: 'Chief Technology Officer', // Custom Role
                documentsJson: { policeVerificationUrl: 'http://test.url' }
            }
        });
        testProfile = createResult;
        console.log('✅ Creation Result:');
        console.log('  Database Enum Role:', createResult.role);
        console.log('  Documents JSON:', JSON.stringify(createResult.documentsJson));

        if (createResult.role !== 'CARE_MANAGER') {
            throw new Error(`Expected database role to fallback to CARE_MANAGER, got ${createResult.role}`);
        }
        if (createResult.documentsJson.title !== 'Chief Technology Officer') {
            throw new Error(`Expected documentsJson.title to be "Chief Technology Officer", got ${createResult.documentsJson.title}`);
        }
        if (createResult.documentsJson.policeVerificationUrl !== 'http://test.url') {
            throw new Error(`Expected documentsJson.policeVerificationUrl to be preserved, got ${createResult.documentsJson.policeVerificationUrl}`);
        }

        // 3. Query Profiles and Verify Standardized Output
        console.log('\n🔍 Step 3: Fetching profiles via getProfiles...');
        const queryResult = await profileService.getProfiles({
            role: 'management',
            search: 'CTO Test Admin'
        });

        const matchedProfile = queryResult.data.find(p => p.id === testProfile.id);
        if (!matchedProfile) {
            throw new Error('Created profile not found in search results');
        }
        console.log('✅ Standardized Output Result:');
        console.log('  Normalized Display Role:', matchedProfile.role);
        
        if (matchedProfile.role !== 'Chief Technology Officer') {
            throw new Error(`Expected display role to be "Chief Technology Officer", got ${matchedProfile.role}`);
        }

        // 4. Update Profile with another Custom Role
        console.log('\n🔄 Step 4: Updating profile to another custom role...');
        const updateResult = await profileService.updateProfile(activeAdminId, {
            id: testProfile.id,
            type: 'management',
            data: {
                role: 'Chief Strategy Officer' // New Custom Role
            }
        });
        console.log('✅ Update Result:');
        console.log('  Database Enum Role:', updateResult.role);
        console.log('  Documents JSON:', JSON.stringify(updateResult.documentsJson));

        if (updateResult.role !== 'CARE_MANAGER') {
            throw new Error(`Expected database role to remain CARE_MANAGER, got ${updateResult.role}`);
        }
        if (updateResult.documentsJson.title !== 'Chief Strategy Officer') {
            throw new Error(`Expected documentsJson.title to be "Chief Strategy Officer", got ${updateResult.documentsJson.title}`);
        }
        if (updateResult.documentsJson.policeVerificationUrl !== 'http://test.url') {
            throw new Error(`Expected other documentsJson fields to be preserved, got ${updateResult.documentsJson.policeVerificationUrl}`);
        }

        // 5. Update Profile with a Valid Enum Role
        console.log('\n🔄 Step 5: Updating profile to standard VALID role (SUPER_ADMIN)...');
        const standardUpdateResult = await profileService.updateProfile(activeAdminId, {
            id: testProfile.id,
            type: 'management',
            data: {
                role: 'SUPER_ADMIN' // Standard Enum Role
            }
        });
        console.log('✅ Standard Update Result:');
        console.log('  Database Enum Role:', standardUpdateResult.role);
        console.log('  Documents JSON:', JSON.stringify(standardUpdateResult.documentsJson));

        if (standardUpdateResult.role !== 'SUPER_ADMIN') {
            throw new Error(`Expected database role to be updated to SUPER_ADMIN, got ${standardUpdateResult.role}`);
        }
        if (standardUpdateResult.documentsJson.title !== undefined) {
            throw new Error(`Expected documentsJson.title to be deleted, got ${standardUpdateResult.documentsJson.title}`);
        }

        console.log('\n🎉 ALL CRUD ROLE TESTS PASSED SUCCESSFULLY! 🎉');

    } catch (error) {
        console.error('\n❌ Verification failed:', error.message);
        process.exit(1);
    } finally {
        // 6. Cleanup
        if (testProfile) {
            console.log('\n🧹 Cleaning up test admin profile...');
            await prisma.admin.delete({ where: { id: testProfile.id } }).catch(console.error);
            console.log('🧹 Cleanup complete.');
        }
        await prisma.$disconnect();
    }
}

verifyCustomRoles();
