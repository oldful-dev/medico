const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../i18n/locales');
const languages = ['en', 'hi', 'bn', 'kn', 'ml', 'mr', 'ta', 'te'];

const updates = {
  en: {
    online_call: "Online Video Call (₹{{price}})",
    home_visit: "Home Visit (₹{{price}})",
  },
  hi: {
    online_call: "ऑनलाइन वीडियो कॉल (₹{{price}})",
    home_visit: "होम विज़िट (₹{{price}})",
  },
  bn: {
    online_call: "অনলাইন ভিডিও কল (₹{{price}})",
    home_visit: "হোম ভিজিট (₹{{price}})",
  },
  kn: {
    online_call: "ಆನ್‌ಲೈನ್ ವಿಡಿಯೋ ಕರೆ (₹{{price}})",
    home_visit: "ಮನೆ ಭೇಟಿ (₹{{price}})",
  },
  ml: {
    online_call: "ഓൺലൈൻ വീഡിയോ കോൾ (₹{{price}})",
    home_visit: "ഹോം വിസിറ്റ് (₹{{price}})",
  },
  mr: {
    online_call: "ऑनलाइन व्हिडिओ कॉल (₹{{price}})",
    home_visit: "होम व्हिजिट (₹{{price}})",
  },
  ta: {
    online_call: "ஆன்லைன் வீடியோ அழைப்பு (₹{{price}})",
    home_visit: "வீட்டு வருகை (₹{{price}})",
  },
  te: {
    online_call: "ఆన్‌లైన్ వీడియో కాల్ (₹{{price}})",
    home_visit: "హోమ్ విజిట్ (₹{{price}})",
  }
};

for (const lang of languages) {
  const filePath = path.join(localesDir, `${lang}.json`);
  if (fs.existsSync(filePath)) {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (content.service_detail) {
      content.service_detail.online_call = updates[lang].online_call;
      content.service_detail.home_visit = updates[lang].home_visit;
    }
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    console.log(`Updated service_detail for ${lang}`);
  }
}
