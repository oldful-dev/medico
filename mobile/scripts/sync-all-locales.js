const fs = require('fs');
const path = require('path');

const localesDir = 'D:\\codes\\MERN\\medico\\mobile\\i18n\\locales';
const languages = ['en', 'hi', 'bn', 'kn', 'ml', 'mr', 'ta', 'te'];

const translations = {
  en: {
    scan_ecg: {
      header: "Scan & ECG",
      header_subtitle: "Book Scans & ECG Diagnostic Services at Home",
      document_upload: "Document Upload",
      camera_option: "Camera",
      camera_sub: "Take a photo of Dr. Prescription",
      gallery_option: "Gallery",
      gallery_sub: "Upload Dr. Prescription from gallery",
      schedule_service: "Schedule Service",
      service_addons: "Service Add-ons",
      pickup_drop: "Pickup-Drop Assistance",
      assistance_required: "Assistance Required",
      appointment_location: "Appointment Location",
      comments: "Comments",
      comments_placeholder: "Enter any additional requirements, special requests or notes here...",
      confirm: "Confirm",
      alert_datetime_required: "Date & Time Required",
      alert_datetime_required_msg: "Please select a date and time slot for your appointment.",
      alert_address_required: "Address Required",
      alert_address_required_msg: "Please enter a valid appointment address."
    },
    fitness: {
      header: "Fitness",
      header_subtitle: "Book Yoga & Fitness Services",
      service_type: "Service Type",
      yoga_teacher_home: "Yoga Teacher at Home",
      join_class: "Join the Class",
      standard_location: "Service Location",
      comments: "Comments",
      comments_placeholder: "Enter any additional notes...",
      book_appointment: "Book Appointment",
      confirm_btn: "Confirm"
    },
    physio: {
      header: "Physiotherapy",
      header_subtitle: "Book Physiotherapist Visit at Home",
      affected_body_parts: "Select Affected Body Parts",
      other_parts: "Other Parts",
      comments: "Comments",
      comments_placeholder: "Describe your condition or specify other body parts...",
      schedule_appointment: "Schedule Appointment",
      book_appointment: "Book Appointment"
    }
  },
  hi: {
    scan_ecg: {
      header: "स्कैन और ईसीजी",
      header_subtitle: "घर पर स्कैन और ईसीजी नैदानिक ​​सेवाएं बुक करें",
      document_upload: "दस्तावेज़ अपलोड",
      camera_option: "कैमरा",
      camera_sub: "डॉक्टर के पर्चे की फोटो लें",
      gallery_option: "गैलरी",
      gallery_sub: "गैलरी से डॉक्टर का पर्चा अपलोड करें",
      schedule_service: "सेवा निर्धारित करें",
      service_addons: "अतिरिक्त सेवाएँ",
      pickup_drop: "पिकअप-ड्रॉप सहायता",
      assistance_required: "सहायता आवश्यक",
      appointment_location: "अपॉइंटमेंट का स्थान",
      comments: "टिप्पणियाँ",
      comments_placeholder: "कोई अतिरिक्त आवश्यकताएं, विशेष अनुरोध या नोट्स यहाँ दर्ज करें...",
      confirm: "पुष्टि करें",
      alert_datetime_required: "दिनांक और समय आवश्यक",
      alert_datetime_required_msg: "कृपया अपॉइंटमेंट के लिए दिनांक और समय चुनें।",
      alert_address_required: "पता आवश्यक",
      alert_address_required_msg: "कृपया एक वैध अपॉइंटमेंट पता दर्ज करें।"
    },
    fitness: {
      header: "फिटनेस",
      header_subtitle: "योग और फिटनेस सेवाएं बुक करें",
      service_type: "सेवा का प्रकार",
      yoga_teacher_home: "घर पर योग शिक्षक",
      join_class: "कक्षा में शामिल हों",
      standard_location: "सेवा का स्थान",
      comments: "टिप्पणियाँ",
      comments_placeholder: "कोई अतिरिक्त नोट्स दर्ज करें...",
      book_appointment: "अपॉइंटमेंट बुक करें",
      confirm_btn: "पुष्टि करें"
    },
    physio: {
      header: "फिजियोथेरेपी",
      header_subtitle: "घर पर फिजियोथेरेपिस्ट की विज़िट बुक करें",
      affected_body_parts: "प्रभावित शरीर के अंग चुनें",
      other_parts: "अन्य अंग",
      comments: "टिप्पणियाँ",
      comments_placeholder: "अपनी स्थिति का वर्णन करें या शरीर के अन्य अंगों को निर्दिष्ट करें...",
      schedule_appointment: "अपॉइंटमेंट शेड्यूल करें",
      book_appointment: "अपॉइंटमेंट बुक करें"
    }
  },
  bn: {
    scan_ecg: {
      header: "স্ক্যান ও ইসিজি",
      header_subtitle: "বাড়িতে স্ক্যান ও ইসিজি ডায়াগনস্টিক পরিষেবা বুক করুন",
      document_upload: "নথি আপলোড",
      camera_option: "ক্যামেরা",
      camera_sub: "ডাক্তারের প্রেসক্রিপশনের ছবি তুলুন",
      gallery_option: "গ্যালারি",
      gallery_sub: "গ্যালারি থেকে ডাক্তারের প্রেসক্রিপশন আপলোড করুন",
      schedule_service: "পরিষেবা নির্ধারণ করুন",
      service_addons: "পরিষেবা অ্যাড-অন",
      pickup_drop: "পিকআপ-ড্রপ সহায়তা",
      assistance_required: "সহায়তা প্রয়োজন",
      appointment_location: "অ্যাপয়েন্টমেন্টের অবস্থান",
      comments: "মন্তব্য",
      comments_placeholder: "কোন অতিরিক্ত প্রয়োজনীয়তা, বিশেষ অনুরোধ বা নোট এখানে লিখুন...",
      confirm: "নিশ্চিত করুন",
      alert_datetime_required: "তারিখ ও সময় প্রয়োজন",
      alert_datetime_required_msg: "অনুগ্রহ করে আপনার অ্যাপয়েন্টমেন্টের জন্য একটি তারিখ এবং সময় নির্বাচন করুন।",
      alert_address_required: "ঠিকানা প্রয়োজন",
      alert_address_required_msg: "অনুগ্রহ করে একটি সঠিক অ্যাপয়েন্টমেন্ট ঠিকানা লিখুন।"
    },
    fitness: {
      header: "ফিটনেস",
      header_subtitle: "যোগব্যায়াম ও ফিটনেস পরিষেবা বুক করুন",
      service_type: "পরিষেবার ধরণ",
      yoga_teacher_home: "বাড়িতে যোগ শিক্ষক",
      join_class: "ক্লাসে যোগ দিন",
      standard_location: "পরিষেবার অবস্থান",
      comments: "মন্তব্য",
      comments_placeholder: "কোন অতিরিক্ত নোট লিখুন...",
      book_appointment: "অ্যাপয়েন্টমেন্ট বুক করুন",
      confirm_btn: "নিশ্চিত করুন"
    },
    physio: {
      header: "ফিজিওথেরাপি",
      header_subtitle: "বাড়িতে ফিজিওথেরাপিস্ট ভিজিট বুক করুন",
      affected_body_parts: "আক্রান্ত শরীরের অংশ নির্বাচন করুন",
      other_parts: "অন্যান্য অংশ",
      comments: "মন্তব্য",
      comments_placeholder: "আপনার অবস্থা বর্ণনা করুন বা শরীরের অন্যান্য অংশ নির্দিষ্ট করুন...",
      schedule_appointment: "অ্যাপয়েন্টমেন্ট নির্ধারণ করুন",
      book_appointment: "অ্যাপয়েন্টমেন্ট বুক করুন"
    }
  },
  kn: {
    scan_ecg: {
      header: "ಸ್ಕ್ಯಾನ್ ಮತ್ತು ಇಸಿಜಿ",
      header_subtitle: "ಮನೆಯಲ್ಲೇ ಸ್ಕ್ಯಾನ್ ಮತ್ತು ಇಸಿಜಿ ತಪಾಸಣೆ ಸೇವೆಗಳನ್ನು ಬುಕ್ ಮಾಡಿ",
      document_upload: "ದಾಖಲೆ ಅಪ್‌ಲೋಡ್",
      camera_option: "ಕ್ಯಾಮೆರಾ",
      camera_sub: "ವೈದ್ಯರ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಫೋಟೋ ತೆಗೆದುಕೊಳ್ಳಿ",
      gallery_option: "ಗ್ಯಾಲರಿ",
      gallery_sub: "ಗ್ಯಾಲರಿಯಿಂದ ವೈದ್ಯರ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
      schedule_service: "ಸೇವೆಯನ್ನು ನಿಗದಿಪಡಿಸಿ",
      service_addons: "ಸೇವಾ ಆಡ್-ಆನ್‌ಗಳು",
      pickup_drop: "ಪಿಕಪ್-ಡ್ರಾಪ್ ಸಹಾಯ",
      assistance_required: "ಸಹಾಯದ ಅಗತ್ಯವಿದೆ",
      appointment_location: "ನೇಮಕಾತಿ ಸ್ಥಳ",
      comments: "ಅಭಿಪ್ರಾಯಗಳು",
      comments_placeholder: "ಯಾವುದೇ ಹೆಚ್ಚುವರಿ ಅಗತ್ಯತೆಗಳು, ವಿಶೇಷ ವಿನಂತಿಗಳು ಅಥವಾ ಟಿಪ್ಪಣಿಗಳನ್ನು ಇಲ್ಲಿ ನಮೂದಿಸಿ...",
      confirm: "ದೃಢೀಕರಿಸಿ",
      alert_datetime_required: "ದಿನಾಂಕ ಮತ್ತು ಸಮಯದ ಅಗತ್ಯವಿದೆ",
      alert_datetime_required_msg: "ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಾಗಿ ದಯವಿಟ್ಟು ದಿನಾಂಕ ಮತ್ತು ಸಮಯವನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
      alert_address_required: "ವಿಳಾಸದ ಅಗತ್ಯವಿದೆ",
      alert_address_required_msg: "ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ವಿಳಾಸವನ್ನು ನಮೂದಿಸಿ."
    },
    fitness: {
      header: "ಫಿಟ್ನೆಸ್",
      header_subtitle: "ಯೋಗ ಮತ್ತು ಫಿಟ್ನೆಸ್ ಸೇವೆಗಳನ್ನು ಬುಕ್ ಮಾಡಿ",
      service_type: "ಸೇವೆಯ ಪ್ರಕಾರ",
      yoga_teacher_home: "ಮನೆಯಲ್ಲಿ ಯೋಗ ಶಿಕ್ಷಕರು",
      join_class: "ತರಗತಿಗೆ ಸೇರಿಕೊಳ್ಳಿ",
      standard_location: "ಸೇವಾ ಸ್ಥಳ",
      comments: "ಅಭಿಪ್ರಾಯಗಳು",
      comments_placeholder: "ಯಾವುದೇ ಹೆಚ್ಚುವರಿ ಟಿಪ್ಪಣಿಗಳನ್ನು ನಮೂದಿಸಿ...",
      book_appointment: "ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಿ",
      confirm_btn: "ದೃಢೀಕರಿಸಿ"
    },
    physio: {
      header: "ಫಿಸಿಯೋಥೆರಪಿ",
      header_subtitle: "ಮನೆಯಲ್ಲೇ ಫಿಸಿಯೋಥೆರಪಿಸ್ಟ್ ಭೇಟಿಯನ್ನು ಬುಕ್ ಮಾಡಿ",
      affected_body_parts: "ಬಾಧಿತ ದೇಹದ ಭಾಗಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ",
      other_parts: "ಇತರ ಭಾಗಗಳು",
      comments: "ಅಭಿಪ್ರಾಯಗಳು",
      comments_placeholder: "ನಿಮ್ಮ ಸ್ಥಿತಿಯನ್ನು ವಿವರಿಸಿ ಅಥವಾ ಇತರ ದೇಹದ ಭಾಗಗಳನ್ನು ನಿರ್ದಿಷ್ಟಪಡಿಸಿ...",
      schedule_appointment: "ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ನಿಗದಿಪಡಿಸಿ",
      book_appointment: "ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಿ"
    }
  },
  ml: {
    scan_ecg: {
      header: "സ്കാൻ & ഇസിജി",
      header_subtitle: "വീട്ടിൽ സ്കാൻ, ഇസിജി ഡയഗ്നോസ്റ്റിക് സേവനങ്ങൾ ബുക്ക് ചെയ്യുക",
      document_upload: "രേഖ അപ്‌ലോഡ് ചെയ്യുക",
      camera_option: "ക്യാമറ",
      camera_sub: "ഡോക്ടറുടെ കുറിപ്പടിയുടെ ഫോട്ടോ എടുക്കുക",
      gallery_option: "ഗാലറി",
      gallery_sub: "ഗാലറിയിൽ നിന്ന് ഡോക്ടറുടെ കുറിപ്പടി അപ്‌ലോഡ് ചെയ്യുക",
      schedule_service: "സേവനം ഷെഡ്യൂൾ ചെയ്യുക",
      service_addons: "സേവന ആഡ്-ഓണുകൾ",
      pickup_drop: "പിക്ക്അപ്പ്-ഡ്രോപ്പ് സഹായം",
      assistance_required: "സഹായം ആവശ്യമാണ്",
      appointment_location: "അപ്പോയിന്റ്മെന്റ് സ്ഥലം",
      comments: "അഭിപ്രായങ്ങൾ",
      comments_placeholder: "മറ്റ് ആവശ്യങ്ങളോ പ്രത്യേക അഭ്യർത്ഥനകളോ കുറിപ്പുകളോ ഉണ്ടെങ്കിൽ ഇവിടെ രേഖപ്പെടുത്തുക...",
      confirm: "സ്ഥിരീകരിക്കുക",
      alert_datetime_required: "തീയതിയും സമയവും ആവശ്യമാണ്",
      alert_datetime_required_msg: "അപ്പോയിന്റ്മെന്റിനായി ഒരു തീയതിയും സമയവും ദയവായി തിരഞ്ഞെടുക്കുക.",
      alert_address_required: "വിലാസം ആവശ്യമാണ്",
      alert_address_required_msg: "സാധുവായ ഒരു അപ്പോയിന്റ്മെന്റ് വിലാസം ദയവായി നൽകുക."
    },
    fitness: {
      header: "ഫിറ്റ്നസ്",
      header_subtitle: "യോഗ, ഫിറ്റ്നസ് സേവനങ്ങൾ ബുക്ക് ചെയ്യുക",
      service_type: "സേവന തരം",
      yoga_teacher_home: "വീട്ടിൽ യോഗ അധ്യാപകൻ",
      join_class: "ക്ലാസ്സിൽ ചേരുക",
      standard_location: "സേവന സ്ഥലം",
      comments: "അഭിപ്രായങ്ങൾ",
      comments_placeholder: "മറ്റ് കുറിപ്പുകൾ ഇവിടെ ചേർക്കുക...",
      book_appointment: "അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്യുക",
      confirm_btn: "സ്ഥിരീകരിക്കുക"
    },
    physio: {
      header: "ഫിസിയോതെറാപ്പി",
      header_subtitle: "വീട്ടിൽ ഫിസിയോതെറാപ്പിസ്റ്റ് സന്ദർശനം ബുക്ക് ചെയ്യുക",
      affected_body_parts: "ബാധിച്ച ശരീരഭാഗങ്ങൾ തിരഞ്ഞെടുക്കുക",
      other_parts: "മറ്റു ഭാഗങ്ങൾ",
      comments: "അഭിപ്രായങ്ങൾ",
      comments_placeholder: "നിങ്ങളുടെ അവസ്ഥ വിവരിക്കുക അല്ലെങ്കിൽ മറ്റ് ശരീരഭാഗങ്ങൾ വ്യക്തമാക്കുക...",
      schedule_appointment: "അപ്പോയിന്റ്മെന്റ് ഷെഡ്യൂൾ ചെയ്യുക",
      book_appointment: "അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്യുക"
    }
  },
  mr: {
    scan_ecg: {
      header: "स्कॅन आणि ईसीजी",
      header_subtitle: "घरी स्कॅन आणि ईसीजी तपासणी सेवा बुक करा",
      document_upload: "दस्तऐवज अपलोड",
      camera_option: "कॅमेरा",
      camera_sub: "डॉक्टरांच्या प्रिस्क्रिप्शनचा फोटो घ्या",
      gallery_option: "गॅलरी",
      gallery_sub: "गॅलरीमधून डॉक्टरांचे प्रिस्क्रिप्शन अपलोड करा",
      schedule_service: "सेवा शेड्यूल करा",
      service_addons: "अतिरिक्त सेवा",
      pickup_drop: "पिकअप-ड्रॉप मदत",
      assistance_required: "मदत आवश्यक आहे",
      appointment_location: "अपॉइंटमेंटचे ठिकाण",
      comments: "टिप्पण्या",
      comments_placeholder: "इतर काही आवश्यकता, विशेष विनंती किंवा नोट्स येथे प्रविष्ट करा...",
      confirm: "निश्चित करा",
      alert_datetime_required: "दिनांक आणि वेळ आवश्यक",
      alert_datetime_required_msg: "कृपया तुमच्या अपॉइंटमेंटसाठी तारीख आणि वेळ निवडा.",
      alert_address_required: "पत्ता आवश्यक",
      alert_address_required_msg: "कृपया एक वैध अपॉइंटमेंट पत्ता प्रविष्ट करा।"
    },
    fitness: {
      header: "फिटनेस",
      header_subtitle: "योग आणि फिटनेस सेवा बुक करा",
      service_type: "सेवेचा प्रकार",
      yoga_teacher_home: "घरी योग शिक्षक",
      join_class: "वर्गात सामील व्हा",
      standard_location: "सेवेचे ठिकाण",
      comments: "टिप्पण्या",
      comments_placeholder: "इतर काही नोट्स प्रविष्ट करा...",
      book_appointment: "अपॉइंटमेंट बुक करा",
      confirm_btn: "निश्चित करा"
    },
    physio: {
      header: "फिजिओथेरपी",
      header_subtitle: "घरी फिजिओथेरपिस्टची भेट बुक करा",
      affected_body_parts: "प्रभावित शरीराचे अवयव निवडा",
      other_parts: "इतर अवयव",
      comments: "टिप्पण्या",
      comments_placeholder: "तुमच्या स्थितीचे वर्णन करा किंवा शरीराचे इतर अवयव निर्दिष्ट करा...",
      schedule_appointment: "अपॉइंटमेंट शेड्यूल करा",
      book_appointment: "अपॉइंटमेंट बुक करा"
    }
  },
  ta: {
    scan_ecg: {
      header: "ஸ்கேன் & ஈசிஜி",
      header_subtitle: "வீட்டிலேயே ஸ்கேன் & ஈசிஜி கண்டறியும் சேவைகளை பதிவு செய்யுங்கள்",
      document_upload: "ஆவண பதிவேற்றம்",
      camera_option: "கேமரா",
      camera_sub: "மருத்துவரின் சீட்டை புகைப்படம் எடுக்கவும்",
      gallery_option: "கேலரி",
      gallery_sub: "கேலரியில் இருந்து மருத்துவரின் சீட்டை பதிவேற்றவும்",
      schedule_service: "சேவையை திட்டமிடுங்கள்",
      service_addons: "சேவை கூடுதல் அம்சங்கள்",
      pickup_drop: "பிக்அப்-டிராப் உதவி",
      assistance_required: "உதவி தேவை",
      appointment_location: "நியமன இடம்",
      comments: "கருத்துகள்",
      comments_placeholder: "கூடுதல் தேவைகள், சிறப்பு கோரிக்கைகள் அல்லது குறிப்புகளை இங்கே உள்ளிடவும்...",
      confirm: "உறுதிப்படுத்து",
      alert_datetime_required: "தேதி & நேரம் தேவை",
      alert_datetime_required_msg: "உங்கள் சந்திப்பிற்கு ஒரு தேதி மற்றும் நேரத்தை தேர்வு செய்யவும்.",
      alert_address_required: "முகவரி தேவை",
      alert_address_required_msg: "செல்லுபடியாகும் சந்திப்பு முகவரியை உள்ளிடவும்."
    },
    fitness: {
      header: "உடற்தகுதி",
      header_subtitle: "யோகா & உடற்தகுதி சேவைகளை பதிவு செய்யவும்",
      service_type: "சேவை வகை",
      yoga_teacher_home: "வீட்டில் யோகா ஆசிரியர்",
      join_class: "வகுப்பில் சேரவும்",
      standard_location: "சேவை இருப்பிடம்",
      comments: "கருத்துகள்",
      comments_placeholder: "கூடுதல் குறிப்புகளை உள்ளிடவும்...",
      book_appointment: "சந்திப்பை பதிவு செய்",
      confirm_btn: "உறுதிப்படுத்து"
    },
    physio: {
      header: "உடலியக்க மருத்துவம் (ஃபிசியோ)",
      header_subtitle: "வீட்டிலேயே உடலியக்க மருத்துவர் வருகையை பதிவு செய்யுங்கள்",
      affected_body_parts: "பாதிக்கப்பட்ட உடல் பாகங்களை தேர்ந்தெடுக்கவும்",
      other_parts: "இதர பாகங்கள்",
      comments: "கருத்துகள்",
      comments_placeholder: "உங்கள் நிலையை விவரிக்கவும் அல்லது இதர உடல் பாகங்களை குறிப்பிடவும்...",
      schedule_appointment: "சந்திப்பை திட்டமிடுங்கள்",
      book_appointment: "சந்திப்பை பதிவு செய்"
    }
  },
  te: {
    scan_ecg: {
      header: "ಸ್ಕ್ಯಾನ್ & ಇಸಿಜಿ",
      header_subtitle: "ఇంటి వద్దే స్కాన్ & ఈసీజీ పరీక్షల సేవలను బుక్ చేసుకోండి",
      document_upload: "పత్రాల అప్‌లోడ్",
      camera_option: "కెమెరా",
      camera_sub: "వైద్యుల ప్రిస్క్రిప్షన్ ఫోటో తీయండి",
      gallery_option: "గ్యాలరీ",
      gallery_sub: "గ్యాలరీ నుండి ప్రిస్క్రిప్షన్ అప్‌లోడ్ చేయండి",
      schedule_service: "సేవను షెడ్యూల్ చేయండి",
      service_addons: "సేవా యాడ్-ఆన్స్",
      pickup_drop: "పికప్-డ్రాప్ సహాయం",
      assistance_required: "సహాయం అవసరం",
      appointment_location: "నియామక స్థలం",
      comments: "వ్యాఖ్యలు",
      comments_placeholder: "ఏవైనా అదనపు అవసరాలు, ప్రత్యేక అభ్యర్థనలు లేదా గమనికలను ఇక్కడ నమోదు చేయండి...",
      confirm: "ధృవీకరించు",
      alert_datetime_required: "తేదీ & సమయం అవసరం",
      alert_datetime_required_msg: "దయచేసి మీ అపాయింట్‌మెంట్ కోసం తేదీ మరియు సమయాన్ని ఎంచుకోండి.",
      alert_address_required: "చిరునామా అవసరం",
      alert_address_required_msg: "దయచేసి సరైన అపాయింట్‌మెంట్ చిరునామాను నమోదు చేయండి."
    },
    fitness: {
      header: "ఫిట్‌నెస్",
      header_subtitle: "యోగా & ఫిట్‌నెస్ సేవలను బుక్ చేసుకోండి",
      service_type: "సేవ రకం",
      yoga_teacher_home: "ఇంటి వద్ద యోగా శిక్షకుడు",
      join_class: "క్లాస్‌లో చేరండి",
      standard_location: "సేవ స్థలం",
      comments: "వ్యాఖ్యలు",
      comments_placeholder: "అదనపు గమనికలను నమోదు చేయండి...",
      book_appointment: "అపాయింట్‌మెంట్ బుక్ చేయండి",
      confirm_btn: "ధృవీకరించు"
    },
    physio: {
      header: "ఫిజియోథెరపీ",
      header_subtitle: "ఇంటి వద్దే ఫిజియోథెరపిస్ట్ సేవలను బుక్ చేసుకోండి",
      affected_body_parts: "బాధిత శరీర భాగాలను ఎంచుకోండి",
      other_parts: "ఇతర భాగాలు",
      comments: "వ్యాఖ్యలు",
      comments_placeholder: "మీ సమస్యను వివరించండి లేదా ఇతర శరీర భాగాలను పేర్కొనండి...",
      schedule_appointment: "అపాయింట్‌మెంట్ షెడ్యూల్ చేయండి",
      book_appointment: "అపాయిंట్‌మెంట్ బుక్ చేయండి"
    },
    medical_equipment: {
      other: "ఇతర",
      other_type: "రకం",
      other_placeholder: "అవసరమైన పరికరాన్ని పేర్కొనండి...",
      alert_other_required: "దయచేసి పరికరం రకాన్ని పేర్కొనండి.",
      custom_duration_label: "అనుకూల వ్యవధి",
      custom_duration_placeholder: "ఉదా. 10 రోజులు, 3 వారాలు",
      alert_custom_duration_required: "దయచేసి అనుకూల వ్యవధిని పేర్కొనండి."
    },
    insurance: {
      self: "స్వయంగా",
      family: "కుటుంబం",
      spouse: "భార్య/భర్త",
      parent: "తల్లి/తండ్రి",
      upload_aadhaar: "ఆధార్ కార్డ్ అప్‌లోడ్ చేయండి",
      upload_pan: "పాన్ కార్డ్ అప్‌లోడ్ చేయండి",
      aadhaar_required: "ఆధార్ కార్డ్ అవసరం.",
      pan_required: "పాన్ కార్డ్ అవసరం.",
      who_is_it_for: "ఇది ఎవరి కోసం?",
      document_preview: "అప్‌లోడ్ చేసిన పత్రాల ప్రివ్యూ"
    }
  }
};

