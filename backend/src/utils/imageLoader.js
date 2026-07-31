const fs = require('fs');
const path = require('path');

const invoicePublicDir = path.resolve(__dirname, '../../public/invoice');

function getBase64Image(filename, mimeType = 'image/png') {
    const filePath = path.join(invoicePublicDir, filename);
    if (!fs.existsSync(filePath)) {
        console.warn(`[imageLoader] Image file missing: ${filePath}`);
        return '';
    }
    const fileBuffer = fs.readFileSync(filePath);
    return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
}

// Convert PNGs into Base64 Data URIs
const logo = getBase64Image('logo.png', 'image/png');
const signature = getBase64Image('signature.png', 'image/png');
const phone = getBase64Image('phone.png', 'image/png');
const email = getBase64Image('email.png', 'image/png');
const globe = getBase64Image('globe.png', 'image/png');
const check = getBase64Image('check.png', 'image/png');

module.exports = {
    logo,
    signature,
    phone,
    email,
    globe,
    check
};
