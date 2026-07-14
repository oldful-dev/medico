// ──────────────────────────────────────────────
//  App Config Controller — SDUI (Server-Driven UI)
//  GET  /api/app-config          (public — mobile app fetches on startup)
//  PUT  /api/app-config          (SUPER_ADMIN only — update via admin panel)
//  POST /api/app-config/reset    (SUPER_ADMIN only — restore defaults)
// ──────────────────────────────────────────────

const prisma = require('../config/database');
const { logger } = require('../config/logger');
const { syncUIConfigToDbServices } = require('../utils/sduiSync');

// ─── Default SDUI Config ─────────────────────────────────────────────────────
// This is the source-of-truth fallback. The DB overrides this when an admin
// publishes a config update via the admin panel.

const DEFAULT_CONFIG = {
    version: '1.0.0',
    cache_ttl: 3600, // seconds the mobile app should cache this response

    // ── Feature Flags ── toggle app features without a new app build
    feature_flags: {
        sos_enabled: true,
        essentials_visible: true,
        trust_badges_visible: true,
        sos_banner_visible: true,
        plans_enabled: true,
        insurance_enabled: true,
        blood_test_enabled: true,
        meal_service_enabled: true,
        promo_section_visible: false,
    },

    // ── Screens ─────────────────────────────────────────────────────────────
    screens: {

        // ── Home Screen ────────────────────────────────────────────────────
        home: {
            sections: [
                {
                    id: 'quick_services',
                    type: 'quick_services',
                    visible: true,
                    sort_order: 1,
                    items: [
                        { id: 'doctor',    label: '{"en":"ayuxacare\\nDoctor","hi":"ayuxacare\\nडॉक्टर","bn":"ayuxacare\\nডাক্তার","kn":"ayuxacare\\nವೈದ್ಯ","ml":"ayuxacare\\nഡോക്ടർ","mr":"ayuxacare\\nडॉक्टर","ta":"ayuxacare\\nமருத்துவர்","te":"ayuxacare\\nడాక్టర్"}',    icon_key: 'quick_doctor',    image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/98e939543c86f26f5f26210bb160eb927b5ff057.png', route: '/doctor-visit',  visible: true, sort_order: 1 },
                        { id: 'nursing',   label: '{"en":"Nursing\\nCare","hi":"नर्सिंग\\nकेयर","bn":"নার্সিং\\nকেয়ার","kn":"ನರ್ಸಿಂಗ್\\nಕೇರ್","ml":"നഴ്‌സിംഗ്\\nകെയർ","mr":"नर्सिंग\\nकेअर","ta":"நர்சிங்\\nகவனிப்பு","te":"నర్సింగ్\\nకేర్"}',   icon_key: 'quick_nursing',   image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/21e5a8a8650cf8eda36be3744c70099580173129.png', route: '/nurse-care',    visible: true, sort_order: 2 },
                        { id: 'caregiver', label: '{"en":"Caregiver\\nSupport","hi":"देखभालकर्ता\\nसहायता","bn":"কেয়ারগিভার\\nসাপোর্ট","kn":"ಕೇರ್‌ಗಿವರ್\\nಸಪೋರ್ಟ್","ml":"കെയർगിവർ\\nപിന്തുണ","mr":"काळजीवाहू\\nसहाय्य","ta":"கவனிப்பாளர்\\nஆதரவு","te":"కేర్‌గివర్\\nసపోర్ట్"}', icon_key: 'quick_caregiver', image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/2fb222a5f206ff64415b72a8d4ac9290b4e6f720.png', route: '/caregiver-support', visible: true, sort_order: 3 },
                        { id: 'emergency', label: '{"en":"Emergency\\nAssist","hi":"आपातकालीन\\nसहायता","bn":"জরুরি\\nসহায়তা","kn":"ತುರ್ತು\\nಸಹಾಯ","ml":"അടിയന്തര\\nസഹായം","mr":"आपत्कालीन\\nमदत","ta":"அவசர\\nஉதவி","te":"అత్యవసర\\nసహాయం"}',  icon_key: 'quick_emergency', image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png', route: '/sos-emergency', visible: true, sort_order: 4 },
                    ],
                },
                {
                    id: 'ayuxa_services',
                    type: 'service_grid',
                    title: '{"en":"ayuxacare Services","hi":"ayuxacare सेवाएं","bn":"ayuxacare সেবা","kn":"ayuxacare ಸೇವೆಗಳು","ml":"ayuxacare സേവനങ്ങൾ","mr":"ayuxacare सेवा","ta":"ayuxacare சேவைகள்","te":"ayuxacare సేవలు"}',
                    visible: true,
                    sort_order: 2,
                    view_all_route: '/all-ayuxa-services',
                    config: { max_items: 6, columns: 3 },
                    items: [
                        { id: 'doctor_visit',   label: '{"en":"Doctor\\nVisit","hi":"डॉक्टर\\nविजिट","bn":"ডাক্তার\\nভিজিট","kn":"ವೈದ್ಯ\\nಭೇಟಿ","ml":"ഡോക്ടർ\\nസന്ദർശനം","mr":"डॉक्टर\\nभेट","ta":"மருத்துவர்\\nவிஜிட்","te":"డాక్టర్\\nవిజిట్"}',   icon_key: 'svc_doctor_visit',   image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/32a4661f97e2fa2dd2c85c403a7c530b7214e7f7.png', route: '/doctor-visit',     visible: true, sort_order: 1 },
                        { id: 'homing_nursing', label: '{"en":"Homing\\nNursing","hi":"होम\\nनर्सिंग","bn":"হোম\\nনার্সিং","kn":"ಹೋಮ್\\nನರ್ಸಿಂಗ್","ml":"ഹോം\\nനഴ്‌സിംഗ്","mr":"होम\\nनर्सिंग","ta":"ஹோம்\\nநர்சிங்","te":"హோం\\nనర్ಸಿಂಗ್"}', icon_key: 'svc_homing_nursing', image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/afd8e2afab202de7ddce09bf8add378c861b9347.png', route: '/nurse-care',        visible: true, sort_order: 2 },
                        { id: 'blood_test',     label: '{"en":"Home\\nBlood Test","hi":"घर पर\\nब्लड टेस्ट","bn":"বাড়িতে\\nব্লাড টেস্ট","kn":"ಮನೆ\\nರಕ್ತ ಪರೀಕ್ಷೆ","ml":"ഹോം\\nരക്തപരിശോധന","mr":"घरी\\nरक्त तपासणी","ta":"வீட்டு\\nரத்த பரிசோதனை","te":"హோం\\nబ్లడ్ టెస్ట్"}',     icon_key: 'svc_blood_test',     image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/f74321d18a86a9e77628058ed35a50d284752eb2.png', route: '/blood-test',        visible: true, sort_order: 3 },
                        { id: 'fitness',        label: '{"en":"Fitness &\\nTherapy","hi":"फिटनेस &\\nथेरेपी","bn":"ফিটনেস &\\nথেরাপি","kn":"ಫಿಟ್‌ನೆಸ್ &\\nಥೆರಪಿ","ml":"ഫിറ്റ്‌നസ് &\\nതെറാപ്പി","mr":"फिटनेस &\\nथेरपी","ta":"ஃபிட்னஸ் &\\nதெரபி","te":"ఫిట్‌నెస్ &\\nథెరపీ"}',        icon_key: 'svc_fitness',        image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/54f5c849cf75e776592dec8236f221da3694ca53.png', route: '/physio-fitness',    visible: true, sort_order: 4 },
                        { id: 'equipment',      label: '{"en":"Rent Medical\\nEquipment","hi":"मेडिकल\\nउपकरण किराए पर","bn":"মেডিকেল\\nসরঞ্জাম ভাড়া","kn":"ವೈದ್ಯಕೀಯ\\nಉಪಕರಣ ಬಾಡಿಗೆ","ml":"മെഡിക്കൽ\\nഉപകരണ വാടക","mr":"वैद्यकीय\\nसाधने भाड्याने","ta":"மருத்துவ\\nஆட்டோவை வாடகை","te":"మెడికల్\\nపరికరాల అద్దె"}',      icon_key: 'svc_equipment',      image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/d3906f517597b2ef10369d92c422b16bf20e879e.png', route: '/medical-equipment', visible: true, sort_order: 5 },
                        { id: 'medicines',      label: '{"en":"Order\\nMedicines","hi":"दवाइयां\\nमंगाएं","bn":"ওষুধ\\nঅর্ডার করুন","kn":"ಔಷಧಗಳ\\nಆರ್ಡರ್","ml":"മരുന്നുകൾ\\nഓർഡർ ചെയ്യൂ","mr":"औषधे\\nमागवा","ta":"மருந்துகள்\\nஆர்டர்","te":"మందులు\\nఆర్డర్ చేయండి"}',      icon_key: 'svc_medicines',      image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/79c15725f6f1a73658b615886f1289634cef9408.png', route: '/order-medicines',   visible: true, sort_order: 6 },
                        { id: 'meal',           label: '{"en":"Meal\\nService","hi":"भोजन\\nसेवा","bn":"খাবার\\nসেবা","kn":"ಊಟ\\nಸೇವೆ","ml":"ഭക്ഷണ\\nസേവനം","mr":"जेवण\\nसेवा","ta":"உணவு\\nசேவை","te":"భోజన\\nసేవ"}',           icon_key: 'svc_meal',           image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/8f136eff1200bb21c080348f6cdb7ad1c2831bdf.png', route: '/meal-service',      visible: true, sort_order: 7 },
                        { id: 'physio',         label: '{"en":"Physio\\nFitness","hi":"फिजियो\\nफिटनेस","bn":"ফিজিও\\nফিটনেস","kn":"ಫಿಜಿಯೋ\\nಫಿಟ್‌ನೆಸ್","ml":"ഫിസിയോ\\nഫിറ്റ്‌നസ്","mr":"फिजिओ\\nफिटनेस","ta":"ஃபிசியோ\\nஃபிட்னஸ்","te":"ఫిజియో\\nఫిట్‌నెస్"}',         icon_key: 'svc_physio',         image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/4ea419052803769fad63ff4292316ce7f8f77dbc.png', route: '/physio',    visible: true, sort_order: 8 },
                        { id: 'hospital_trip',  label: '{"en":"Hospital\\nTrip","hi":"अस्पताल\\nयात्रा","bn":"হাসপাতাল\\nট্রিপ","kn":"ಆಸ್ಪತ್ರೆ\\nಪ್ರಯಾಣ","ml":"ആശുപത്രി\\nട്രിപ്പ്","mr":"रुग्णालय\\nप्रवास","ta":"மருத்துவமனை\\nட்ரிப்","te":"ఆసుపత్రి\\nట్రిప్"}',  icon_key: 'svc_hospital_trip',  image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png', route: '/hospital-trip',     visible: true, sort_order: 9 },
                        { id: 'insurance',      label: '{"en":"Insurance\\n& Claims","hi":"बीमा\\n& दावे","bn":"বীমা\\n& দাবি","kn":"ವಿಮೆ\\n& ಕ್ಲೇಮ್","ml":"ഇൻഷുറൻസ്\\n& ക്ലെയിം","mr":"विमा\\n& दावे","ta":"காப்பீடு\\n& கோரிக்கை","te":"ఇన్సూరెన్స్\\n& క్లెయిమ్స్"}',      icon_key: 'svc_insurance',      image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/e453f94c7e87531b0da0b6712f8dc4b3bc7084a9.png', route: '/insurance',         visible: true, sort_order: 10 },
                    ],
                },
                {
                    id: 'trust_badges',
                    type: 'trust_badges',
                    visible: true,
                    sort_order: 3,
                    items: [
                        { id: 'support',    label: '{"en":"24/7 Support","hi":"24/7 सहायता","bn":"24/7 সাপোর্ট","kn":"24/7 ಸಹಾಯ","ml":"24/7 പിന്തുണ","mr":"24/7 सहाय्य","ta":"24/7 ஆதரவு","te":"24/7 సపోర్ట్"}',    icon_key: 'badge_support',    image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/cea3b8dc2ce488942e83a8a4cd0dbe1e6173764b.png', visible: true, sort_order: 1 },
                        { id: 'caregivers', label: '{"en":"Verified Caregivers","hi":"सत्यापित देखभालकर्ता","bn":"যাচাইকৃত কেয়ারগিভার","kn":"ಪರಿಶೀಲಿಸಿದ ಕೇರ್‌ಗಿವರ್","ml":"സ്ഥിരീകരിച്ച കെയർഗിവർ","mr":"सत्यापित काळजीवाहू","ta":"சரிபார்க்கப்பட்ட கவனிப்பாளர்","te":"ధృవీకరించిన కేర్‌గివర్లు"}', icon_key: 'badge_caregivers', image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/4dcdffbd537a1de53d947d7f0c7c548318bc85a7.png', visible: true, sort_order: 2 },
                        { id: 'family',     label: '{"en":"Family-first Care","hi":"परिवार प्रथम देखभाल","bn":"পরিবার-প্রথম যত্ন","kn":"ಕುಟುಂಬ-ಮೊದಲ ಕಾಳಜಿ","ml":"കുടുംബ-ആദ്യ കരുതൽ","mr":"कुटुंब-प्रथम काळजी","ta":"குடும்பம்-முதல் கவனிப்பு","te":"కుటుంబం-ముందు కేర్"}',  icon_key: 'badge_family',     image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/f90ea6c9d084318475183b0a2f11175f0f34640e.png', visible: true, sort_order: 3 },
                    ],
                },
                {
                    id: 'sos_banner',
                    type: 'sos_banner',
                    visible: true,
                    sort_order: 4,
                    config: {
                        title_line1: '{"en":"Need Immediate","hi":"तत्काल जरूरत","bn":"তাৎক্ষণিক প্রয়োজন","kn":"ತಕ್ಷಣದ ಅಗತ್ಯ","ml":"ഉടൻ ആവശ്യം","mr":"तातडीची गरज","ta":"உடனடி தேவை","te":"తక్షణ అవసరం"}',
                        title_line2: '{"en":"Medical Support?","hi":"चिकित्सा सहायता?","bn":"চিকিৎসা সহায়তা?","kn":"ವೈದ್ಯಕೀಯ ಸಹಾಯ?","ml":"മെഡിക്കൽ സഹായം?","mr":"वैद्यकीय मदत?","ta":"மருத்துவ ஆதரவு?","te":"మెడికల్ సపోర్ట్?"}',
                        cta_text: '{"en":"Click here","hi":"यहाँ क्लिक करें","bn":"এখানে ক্লিক করুন","kn":"ಇಲ್ಲಿ ಕ್ಲಿಕ್ ಮಾಡಿ","ml":"ഇവിടെ ക്ലിക്ക് ചെയ്യൂ","mr":"येथे क्लिक करा","ta":"இங்கே கிளிக் செய்யுங்கள்","te":"ఇక్కడ క్లిక్ చేయండి"}',
                        cta_route: '/sos-emergency',
                        icon_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/5eedb2a89f68f0fea90ef304401e7d38d0fc1790.png',
                        illustration_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/e453f94c7e87531b0da0b6712f8dc4b3bc7084a9.png',
                    },
                },
                {
                    id: 'essentials',
                    type: 'essentials_grid',
                    title: '{"en":"Home Essentials Services","hi":"होम एसेंशियल सेवाएं","bn":"হোম এসেনশিয়াল সেবা","kn":"ಹೋಮ್ ಎಸೆಂಷಿಯಲ್ ಸೇವೆಗಳು","ml":"ഹോം എസൻഷ്യൽ സേവനങ്ങൾ","mr":"होम एसेंशियल सेवा","ta":"வீட்டு அத்தியாவசிய சேவைகள்","te":"హోమ్ ఎసెన్షియల్ సేవలు"}',
                    visible: true,
                    sort_order: 5,
                    view_all_route: '/all-home-essentials',
                    config: { columns: 4, max_visible_rows: 2 },
                    items: [
                        { id: 'ac_repair',    label: '{"en":"AC\\nRepair","hi":"AC\\nमरम्मत","bn":"AC\\nমেরামত","kn":"AC\\nರಿಪೇರಿ","ml":"AC\\nറിപ്പയർ","mr":"AC\\nदुरुस्ती","ta":"AC\\nபழுதுபார்ப்பு","te":"AC\\nరిపేర్"}',    icon_key: 'ess_ac_repair', image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/fa6360cf6179cebaed29a6c808bafae2d31ad753.png', route: '/appliance-repair',     visible: true, sort_order: 1 },
                        { id: 'plumbing',     label: '{"en":"Plumbing","hi":"प्लम्बिंग","bn":"প্লাম্বিং","kn":"ಪ್ಲಂಬಿಂಗ್","ml":"പ്ലംബിംഗ്","mr":"प्लंबिंग","ta":"பிளம்பிங்","te":"ప్లంబింగ్"}',        icon_key: 'ess_plumbing',  image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/8ce612b04a3a83f1e834c7b71a6dd2c0174cb918.png', route: '/plumbing-electrical',  visible: true, sort_order: 2 },
                        { id: 'cleaning',     label: '{"en":"Cleaning","hi":"सफाई","bn":"পরিষ্কার","kn":"ಸ್ವಚ್ಛತೆ","ml":"ക്ലീനിംഗ്","mr":"स्वच्छता","ta":"சுத்தம்","te":"క్లీనింగ్"}',        icon_key: 'ess_cleaning',  image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/ad6b9b061bc7b1487a0e73c2557f711136d2a4d9.png', route: '/deep-cleaning',        visible: true, sort_order: 3 },
                        { id: 'driver',       label: '{"en":"Driver","hi":"ड्राइवर","bn":"ড্রাইভার","kn":"ಡ್ರೈವರ್","ml":"ഡ്രൈവർ","mr":"ड्रायव्हर","ta":"டிரைவர்","te":"డ్రైవర్"}',          icon_key: 'ess_driver',    image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/60d4d0afa5801aeaa9e593bc049e3b017ef5624c.png', route: '/driving-cab',          visible: true, sort_order: 4 },
                        { id: 'bills',        label: '{"en":"Bills","hi":"बिल","bn":"বিল","kn":"ಬಿಲ್ಗಳು","ml":"ബില്ലുകൾ","mr":"बिले","ta":"பில்கள்","te":"బిల్లులు"}',           icon_key: 'ess_bills',     image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/056ecb9c01dd2283b1c0db1e84c1eb94c6d8a45a.png', route: '/bill-payment',         visible: true, sort_order: 5 },
                        { id: 'bank',         label: '{"en":"Bank\\nWork","hi":"बैंक\\nकार्य","bn":"ব্যাংক\\nকাজ","kn":"ಬ್ಯಾಂಕ್\\nಕೆಲಸ","ml":"ബാങ്ക്\\nജോലി","mr":"बँक\\nकाम","ta":"வங்கி\\nவேலை","te":"బ్యాంక్\\nపని"}',      icon_key: 'ess_bank',      image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/33ede0e57be708b9775957c3ecec7013b0a56c6d.png', route: '/bank-paperwork',       visible: true, sort_order: 6 },
                        { id: 'grocery',      label: '{"en":"Grocery","hi":"किराना","bn":"মুদিখানা","kn":"ಕಿರಾಣಿ","ml":"ഗ്രോസറി","mr":"किराणा","ta":"மளிகை","te":"కిరాణా"}',      icon_key: 'ess_grocery',   image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/8888c71f466119aa294bd00136ff887f616d4737.png', route: '/grocery-run',          visible: true, sort_order: 7 },
                        { id: 'anything',     label: '{"en":"Anything\\nElse","hi":"कुछ और","bn":"যেকোনো কিছু","kn":"ಇನ್ನಾವುದಾದರೂ","ml":"മറ്റെന്തും","mr":"इतर काही","ta":"வேறு எதுவும்","te":"ఇంకేదైనా"}',  icon_key: 'ess_anything',  image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/6c8ed456023258e8b4095af93909c6cbc6c4b909.png', route: '/anything-else',        visible: true, sort_order: 8 },
                        { id: 'paper_legal',  label: '{"en":"Paper &\\nLegal","hi":"कागज &\\nकानूनी","bn":"কাগজ &\\nআইনি","kn":"ಕಾಗದ &\\nಕಾನೂನು","ml":"പേപ്പർ &\\nനിയമം","mr":"कागद &\\nकायदेशीर","ta":"காகிதம் &\\nசட்டம்","te":"పేపర్ &\\nలీగల్"}',  icon_key: 'ess_bank',      image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/33ede0e57be708b9775957c3ecec7013b0a56c6d.png', route: '/paper-legal',          visible: true, sort_order: 9 },
                        { id: 'trip_travel',  label: '{"en":"Trip &\\nTravel","hi":"यात्रा &\\nट्रेवल","bn":"ভ্রমণ","kn":"ಪ್ರವಾಸ &\\nಟ್ರಾವೆಲ್","ml":"ട്രിപ്പ് &\\nട്രാവൽ","mr":"प्रवास &\\nट्रॅव्हल","ta":"பயணம் &\\nட்ராவல்","te":"ట్రిప్ &\\nట్రావెల్"}',  icon_key: 'ess_driver',    image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/60d4d0afa5801aeaa9e593bc049e3b017ef5624c.png', route: '/trip-travels',         visible: true, sort_order: 10 },
                        { id: 'tech_helper',  label: '{"en":"Tech\\nHelper","hi":"टेक\\nसहायक","bn":"টেক\\nহেল্পার","kn":"ತಂತ್ರಜ್ಞಾನ\\nಸಹಾಯಕ","ml":"ടെക്\\nഹെൽപ്പർ","mr":"तंत्रज्ञान\\nसहाय्यक","ta":"டெக்\\nஹெல்பர்","te":"టెక్\\nహెల్పర్"}',  icon_key: 'ess_ac_repair', image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/fa6360cf6179cebaed29a6c808bafae2d31ad753.png', route: '/tech-helper',          visible: true, sort_order: 11 },
                        { id: 'smart_upgrade',label: '{"en":"Smart\\nUpgrade","hi":"स्मार्ट\\nअपग्रेड","bn":"স্মার্ট\\nআপগ্রেড","kn":"ಸ್ಮಾರ್ಟ್\\nಅಪ್‌ಗ್ರೇಡ್","ml":"സ്മാർട്ട്\\nഅപ്‌ഗ്രേഡ്","mr":"स्मार्ट\\nअपग्रेड","ta":"ஸ்மார்ட்\\nஅப்கிரேட்","te":"స్మార్ట్\\nఅప్‌గ్రేడ్"}',icon_key: 'ess_cleaning',  image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/ad6b9b061bc7b1487a0e73c2557f711136d2a4d9.png', route: '/smart-upgrade',        visible: true, sort_order: 12 },
                    ],
                },
            ],
        },

        // ── Plans Screen ───────────────────────────────────────────────────
        plans: {
            banner: {
                title: '{"en":"Value Plans for Your Peace of Mind","hi":"आपकी शांति के लिए मूल्य योजनाएं","bn":"আপনার মানসিক শান্তির জন্য ভ্যালু প্ল্যান","kn":"ನಿಮ್ಮ ಮನಸ್ಸಿನ ಶಾಂತಿಗಾಗಿ ಮೌಲ್ಯ ಯೋಜನೆಗಳು","ml":"നിങ്ങളുടെ മനഃശാന്തിക്കായി വാല്യൂ പ്ലാനുകൾ","mr":"आपल्या मनःशांतीसाठी व्हॅल्यू प्लॅन्स","ta":"உங்கள் மன அமைதிக்கான மதிப்பு திட்டங்கள்","te":"మీ మనస్సు శాంతికి విలువ ప్రణాళికలు"}',
                subtitle: '{"en":"Subscribe and save with our exclusive ayuxacare plans.","hi":"हमारी विशेष ayuxacare योजनाओं से सदस्यता लें और बचत करें।","bn":"আমাদের এক্সক্লুসিভ ayuxacare প্ল্যান সাবস্ক্রাইব করুন।","kn":"ನಮ್ಮ ಎಕ್ಸ್‌ಕ್ಲೂಸಿವ್ ayuxacare ಯೋಜನೆಗಳಿಗೆ ಸದಸ್ಯರಾಗಿ.","ml":"ഞങ്ങളുടെ ayuxacare പ്ലാനുകൾ സബ്‌സ്‌ക്രൈബ് ചെയ്ത് ലാഭിക്കൂ.","mr":"आमच्या विशेष ayuxacare योजनांसाठी सदस्यता घ्या.","ta":"எங்கள் ayuxacare திட்டங்களில் சேர்ந்து சேமியுங்கள்.","te":"మా ayuxacare ప్లాన్‌లకు సభ్యత్వం పొందండి."}',
            },
            plans: [
                {
                    id: 'care_plan',
                    name: 'Care Plan',
                    accent_color: '#4B78D8',
                    price_bg_color: '#56BDB7',
                    cta_color: '#4B78D8',
                    tab_bg: '#EAEFFF',
                    tab_active_bg: '#D1DEFE',
                    tab_text_color: '#4B73D0',
                    active_duration_label: 'Yearly',
                    durations: [
                        { label: 'Quarterly',  price: '₹599',   suffix: '/ Quarterly' },
                        { label: 'Biannually', price: '₹999',   suffix: '/ Biannually' },
                        { label: 'Yearly',     price: '₹1,999', suffix: '/ Yearly' },
                    ],
                    features: [
                        '25% Off Healthy Meals',
                        'Temple & Picnic Group Trips',
                        'Paperwork & Tech Support',
                    ],
                    cta_text: 'View Details / Subscribe',
                    cta_route: '/smart-upgrade',
                    visible: true,
                    sort_order: 1,
                },
                {
                    id: 'home_maker_plan',
                    name: 'Home Maker Plan',
                    accent_color: '#048357',
                    price_bg_color: '#75B55E',
                    cta_color: '#42884F',
                    tab_bg: '#E8F5E9',
                    tab_active_bg: '#D8ECDC',
                    tab_text_color: '#048357',
                    active_duration_label: 'Yearly',
                    durations: [
                        { label: 'Quarterly',  price: '₹1,499', suffix: '/ Quarterly' },
                        { label: 'Biannually', price: '₹2,499', suffix: '/ Biannually' },
                        { label: 'Yearly',     price: '₹4,799', suffix: '/ Yearly' },
                    ],
                    features: [
                        'Home Cook (Daily Meals)',
                        'Bank, Will & ID Certificate Updates',
                        'Medicines & Doctor Visits',
                        'Tech Help at Home',
                    ],
                    cta_text: 'View Details / Subscribe',
                    cta_route: '/smart-upgrade',
                    visible: true,
                    sort_order: 2,
                },
            ],
            benefits: [
                {
                    id: 'save_big',
                    title: '{"en":"Save Big","hi":"बड़ी बचत","bn":"বড় সঞ্চয়","kn":"ದೊಡ್ಡ ಉಳಿತಾಯ","ml":"വലുതായി ലാഭിക്കൂ","mr":"मोठी बचत","ta":"பெரிய சேமிப்பு","te":"పెద్ద ఆదా"}',
                    description: '{"en":"Recover your plan cost in just 2 orders.","hi":"केवल 2 ऑर्डर में अपनी योजना की लागत वसूल करें।","bn":"মাত্র ২ অর্ডারে প্ল্যানের খরচ উঠিয়ে নিন।","kn":"ಕೇವಲ 2 ಆರ್ಡರ್‌ಗಳಲ್ಲಿ ನಿಮ್ಮ ಯೋಜನೆಯ ವೆಚ್ಚ ಮರುಪಡೆಯಿರಿ.","ml":"2 ഓർഡറുകളിൽ പ്ലാൻ ചെലവ് തിരിച്ചുപിടിക്കൂ.","mr":"फक्त 2 ऑर्डरमध्ये प्लॅनचा खर्च वसूल करा.","ta":"வெறும் 2 ஆர்டர்களில் உங்கள் திட்டத்தின் செலவை மீட்டெடுங்கள்.","te":"కేవలం 2 ఆర్డర్లలో మీ ప్లాన్ ఖర్చు రికవర్ అవుతుంది."}',
                    highlight: '2 orders.',
                    icon_key: 'benefit_money_bag',
                    image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/26948a93a4bbaa57b96ff130f4425886b3c5d292.png',
                    sort_order: 1,
                },
                {
                    id: 'priority_support',
                    title: '{"en":"Priority Support","hi":"प्राथमिकता सहायता","bn":"প্রায়োরিটি সাপোর্ট","kn":"ಆದ್ಯತೆ ಸಹಾಯ","ml":"പ്രൊആരിടി സപ്പോർട്ട്","mr":"प्राधान्य सहाय्य","ta":"முன்னுரிமை ஆதரவு","te":"ప్రాయారిటీ సపోర్ట్"}',
                    description: '{"en":"Skip the queue. Members get answered first.","hi":"कतार छोड़ें। सदस्यों को पहले उत्तर मिलता है।","bn":"লাইন ছাড়ুন। সদস্যরা প্রথমে উত্তর পান।","kn":"ಕ್ಯೂ ಬಿಡಿ. ಸದಸ್ಯರಿಗೆ ಮೊದಲು ಉತ್ತರ ಸಿಗುತ್ತದೆ.","ml":"ക്യൂ ഒഴിവാക്കൂ. അംഗങ്ങൾക്ക് ആദ്യം ഉത്തരം.","mr":"रांग सोडा. सदस्यांना प्रथम उत्तर मिळते.","ta":"வரிசையைத் தவிருங்கள். உறுப்பினர்களுக்கு முதலில் பதில் கிடைக்கும்.","te":"క్యూ దాటండి. సభ్యులకు ముందు సమాధానం వస్తుంది."}',
                    highlight: 'Skip the queue.',
                    icon_key: 'benefit_checkmark',
                    image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/019640d27de157c119b045c46aae6a6559dd3a79.png',
                    sort_order: 2,
                },
                {
                    id: 'family_updates',
                    title: '{"en":"Family Updates","hi":"परिवार अपडेट","bn":"পরিবার আপডেট","kn":"ಕುಟುಂಬ ಅಪ್‌ಡೇಟ್","ml":"കുടുംബ അപ്‌ഡേറ്റ്","mr":"कुटुंब अपडेट","ta":"குடும்ப புதுப்பிப்புகள்","te":"కుటుంబ అప్‌డేట్లు"}',
                    description: '{"en":"We send a weekly health report to your children.","hi":"हम आपके बच्चों को साप्ताहिक स्वास्थ्य रिपोर्ट भेजते हैं।","bn":"আমরা আপনার সন্তানদের সাপ্তাহিক স্বাস্থ্য রিপোর্ট পাঠাই।","kn":"ನಾವು ನಿಮ್ಮ ಮಕ್ಕಳಿಗೆ ಸಾಪ್ತಾಹಿಕ ಆರೋಗ್ಯ ವರದಿ ಕಳುಹಿಸುತ್ತೇವೆ.","ml":"ഞങ്ങൾ നിങ്ങളുടെ കുട്ടികൾക്ക് വാരാന്ത്യ ആരോഗ്യ റിപ്പോർട്ട് അയക്കും.","mr":"आम्ही तुमच्या मुलांना साप्ताहिक आरोग्य अहवाल पाठवतो.","ta":"நாங்கள் உங்கள் பிள்ளைகளுக்கு வாராந்திர உடல்நல அறிக்கை அனுப்புகிறோம்.","te":"మేము మీ పిల్లలకు వారంవారీ ఆరోగ్య నివేదిక పంపుతాం."}',
                    highlight: '',
                    icon_key: 'benefit_family',
                    image_url: 'https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/26945e6abc1b678cf3cb29a1a66c0cf290cc7cfd.png',
                    sort_order: 3,
                },
            ],
        },

        // ── City Selection Screen ──────────────────────────────────────────
        city_selection: {
            cities: [
                { id: 'bangalore', name: 'Bangalore', state: 'Karnataka',    available: true,  sort_order: 1 },
                { id: 'chennai',   name: 'Chennai',   state: 'Tamil Nadu',   available: false, sort_order: 2 },
                { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana',    available: false, sort_order: 3 },
                { id: 'mumbai',    name: 'Mumbai',    state: 'Maharashtra',  available: false, sort_order: 4 },
                { id: 'delhi',     name: 'Delhi NCR', state: 'Delhi',        available: false, sort_order: 5 },
                { id: 'pune',      name: 'Pune',      state: 'Maharashtra',  available: false, sort_order: 6 },
            ],
        },

        // ── Language Selection Screen ──────────────────────────────────────
        language_selection: {
            languages: [
                { code: 'en', label: 'English',   native_label: 'English',  sort_order: 1 },
                { code: 'hi', label: 'Hindi',     native_label: 'हिन्दी',   sort_order: 2 },
                { code: 'kn', label: 'Kannada',   native_label: 'ಕನ್ನಡ',    sort_order: 3 },
                { code: 'ta', label: 'Tamil',     native_label: 'தமிழ்',    sort_order: 4 },
                { code: 'te', label: 'Telugu',    native_label: 'తెలుగు',   sort_order: 5 },
                { code: 'ml', label: 'Malayalam', native_label: 'മലയാളം',   sort_order: 6 },
                { code: 'mr', label: 'Marathi',   native_label: 'मराठी',    sort_order: 7 },
                { code: 'bn', label: 'Bengali',   native_label: 'বাংলা',    sort_order: 8 },
            ],
        },

        doctor_visit: {
            title: 'Doctor Home Visit',
            sections: [
                {
                    id: "header",
                    type: "header",
                    components: [
                        { id: "header_title", type: "text", data: { label: "Doctor Home Visit", icon: "", tagline: "" } }
                    ]
                },
                {
                    id: "description_card",
                    type: "banner",
                    data: { label: "Booking a doctor or physiotherapist to visit your home for non-emergency issues.", icon: "", tagline: "physiotherapist", action: null }
                },
                {
                    id: "select_problem_section",
                    type: "section",
                    title: "Select Problem",
                    components: [
                        {
                            id: "problems_grid",
                            type: "grid",
                            layout: { columns: 3 },
                            items: [
                                { id: "fever_flu", label: "Fever/Flu", icon: "https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/85703338762dce300aaacb9a05f302adc3d527f4.png", tagline: "", action: { type: "navigate", route: "select_problem" } },
                                { id: "bp_sugar", label: "BP/Sugar check", icon: "https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/a094df3aff84fca10f86363d2a72a2a9a16cb8b9.png", tagline: "", action: { type: "navigate", route: "select_problem" } },
                                { id: "general_weakness", label: "General Weakness", icon: "https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/a4cc4e445884c7ec5ea2ea73c3cf8315b9a5fd4b.png", tagline: "", action: { type: "navigate", route: "select_problem" } },
                                { id: "body_pain", label: "Body pain/joint pain", icon: "https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/3a3fbbfc074010919d54378e2349e7a3ecdea262.png", tagline: "", action: { type: "navigate", route: "select_problem" } },
                                { id: "post_surgery", label: "Post-surgery Rehab", icon: "https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/cc303b4d8fc2cc0ba55dc7a7b0eaaee1385183f1.png", tagline: "", action: { type: "navigate", route: "select_problem" } },
                                { id: "stroke_recovery", label: "Stroke Recovery", icon: "https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/9c25016906e38b6b999adf0f9fb6cb2adb589322.png", tagline: "", action: { type: "navigate", route: "select_problem" } },
                                { id: "frozen_shoulder", label: "Frozen shoulder", icon: "https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/05879295a9b69201cfab443f22bf9218402f1522.png", tagline: "", action: { type: "navigate", route: "select_problem" } },
                                { id: "other", label: "Other", icon: "https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/34a78d011624199a5541b871a68bb218b41e5aba.png", tagline: "", action: { type: "navigate", route: "select_problem" } }
                            ]
                        },
                        {
                            id: "smart_banner",
                            type: "banner",
                            data: { label: "Smart :", icon: "", tagline: "Post-surgery, frozen shoulder & stroke visits will auto-select physiotherapist", action: { type: "navigate", route: "" } }
                        }
                    ]
                },
                {
                    id: "select_doctor_type_section",
                    type: "section",
                    title: "Select Doctor Type",
                    components: [
                        {
                            id: "doctor_types_grid",
                            type: "grid",
                            layout: { columns: 2 },
                            items: [
                                { id: "GP", label: "General Physician", icon: "https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/9bbd0539ddfd504d8362c951cb07d107b0df9fdf.png", tagline: "", action: { type: "navigate", route: "select_doctor_type" } },
                                { id: "Physio", label: "Physiotherapist", icon: "https://storage.googleapis.com/ayuxa-assets/mobile/assets/images/ad2bd697d39bc0738ca19a09e58ce4677761ca47.png", tagline: "", action: { type: "navigate", route: "select_doctor_type" } }
                            ]
                        }
                    ]
                },
                {
                    id: "select_visit_type_section",
                    type: "section",
                    title: "Select Visit Type",
                    components: [
                        {
                            id: "visit_types_grid",
                            type: "grid",
                            layout: { columns: 2 },
                            items: [
                                { id: "Home", label: "Home Session", icon: "home-outline", tagline: "", action: { type: "navigate", route: "select_visit_type" } },
                                { id: "Clinic", label: "Clinic Visit", icon: "business-outline", tagline: "", action: { type: "navigate", route: "select_visit_type" } }
                            ]
                        }
                    ]
                },
                {
                    id: "select_when_section",
                    type: "section",
                    title: "When?",
                    components: [
                        {
                            id: "when_list",
                            type: "list",
                            layout: { columns: 1 },
                            items: [
                                { id: "ASAP", label: "Come ASAP", icon: "radio-button-on", tagline: "(Urgent)", action: { type: "navigate", route: "select_when" } },
                                { id: "Later", label: "Schedule for later", icon: "radio-button-off", tagline: "(Date & Time Picker)", action: { type: "navigate", route: "select_when" } }
                            ]
                        }
                    ]
                },
                {
                    id: "upload_documents_section",
                    type: "section",
                    title: "Upload Reports (Optional)",
                    components: [
                        {
                            id: "upload_form",
                            type: "form",
                            layout: { columns: 1 },
                            items: [
                                { id: "upload_reports", label: "Upload Reports (Optional)", icon: "cloud-upload-outline", tagline: "JPG, PNG or PDF, help our doctors understand better", action: { type: "navigate", route: "upload_document" } }
                            ]
                        }
                    ]
                },
                {
                    id: "confirm_address_section",
                    type: "section",
                    title: "Confirm Address",
                    components: [
                        {
                            id: "address_form",
                            type: "form",
                            layout: { columns: 1 },
                            items: [
                                { id: "address", label: "Fetching address...", icon: "location-outline", tagline: "Auto-fitted from user profile(Google maps location).", action: { type: "navigate", route: "edit_address" } }
                            ]
                        }
                    ]
                },
                {
                    id: "bottom_action_section",
                    type: "section",
                    title: "",
                    components: [
                        {
                            id: "book_button",
                            type: "form",
                            layout: { columns: 1 },
                            items: [
                                { id: "submit_booking", label: "Book Appointment", icon: "", tagline: "", action: { type: "navigate", route: "submit_booking" } }
                            ]
                        }
                    ]
                }
            ]
        },

        // ── Help & Support Screen ──────────────────────────────────────────
        help_support: {
            phone: '080 4728 0789',
            whatsapp_url: 'https://wa.me/919480198108',
            page_description: '{"en":"Our support team is available to help with bookings, services, and payments.","hi":"हमारी सहायता टीम बुकिंग, सेवाओं और भुगतान में मदद के लिए उपलब्ध है।","bn":"আমাদের সাপোর্ট টিম বুকিং, সেবা এবং পেমেন্টে সাহায্যের জন্য উপলব্ধ।","kn":"ನಮ್ಮ ಬೆಂಬಲ ತಂಡ ಬುಕಿಂಗ್, ಸೇವೆಗಳು ಮತ್ತು ಪಾವತಿಗಳಿಗಾಗಿ ಸಹಾಯ ಮಾಡಲು ಲಭ್ಯವಿದೆ.","ml":"ബുക്കിംഗ്, സേവനങ്ങൾ, പേയ്‌മെന്റ് എന്നിവ സഹായിക്കാൻ ഞങ്ങളുടെ ടീം ലഭ്യമാണ്.","mr":"आमची सहाय्य टीम बुकिंग, सेवा आणि पेमेंटसाठी मदत करण्यास उपलब्ध आहे.","ta":"எங்கள் ஆதரவு குழு முன்பதிவு, சேவைகள் மற்றும் கட்டணங்களுக்கு உதவ கிடைக்கிறது.","te":"మా సపోర్ట్ టీమ్ బుకింగ్, సేవలు మరియు చెల్లింపులకు సహాయం అందుబాటులో ఉంది."}',
            contacts: [
                { id: 'client_support', label: 'Client Support', phone: '080 4728 0789', email: 'support@ayuxacare.com', name: null },
                { id: 'investor_relations', label: 'Investor Relations', phone: '+91 94801 98108', email: 'office@ayuxa.co.in', name: null },
                { id: 'careers', label: 'Careers', phone: null, email: 'careers@ayuxa.co.in', name: null },
                { id: 'general_enquiries', label: 'General Enquiries', phone: '+91 94801 98108', email: 'ho@ayuxa.co.in', name: null },
            ],
            ticket_categories: [
                { id: 'billing',    label: 'Billing',    sort_order: 1 },
                { id: 'service',    label: 'Service',    sort_order: 2 },
                { id: 'complaint',  label: 'Complaint',  sort_order: 3 },
                { id: 'lab',        label: 'Lab / Test', sort_order: 4 },
                { id: 'technical',  label: 'Technical',  sort_order: 5 },
                { id: 'other',      label: 'Other',      sort_order: 6 },
            ],
            ticket_status_colors: {
                open:        '#F5A623',
                in_progress: '#4A90E2',
                resolved:    '#27AE60',
                closed:      '#9B9B9B',
            },
            support_promise: [
                { id: 'ack',     text: '{"en":"Acknowledgement within 48 hours","hi":"48 घंटे के भीतर पावती","bn":"৪৮ ঘণ্টার মধ্যে স্বীকৃতি","kn":"48 ಗಂಟೆಗಳಲ್ಲಿ ಅಂಗೀಕಾರ","ml":"48 മണിക്കൂറിനുള്ളിൽ ഔദ്യോഗിക സ്ഥിരീകരണം","mr":"48 तासांच्या आत पावती","ta":"48 மணி நேரத்திற்குள் ஒப்புகை","te":"48 గంటలలోపు అంగీకారం"}',     ionicon: 'checkmark-circle' },
                { id: 'resolve', text: '{"en":"Resolution within 1 month","hi":"1 महीने के भीतर समाधान","bn":"১ মাসের মধ্যে সমাধান","kn":"1 ತಿಂಗಳಲ್ಲಿ ಪರಿಹಾರ","ml":"1 മാസത്തിനുള്ളിൽ പരിഹാരം","mr":"1 महिन्यात निराकरण","ta":"1 மாதத்திற்குள் தீர்வு","te":"1 నెలలోపు పరిష్కారం"}',                                    ionicon: 'checkmark-circle' },
                { id: 'track',   text: '{"en":"A unique ticket number is provided to track your request.","hi":"आपके अनुरोध को ट्रैक करने के लिए एक अनोखा टिकट नंबर दिया जाता है।","bn":"আপনার অনুরোধ ট্র্যাক করতে একটি অনন্য টিকিট নম্বর দেওয়া হয়।","kn":"ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಲು ಅನನ್ಯ ಟಿಕೆಟ್ ಸಂಖ್ಯೆ ನೀಡಲಾಗುತ್ತದೆ.","ml":"നിങ്ങളുടെ അഭ്യർഥന ട്രാക്ക് ചെയ്യാൻ ഒരു തനതായ ടിക്കറ്റ് നമ്പർ നൽകും.","mr":"आपला अनुरोध ट्रॅक करण्यासाठी एक अनोखा तिकिट क्रमांक दिला जातो.","ta":"உங்கள் கோரிக்கையை கண்காணிக்க ஒரு தனித்துவமான டிக்கெட் எண் வழங்கப்படும்.","te":"మీ అభ్యర్థనను ట్రాక్ చేయడానికి ఒక యూనిక్ టిక్కెట్ నంబర్ ఇవ్వబడుతుంది."}',    ionicon: 'information-circle' },
            ],
            faqs: [
                { id: 'book',     q: 'How do I book a service?',       a: 'Tap any service on the Home screen and follow the steps.',                                             sort_order: 1 },
                { id: 'sos',      q: 'Is SOS always available?',        a: 'Yes, SOS is 24/7. It alerts our team and your emergency contacts instantly.',                          sort_order: 2 },
                { id: 'lab',      q: 'How can I get my lab reports?',   a: 'Reports appear in My Health → Prescriptions and are sent via WhatsApp/Email.',                        sort_order: 3 },
                { id: 'refund',   q: 'What is the refund policy?',      a: 'Cancel 2 hours before the slot for a full refund. Settlement takes 5–7 business days.',               sort_order: 4 },
                { id: 'contacts', q: 'How to add emergency contacts?',  a: 'Go to My Profile → Emergency Contacts.',                                                              sort_order: 5 },
                { id: 'reschedule', q: 'How do I reschedule a service booking?', a: 'Go to My Bookings, select your active booking, and tap Reschedule, or chat/call our support team.', sort_order: 6 },
                { id: 'family',   q: 'Can I book services for family members?', a: 'Yes, you can add family members under My Profile → Family Members and select them when making a booking.', sort_order: 7 },
                { id: 'caregivers', q: 'Are caregivers verified?',      a: 'Yes, all our caregivers and support buddies undergo background verification, screening, and basic medical training.', sort_order: 8 },
                { id: 'membership', q: 'How do I upgrade to a premium plan?', a: 'Navigate to My Profile → Subscription & Membership, select your preferred plan, and proceed to checkout.', sort_order: 9 },
                { id: 'emergency', q: 'What should I do in a medical emergency?', a: 'For life-threatening emergencies, call national emergency lines immediately. Tap the SOS Assist button on our app to alert our local response team and your emergency contacts.', sort_order: 10 },
            ],
        },
    },
};

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * GET /api/app-config
 * Public. Returns the current SDUI config.
 * Checks DB for an admin-published override first; falls back to DEFAULT_CONFIG.
 */
const getAppConfig = async (req, res) => {
    try {
        const stored = await prisma.uIConfig.findUnique({
            where: { key: 'sdui_app_config' },
        });

        if (stored?.configJson) {
            return res.json({ success: true, data: stored.configJson });
        }

        return res.json({ success: true, data: DEFAULT_CONFIG });
    } catch (error) {
        // Never fail the mobile app — always return the default
        logger.error('App config fetch error:', error.message);
        return res.json({ success: true, data: DEFAULT_CONFIG });
    }
};

/**
 * PUT /api/app-config
 * SUPER_ADMIN only. Publishes a new config to the mobile app.
 * Body: { config: { ...full AppConfig object } }
 */
const updateAppConfig = async (req, res, next) => {
    try {
        const { config } = req.body;
        if (!config || typeof config !== 'object') {
            return res.status(400).json({ success: false, message: 'config object required' });
        }

        await prisma.uIConfig.upsert({
            where:  { key: 'sdui_app_config' },
            create: {
                type:       'CUSTOM',
                key:        'sdui_app_config',
                label:      'SDUI App Configuration',
                configJson: config,
                sortOrder:  0,
                isVisible:  true,
                version:    1,
            },
            update: {
                configJson:  config,
                version:     { increment: 1 },
                publishedAt: new Date(),
            },
        });

        logger.info('SDUI app config updated by admin:', req.admin?.id);
        return res.json({ success: true, message: 'App config published' });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/app-config/reset
 * SUPER_ADMIN only. Deletes the DB override — reverts app to DEFAULT_CONFIG.
 */
const resetAppConfig = async (req, res, next) => {
    try {
        await prisma.uIConfig.deleteMany({ where: { key: 'sdui_app_config' } });
        logger.info('SDUI app config reset to defaults by admin:', req.admin?.id);
        return res.json({ success: true, message: 'App config reset to defaults' });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/app-config/default
 * SUPER_ADMIN only. Returns the hardcoded DEFAULT_CONFIG for reference.
 * Useful when building the admin UI editor.
 */
const getDefaultConfig = (req, res) => {
    return res.json({ success: true, data: DEFAULT_CONFIG });
};

const DEFAULT_HOME_CONFIG = {
  version: "1.0.0",
  banners: [
    {
      id: "banner_greeting",
      image: "banner.png",
      title: "Your health, our priority",
      subtitle: "Book a doctor visit in minutes",
      cta_route: "/doctor-visit",
      enabled: true
    }
  ],
  sections: [
    {
      id: "quick_services",
      title: "Quick Services",
      type: "quick_services",
      enabled: true,
      sort_order: 1,
      services: [
        {
          id: "doctor_quick",
          label: "Doctor\nVisit",
          icon: "onlylogo.png",
          route: "/doctor-visit",
          enabled: true,
          sort_order: 1
        },
        {
          id: "nurse_quick",
          label: "Nurse &\nAide",
          icon: "21e5a8a8650cf8eda36be3744c70099580173129.png",
          route: "/nurse-care",
          enabled: true,
          sort_order: 2
        },
        {
          id: "hospital_quick",
          label: "Hospital\nVisit",
          icon: "e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png",
          route: "/hospital-trip",
          enabled: true,
          sort_order: 3
        },
        {
          id: "caregiver_quick",
          label: "Caregiver",
          icon: "2fb222a5f206ff64415b72a8d4ac9290b4e6f720.png",
          route: "/caregiver-support",
          enabled: true,
          sort_order: 4
        }
      ]
    },
    {
      id: "ayuxa_services",
      title: "Diagnostics & Fitness",
      type: "service_grid",
      enabled: true,
      sort_order: 2,
      max_items: 6,
      view_all_route: "/all-ayuxa-services",
      services: [
        {
          id: "blood_test",
          label: "Blood\nWork",
          icon: "f74321d18a86a9e77628058ed35a50d284752eb2.png",
          route: "/blood-test",
          enabled: true,
          sort_order: 1
        },
        {
          id: "scan_ecg",
          label: "Scan &\nECG",
          icon: "scan&ecg.jpg",
          route: "/account/medical-logs",
          enabled: true,
          sort_order: 2
        },
        {
          id: "medicines",
          label: "Medicine",
          icon: "79c15725f6f1a73658b615886f1289634cef9408.png",
          route: "/order-medicines",
          enabled: true,
          sort_order: 3
        },
        {
          id: "insurance",
          label: "Insurance",
          icon: "e453f94c7e87531b0da0b6712f8dc4b3bc7084a9.png",
          route: "/insurance",
          enabled: true,
          sort_order: 4
        },
        {
          id: "fitness",
          label: "Fitness",
          icon: "54f5c849cf75e776592dec8236f221da3694ca53.png",
          route: "/physio-fitness",
          enabled: true,
          sort_order: 5
        },
        {
          id: "equipment",
          label: "Equipment",
          icon: "d3906f517597b2ef10369d92c422b16bf20e879e.png",
          route: "/medical-equipment",
          enabled: true,
          sort_order: 6
        },
        {
          id: "caregiver",
          label: "Caregiver\nSupport",
          icon: "2fb222a5f206ff64415b72a8d4ac9290b4e6f720.png",
          route: "/caregiver-support",
          enabled: true,
          sort_order: 7
        },
        {
          id: "emergency",
          label: "Emergency\nAssist",
          icon: "e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png",
          route: "/sos-emergency",
          enabled: false,
          sort_order: 8
        },
        {
          id: "meal",
          label: "Meal\nService",
          icon: "8f136eff1200bb21c080348f6cdb7ad1c2831bdf.png",
          route: "/meal-service",
          enabled: true,
          sort_order: 9
        }
      ]
    },
    {
      id: "essentials",
      title: "Home Essentials Services",
      type: "essentials_grid",
      enabled: true,
      sort_order: 3,
      max_items: 8,
      view_all_route: "/all-home-essentials",
      services: [
        {
          id: "ac_repair",
          label: "AC\nRepair",
          icon: "fa6360cf6179cebaed29a6c808bafae2d31ad753.png",
          route: "/appliance-repair",
          enabled: false,
          sort_order: 1
        },
        {
          id: "plumbing",
          label: "Plumbing",
          icon: "8ce612b04a3a83f1e834c7b71a6dd2c0174cb918.png",
          route: "/plumbing-electrical",
          enabled: true,
          sort_order: 2
        },
        {
          id: "cleaning",
          label: "Cleaning",
          icon: "ad6b9b061bc7b1487a0e73c2557f711136d2a4d9.png",
          route: "/deep-cleaning",
          enabled: true,
          sort_order: 3
        },
        {
          id: "driver",
          label: "Driver",
          icon: "60d4d0afa5801aeaa9e593bc049e3b017ef5624c.png",
          route: "/driving-cab",
          enabled: true,
          sort_order: 4
        },
        {
          id: "bills",
          label: "Bills",
          icon: "056ecb9c01dd2283b1c0db1e84c1eb94c6d8a45a.png",
          route: "/bill-payment",
          enabled: true,
          sort_order: 5
        },
        {
          id: "bank",
          label: "Bank\nWork",
          icon: "33ede0e57be708b9775957c3ecec7013b0a56c6d.png",
          route: "/bank-paperwork",
          enabled: true,
          sort_order: 6
        },
        {
          id: "grocery",
          label: "Gro-\ncery",
          icon: "8888c71f466119aa294bd00136ff887f616d4737.png",
          route: "/grocery-run",
          enabled: true,
          sort_order: 7
        },
        {
          id: "anything",
          label: "Anything\nElse",
          icon: "6c8ed456023258e8b4095af93909c6cbc6c4b909.png",
          route: "/anything-else",
          enabled: true,
          sort_order: 8
        },
        {
          id: "paper_legal",
          label: "Paper &\nLegal",
          icon: "33ede0e57be708b9775957c3ecec7013b0a56c6d.png",
          route: "/paper-legal",
          enabled: true,
          sort_order: 9
        },
        {
          id: "trip_travel",
          label: "Trip &\nTravel",
          icon: "60d4d0afa5801aeaa9e593bc049e3b017ef5624c.png",
          route: "/trip-travels",
          enabled: true,
          sort_order: 10
        },
        {
          id: "tech_helper",
          label: "Tech\nHelper",
          icon: "fa6360cf6179cebaed29a6c808bafae2d31ad753.png",
          route: "/tech-helper",
          enabled: true,
          sort_order: 11
        },
        {
          id: "smart_upgrade",
          label: "Smart\nUpgrade",
          icon: "ad6b9b061bc7b1487a0e73c2557f711136d2a4d9.png",
          route: "/smart-upgrade",
          enabled: true,
          sort_order: 12
        }
      ]
    }
  ],
  "trust_badges": [
    {
      "id": "support",
      "label": "24/7 Support",
      "icon": "cea3b8dc2ce488942e83a8a4cd0dbe1e6173764b.png",
      "enabled": true,
      "sort_order": 1
    },
    {
      "id": "caregivers",
      "label": "Verified Caregivers",
      "icon": "4dcdffbd537a1de53d947d7f0c7c548318bc85a7.png",
      "enabled": false,
      "sort_order": 2
    },
    {
      "id": "family",
      "label": "Family-first Care",
      "icon": "f90ea6c9d084318475183b0a2f11175f0f34640e.png",
      "enabled": true,
      "sort_order": 3
    }
  ],
  "sos_banner": {
    "enabled": true,
    "title_line1": "Need Immediate",
    "title_line2": "Medical Support?",
    "cta_text": "Click here",
    "cta_route": "/sos-emergency",
    "icon": "5eedb2a89f68f0fea90ef304401e7d38d0fc1790.png",
    "illustration": "e453f94c7e87531b0da0b6712f8dc4b3bc7084a9.png"
  }
};

/**
 * GET /api/app-config/home
 * Public. Returns the current home screen UI config.
 */
const getHomeConfig = async (req, res) => {
    try {
        const stored = await prisma.uIConfig.findUnique({
            where: { key: 'home_config' },
        });

        if (stored?.configJson) {
            return res.json({ success: true, data: stored.configJson });
        }

        return res.json({ success: true, data: DEFAULT_HOME_CONFIG });
    } catch (error) {
        logger.error('Home config fetch error:', error.message);
        return res.json({ success: true, data: DEFAULT_HOME_CONFIG });
    }
};

/**
 * PUT /api/app-config/home
 * SUPER_ADMIN only. Updates the home screen UI config.
 */
const updateHomeConfig = async (req, res, next) => {
    try {
        const { config } = req.body;
        if (!config || typeof config !== 'object') {
            return res.status(400).json({ success: false, message: 'config object required' });
        }

        await prisma.uIConfig.upsert({
            where:  { key: 'home_config' },
            create: {
                type:       'CUSTOM',
                key:        'home_config',
                label:      'SDUI Home Configuration',
                configJson: config,
                sortOrder:  0,
                isVisible:  true,
                version:    1,
            },
            update: {
                configJson:  config,
                version:     { increment: 1 },
                publishedAt: new Date(),
            },
        });

        logger.info('SDUI home config updated by admin:', req.admin?.id);
        
        await syncUIConfigToDbServices(config);

        return res.json({ success: true, message: 'Home config published' });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/app-config/home/reset
 * SUPER_ADMIN only. Deletes custom home config layout from DB.
 */
const resetHomeConfig = async (req, res, next) => {
    try {
        await prisma.uIConfig.deleteMany({ where: { key: 'home_config' } });
        
        await syncUIConfigToDbServices(DEFAULT_HOME_CONFIG);

        logger.info('SDUI home config reset to defaults by admin:', req.admin?.id);
        return res.json({ success: true, message: 'Home config reset to defaults' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAppConfig,
    updateAppConfig,
    resetAppConfig,
    getDefaultConfig,
    DEFAULT_CONFIG,
    getHomeConfig,
    updateHomeConfig,
    resetHomeConfig,
    DEFAULT_HOME_CONFIG
};
