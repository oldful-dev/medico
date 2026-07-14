const fs = require('fs');
const path = require('path');

const LOCALES_DIR = 'd:/codes/MERN/medico/mobile/i18n/locales';

const HOSPITAL_QUICK_VALS = {
    hi: "अस्पताल\nदौरा",
    te: "ఆసుపత్రి\nసందర్శన",
    ta: "மருத்துவமனை\nவருகை",
    mr: "हॉस्पिटल\nभेट",
    ml: "ആശുപത്രി\nസന്ദർശനം",
    kn: "ಆಸ್ಪತ್ರೆ\nಭೇಟಿ",
    bn: "হাসপাতাল\nপরিদর্শন",
    en: "Hospital\nVisit"
};

function run() {
    for (const lang of Object.keys(HOSPITAL_QUICK_VALS)) {
        const filePath = path.join(LOCALES_DIR, `${lang}.json`);
        if (!fs.existsSync(filePath)) {
            console.log(`File not found: ${filePath}`);
            continue;
        }

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const json = JSON.parse(content);

            if (!json.services) {
                json.services = {};
            }

            json.services.hospital_trip_quick = HOSPITAL_QUICK_VALS[lang];

            fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
            console.log(`Successfully updated hospital_trip_quick in: ${filePath}`);
        } catch (e) {
            console.error(`Error processing ${filePath}:`, e);
        }
    }
}

run();
