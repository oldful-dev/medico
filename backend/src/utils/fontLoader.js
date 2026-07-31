const fs = require('fs');
const path = require('path');

const fontsDir = path.resolve(__dirname, '../../public/invoice/fonts');

function getBase64Font(filename) {
    const filePath = path.join(fontsDir, filename);
    if (!fs.existsSync(filePath)) {
        console.warn(`[fontLoader] Font file missing: ${filePath}`);
        return '';
    }
    const fontBuffer = fs.readFileSync(filePath);
    return `data:font/opentype;base64,${fontBuffer.toString('base64')}`;
}

const regular = getBase64Font('Montserrat-Regular.ttf');
const semiBold = getBase64Font('Montserrat-SemiBold.ttf');
const bold = getBase64Font('Montserrat-Bold.ttf');

module.exports = {
    regular,
    semiBold,
    bold
};
