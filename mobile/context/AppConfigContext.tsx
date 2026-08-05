// ──────────────────────────────────────────────
//  App Config Context — SDUI (Server-Driven UI)
//
//  Strategy:
//    1. On mount: load cached config from AsyncStorage instantly (no flicker)
//    2. Fetch fresh config from backend in background
//    3. Replace cache + state when fresh config arrives
//    4. On fetch failure: keep cached/default config (offline-safe)
// ──────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  appConfigService,
  AppConfig,
  FeatureFlags,
  HomeSection,
  PlanConfig,
  PlanBenefit,
  CityConfig,
  LanguageConfig,
  DoctorVisitConfig,
  HelpSupportConfig,
} from "@/services/api/appConfigService";
import { getAssetUrl } from "@/utils/getAssetUrl";
import { cityService } from "@/services/api/cityService";
const CACHE_KEY = "@ayuxacare_app_config";
const CACHE_VERSION_KEY = "@ayuxacare_app_config_version";

// ─── Embedded fallback (identical to backend DEFAULT_CONFIG) ─────────────────
// Ensures the app works fully offline on first install, before any API call.

const FALLBACK_CONFIG: AppConfig = {
  version: "1.0.0",
  cache_ttl: 3600,
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
  screens: {
    home: {
      sections: [
        {
          id: "quick_services",
          type: "quick_services",
          visible: true,
          sort_order: 1,
          items: [
            {
              id: "doctor",
              label: '{"en":"ayuxacare\\nDoctor","hi":"ayuxacare\\nडॉक्टर","bn":"ayuxacare\\nডাক্তার","kn":"ayuxacare\\nವೈದ್ಯ","ml":"ayuxacare\\nഡോക്ടർ","mr":"ayuxacare\\nडॉक्टर","ta":"ayuxacare\\nமருத்துவர்","te":"ayuxacare\\nడాక్టర్"}',
              icon_key: "quick_doctor",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/98e939543c86f26f5f26210bb160eb927b5ff057.png",
              route: "/doctor-visit",
              visible: true,
              sort_order: 1,
            },
            {
              id: "nursing",
              label: '{"en":"Nursing\\nCare","hi":"नर्सिंग\\nकेयर","bn":"নার্সিং\\nকেয়ার","kn":"ನರ್ಸಿಂಗ್\\nಕೇರ್","ml":"നഴ്‌സിംഗ്\\nകെയർ","mr":"नर्सिंग\\nकेअर","ta":"நர்சிங்\\nகவனிப்பு","te":"నర్సింగ్\\nకేర్"}',
              icon_key: "quick_nursing",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/21e5a8a8650cf8eda36be3744c70099580173129.png",
              route: "/nurse-care",
              visible: true,
              sort_order: 2,
            },
            {
              id: "caregiver",
              label: '{"en":"Caregiver\\nSupport","hi":"देखभालकर्ता\\nसहायता","bn":"কেয়ারগিভার\\nসাপোর্ট","kn":"ಕೇರ್‌ಗಿವರ್\\nಸಪೋರ್ಟ್","ml":"കെയർഗിവർ\\nപിന്തുണ","mr":"काळजीवाहू\\nसहाय्य","ta":"கவனிப்பாளர்\\nஆதரவு","te":"కేర్‌గివర్\\nసపోర్ట్"}',
              icon_key: "quick_caregiver",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/2fb222a5f206ff64415b72a8d4ac9290b4e6f720.png",
              route: "/caregiver-support",
              visible: true,
              sort_order: 3,
            },
            {
              id: "emergency",
              label: '{"en":"Emergency\\nAssist","hi":"आपातकालीन\\nसहायता","bn":"জরুরি\\nসহায়তা","kn":"ತುರ್ತು\\nಸಹಾಯ","ml":"അടിയന്തര\\nസഹായം","mr":"आपत्कालीन\\nमदत","ta":"அவசர\\nஉதவி","te":"అత్యవసర\\nసహాయం"}',
              icon_key: "quick_emergency",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png",
              route: "/sos-emergency",
              visible: true,
              sort_order: 4,
            },
          ],
        },
        {
          id: "ayuxacare_services",
          type: "service_grid",
          title: '{"en":"ayuxacare Services","hi":"ayuxacare सेवाएं","bn":"ayuxacare সেবা","kn":"ayuxacare ಸೇವೆಗಳು","ml":"ayuxacare സേവനങ്ങൾ","mr":"ayuxacare सेवा","ta":"ayuxacare சேவைகள்","te":"ayuxacare సేవలు"}',
          visible: true,
          sort_order: 2,
          view_all_route: "/all-ayuxacare-services",
          config: { max_items: 6, columns: 3 },
          items: [
            {
              id: "doctor_visit",
              label: '{"en":"Doctor\\nVisit","hi":"डॉक्टर\\nविजिट","bn":"ডাক্তার\\nভিজিট","kn":"ವೈದ್ಯ\\nಭೇಟಿ","ml":"ഡോക്ടർ\\nസന്ദർശനം","mr":"डॉक्टर\\nभेट","ta":"மருத்துவர்\\nவிஜிட்","te":"డాక్టర్\\nవిజిట్"}',
              icon_key: "svc_doctor_visit",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/32a4661f97e2fa2dd2c85c403a7c530b7214e7f7.png",
              route: "/doctor-visit",
              visible: true,
              sort_order: 1,
            },
            {
              id: "homing_nursing",
              label: '{"en":"Homing\\nNursing","hi":"होम\\nनर्सिंग","bn":"হোম\\nনার্সিং","kn":"ಹೋಮ್\\nನರ್ಸಿಂಗ್","ml":"ഹോം\\nനഴ്‌സിംഗ്","mr":"होम\\nनर्सिंग","ta":"ஹோம்\\nநர்சிங்","te":"హోం\\nనర్సింగ్"}',
              icon_key: "svc_homing_nursing",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/afd8e2afab202de7ddce09bf8add378c861b9347.png",
              route: "/nurse-care",
              visible: true,
              sort_order: 2,
            },
            {
              id: "blood_test",
              label: '{"en":"Home\\nBlood Test","hi":"घर पर\\nब्लड टेस्ट","bn":"বাড়িতে\\nব্লাড টেস্ট","kn":"ಮನೆ\\nರಕ್ತ ಪರೀಕ್ಷೆ","ml":"ഹോം\\nരക്തപരിശോധന","mr":"घरी\\nरक्त तपासणी","ta":"வீட்டு\\nரத்த பரிசோதனை","te":"హోం\\nబ్లడ్ టెస్ట్"}',
              icon_key: "svc_blood_test",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/f74321d18a86a9e77628058ed35a50d284752eb2.png",
              route: "/blood-test",
              visible: true,
              sort_order: 3,
            },
            {
              id: "fitness",
              label: '{"en":"Fitness &\\nTherapy","hi":"फिटनेस &\\nथेरेपी","bn":"ফিটনেস &\\nথেরাপি","kn":"ಫಿಟ್‌ನೆಸ್ &\\nಥೆರಪಿ","ml":"ഫിറ്റ്‌നസ് &\\nതെറാപ്പി","mr":"फिटनेस &\\nथेरपी","ta":"ஃபிட்னஸ் &\\nதெரபி","te":"ఫిట్‌నెస్ &\\nథెరపీ"}',
              icon_key: "svc_fitness",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/54f5c849cf75e776592dec8236f221da3694ca53.png",
              route: "/physio-fitness",
              visible: true,
              sort_order: 4,
            },
            {
              id: "equipment",
              label: '{"en":"Rent Medical\\nEquipment","hi":"मेडिकल\\nउपकरण किराए पर","bn":"মেডিকেল\\nসরঞ্জাম ভাড়া","kn":"ವೈದ್ಯಕೀಯ\\nಉಪಕರಣ ಬಾಡಿಗೆ","ml":"മെഡിക്കൽ\\nഉപകരണ വാടക","mr":"वैद्यकीय\\nसाधने भाड्याने","ta":"மருத்துவ\\nஆட்டோவை வாடகை","te":"మెడికల్\\nపరికరాల అద్దె"}',
              icon_key: "svc_equipment",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/d3906f517597b2ef10369d92c422b16bf20e879e.png",
              route: "/medical-equipment",
              visible: true,
              sort_order: 5,
            },
            {
              id: "medicines",
              label: '{"en":"Order\\nMedicines","hi":"दवाइयां\\nमंगाएं","bn":"ওষুধ\\nঅর্ডার করুন","kn":"ಔಷಧಗಳ\\nಆರ್ಡರ್","ml":"മരുന്നുകൾ\\nഓർഡർ ചെയ്യൂ","mr":"औषधे\\nमागवा","ta":"மருந்துகள்\\nஆர்டர்","te":"మందులు\\nఆర్డర్ చేయండి"}',
              icon_key: "svc_medicines",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/79c15725f6f1a73658b615886f1289634cef9408.png",
              route: "/order-medicines",
              visible: true,
              sort_order: 6,
            },
            {
              id: "meal",
              label: '{"en":"Meal\\nService","hi":"भोजन\\nसेवा","bn":"খাবার\\nসেবা","kn":"ಊಟ\\nಸೇವೆ","ml":"ഭക്ഷണ\\nസേവനം","mr":"जेवण\\nसेवा","ta":"உணவு\\nசேவை","te":"భోజన\\nసేవ"}',
              icon_key: "svc_meal",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/8f136eff1200bb21c080348f6cdb7ad1c2831bdf.png",
              route: "/meal-service",
              visible: true,
              sort_order: 7,
            },
            {
              id: "physio",
              label: '{"en":"Physio\\nFitness","hi":"फिजियो\\nफिटनेस","bn":"ফিজিও\\nফিটনেস","kn":"ಫಿಜಿಯೋ\\nಫಿಟ್‌ನೆಸ್","ml":"ഫിസിയോ\\nഫിറ്റ്‌നസ്","mr":"फिजिओ\\nफिटनेस","ta":"ஃபிசியோ\\nஃபிட்னஸ்","te":"ఫిజియో\\nఫిట్‌నెస్"}',
              icon_key: "svc_physio",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/4ea419052803769fad63ff4292316ce7f8f77dbc.png",
              route: "/physio-fitness",
              visible: true,
              sort_order: 8,
            },
            {
              id: "hospital_trip",
              label: '{"en":"Hospital\\nTrip","hi":"अस्पताल\\nयात्रा","bn":"হাসপাতাল\\nট্রিপ","kn":"ಆಸ್ಪತ್ರೆ\\nಪ್ರಯಾಣ","ml":"ആശുപത്രി\\nട്രിപ്പ്","mr":"रुग्णालय\\nप्रवास","ta":"மருத்துவமனை\\nட்ரிப்","te":"ఆసుపత్రి\\nట్రిప్"}',
              icon_key: "svc_hospital_trip",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png",
              route: "/hospital-trip",
              visible: true,
              sort_order: 9,
            },
            {
              id: "insurance",
              label: '{"en":"Insurance\\n& Claims","hi":"बीमा\\n& दावे","bn":"বীমা\\n& দাবি","kn":"ವಿಮೆ\\n& ಕ್ಲೇಮ್","ml":"ഇൻഷുറൻസ്\\n& ക്ലെയിം","mr":"विमा\\n& दावे","ta":"காப்பீடு\\n& கோரிக்கை","te":"ఇన్సూరెన్స్\\n& క్లెయిమ్స్"}',
              icon_key: "svc_insurance",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/e453f94c7e87531b0da0b6712f8dc4b3bc7084a9.png",
              route: "/insurance",
              visible: true,
              sort_order: 10,
            },
          ],
        },
        {
          id: "trust_badges",
          type: "trust_badges",
          visible: true,
          sort_order: 3,
          items: [
            {
              id: "support",
              label: '{"en":"24/7 Support","hi":"24/7 सहायता","bn":"24/7 সাপোর্ট","kn":"24/7 ಸಹಾಯ","ml":"24/7 പിന്തുണ","mr":"24/7 सहाय्य","ta":"24/7 ஆதரவு","te":"24/7 సపోర్ట్"}',
              icon_key: "badge_support",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/cea3b8dc2ce488942e83a8a4cd0dbe1e6173764b.png",
              visible: true,
              sort_order: 1,
            },
            {
              id: "caregivers",
              label: '{"en":"Verified Caregivers","hi":"सत्यापित देखभालकर्ता","bn":"যাচাইকৃত কেয়ারগিভার","kn":"ಪರಿಶೀಲಿಸಿದ ಕೇರ್‌ಗಿವರ್","ml":"സ്ഥിരീകരിച്ച കെയർഗിവർ","mr":"सत्यापित काळजीवाहू","ta":"சரிபார்க்கப்பட்ட கவனிப்பாளர்","te":"ధృవీకరించిన కేర్‌గివర్లు"}',
              icon_key: "badge_caregivers",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/4dcdffbd537a1de53d947d7f0c7c548318bc85a7.png",
              visible: true,
              sort_order: 2,
            },
            {
              id: "family",
              label: '{"en":"Family-first Care","hi":"परिवार प्रथम देखभाल","bn":"পরিবার-প্রথম যত্ন","kn":"ಕುಟುಂಬ-ಮೊದಲ ಕಾಳಜಿ","ml":"കുടുംബ-ആദ്യ കരുതൽ","mr":"कुटुंब-प्रथम काळजी","ta":"குடும்பம்-முதல் கவனிப்பு","te":"కుటుంబం-ముందు కేర్"}',
              icon_key: "badge_family",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/f90ea6c9d084318475183b0a2f11175f0f34640e.png",
              visible: true,
              sort_order: 3,
            },
          ],
        },
        {
          id: "sos_banner",
          type: "sos_banner",
          visible: true,
          sort_order: 4,
          config: {
            title_line1: '{"en":"Need Immediate","hi":"तत्काल जरूरत","bn":"তাৎক্ষণিক প্রয়োজন","kn":"ತಕ್ಷಣದ ಅಗತ್ಯ","ml":"ഉടൻ ആവശ്യം","mr":"तातडीची गरज","ta":"உடனடி தேவை","te":"తక్షణ అవసరం"}',
            title_line2: '{"en":"Medical Support?","hi":"चिकित्सा सहायता?","bn":"চিকিৎসা সহায়তা?","kn":"ವೈದ್ಯಕೀಯ ಸಹಾಯ?","ml":"മെഡിക്കൽ സഹായം?","mr":"वैद्यकीय मदत?","ta":"மருத்துவ ஆதரவு?","te":"మెడికల్ సపోర్ట్?"}',
            cta_text: '{"en":"Click here","hi":"यहाँ क्लिक करें","bn":"এখানে ক্লিক করুন","kn":"ಇಲ್ಲಿ ಕ್ಲಿಕ್ ಮಾಡಿ","ml":"ഇവിടെ ക്ലിക്ക് ചെയ്യൂ","mr":"येथे क्लिक करा","ta":"இங்கே கிளிக் செய்யுங்கள்","te":"ఇక్కడ క్లిక్ చేయండి"}',
            cta_route: "/sos-emergency",
            icon_url:
              "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/5eedb2a89f68f0fea90ef304401e7d38d0fc1790.png",
            illustration_url:
              "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/e453f94c7e87531b0da0b6712f8dc4b3bc7084a9.png",
          },
        },
        {
          id: "essentials",
          type: "essentials_grid",
          title: '{"en":"Home Essentials Services","hi":"होम एसेंशियल सेवाएं","bn":"হোম এসেনশিয়াল সেবা","kn":"ಹೋಮ್ ಎಸೆಂಷಿಯಲ್ ಸೇವೆಗಳು","ml":"ഹോം എസൻഷ്യൽ സേവനങ്ങൾ","mr":"होम एसेंशियल सेवा","ta":"வீட்டு அத்தியாவசிய சேவைகள்","te":"హోమ్ ఎసెన్షియల్ సేవలు"}',
          visible: true,
          sort_order: 5,
          view_all_route: "/all-home-essentials",
          config: { columns: 4, max_visible_rows: 2 },
          items: [
            // 1. Bill Payment
            {
              id: "bills",
              label: '{"en":"Bill\\nPayment","hi":"बिल\\nभुगतान","bn":"বিল\\nপেমেন্ট","kn":"ಬಿಲ್\\nಪಾವತಿ","ml":"ബിൽ\\nപേമെന്റ്","mr":"बिल\\nपेमेंट","ta":"பில்\\nபேமெண்ட்","te":"బిల్\\nపేమెంట్"}',
              icon_key: "ess_bills",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/056ecb9c01dd2283b1c0db1e84c1eb94c6d8a45a.png",
              route: "/bill-payment",
              visible: true,
              sort_order: 1,
            },
            // 2. Tech Help
            {
              id: "tech_helper",
              label: '{"en":"Tech\\nHelp","hi":"टेक\\nसहायता","bn":"টেক\\nহেল্প","kn":"ತಂತ್ರಜ್ಞಾನ\\nಸಹಾಯ","ml":"ടെക്\\nഹെൽപ്","mr":"तंत्रज्ञान\\nमदत","ta":"டெக்\\nஹெல்ப்","te":"టెక్\\nహెల్ప్"}',
              icon_key: "ess_ac_repair",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/fa6360cf6179cebaed29a6c808bafae2d31ad753.png",
              route: "/paper-legal",
              visible: true,
              sort_order: 2,
            },
            // 3. Paperwork
            {
              id: "bank",
              label: '{"en":"Paper-\\nwork","hi":"कागज़\\nकार्य","bn":"কাগজ\\nকাজ","kn":"ಕಾಗದ\\nಕೆಲಸ","ml":"പേപ്പർ\\nജോലി","mr":"कागद\\nकाम","ta":"காகிதம்\\nவேலை","te":"పేపర్\\nపని"}',
              icon_key: "ess_bank",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/33ede0e57be708b9775957c3ecec7013b0a56c6d.png",
              route: "/bank-paperwork",
              visible: true,
              sort_order: 3,
            },
            // 4. Appliance Repair
            {
              id: "ac_repair",
              label: '{"en":"Appliance\\nRepair","hi":"उपकरण\\nमरम्मत","bn":"যন্ত্রপাতি\\nমেরামত","kn":"ಉಪಕರಣ\\nರಿಪೇರಿ","ml":"ഉപകരണ\\nറിപ്പയർ","mr":"उपकरण\\nदुरुस्ती","ta":"கருவி\\nபழுதுபார்ப்பு","te":"పరికరం\\nరిపేర్"}',
              icon_key: "ess_ac_repair",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/fa6360cf6179cebaed29a6c808bafae2d31ad753.png",
              route: "/appliance-repair",
              visible: true,
              sort_order: 4,
            },
            // 5. Deep Cleaning & Pest Control
            {
              id: "cleaning",
              label: '{"en":"Deep Cleaning\\n& Pest Ctrl","hi":"गहरी सफाई\\nव कीट नियंत्रण","bn":"গভীর পরিষ্কার\\nও কীট নিয়ন্ত্রণ","kn":"ಆಳ ಸ್ವಚ್ಛತೆ\\nಮತ್ತು ಕೀಟ","ml":"ഡീപ് ക്ലീനിംഗ്\\nകീടനിയന്ത്രണം","mr":"खोल सफाई\\nकीड नियंत्रण","ta":"ஆழ் சுத்தம்\\nகீட கட்டுப்பாடு","te":"డీప్ క్లీనింగ్\\nకీట నియంత్రణ"}',
              icon_key: "ess_cleaning",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/ad6b9b061bc7b1487a0e73c2557f711136d2a4d9.png",
              route: "/deep-cleaning",
              visible: true,
              sort_order: 5,
            },
            // 6. Washroom Sanitation
            {
              id: "sanitisation",
              label: '{"en":"Washroom\\nSanitation","hi":"शौचालय\\nस्वच्छता","bn":"বাথরুম\\nস্যানিটেশন","kn":"ವಾಶ್‌ರೂಮ್\\nಸ್ವಚ್ಛತೆ","ml":"ശൗചാലയ\\nശുചിത്വം","mr":"शौचालय\\nस्वच्छता","ta":"கழிவறை\\nசுகாதாரம்","te":"వాష్‌రూమ్\\nసానిటేషన్"}',
              icon_key: "ess_cleaning",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/8888c71f466119aa294bd00136ff887f616d4737.png",
              route: "/sanitisation",
              visible: true,
              sort_order: 6,
            },
            // 7. Plumbing & Electrician
            {
              id: "plumbing",
              label: '{"en":"Plumbing &\\nElectrician","hi":"प्लम्बिंग &\\nइलेक्ट्रीशियन","bn":"প্লাম্বিং &\\nইলেকট্রিশিয়ান","kn":"ಪ್ಲಂಬಿಂಗ್ &\\nಎಲೆಕ್ಟ್ರಿಷಿಯನ್","ml":"പ്ലംബിംഗ് &\\nഇലക്ട്രിഷ്യൻ","mr":"प्लंबिंग &\\nइलेक्ट्रिशियन","ta":"பிளம்பிங் &\\nமின்சாரி","te":"ప్లంబింగ్ &\\nఎలక్ట్రీషియన్"}',
              icon_key: "ess_plumbing",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/8ce612b04a3a83f1e834c7b71a6dd2c0174cb918.png",
              route: "/plumbing-electrical",
              visible: true,
              sort_order: 7,
            },
            // 8. Driver Request
            {
              id: "driver",
              label: '{"en":"Driver\\nRequest","hi":"ड्राइवर\\nअनुरोध","bn":"ড্রাইভার\\nঅনুরোধ","kn":"ಡ್ರೈವರ್\\nವಿನಂತಿ","ml":"ഡ്രൈവർ\\nഅഭ്യർത്ഥന","mr":"ड्रायव्हर\\nविनंती","ta":"டிரைவர்\\nகோரிக்கை","te":"డ్రైవర్\\nరిక్వెస్ట్"}',
              icon_key: "ess_driver",
              image_url:
                "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/60d4d0afa5801aeaa9e593bc049e3b017ef5624c.png",
              route: "/driving-cab",
              visible: true,
              sort_order: 8,
            },
          ],
        },
      ],
    },
    plans: {
      banner: {
        title: '{"en":"Value Plans for Your Peace of Mind","hi":"आपकी शांति के लिए मूल्य योजनाएं","bn":"আপনার মানসিক শান্তির জন্য ভ্যালু প্ল্যান","kn":"ನಿಮ್ಮ ಮನಸ್ಸಿನ ಶಾಂತಿಗಾಗಿ ಮೌಲ್ಯ ಯೋಜನೆಗಳು","ml":"നിങ്ങളുടെ മനഃശാന്തിക്കായി വാല്യൂ പ്ലാനുകൾ","mr":"आपल्या मनःशांतीसाठी व्हॅल्यू प्लॅन्स","ta":"உங்கள் மன அமைதிக்கான மதிப்பு திட்டங்கள்","te":"మీ మనస్సు శాంతికి విలువ ప్రణాళికలు"}',
        subtitle: '{"en":"Subscribe and save with our exclusive ayuxacare plans.","hi":"हमारी विशेष ayuxacare योजनाओं से सदस्यता लें और बचत करें।","bn":"আমাদের এক্সক্লুসিভ ayuxacare প্ল্যান সাবস্ক্রাইব করুন।","kn":"ನಮ್ಮ ಎಕ್ಸ್‌ಕ್ಲೂಸಿವ್ ayuxacare ಯೋಜನೆಗಳಿಗೆ ಸದಸ್ಯರಾಗಿ.","ml":"ഞങ്ങളുടെ ayuxacare പ്ലാനുകൾ സബ്‌സ്‌ക്രൈബ് ചെയ്ത് ലാഭിക്കൂ.","mr":"आमच्या विशेष ayuxacare योजनांसाठी सदस्यता घ्या.","ta":"எங்கள் ayuxacare திட்டங்களில் சேர்ந்து சேமியுங்கள்.","te":"మా ayuxacare ప్లాన్‌లకు సభ్యత్వం పొందండి."}',
      },
      plans: [
        {
          id: "care_plan",
          name: "Care Plan",
          accent_color: "#4B78D8",
          price_bg_color: "#56BDB7",
          cta_color: "#4B78D8",
          tab_bg: "#EAEFFF",
          tab_active_bg: "#D1DEFE",
          tab_text_color: "#4B73D0",
          active_duration_label: "Yearly",
          durations: [
            { label: "Quarterly", price: "₹599", suffix: "/ Quarterly" },
            { label: "Biannually", price: "₹999", suffix: "/ Biannually" },
            { label: "Yearly", price: "₹1,999", suffix: "/ Yearly" },
          ],
          features: [
            "25% Off Healthy Meals",
            "Temple & Picnic Group Trips",
            "Paperwork & Tech Support",
          ],
          cta_text: "View Details / Subscribe",
          cta_route: "/smart-upgrade",
          visible: true,
          sort_order: 1,
        },
        {
          id: "home_maker_plan",
          name: "Home Maker Plan",
          accent_color: "#048357",
          price_bg_color: "#75B55E",
          cta_color: "#42884F",
          tab_bg: "#E8F5E9",
          tab_active_bg: "#D8ECDC",
          tab_text_color: "#048357",
          active_duration_label: "Yearly",
          durations: [
            { label: "Quarterly", price: "₹1,499", suffix: "/ Quarterly" },
            { label: "Biannually", price: "₹2,499", suffix: "/ Biannually" },
            { label: "Yearly", price: "₹4,799", suffix: "/ Yearly" },
          ],
          features: [
            "Home Cook (Daily Meals)",
            "Bank, Will & ID Certificate Updates",
            "Medicines & Doctor Visits",
            "Tech Help at Home",
          ],
          cta_text: "View Details / Subscribe",
          cta_route: "/smart-upgrade",
          visible: true,
          sort_order: 2,
        },
      ],
      benefits: [
        {
          id: "save_big",
          title: '{"en":"Save Big","hi":"बड़ी बचत","bn":"বড় সঞ্চয়","kn":"ದೊಡ್ಡ ಉಳಿತಾಯ","ml":"വലുതായി ലാഭിക്കൂ","mr":"मोठी बचत","ta":"பெரிய சேமிப்பு","te":"పెద్ద ఆదా"}',
          description: '{"en":"Recover your plan cost in just 2 orders.","hi":"केवल 2 ऑर्डर में अपनी योजना की लागत वसूल करें।","bn":"মাত্র ২ অর্ডারে প্ল্যানের খরচ উঠিয়ে নিন।","kn":"ಕೇವಲ 2 ಆರ್ಡರ್‌ಗಳಲ್ಲಿ ನಿಮ್ಮ ಯೋಜನೆಯ ವೆಚ್ಚ ಮರುಪಡೆಯಿರಿ.","ml":"2 ഓർഡറുകളിൽ പ്ലാൻ ചെലവ് തിരിച്ചുപിടിക്കൂ.","mr":"फक्त 2 ऑर्डरमध्ये प्लॅनचा खर्च वसूल करा.","ta":"வெறும் 2 ஆர்டர்களில் உங்கள் திட்டத்தின் செலவை மீட்டெடுங்கள்.","te":"కేవలం 2 ఆర్డర్లలో మీ ప్లాన్ ఖర్చు రికవర్ అవుతుంది."}',
          highlight: "2 orders.",
          icon_key: "benefit_money_bag",
          sort_order: 1,
        },
        {
          id: "priority_support",
          title: '{"en":"Priority Support","hi":"प्राथमिकता सहायता","bn":"প্রায়োরিটি সাপোর্ট","kn":"ಆದ್ಯತೆ ಸಹಾಯ","ml":"പ്രൊആരിടി സപ്പോർട്ട്","mr":"प्राधान्य सहाय्य","ta":"முன்னுரிமை ஆதரவு","te":"ప్రాయారిటీ సపోర్ట్"}',
          description: '{"en":"Skip the queue. Members get answered first.","hi":"कतार छोड़ें। सदस्यों को पहले उत्तर मिलता है।","bn":"লাইন ছাড়ুন। সদস্যরা প্রথমে উত্তর পান।","kn":"ಕ್ಯೂ ಬಿಡಿ. ಸದಸ್ಯರಿಗೆ ಮೊದಲು ಉತ್ತರ ಸಿಗುತ್ತದೆ.","ml":"ക്യൂ ഒഴിവാക്കൂ. അംഗങ്ങൾക്ക് ആദ്യം ഉത്തരം.","mr":"रांग सोडा. सदस्यांना प्रथम उत्तर मिळते.","ta":"வரிசையைத் தவிருங்கள். உறுப்பினர்களுக்கு முதலில் பதில் கிடைக்கும்.","te":"క్యూ దాటండి. సభ్యులకు ముందు సమాధానం వస్తుంది."}',
          highlight: "Skip the queue.",
          icon_key: "benefit_checkmark",
          sort_order: 2,
        },
        {
          id: "family_updates",
          title: '{"en":"Family Updates","hi":"परिवार अपडेट","bn":"পরিবার আপডেট","kn":"ಕುಟುಂಬ ಅಪ್‌ಡೇಟ್","ml":"കുടുംബ അപ്‌ഡേറ്റ്","mr":"कुटुंब अपडेट","ta":"குடும்ப புதுப்பிப்புகள்","te":"కుటుంబ అప్‌డేట్లు"}',
          description: '{"en":"We send a weekly health report to your children.","hi":"हम आपके बच्चों को साप्ताहिक स्वास्थ्य रिपोर्ट भेजते हैं।","bn":"আমরা আপনার সন্তানদের সাপ্তাহিক স্বাস্থ্য রিপোর্ট পাঠাই।","kn":"ನಾವು ನಿಮ್ಮ ಮಕ್ಕಳಿಗೆ ಸಾಪ್ತಾಹಿಕ ಆರೋಗ್ಯ ವರದಿ ಕಳುಹಿಸುತ್ತೇವೆ.","ml":"ഞങ്ങൾ നിങ്ങളുടെ കുട്ടികൾക്ക് വാരാന്ത്യ ആരോഗ്യ റിപ്പോർട്ട് അയക്കും.","mr":"आम्ही तुमच्या मुलांना साप्ताहिक आरोग्य अहवाल पाठवतो.","ta":"நாங்கள் உங்கள் பிள்ளைகளுக்கு வாராந்திர உடல்நல அறிக்கை அனுப்புகிறோம்.","te":"మేము మీ పిల్లలకు వారంవారీ ఆరోగ్య నివేదిక పంపుతాం."}',
          highlight: "",
          icon_key: "benefit_family",
          sort_order: 3,
        },
      ],
    },
    city_selection: {
      cities: [
        {
          id: "bangalore",
          name: "Bangalore",
          state: "Karnataka",
          available: true,
          sort_order: 1,
        },
        {
          id: "chennai",
          name: "Chennai",
          state: "Tamil Nadu",
          available: false,
          sort_order: 2,
        },
        {
          id: "hyderabad",
          name: "Hyderabad",
          state: "Telangana",
          available: false,
          sort_order: 3,
        },
        {
          id: "mumbai",
          name: "Mumbai",
          state: "Maharashtra",
          available: false,
          sort_order: 4,
        },
        {
          id: "delhi",
          name: "Delhi NCR",
          state: "Delhi",
          available: false,
          sort_order: 5,
        },
        {
          id: "pune",
          name: "Pune",
          state: "Maharashtra",
          available: false,
          sort_order: 6,
        },
      ],
    },
    language_selection: {
      languages: [
        {
          code: "en",
          label: "English",
          native_label: "English",
          sort_order: 1,
        },
        { code: "hi", label: "Hindi", native_label: "हिन्दी", sort_order: 2 },
        { code: "kn", label: "Kannada", native_label: "ಕನ್ನಡ", sort_order: 3 },
        { code: "ta", label: "Tamil", native_label: "தமிழ்", sort_order: 4 },
        { code: "te", label: "Telugu", native_label: "తెలుగు", sort_order: 5 },
        {
          code: "ml",
          label: "Malayalam",
          native_label: "മലയാളം",
          sort_order: 6,
        },
        { code: "mr", label: "Marathi", native_label: "मराठी", sort_order: 7 },
        { code: "bn", label: "Bengali", native_label: "বাংলা", sort_order: 8 },
      ],
    },
    doctor_visit: {
      title: "Doctor Home Visit",
      sections: [
        {
          id: "header",
          type: "header",
          components: [
            {
              id: "header_title",
              type: "text",
              data: { label: "Doctor Home Visit", icon: "", tagline: "" },
            },
          ],
        },
        {
          id: "description_card",
          type: "banner",
          data: {
            label:
              "Booking a doctor or physiotherapist to visit your home for non-emergency issues.",
            icon: "",
            tagline: "physiotherapist",
            action: null,
          },
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
                {
                  id: "fever_flu",
                  label: "Fever/Flu",
                  icon: "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/85703338762dce300aaacb9a05f302adc3d527f4.png",
                  tagline: "",
                  action: { type: "navigate", route: "select_problem" },
                },
                {
                  id: "bp_sugar",
                  label: "BP/Sugar check",
                  icon: "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/a094df3aff84fca10f86363d2a72a2a9a16cb8b9.png",
                  tagline: "",
                  action: { type: "navigate", route: "select_problem" },
                },
                {
                  id: "general_weakness",
                  label: "General Weakness",
                  icon: "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/a4cc4e445884c7ec5ea2ea73c3cf8315b9a5fd4b.png",
                  tagline: "",
                  action: { type: "navigate", route: "select_problem" },
                },
                {
                  id: "body_pain",
                  label: "Body pain/joint pain",
                  icon: "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/3a3fbbfc074010919d54378e2349e7a3ecdea262.png",
                  tagline: "",
                  action: { type: "navigate", route: "select_problem" },
                },
                {
                  id: "post_surgery",
                  label: "Post-surgery Rehab",
                  icon: "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/cc303b4d8fc2cc0ba55dc7a7b0eaaee1385183f1.png",
                  tagline: "",
                  action: { type: "navigate", route: "select_problem" },
                },
                {
                  id: "stroke_recovery",
                  label: "Stroke Recovery",
                  icon: "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/9c25016906e38b6b999adf0f9fb6cb2adb589322.png",
                  tagline: "",
                  action: { type: "navigate", route: "select_problem" },
                },
                {
                  id: "frozen_shoulder",
                  label: "Frozen shoulder",
                  icon: "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/05879295a9b69201cfab443f22bf9218402f1522.png",
                  tagline: "",
                  action: { type: "navigate", route: "select_problem" },
                },
                {
                  id: "other",
                  label: "Other",
                  icon: "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/34a78d011624199a5541b871a68bb218b41e5aba.png",
                  tagline: "",
                  action: { type: "navigate", route: "select_problem" },
                },
              ],
            },
            {
              id: "smart_banner",
              type: "banner",
              data: {
                label: "Smart :",
                icon: "",
                tagline:
                  "Post-surgery, frozen shoulder & stroke visits will auto-select physiotherapist",
                action: { type: "navigate", route: "" },
              },
            },
          ],
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
                {
                  id: "GP",
                  label: "General Physician",
                  icon: "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/9bbd0539ddfd504d8362c951cb07d107b0df9fdf.png",
                  tagline: "",
                  action: { type: "navigate", route: "select_doctor_type" },
                },
                {
                  id: "Physio",
                  label: "Physiotherapist",
                  icon: "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/ad2bd697d39bc0738ca19a09e58ce4677761ca47.png",
                  tagline: "",
                  action: { type: "navigate", route: "select_doctor_type" },
                },
              ],
            },
          ],
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
                {
                  id: "Home",
                  label: "Home Session",
                  icon: "home-outline",
                  tagline: "",
                  action: { type: "navigate", route: "select_visit_type" },
                },
                {
                  id: "Clinic",
                  label: "Clinic Visit",
                  icon: "business-outline",
                  tagline: "",
                  action: { type: "navigate", route: "select_visit_type" },
                },
              ],
            },
          ],
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
                {
                  id: "ASAP",
                  label: "Come ASAP",
                  icon: "radio-button-on",
                  tagline: "(Urgent)",
                  action: { type: "navigate", route: "select_when" },
                },
                {
                  id: "Later",
                  label: "Schedule for later",
                  icon: "radio-button-off",
                  tagline: "(Date & Time Picker)",
                  action: { type: "navigate", route: "select_when" },
                },
              ],
            },
          ],
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
                {
                  id: "upload_reports",
                  label: "Upload Reports (Optional)",
                  icon: "cloud-upload-outline",
                  tagline:
                    "JPG, PNG or PDF, help our doctors understand better",
                  action: { type: "navigate", route: "upload_document" },
                },
              ],
            },
          ],
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
                {
                  id: "address",
                  label: "Fetching address...",
                  icon: "location-outline",
                  tagline:
                    "Auto-fitted from user profile(Google maps location).",
                  action: { type: "navigate", route: "edit_address" },
                },
              ],
            },
          ],
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
                {
                  id: "submit_booking",
                  label: "Book Appointment",
                  icon: "",
                  tagline: "",
                  action: { type: "navigate", route: "submit_booking" },
                },
              ],
            },
          ],
        },
      ],
    },
    help_support: {
      phone: "080-4728-0789",
      whatsapp_url: "https://wa.me/919480198108",
      page_description:
        '{"en":"Our support team is available to help with bookings, services, and payments.","hi":"हमारी सहायता टीम बुकिंग, सेवाओं और भुगतान में मदद के लिए उपलब्ध है।","bn":"আমাদের সাপোর্ট টিম বুকিং, সেবা এবং পেমেন্টে সাহায্যের জন্য উপলব্ধ।","kn":"ನಮ್ಮ ಬೆಂಬಲ ತಂಡ ಬುಕಿಂಗ್, ಸೇವೆಗಳು ಮತ್ತು ಪಾವತಿಗಳಿಗಾಗಿ ಸಹಾಯ ಮಾಡಲು ಲಭ್ಯವಿದೆ.","ml":"ബുക്കിംഗ്, സേവനങ്ങൾ, പേയ്‌മെന്റ് എന്നിവ സഹായിക്കാൻ ഞങ്ങളുടെ ടീം ലഭ്യമാണ്.","mr":"आमची सहाय्य टीम बुकिंग, सेवा आणि पेमेंटसाठी मदत करण्यास उपलब्ध आहे.","ta":"எங்கள் ஆதரவு குழு முன்பதிவு, சேவைகள் மற்றும் கட்டணங்களுக்கு உதவ கிடைக்கிறது.","te":"మా సపోర்ட్ టీమ్ బుకింగ్, సేవలు మరియు చెల్లింపులకు సహాయం అందుబాటులో ఉంది."}',
      contacts: [
        {
          id: "customer_support",
          label: "Customer Support",
          phone: "080-4728-0789",
          email: "support@ayuxacare.com",
          name: null,
        },
        {
          id: "backend_operations",
          label: "Backend Operations",
          phone: "+91 94801-98108",
          email: "support@ayuxacare.com",
          name: null,
        },
        {
          id: "grievance",
          label: "Grievance Officer",
          phone: null,
          email: "compliance@ayuxacare.com",
          name: "SK Murgan",
        },
      ],
      ticket_categories: [
        { id: "billing", label: "Billing", sort_order: 1 },
        { id: "service", label: "Service", sort_order: 2 },
        { id: "complaint", label: "Complaint", sort_order: 3 },
        { id: "lab", label: "Lab / Test", sort_order: 4 },
        { id: "technical", label: "Technical", sort_order: 5 },
        { id: "other", label: "Other", sort_order: 6 },
      ],
      ticket_status_colors: {
        open: "#F5A623",
        in_progress: "#4A90E2",
        resolved: "#27AE60",
        closed: "#9B9B9B",
      },
      support_promise: [
        {
          id: "ack",
          text: '{"en":"Acknowledgement within 48 hours","hi":"48 घंटे के भीतर पावती","bn":"৪৮ ঘণ্টার মধ্যে স্বীকৃতি","kn":"48 ಗಂಟೆಗಳಲ್ಲಿ ಅಂಗೀಕಾರ","ml":"48 മണിക്കൂറിനുള്ളിൽ ഔദ്യോഗിക സ്ഥിരീകരണം","mr":"48 तासांच्या आत पावती","ta":"48 மணி நேரத்திற்குள் ஒப்புகை","te":"48 గంటలలోపు అంగీకారం"}',
          ionicon: "checkmark-circle",
        },
        {
          id: "resolve",
          text: '{"en":"Resolution within 1 month","hi":"1 महीने के भीतर समाधान","bn":"১ মাসের মধ্যে সমাধান","kn":"1 ತಿಂಗಳಲ್ಲಿ ಪರಿಹಾರ","ml":"1 മാസത്തിനുള്ളിൽ പരിഹാരം","mr":"1 महिन्यात निराकरण","ta":"1 மாதத்திற்குள் தீர்வு","te":"1 నెలలోపు పరిష్కారం"}',
          ionicon: "checkmark-circle",
        },
        {
          id: "track",
          text: '{"en":"A unique ticket number is provided to track your request.","hi":"आपके अनुरोध को ट्रैक करने के लिए एक अनोखा टिकट नंबर दिया जाता है।","bn":"আপনার অনুরোধ ট্র্যাক করতে একটি অনন্য টিকিট নম্বর দেওয়া হয়।","kn":"ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಲು ಅನನ್ಯ ಟಿಕೆಟ್ ಸಂಖ್ಯೆ ನೀಡಲಾಗುತ್ತದೆ.","ml":"നിങ്ങളുടെ അഭ്യർഥന ട്രാക്ക് ചെയ്യാൻ ഒരു തനതായ ടിക്കറ്റ് നമ്പർ നൽകും.","mr":"आपला अनुरोध ट्रॅक करण्यासाठी एक अनोखा तिकिट क्रमांक दिला जातो.","ta":"உங்கள் கோரிக்கையை கண்காணிக்க ஒரு தனித்துவமான டிக்கெட் எண் வழங்கப்படும்.","te":"మీ అభ్యర్థనను ట్రాక్ చేయడానికి ఒక యూనిక్ టిక్కెట్ నంబర్ ఇవ్వబడుతుంది."}',
          ionicon: "information-circle",
        },
      ],
      faqs: [
        {
          id: "book",
          q: "How do I book a service?",
          a: "Tap any service on the Home screen and follow the steps.",
          sort_order: 1,
        },
        {
          id: "sos",
          q: "Is SOS always available?",
          a: "Yes, SOS is 24/7. It alerts our team and your emergency contacts instantly.",
          sort_order: 2,
        },
        {
          id: "lab",
          q: "How can I get my lab reports?",
          a: "Reports appear in My Health → Prescriptions and are sent via WhatsApp/Email.",
          sort_order: 3,
        },
        {
          id: "refund",
          q: "What is the refund policy?",
          a: "Cancel 2 hours before the slot for a full refund. Settlement takes 5–7 business days.",
          sort_order: 4,
        },
        {
          id: "contacts",
          q: "How to add emergency contacts?",
          a: "Go to My Profile → Emergency Contacts.",
          sort_order: 5,
        },
        {
          id: "reschedule",
          q: "How do I reschedule a service booking?",
          a: "Go to My Bookings, select your active booking, and tap Reschedule, or chat/call our support team.",
          sort_order: 6,
        },
        {
          id: "family",
          q: "Can I book services for family members?",
          a: "Yes, you can add family members under My Profile → Family Members and select them when making a booking.",
          sort_order: 7,
        },
        {
          id: "caregivers",
          q: "Are caregivers verified?",
          a: "Yes, all our caregivers and support buddies undergo background verification, screening, and basic medical training.",
          sort_order: 8,
        },
        {
          id: "membership",
          q: "How do I upgrade to a premium plan?",
          a: "Navigate to My Profile → Subscription & Membership, select your preferred plan, and proceed to checkout.",
          sort_order: 9,
        },
        {
          id: "emergency",
          q: "What should I do in a medical emergency?",
          a: "For life-threatening emergencies, call national emergency lines immediately. Tap the SOS Assist button on our app to alert our local response team and your emergency contacts.",
          sort_order: 10,
        },
      ],
    },
  },
};

