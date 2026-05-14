#!/usr/bin/env node

/**
 * Check GCS Avatar Status
 *
 * Usage: node check-avatar.js <userId>
 * Example: node check-avatar.js 1ff68a53-100c-4334-b4c4-0415c9f9b4f1
 */

const { Storage } = require('@google-cloud/storage');
const path = require('path');

const userId = process.argv[2];

if (!userId) {
    console.error('❌ Usage: node check-avatar.js <userId>');
    console.error('Example: node check-avatar.js 1ff68a53-100c-4334-b4c4-0415c9f9b4f1');
    process.exit(1);
}

async function checkAvatar() {
    try {
        // Initialize GCS
        const keyPath = path.join(__dirname, '../src/config/firebase_account_config.json');
        const storage = new Storage({
            projectId: 'ayuxa-platforms',
            keyFilename: keyPath,
        });

        const bucket = storage.bucket('ayuxa-assets');

        // List all files for this user's avatar
        const avatarPath = `users/${userId}/profile/`;
        console.log(`\n📁 Checking avatar path: ${avatarPath}\n`);

        const [files] = await bucket.getFiles({ prefix: avatarPath });

        if (files.length === 0) {
            console.log('❌ No avatar found for this user');
            return;
        }

        console.log(`✅ Found ${files.length} file(s):\n`);

        for (const file of files) {
            const [metadata] = await file.getMetadata();
            const sizeKB = (metadata.size / 1024).toFixed(2);
            const updated = new Date(metadata.updated).toLocaleString();
            const contentType = metadata.contentType || 'unknown';

            console.log(`📄 ${file.name}`);
            console.log(`   Size: ${sizeKB} KB`);
            console.log(`   Type: ${contentType}`);
            console.log(`   Updated: ${updated}`);
            console.log(`   GCS URL: https://storage.googleapis.com/ayuxa-assets/${file.name}`);
            console.log(`   CDN URL: https://assets.ayuxacare.com/users/${userId}/profile/avatar.jpg`);
            console.log('');
        }

        // Check if there are multiple versions (shouldn't be with versioning disabled)
        if (files.length > 1) {
            console.log('⚠️  WARNING: Multiple avatar files found!');
            console.log('    This suggests files are being created instead of overwritten.');
            console.log('    Check if versioning is enabled or if paths are different.');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkAvatar();
