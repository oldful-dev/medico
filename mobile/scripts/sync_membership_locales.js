/**
 * Sync membership locale keys across all 8 languages.
 * Run: node scripts/sync_membership_locales.js
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../i18n/locales');

// All new keys in English
const NEW_KEYS = {
  membership: {
    // dashboard
    title: 'My Memberships',
    subtitle: 'Manage all your active plans',
    care_label: 'Care Plan',
    homemaker_label: 'Home Maker Plan',
    no_plan_title: 'No {{category}} Active',
    no_plan_sub: 'Subscribe to unlock benefits',
    subscribe_now: 'Subscribe Now',
    days_left_one: '{{count}} day left',
    days_left_other: '{{count}} days left',
    expires_today: 'Expires today',
    expires_on: 'Expires {{date}}',
    days_left: 'Days Left',
    paid: 'Paid',
    cycle: 'Cycle',
    cycle_yearly: '1yr',
    cycle_biannual: '6mo',
    cycle_quarterly: '3mo',
    upgrade_btn: 'Upgrade',
    renew_btn: 'Renew',
    history_link: 'View Upgrade & Transaction History',
    scheduled_downgrade_notice: 'Downgrade to {{plan}} scheduled on {{date}}',
    basic_tier: 'Basic',
    premium_tier: 'Premium',
    vip_tier: 'VIP',

    // upgrade screen
    upgrade_title: 'Upgrade Plan',
    current_plan_label: 'Current: {{name}}',
    choose_new_plan: 'Choose New Plan',
    billing_duration: 'Billing Duration',
    already_highest: "You're already on the highest tier!",
    three_months: '3 Months',
    six_months: '6 Months',
    one_year: '1 Year',
    days_90: '90 days',
    days_180: '180 days',
    days_365: '365 days',
    selected_label: 'Selected',
    from_price: 'From ₹{{price}} / 3 months',
    loading_upgrades: 'Loading upgrade options…',
    no_upgrades: 'No Upgrades',
    no_upgrades_msg: 'No upgrade options available.',
    load_error: 'Failed to load upgrade options.',

    // credit breakdown
    credit_breakdown_title: 'Pro-Rata Credit Breakdown',
    days_remaining: 'Days remaining',
    daily_rate: 'Daily rate (current plan)',
    credit_from_plan: 'Credit from current plan',
    new_plan_price: 'New plan price',
    amount_due: 'Amount Due',
    free: 'FREE',
    credit_covers_full: 'Your credit fully covers this upgrade!',
    select_plan_prompt: 'Select a plan to see the breakdown.',

    // upgrade CTA
    upgrade_free_btn: 'Upgrade for Free',
    pay_and_upgrade_btn: 'Pay ₹{{amount}} & Upgrade',
    confirm_upgrade_title: 'Confirm Upgrade',
    confirm_upgrade_msg: 'Upgrade to {{plan}}?\n\nYour credit of ₹{{credit}} covers the full cost. No payment needed.',
    cancel_btn: 'Cancel',
    upgrade_now_btn: 'Upgrade Now',
    upgrade_success_title: '🎉 Upgraded!',
    upgrade_success_msg: 'Welcome to {{plan}}! Your plan is now active.',
    upgrade_failed: 'Upgrade Failed',
    upgrade_error: 'Something went wrong.',
    upgrade_generic_error: 'Upgrade failed.',

    // history screen
    history_title: 'Plan History',
    history_subtitle: 'All your plan changes',
    history_empty_title: 'No History Yet',
    history_empty_sub: 'Your plan upgrades and changes will appear here.',
    history_loading: 'Loading history…',
    history_date: 'Date',
    old_plan: 'From',
    new_plan: 'To',
    credit_applied: 'Credit Applied',
    amount_paid: 'Amount Paid',
    type_upgrade: 'Upgrade',
    type_downgrade: 'Downgrade Scheduled',
    type_renew: 'Renewed',
    free_upgrade: 'Free Upgrade',
  }
};

// Translations per language (machine-translated — update as needed)
const TRANSLATIONS = {
  en: NEW_KEYS,
  hi: {
    membership: {
      title: 'मेरी सदस्यता',
      subtitle: 'अपनी सभी सक्रिय योजनाएं प्रबंधित करें',
      care_label: 'केयर प्लान',
      homemaker_label: 'होम मेकर प्लान',
      no_plan_title: 'कोई {{category}} सक्रिय नहीं',
      no_plan_sub: 'लाभ अनलॉक करने के लिए सदस्यता लें',
      subscribe_now: 'अभी सदस्यता लें',
      days_left_one: '{{count}} दिन शेष',
      days_left_other: '{{count}} दिन शेष',
      expires_today: 'आज समाप्त होती है',
      expires_on: '{{date}} को समाप्त',
      days_left: 'शेष दिन',
      paid: 'भुगतान',
      cycle: 'चक्र',
      cycle_yearly: '1 वर्ष',
      cycle_biannual: '6 माह',
      cycle_quarterly: '3 माह',
      upgrade_btn: 'अपग्रेड',
      renew_btn: 'नवीनीकरण',
      history_link: 'अपग्रेड और लेनदेन इतिहास देखें',
      scheduled_downgrade_notice: '{{date}} को {{plan}} में डाउनग्रेड निर्धारित',
      basic_tier: 'बेसिक',
      premium_tier: 'प्रीमियम',
      vip_tier: 'वीआईपी',
      upgrade_title: 'योजना अपग्रेड करें',
      current_plan_label: 'वर्तमान: {{name}}',
      choose_new_plan: 'नई योजना चुनें',
      billing_duration: 'बिलिंग अवधि',
      already_highest: 'आप पहले से उच्चतम स्तर पर हैं!',
      three_months: '3 महीने',
      six_months: '6 महीने',
      one_year: '1 वर्ष',
      days_90: '90 दिन',
      days_180: '180 दिन',
      days_365: '365 दिन',
      selected_label: 'चुना गया',
      from_price: '₹{{price}} / 3 माह से',
      loading_upgrades: 'अपग्रेड विकल्प लोड हो रहे हैं…',
      no_upgrades: 'कोई अपग्रेड नहीं',
      no_upgrades_msg: 'कोई अपग्रेड विकल्प उपलब्ध नहीं है।',
      load_error: 'अपग्रेड विकल्प लोड करने में विफल।',
      credit_breakdown_title: 'प्रो-राटा क्रेडिट विवरण',
      days_remaining: 'शेष दिन',
      daily_rate: 'दैनिक दर (वर्तमान योजना)',
      credit_from_plan: 'वर्तमान योजना से क्रेडिट',
      new_plan_price: 'नई योजना की कीमत',
      amount_due: 'देय राशि',
      free: 'मुफ्त',
      credit_covers_full: 'आपका क्रेडिट इस अपग्रेड को पूरी तरह कवर करता है!',
      select_plan_prompt: 'विवरण देखने के लिए एक योजना चुनें।',
      upgrade_free_btn: 'मुफ्त में अपग्रेड करें',
      pay_and_upgrade_btn: '₹{{amount}} भुगतान करें और अपग्रेड करें',
      confirm_upgrade_title: 'अपग्रेड की पुष्टि करें',
      confirm_upgrade_msg: '{{plan}} में अपग्रेड करें?\n\nआपका ₹{{credit}} क्रेडिट पूरी लागत को कवर करता है। कोई भुगतान नहीं।',
      cancel_btn: 'रद्द करें',
      upgrade_now_btn: 'अभी अपग्रेड करें',
      upgrade_success_title: '🎉 अपग्रेड हुआ!',
      upgrade_success_msg: '{{plan}} में आपका स्वागत है! आपकी योजना अब सक्रिय है।',
      upgrade_failed: 'अपग्रेड विफल',
      upgrade_error: 'कुछ गलत हो गया।',
      upgrade_generic_error: 'अपग्रेड विफल।',
      history_title: 'योजना इतिहास',
      history_subtitle: 'आपके सभी योजना परिवर्तन',
      history_empty_title: 'अभी तक कोई इतिहास नहीं',
      history_empty_sub: 'आपके अपग्रेड और परिवर्तन यहाँ दिखेंगे।',
      history_loading: 'इतिहास लोड हो रहा है…',
      history_date: 'तारीख',
      old_plan: 'से',
      new_plan: 'को',
      credit_applied: 'क्रेडिट लागू',
      amount_paid: 'भुगतान राशि',
      type_upgrade: 'अपग्रेड',
      type_downgrade: 'डाउनग्रेड निर्धारित',
      type_renew: 'नवीनीकृत',
      free_upgrade: 'मुफ्त अपग्रेड',
    }
  },
  kn: {
    membership: {
      title: 'ನನ್ನ ಸದಸ್ಯತೆ',
      subtitle: 'ನಿಮ್ಮ ಎಲ್ಲಾ ಸಕ್ರಿಯ ಯೋಜನೆಗಳನ್ನು ನಿರ್ವಹಿಸಿ',
      care_label: 'ಕೇರ್ ಪ್ಲ್ಯಾನ್',
      homemaker_label: 'ಹೋಂ ಮೇಕರ್ ಪ್ಲ್ಯಾನ್',
      no_plan_title: '{{category}} ಸಕ್ರಿಯವಿಲ್ಲ',
      no_plan_sub: 'ಪ್ರಯೋಜನಗಳನ್ನು ಅನ್‌ಲಾಕ್ ಮಾಡಲು ಚಂದಾದಾರರಾಗಿ',
      subscribe_now: 'ಈಗ ಚಂದಾದಾರರಾಗಿ',
      days_left_one: '{{count}} ದಿನ ಬಾಕಿ',
      days_left_other: '{{count}} ದಿನಗಳು ಬಾಕಿ',
      expires_today: 'ಇಂದು ಮುಗಿಯುತ್ತದೆ',
      expires_on: '{{date}} ರಂದು ಮುಗಿಯುತ್ತದೆ',
      days_left: 'ಬಾಕಿ ದಿನಗಳು',
      paid: 'ಪಾವತಿ',
      cycle: 'ಚಕ್ರ',
      cycle_yearly: '1 ವರ್ಷ',
      cycle_biannual: '6 ತಿಂಗಳು',
      cycle_quarterly: '3 ತಿಂಗಳು',
      upgrade_btn: 'ಅಪ್‌ಗ್ರೇಡ್',
      renew_btn: 'ನವೀಕರಿಸಿ',
      history_link: 'ಅಪ್‌ಗ್ರೇಡ್ ಮತ್ತು ವಹಿವಾಟು ಇತಿಹಾಸ ವೀಕ್ಷಿಸಿ',
      scheduled_downgrade_notice: '{{date}} ರಂದು {{plan}} ಗೆ ಡೌನ್‌ಗ್ರೇಡ್ ನಿಗದಿಪಡಿಸಲಾಗಿದೆ',
      basic_tier: 'ಬೇಸಿಕ್', premium_tier: 'ಪ್ರೀಮಿಯಂ', vip_tier: 'ವಿಐಪಿ',
      upgrade_title: 'ಯೋಜನೆ ಅಪ್‌ಗ್ರೇಡ್ ಮಾಡಿ',
      current_plan_label: 'ಪ್ರಸ್ತುತ: {{name}}',
      choose_new_plan: 'ಹೊಸ ಯೋಜನೆ ಆರಿಸಿ',
      billing_duration: 'ಬಿಲ್ಲಿಂಗ್ ಅವಧಿ',
      already_highest: 'ನೀವು ಈಗಾಗಲೇ ಅತ್ಯುನ್ನತ ಹಂತದಲ್ಲಿದ್ದೀರಿ!',
      three_months: '3 ತಿಂಗಳು', six_months: '6 ತಿಂಗಳು', one_year: '1 ವರ್ಷ',
      days_90: '90 ದಿನಗಳು', days_180: '180 ದಿನಗಳು', days_365: '365 ದಿನಗಳು',
      selected_label: 'ಆಯ್ಕೆ ಮಾಡಲಾಗಿದೆ',
      from_price: '₹{{price}} / 3 ತಿಂಗಳಿನಿಂದ',
      loading_upgrades: 'ಅಪ್‌ಗ್ರೇಡ್ ಆಯ್ಕೆಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ…',
      no_upgrades: 'ಅಪ್‌ಗ್ರೇಡ್ ಇಲ್ಲ', no_upgrades_msg: 'ಯಾವುದೇ ಅಪ್‌ಗ್ರೇಡ್ ಆಯ್ಕೆ ಲಭ್ಯವಿಲ್ಲ.',
      load_error: 'ಅಪ್‌ಗ್ರೇಡ್ ಆಯ್ಕೆಗಳನ್ನು ಲೋಡ್ ಮಾಡಲು ವಿಫಲವಾಗಿದೆ.',
      credit_breakdown_title: 'ಪ್ರೊ-ರಾಟಾ ಕ್ರೆಡಿಟ್ ವಿವರ',
      days_remaining: 'ಬಾಕಿ ದಿನಗಳು', daily_rate: 'ದೈನಿಕ ದರ (ಪ್ರಸ್ತುತ ಯೋಜನೆ)',
      credit_from_plan: 'ಪ್ರಸ್ತುತ ಯೋಜನೆಯಿಂದ ಕ್ರೆಡಿಟ್', new_plan_price: 'ಹೊಸ ಯೋಜನೆ ಬೆಲೆ',
      amount_due: 'ಬಾಕಿ ಮೊತ್ತ', free: 'ಉಚಿತ',
      credit_covers_full: 'ನಿಮ್ಮ ಕ್ರೆಡಿಟ್ ಈ ಅಪ್‌ಗ್ರೇಡ್ ಅನ್ನು ಸಂಪೂರ್ಣವಾಗಿ ಒಳಗೊಳ್ಳುತ್ತದೆ!',
      select_plan_prompt: 'ವಿವರ ನೋಡಲು ಯೋಜನೆ ಆರಿಸಿ.',
      upgrade_free_btn: 'ಉಚಿತವಾಗಿ ಅಪ್‌ಗ್ರೇಡ್ ಮಾಡಿ',
      pay_and_upgrade_btn: '₹{{amount}} ಪಾವತಿಸಿ & ಅಪ್‌ಗ್ರೇಡ್ ಮಾಡಿ',
      confirm_upgrade_title: 'ಅಪ್‌ಗ್ರೇಡ್ ದೃಢೀಕರಿಸಿ',
      confirm_upgrade_msg: '{{plan}} ಗೆ ಅಪ್‌ಗ್ರೇಡ್ ಮಾಡಬೇಕೇ?\n\n₹{{credit}} ಕ್ರೆಡಿಟ್ ಸಂಪೂರ್ಣ ವೆಚ್ಚವನ್ನು ತಡೆಯುತ್ತದೆ.',
      cancel_btn: 'ರದ್ದು', upgrade_now_btn: 'ಈಗ ಅಪ್‌ಗ್ರೇಡ್ ಮಾಡಿ',
      upgrade_success_title: '🎉 ಅಪ್‌ಗ್ರೇಡ್ ಆಯಿತು!',
      upgrade_success_msg: '{{plan}} ಗೆ ಸ್ವಾಗತ! ನಿಮ್ಮ ಯೋಜನೆ ಈಗ ಸಕ್ರಿಯವಾಗಿದೆ.',
      upgrade_failed: 'ಅಪ್‌ಗ್ರೇಡ್ ವಿಫಲ', upgrade_error: 'ಏನೋ ತಪ್ಪಾಯಿತು.', upgrade_generic_error: 'ಅಪ್‌ಗ್ರೇಡ್ ವಿಫಲ.',
      history_title: 'ಯೋಜನೆ ಇತಿಹಾಸ', history_subtitle: 'ನಿಮ್ಮ ಎಲ್ಲಾ ಯೋಜನೆ ಬದಲಾವಣೆಗಳು',
      history_empty_title: 'ಇನ್ನೂ ಇತಿಹಾಸ ಇಲ್ಲ', history_empty_sub: 'ನಿಮ್ಮ ಅಪ್‌ಗ್ರೇಡ್ ಇಲ್ಲಿ ತೋರಿಸಲಾಗುತ್ತದೆ.',
      history_loading: 'ಇತಿಹಾಸ ಲೋಡ್ ಆಗುತ್ತಿದೆ…',
      history_date: 'ದಿನಾಂಕ', old_plan: 'ಇಂದ', new_plan: 'ಗೆ',
      credit_applied: 'ಕ್ರೆಡಿಟ್ ಅನ್ವಯಿಸಲಾಗಿದೆ', amount_paid: 'ಪಾವತಿ ಮೊತ್ತ',
      type_upgrade: 'ಅಪ್‌ಗ್ರೇಡ್', type_downgrade: 'ಡೌನ್‌ಗ್ರೇಡ್ ನಿಗದಿ', type_renew: 'ನವೀಕರಿಸಲಾಗಿದೆ', free_upgrade: 'ಉಚಿತ ಅಪ್‌ಗ್ರೇಡ್',
    }
  },
  // Other langs: copy en keys as fallback (i18next falls back to en automatically)
  bn: null, ml: null, mr: null, ta: null, te: null,
};

const langs = ['en', 'hi', 'kn', 'bn', 'ml', 'mr', 'ta', 'te'];

function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      out[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      if (!(key in target)) out[key] = source[key]; // only add missing
    }
  }
  return out;
}

let changed = 0;
for (const lang of langs) {
  const file = path.join(LOCALES_DIR, `${lang}.json`);
  if (!fs.existsSync(file)) { console.log(`SKIP: ${lang}.json not found`); continue; }
  const current = JSON.parse(fs.readFileSync(file, 'utf8'));
  // Use lang-specific translations if available, else fall back to English
  const newKeys = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const merged = deepMerge(current, newKeys);
  fs.writeFileSync(file, JSON.stringify(merged, null, 2), 'utf8');
  console.log(`✓ ${lang}.json updated`);
  changed++;
}
console.log(`\nDone. Updated ${changed} locale files.`);