// ─── Context Type ─────────────────────────────────────────────────────────────

interface AppConfigContextType {
  config: AppConfig;
  isLoading: boolean;
  refresh: () => Promise<void>;

  // Convenience accessors
  flags: FeatureFlags;
  homeSections: HomeSection[]; // sorted, visibility-filtered
  plans: PlanConfig[]; // sorted, visibility-filtered
  benefits: PlanBenefit[];
  cities: CityConfig[];
  languages: LanguageConfig[];
  plansBanner: { title: string; subtitle: string };
  doctorVisitConfig: DoctorVisitConfig;
  helpSupportConfig: HelpSupportConfig;
}

const AppConfigContext = createContext<AppConfigContextType | undefined>(
  undefined,
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sortByOrder = <T extends { sort_order: number }>(arr: T[]): T[] =>
  [...arr].sort((a, b) => a.sort_order - b.sort_order);

/**
 * Transform all image_url fields in a section through CDN.
 * Converts GCS URLs to Cloudflare CDN for caching and performance.
 */
const transformSectionURLs = (section: HomeSection): HomeSection => {
  if (!section.items) return section;

  return {
    ...section,
    items: section.items.map((item) => ({
      ...item,
      image_url: item.image_url ? getAssetUrl(item.image_url) : item.image_url,
    })),
    // Also transform config URLs (sos_banner, etc)
    config: section.config
      ? transformConfigURLs(section.config)
      : section.config,
  };
};

/**
 * Recursively transform URLs in config objects.
 */
const transformConfigURLs = (
  config: Record<string, any>,
): Record<string, any> => {
  const transformed: Record<string, any> = {};

  for (const [key, value] of Object.entries(config)) {
    if (
      typeof value === "string" &&
      (key.includes("url") || key.includes("icon") || key.includes("image")) &&
      (value.startsWith("http") ||
        value.includes("storage.googleapis") ||
        value.match(/^[a-f0-9]{40}\./))
    ) {
      transformed[key] = getAssetUrl(value);
    } else {
      transformed[key] = value;
    }
  }

  return transformed;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(FALLBACK_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [dynamicCities, setDynamicCities] = useState<CityConfig[]>([]);

  const applyConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(newConfig));
    AsyncStorage.setItem(CACHE_VERSION_KEY, newConfig.version);
  };

  const lastFetchRef = useRef<number>(0);
  const MIN_REFETCH_INTERVAL = 60_000; // Don't refetch more than once per minute

  const fetchFresh = useCallback(async (force = false) => {
    // Throttle: skip if fetched recently (unless forced)
    const now = Date.now();
    if (!force && now - lastFetchRef.current < MIN_REFETCH_INTERVAL) return;

    try {
      const res = await appConfigService.getConfig();
      if (res.success && res.data) {
        applyConfig(res.data);
        lastFetchRef.current = Date.now();
      }

      // Dynamic cities fetch from database
      const cityRes = await cityService.getCities();
      if (cityRes.success && cityRes.data) {
        const visibleCities = cityRes.data.filter(c => c.isEnabled || c.isComingSoon);
        const mapped = visibleCities.map((c, idx) => ({
          id: c.id,
          name: c.name,
          state: c.stateCode,
          available: c.isEnabled && !c.isComingSoon,
          sort_order: idx + 1
        }));
        setDynamicCities(mapped);
      }
    } catch {
      // Silently keep existing config on network failure
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load: cache first, then fetch fresh
  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          setConfig(JSON.parse(cached));
        }
      } catch {
        // ignore parse errors — use fallback
      }
      await fetchFresh(true);
    })();
  }, []);

  // Re-fetch when app comes back to foreground
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        fetchFresh();
      }
    };
    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, [fetchFresh]);

  // ── Derived values ──────────────────────────────────────────────────────
  const flags = config.feature_flags;
  const homeScreen = config.screens.home;
  const plansScreen = config.screens.plans;

  // Transform all image URLs through CDN for caching and performance
  const homeSections = sortByOrder(homeScreen.sections)
    .filter((s) => s.visible)
    .map((s) => transformSectionURLs(s));
  const plans = sortByOrder(plansScreen.plans.filter((p) => p.visible));
  const benefits = sortByOrder(plansScreen.benefits);
  const cities = dynamicCities.length > 0 ? dynamicCities : sortByOrder(config.screens.city_selection.cities);
  const languages = sortByOrder(config.screens.language_selection.languages);
  const plansBanner = plansScreen.banner;
  const doctorVisitConfig = config.screens.doctor_visit;
  const helpSupportConfig = config.screens.help_support;

  return (
    <AppConfigContext.Provider
      value={{
        config,
        isLoading,
        refresh: fetchFresh,
        flags,
        homeSections,
        plans,
        benefits,
        cities,
        languages,
        plansBanner,
        doctorVisitConfig,
        helpSupportConfig,
      }}
    >
      {children}
    </AppConfigContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppConfig(): AppConfigContextType {
  const ctx = useContext(AppConfigContext);
  if (!ctx)
    throw new Error("useAppConfig must be used within AppConfigProvider");
  return ctx;
}
