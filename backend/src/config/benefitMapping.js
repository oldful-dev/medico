const serviceActionMap = {
  SOS_REQUEST: "SOS",
  TELECONSULT_BOOKING: "TELECONSULT",
  MEDICINE_DELIVERY: "MEDICINE_DELIVERY",
  BLOOD_TEST: "BLOOD_TEST",
  COMPANION_CALL: "COMPANIONSHIP_CALL",
  NURSE_VISIT: "NURSE_VISIT",
  HOSPITAL_ACCOMPANIMENT: "HOSPITAL_ACCOMPANIMENT",
  BILL_PAYMENT: "BILL_PAYMENT",
  TECH_SUPPORT: "TECH_SUPPORT",
  GROCERY_ASSISTANCE: "GROCERY_ASSIST",
  HOME_AUDIT: "HOME_AUDIT",
  MEAL_SERVICE: "MEAL_SERVICE"
};

const serviceSlugMap = {
  "doctor-visit": "TELECONSULT",
  "doctor-home-visit": "TELECONSULT",
  "medicines": "MEDICINE_DELIVERY",
  "order-medicines": "MEDICINE_DELIVERY",
  "blood-test": "BLOOD_TEST",
  "scan-ecg": "BLOOD_TEST",
  "companion-call": "COMPANIONSHIP_CALL",
  "nurse-care": "NURSE_VISIT",
  "home-nurse": "NURSE_VISIT",
  "caregiver-support": "NURSE_VISIT",
  "hospital-trip": "HOSPITAL_ACCOMPANIMENT",
  "bill-payment": "BILL_PAYMENT",
  "tech-helper": "TECH_SUPPORT",
  "grocery-run": "GROCERY_ASSIST",
  "bank-paperwork": "PAPERWORK_ASSIST",
  "paper-legal": "PAPERWORK_ASSIST",
  "paperwork-legal": "PAPERWORK_ASSIST",
  "sanitisation": "SANITATION",
  "deep-cleaning": "DEEP_CLEANING",
  "home-audit": "HOME_AUDIT",
  "meal-service": "MEAL_SERVICE",
  "anything-else": "CUSTOM_REQUEST",
  "test": "CUSTOM_REQUEST",
  
  // Waiver categories:
  "plumbing-electrical": "ZERO_SERVICE_FEE",
  "appliance-repair": "ZERO_SERVICE_FEE",
  "smart-upgrade": "ZERO_SERVICE_FEE",
  "driving-cab": "ZERO_SERVICE_FEE",
  "trip-travels": "ZERO_SERVICE_FEE",
  "ayuxa": "ZERO_SERVICE_FEE"
};

function getBenefitCodeForService(serviceSlug) {
  if (!serviceSlug) return null;
  const normalized = serviceSlug.toLowerCase().trim();
  if (serviceSlugMap[normalized]) {
    return serviceSlugMap[normalized];
  }
  const match = Object.keys(serviceSlugMap).find(k => k.toUpperCase().replace(/-/g, '_') === normalized.toUpperCase().replace(/-/g, '_'));
  if (match) {
    return serviceSlugMap[match];
  }
  return null;
}

module.exports = {
  serviceActionMap,
  serviceSlugMap,
  getBenefitCodeForService
};
