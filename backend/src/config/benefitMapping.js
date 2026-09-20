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
  // Array = the slug is shared by more than one plan's promised benefit.
  // Ayuxa Companion promises HOSPITAL_ACCOMPANIMENT (quota-tracked) on this
  // same booking; Ayuxa Escort separately promises PICKUP_DROP (1/month) —
  // getBenefitCodeForService()'s callers try each candidate in order and use
  // whichever the user's actual active plan grants.
  "hospital-trip": ["HOSPITAL_ACCOMPANIMENT", "PICKUP_DROP"],
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
  "meetup": "LOCAL_MEETUP",

  // Current DB slugs (admin renamed these at some point after the entries
  // above were written — the OLD slugs above are now dead/unused by any
  // real Service row, but kept harmless in case something still points at
  // them). getBenefitCodeForService() was silently returning null for
  // Washroom Sanitization, Appliance Repair, Bank & Paperwork, Paper &
  // Legal Helper, and Deep Cleaning until these were added — Home
  // Essentials plan holders were being charged full price/fees on all 5,
  // with zero error, because the "if (benefitCode)" check was just never
  // entered. Verify each rename against the live Service table before
  // trusting a slug here again — see scripts/verify-mobile-service-slugs.js.
  "washroom-sanitization": "SANITATION",
  "appliances-repair-": "ZERO_SERVICE_FEE",
  "paper-work": "PAPERWORK_ASSIST",
  "legal-work": "PAPERWORK_ASSIST",
  "depp-clean": "DEEP_CLEANING",

  // Waiver categories:
  // Real DB slug is "plumbing" (not "plumbing-electrical") — the mismatch
  // meant getBenefitCodeForService() returned null for every Plumbing &
  // Electrical booking, silently skipping the ZERO_SERVICE_FEE waiver check
  // entirely, so Home Essentials plan holders were charged full fees on it.
  "plumbing-electrical": "ZERO_SERVICE_FEE",
  "plumbing": "ZERO_SERVICE_FEE",
  "appliance-repair": "ZERO_SERVICE_FEE",
  "smart-upgrade": "ZERO_SERVICE_FEE",
  "driving-cab": "ZERO_SERVICE_FEE",
  // Ayuxa Escort separately promises SPIRITUAL_ESCORT (1/quarter, "Travel
  // Escort up to 50km") on this same slug — see hospital-trip's comment above.
  "trip-travels": ["ZERO_SERVICE_FEE", "SPIRITUAL_ESCORT"],
  "ayuxa": "ZERO_SERVICE_FEE"
};

// Returns the single benefit code for a slug (back-compat — existing callers
// expect one string). When a slug maps to multiple candidate codes (shared
// across plans), returns the first one; use getBenefitCodesForService() to
// get the full candidate list and pick the one the user's plan actually grants.
function getBenefitCodeForService(serviceSlug) {
  const codes = getBenefitCodesForService(serviceSlug);
  return codes.length ? codes[0] : null;
}

function getBenefitCodesForService(serviceSlug) {
  if (!serviceSlug) return [];
  const normalized = serviceSlug.toLowerCase().trim();
  let entry = serviceSlugMap[normalized];
  if (!entry) {
    const match = Object.keys(serviceSlugMap).find(k => k.toUpperCase().replace(/-/g, '_') === normalized.toUpperCase().replace(/-/g, '_'));
    entry = match ? serviceSlugMap[match] : null;
  }
  if (!entry) return [];
  return Array.isArray(entry) ? entry : [entry];
}

module.exports = {
  serviceActionMap,
  serviceSlugMap,
  getBenefitCodeForService,
  getBenefitCodesForService
};