// Add medical_equipment and insurance keys to other languages in translations
translations.en = {
  ...translations.en,
  medical_equipment: {
    other: "Other",
    other_type: "Type",
    other_placeholder: "Specify equipment needed...",
    alert_other_required: "Please specify the equipment type.",
    custom_duration_label: "Custom Duration",
    custom_duration_placeholder: "e.g. 10 Days, 3 Weeks",
    alert_custom_duration_required: "Please specify custom duration."
  },
  insurance: {
    self: "Self",
    family: "Family",
    spouse: "Spouse",
    parent: "Parent",
    upload_aadhaar: "Upload Aadhaar Card",
    upload_pan: "Upload PAN Card",
    aadhaar_required: "Aadhaar Card is required.",
    pan_required: "PAN Card is required.",
    who_is_it_for: "Who is it for?",
    document_preview: "Uploaded Document Preview"
  }
};

translations.hi = {
  ...translations.hi,
  medical_equipment: {
    other: "अन्य",
    other_type: "प्रकार",
    other_placeholder: "आवश्यक उपकरण निर्दिष्ट करें...",
    alert_other_required: "कृपया उपकरण का प्रकार निर्दिष्ट करें।",
    custom_duration_label: "कस्टम अवधि",
    custom_duration_placeholder: "जैसे 10 दिन, 3 सप्ताह",
    alert_custom_duration_required: "कृपया कस्टम अवधि निर्दिष्ट करें।"
  },
  insurance: {
    self: "स्वयं",
    family: "परिवार",
    spouse: "जीवनसाथी",
    parent: "माता-पिता",
    upload_aadhaar: "आधार कार्ड अपलोड करें",
    upload_pan: "पैन कार्ड अपलोड करें",
    aadhaar_required: "आधार कार्ड आवश्यक है।",
    pan_required: "पैन कार्ड आवश्यक है।",
    who_is_it_for: "यह किसके लिए है?",
    document_preview: "अपलोड किए गए दस्तावेज़ का पूर्वावलोकन"
  }
};

