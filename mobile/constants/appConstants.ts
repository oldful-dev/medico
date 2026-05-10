// App Constants - Application-wide configuration values

export const APP_CONFIG = {
  name: 'ayuxacare',
  tagline: 'Elder Care, Simplified',
  version: '1.0.0',
  supportEmail: 'support@ayuxacare.com',
  supportPhone: '+91-XXXXXXXXXX',
  emergencyHotline: '+91-XXXXXXXXXX',
};

// Cities available in the app
export const CITIES = [
  { id: 'bangalore', name: 'Bangalore', isActive: true },
  { id: 'chennai', name: 'Chennai', isActive: false, comingSoon: true },
  { id: 'hyderabad', name: 'Hyderabad', isActive: false, comingSoon: true },
] as const;

// Supported languages
export const LANGUAGES = [
  { id: 'en', name: 'English', nativeName: 'English' },
  { id: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { id: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { id: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { id: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
] as const;

// Symptoms for doctor visit booking
export const SYMPTOMS = [
  { id: 'fever', label: 'Fever', icon: '🤒', doctorType: 'general-physician' },
  { id: 'bp-check', label: 'BP Check', icon: '💉', doctorType: 'general-physician' },
  { id: 'sugar-check', label: 'Sugar Check', icon: '🩸', doctorType: 'general-physician' },
  { id: 'body-pain', label: 'Body Pain', icon: '🤕', doctorType: 'general-physician' },
  { id: 'post-surgery-rehab', label: 'Post-Surgery Rehab', icon: '🏥', doctorType: 'physiotherapist' },
  { id: 'general-checkup', label: 'General Checkup', icon: '🩺', doctorType: 'general-physician' },
  { id: 'wound-dressing', label: 'Wound Dressing', icon: '🩹', doctorType: 'general-physician' },
  { id: 'injection', label: 'Injection', icon: '💊', doctorType: 'general-physician' },
  { id: 'physiotherapy', label: 'Physiotherapy', icon: '🦿', doctorType: 'physiotherapist' },
  { id: 'other', label: 'Other', icon: '➕', doctorType: 'general-physician' },
] as const;

// Nurse care shift durations
export const SHIFT_DURATIONS = [
  { id: 'short-visit', label: 'Short Visit', duration: '1-2 hours', description: 'Quick medical procedure or check-up' },
  { id: '12-hour', label: '12-Hour Shift', duration: '12 hours', description: 'Half-day care coverage' },
  { id: '24-hour', label: '24-Hour Care', duration: '24 hours', description: 'Full-day live-in care' },
] as const;

// Pre-existing conditions for insurance
export const PRE_EXISTING_CONDITIONS = [
  { id: 'diabetes', label: 'Diabetes' },
  { id: 'hypertension', label: 'Hypertension / High BP' },
  { id: 'heart-disease', label: 'Heart Disease' },
  { id: 'kidney-disease', label: 'Kidney Disease' },
  { id: 'asthma', label: 'Asthma / COPD' },
  { id: 'arthritis', label: 'Arthritis' },
  { id: 'thyroid', label: 'Thyroid Disorders' },
  { id: 'cancer', label: 'Cancer (any type)' },
  { id: 'other', label: 'Other' },
] as const;

// SOS Configuration
export const SOS_CONFIG = {
  countdownDuration: 3, // seconds
  activationMode: 'slide' as 'slide' | 'countdown', // PRD: Slide to Call or 3-second countdown
};

// Refund Policy Types
export const REFUND_REASONS = [
  { id: 'sla-breach', label: 'SLA Breach (Missed Visit)' },
  { id: 'compassionate', label: 'Compassionate Clause' },
  { id: 'cancellation', label: 'Service Cancellation' },
  { id: 'quality', label: 'Quality Issues' },
  { id: 'other', label: 'Other' },
] as const;
