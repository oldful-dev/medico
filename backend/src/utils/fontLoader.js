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

const getRegular = () => getBase64Font('Montserrat-Regular.ttf');
const getSemiBold = () => getBase64Font('Montserrat-SemiBold.ttf');
const getBold = () => getBase64Font('Montserrat-Bold.ttf');

module.exports = {
    get regular() { return getRegular(); },
    get semiBold() { return getSemiBold(); },
    get bold() { return getBold(); }
};