translations.bn = {
  ...translations.bn,
  medical_equipment: {
    other: "অন্যান্য",
    other_type: "ধরণ",
    other_placeholder: "প্রয়োজনীয় সরঞ্জাম উল্লেখ করুন...",
    alert_other_required: "অনুগ্রহ করে সরঞ্জামের ধরণ উল্লেখ করুন।",
    custom_duration_label: "কাস্টম মেয়াদ",
    custom_duration_placeholder: "যেমন ১০ দিন, ৩ সপ্তাহ",
    alert_custom_duration_required: "অনুগ্রহ করে কাস্টম মেয়াদ উল্লেখ করুন।"
  },
  insurance: {
    self: "স্বয়ং",
    family: "পরিবার",
    spouse: "স্বামী/স্ত্রী",
    parent: "পিতা-মাতা",
    upload_aadhaar: "আধার কার্ড আপলোড করুন",
    upload_pan: "প্যান कार्ड আপলোড করুন",
    aadhaar_required: "আধার কার্ড প্রয়োজন।",
    pan_required: "প্যান কার্ড প্রয়োজন।",
    who_is_it_for: "এটি কার জন্য?",
    document_preview: "আপলোড করা নথির পূর্বরূপ"
  }
};

translations.kn = {
  ...translations.kn,
  medical_equipment: {
    other: "ಇತರ",
    other_type: "ಪ್ರಕಾರ",
    other_placeholder: "ಅಗತ್ಯವಿರುವ ಉಪಕರಣವನ್ನು ನಿರ್ದಿಷ್ಟಪಡಿಸಿ...",
    alert_other_required: "ದಯವಿಟ್ಟು ಉಪಕರಣದ ಪ್ರಕಾರವನ್ನು ನಿರ್ದಿಷ್ಟಪಡಿಸಿ.",
    custom_duration_label: "ಕಸ್ಟಮ್ ಅವಧಿ",
    custom_duration_placeholder: "ಉದಾ. 10 ದಿನಗಳು, 3 ವಾರಗಳು",
    alert_custom_duration_required: "ದಯವಿಟ್ಟು ಕಸ್ಟಮ್ ಅವಧಿಯನ್ನು ನಿರ್ದಿಷ್ಟಪಡಿಸಿ."
  },
  insurance: {
    self: "ಸ್ವಯಂ",
    family: "ಕುಟುಂಬ",
    spouse: "ಜೀವನ ಸಂಗಾತಿ",
    parent: "ಪೋಷಕರು",
    upload_aadhaar: "ಆಧಾರ್ ಕಾರ್ಡ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
    upload_pan: "ಪ್ಯಾನ್ ಕಾರ್ಡ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
    aadhaar_required: "ಆಧಾರ್ ಕಾರ್ಡ್ ಅಗತ್ಯವಿದೆ.",
    pan_required: "ಪ್ಯಾನ್ ಕಾರ್ಡ್ ಅಗತ್ಯವಿದೆ.",
    who_is_it_for: "ಇದು ಯಾರಿಗಾಗಿ?",
    document_preview: "ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ದಾಖಲೆಯ ಪೂರ್ವವೀಕ್ಷಣೆ"
  }
};

