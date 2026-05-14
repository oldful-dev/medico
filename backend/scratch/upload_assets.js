const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');

// Configuration from .env context
const bucketName = 'ayuxa-assets';
const keyFile = path.join(__dirname, '..', 'src', 'config', 'google-vision-key.json');
const destinationDir = 'mobile/assets/images/';

const storage = new Storage({
    keyFilename: keyFile,
});

const filesToUpload = [
    {
        local: 'C:/Users/gearh/.gemini/antigravity/brain/66f20990-c18e-4068-a26c-4d9aca78fa09/calendar_3d_icon_1776546307330.png',
        remote: 'calender-3d-icon-download-in-png-blend-fbx-gltf-pack-icons-8646332 1.png'
    },
    {
        local: 'C:/Users/gearh/.gemini/antigravity/brain/66f20990-c18e-4068-a26c-4d9aca78fa09/clock_3d_icon_1776546320624.png',
        remote: 'pngtree-white-clock-alarm-png-image_9507478 1.png'
    },
    {
        local: 'C:/Users/gearh/.gemini/antigravity/brain/66f20990-c18e-4068-a26c-4d9aca78fa09/caution_3d_icon_1776546334154.png',
        remote: '3d-image-of-caution-sign-free-png 1.png'
    }
];

async function uploadFiles() {
    console.log(`Starting upload to bundle: ${bucketName}...`);
    for (const file of filesToUpload) {
        const destination = path.join(destinationDir, file.remote).replace(/\\/g, '/');
        console.log(`Uploading ${file.remote} to ${destination}...`);
        
        try {
            await storage.bucket(bucketName).upload(file.local, {
                destination: destination,
                public: true, // Make it public as these are app assets
                metadata: {
                    cacheControl: 'public, max-age=31536000',
                },
            });
            console.log(`Successfully uploaded ${file.remote}`);
        } catch (err) {
            console.error(`Failed to upload ${file.remote}:`, err.message);
        }
    }
    console.log('Upload process completed.');
}

uploadFiles().catch(console.error);
