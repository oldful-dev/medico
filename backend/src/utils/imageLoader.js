const fs = require('fs');
const path = require('path');

const invoicePublicDir = path.resolve(__dirname, '../../public/invoice');

function getBase64Image(filename, mimeType = 'image/png') {
    const possiblePaths = [
        path.resolve(__dirname, '../../public/invoice', filename),
        path.resolve(__dirname, '../public/invoice', filename),
        path.resolve(process.cwd(), 'public/invoice', filename),
        path.resolve(process.cwd(), 'backend/public/invoice', filename)
    ];

    let filePath = possiblePaths.find(p => fs.existsSync(p));

    if (!filePath) {
        console.warn(`[imageLoader] Image file missing: ${possiblePaths[0]}`);
        return '';
    }
    const fileBuffer = fs.readFileSync(filePath);
    return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
}

// Convert PNGs into Base64 Data URIs
const getLogo = () => getBase64Image('logo.png', 'image/png');
const getSignature = () => getBase64Image('signature.png', 'image/png');
const getPhone = () => getBase64Image('phone.png', 'image/png');
const getEmail = () => getBase64Image('email.png', 'image/png');
const getGlobe = () => getBase64Image('globe.png', 'image/png');
const getCheck = () => getBase64Image('check.png', 'image/png');

module.exports = {
    get logo() { return getLogo(); },
    get signature() { return getSignature(); },
    get phone() { return getPhone(); },
    get email() { return getEmail(); },
    get globe() { return getGlobe(); },
    get check() { return getCheck(); }
};