translations.ml = {
  ...translations.ml,
  medical_equipment: {
    other: "മറ്റുള്ളവ",
    other_type: "തരം",
    other_placeholder: "ആവശ്യമായ ഉപകരണം വ്യക്തമാക്കുക...",
    alert_other_required: "ദയവായി ഉപകരണത്തിന്റെ തരം വ്യക്തമാക്കുക.",
    custom_duration_label: "കസ്റ്റം ദൈർഘ്യം",
    custom_duration_placeholder: "ഉദാ. 10 ദിവസം, 3 ആഴ്ച",
    alert_custom_duration_required: "ദയവായി കസ്റ്റം ദൈർഘ്യം വ്യക്തമാക്കുക."
  },
  insurance: {
    self: "സ്വയം",
    family: "കുടുംബം",
    spouse: "പങ്കാളി",
    parent: "മാതാപിതാക്കൾ",
    upload_aadhaar: "ആധാർ കാർഡ് അപ്‌ലോഡ് ചെയ്യുക",
    upload_pan: "പാൻ കാർഡ് അപ്‌ലോഡ് ചെയ്യുക",
    aadhaar_required: "ആധാർ കാർഡ് ആവശ്യമാണ്.",
    pan_required: "പാൻ കാർഡ് ആവശ്യമാണ്.",
    who_is_it_for: "ഇത് ആർക്കാണ്?",
    document_preview: "അപ്‌ലോഡ് ചെയ്ത രേഖയുടെ പ്രിവ്യൂ"
  }
};

