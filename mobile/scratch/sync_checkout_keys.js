const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../i18n/locales');
const languages = ['en', 'hi', 'bn', 'kn', 'mr', 'te', 'ta', 'ml'];

const translations = {
  en: {
    convenience_fee: "Convenience Fee",
    emergency_fee: "Emergency Premium",
    visit_fee: "Visit Charge",
    night_charge: "Night Premium",
    surge_charge: "Surge Charge"
  },
  hi: {
    convenience_fee: "सुविधा शुल्क",
    emergency_fee: "आपातकालीन प्रीमियम",
    visit_fee: "विज़िट शुल्क",
    night_charge: "नाइट प्रीमियम",
    surge_charge: "सर्ज शुल्क"
  },
  bn: {
    convenience_fee: "কনভেনিয়েন্স ফি",
    emergency_fee: "জরুরি প্রিমিয়াম",
    visit_fee: "ভিজিট চার্জ",
    night_charge: "নাইট প্রিমিয়াম",
    surge_charge: "সার্জ চার্জ"
  },
  kn: {
    convenience_fee: "ಅನುಕೂಲಕರ ಶುಲ್ಕ",
    emergency_fee: "ತುರ್ತು ಪ್ರೀಮಿಯಂ",
    visit_fee: "ಭೇಟಿ ಶುಲ್ಕ",
    night_charge: "ರಾತ್ರಿ ಪ್ರೀಮಿಯಂ",
    surge_charge: "ಸರ್ಜ್ ಶುಲ್ಕ"
  },
  mr: {
    convenience_fee: "सुविधा शुल्क",
    emergency_fee: "आपत्कालीन प्रीमियम",
    visit_fee: "भेट शुल्क",
    night_charge: "नाईट प्रीमियम",
    surge_charge: "सर्ज शुल्क"
  },
  te: {
    convenience_fee: "కన్వీనియన్స్ ఫీజు",
    emergency_fee: "ఎమర్జెన్సీ ప్రీమియం",
    visit_fee: "విజిట్ ఛార్జ్",
    night_charge: "నైట్ ప్రీమియం",
    surge_charge: "సర్జ్ ఛార్జ్"
  },
  ta: {
    convenience_fee: "சேவை கட்டணம்",
    emergency_fee: "அவசரகால பிரீமியம்",
    visit_fee: "வருகை கட்டணம்",
    night_charge: "இரவு பிரீமியம்",
    surge_charge: "சர்ஜ் கட்டணம்"
  },
  ml: {
    convenience_fee: "കൺവീനിയൻസ് ഫീസ്",
    emergency_fee: "എമർജൻസി പ്രീമിയം",
    visit_fee: "സന്ദർശന ഫീസ്",
    night_charge: "നൈറ്റ് പ്രീമിയം",
    surge_charge: "സർജ്ജ് ഫീസ്"
  }
};

languages.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);

    if (!data.checkout) {
      data.checkout = {};
    }

    // Add keys to checkout namespace
    Object.keys(translations[lang]).forEach(key => {
      data.checkout[key] = translations[lang][key];
    });

    // Write back pretty formatted JSON
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Successfully updated ${lang}.json`);
  } catch (err) {
    console.error(`Error processing ${lang}.json:`, err);
  }
});
