// One-off: upload the Ayuxa Welcome SLA PDF to GCS so it can be referenced
// as WELCOME_DOC_URL (WhatsApp welcome template's document media) and as
// the same asset attached to the welcome email.
// Run once: node scripts/upload-welcome-sla.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { uploadFile } = require('../src/utils/storage.service');

async function main() {
    const filePath = path.join(__dirname, '../src/assets/documents/Ayuxa_Welcome_SLA.pdf');
    const buffer = fs.readFileSync(filePath);

    // 'mobile/assets/images' is the one folder buildFilePath treats as
    // public + permanent + not user-nested (no userId required) — despite
    // the name, it's the right bucket path for any static public asset,
    // not just images. 'documents'/'sla-documents' would be wrong here:
    // isPrivateFolder() treats those as private, so uploadFile would return
    // a signed URL that expires, not the permanent link WELCOME_DOC_URL needs.
    const asset = await uploadFile(buffer, 'mobile/assets/images', 'Ayuxa_Welcome_SLA.pdf');
    console.log('Uploaded to GCS storagePath:', asset.storagePath);
    console.log('Public URL:', asset.url);
}

main().catch(err => {
    console.error('Upload failed:', err);
    process.exit(1);
});