translations.mr = {
  ...translations.mr,
  medical_equipment: {
    other: "इतर",
    other_type: "प्रकार",
    other_placeholder: "आवश्यक उपकरणे निर्दिष्ट करा...",
    alert_other_required: "कृपया उपकरणाचा प्रकार निर्दिष्ट करा.",
    custom_duration_label: "सानुकूल कालावधी",
    custom_duration_placeholder: "उदा. १० दिवस, ३ आठवडे",
    alert_custom_duration_required: "कृपया सानुकूल कालावधी निर्दिष्ट करा."
  },
  insurance: {
    self: "स्वतः",
    family: "कुटुंब",
    spouse: "जोडीदार",
    parent: "पालक",
    upload_aadhaar: "आधार कार्ड अपलोड करा",
    upload_pan: "पॅन कार्ड अपलोड करा",
    aadhaar_required: "आधार कार्ड आवश्यक आहे.",
    pan_required: "पॅन कार्ड आवश्यक आहे.",
    who_is_it_for: "हे कोणासाठी आहे?",
    document_preview: "अपलोड केलेल्या दस्तऐवजाचे पूर्वावलोकन"
  }
};

translations.ta = {
  ...translations.ta,
  medical_equipment: {
    other: "மற்றவை",
    other_type: "வகை",
    other_placeholder: "தேவையான உபகரணங்களை குறிப்பிடவும்...",
    alert_other_required: "தயவுசெய்து உபகரண வகையைக் குறிப்பிடவும்.",
    custom_duration_label: "தனிப்பயன் காலம்",
    custom_duration_placeholder: "உதாரணமாக 10 நாட்கள், 3 வாரங்கள்",
    alert_custom_duration_required: "தயவுசெய்து தனிப்பயன் காலத்தைக் குறிப்பிடவும்."
  },
  insurance: {
    self: "சுய",
    family: "குடும்பம்",
    spouse: "துணைவர்",
    parent: "பெற்றோர்",
    upload_aadhaar: "ஆதார் கார்டைப் பதிவேற்றவும்",
    upload_pan: "பான் கார்டைப் பதிவேற்றவும்",
    aadhaar_required: "ஆதார் கார்டு தேவை.",
    pan_required: "பான் கார்டு தேவை.",
    who_is_it_for: "இது யாருக்காக?",
    document_preview: "பதிவேற்றிய ஆவணத்தின் முன்னோட்டம்"
  }
};

Object.entries(translations).forEach(([lang, namespaces]) => {
  const filePath = path.join(localesDir, `${lang}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  Object.entries(namespaces).forEach(([ns, keys]) => {
    data[ns] = { ...data[ns], ...keys };
  });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ ${lang} locales successfully updated with scan_ecg, fitness, physio, medical_equipment, and insurance namespaces!`);
});
