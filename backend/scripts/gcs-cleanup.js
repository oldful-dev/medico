require('dotenv').config();
const { Storage } = require('@google-cloud/storage');

const storage = new Storage({ keyFilename: process.env.FIREBASE_SERVICE_ACCOUNT_PATH });
const bucket = storage.bucket(process.env.GOOGLE_STORAGE_BUCKET_NAME);

async function cleanup() {
    console.log(`🧹 Cleaning up legacy root folders in bucket: ${bucket.name}`);
    
    // Legacy folders to check
    const legacyFolders = ['profile-avatars', 'health-reports'];
    
    for (const folder of legacyFolders) {
        console.log(`\n🔍 Checking folder: ${folder}/`);
        const [files] = await bucket.getFiles({ prefix: `${folder}/` });
        
        if (files.length === 0) {
            console.log(`   ✅ Folder is already empty or does not exist.`);
            continue;
        }

        console.log(`   ⚠️ Found ${files.length} orphaned files.`);
        
        if (process.argv.includes('--delete')) {
            console.log(`   🔥 Deleting files...`);
            for (const file of files) {
                await file.delete();
                console.log(`      🗑️ Deleted: ${file.name}`);
            }
            console.log(`   ✅ Cleanup of ${folder}/ complete.`);
        } else {
            console.log(`   ℹ️ Run with --delete flag to remove these files.`);
        }
    }
}

cleanup().catch(console.error);
