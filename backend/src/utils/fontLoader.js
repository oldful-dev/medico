const fs = require('fs');
const path = require('path');

const fontsDir = path.resolve(__dirname, '../../public/invoice/fonts');

function getBase64Font(filename) {
    const possiblePaths = [
        path.resolve(__dirname, '../assets/invoice/fonts', filename),
        path.resolve(__dirname, '../../public/invoice/fonts', filename),
        path.resolve(__dirname, '../public/invoice/fonts', filename),
        path.resolve(process.cwd(), 'src/assets/invoice/fonts', filename),
        path.resolve(process.cwd(), 'backend/src/assets/invoice/fonts', filename),
        path.resolve(process.cwd(), 'public/invoice/fonts', filename),
        path.resolve(process.cwd(), 'backend/public/invoice/fonts', filename)
    ];

    let filePath = possiblePaths.find(p => fs.existsSync(p));

    if (!filePath) {
        console.warn(`[fontLoader] Font file missing: ${possiblePaths[0]}`);
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
