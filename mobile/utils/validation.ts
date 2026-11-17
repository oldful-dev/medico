// Validation Utilities - Form validation helpers

export const validators = {
  phoneNumber: (phone: string): boolean => {
    // Indian phone number validation (10 digits)
    return /^[6-9]\d{9}$/.test(phone.replace(/\D/g, ''));
  },

  otp: (otp: string, length: number = 4): boolean => {
    return /^\d+$/.test(otp) && otp.length === length;
  },

  email: (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  pincode: (pincode: string): boolean => {
    return isValidPincode(pincode);
  },

  name: (name: string): boolean => {
    return isValidPersonName(name);
  },

  required: (value: string): boolean => {
    return value.trim().length > 0;
  },
};

/**
 * Cleans text typed or PASTED into a mobile-number field: keeps digits only,
 * drops a pasted +91 / 91 / 0 prefix, and caps the length at 10.
 */
export const sanitizePhoneInput = (text: string): string => {
  let digits = (text || '').replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length > 10 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
};

/** True for a complete Indian mobile number: exactly 10 digits, first digit 6-9. */
export const isValidIndianMobile = (phone: string): boolean => /^[6-9]\d{9}$/.test(phone);

/** Removes characters that are not valid in a person's name (digits, symbols). */
export const sanitizeNameInput = (text: string, maxLength = 60): string =>
  (text || '').replace(/[^\p{L}\p{M}\s.'-]/gu, '').replace(/\s{2,}/g, ' ').slice(0, maxLength);

/** A person's name: letters (any script), spaces, . ' - ; 3 to 60 characters. */
export const isValidPersonName = (name: string): boolean => {
  const n = (name || '').trim();
  return n.length >= 3 && n.length <= 60 && /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u.test(n);
};

/** Indian pincode: 6 digits, first digit 1-9 (rejects 000000). */
export const isValidPincode = (pin: string): boolean => /^[1-9]\d{5}$/.test(pin);

/** Free-text medical fields (allergies etc.) must not be numeric-only. */
export const isValidMedicalText = (text: string): boolean => {
  const t = (text || '').trim();
  return t.length === 0 || (/\p{L}/u.test(t) && !/^[\d\s,.\-]+$/.test(t));
};

export const getValidationError = (field: string, value: string): string | null => {
  switch (field) {
    case 'phoneNumber':
      return validators.phoneNumber(value) ? null : 'Please enter a valid 10-digit phone number';
    case 'otp':
      return validators.otp(value) ? null : 'Please enter a valid 4-digit OTP';
    case 'email':
      return validators.email(value) ? null : 'Please enter a valid email address';
    case 'pincode':
      return validators.pincode(value) ? null : 'Please enter a valid 6-digit pincode';
    case 'name':
      return validators.name(value) ? null : 'Enter a valid name (letters only, at least 3 characters)';
    default:
      return validators.required(value) ? null : 'This field is required';
  }
};
