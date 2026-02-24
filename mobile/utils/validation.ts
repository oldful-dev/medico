// Validation Utilities - Form validation helpers

export const validators = {
  phoneNumber: (phone: string): boolean => {
    // Indian phone number validation (10 digits)
    return /^[6-9]\d{9}$/.test(phone.replace(/\D/g, ''));
  },

  otp: (otp: string, length: number = 6): boolean => {
    return /^\d+$/.test(otp) && otp.length === length;
  },

  email: (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  pincode: (pincode: string): boolean => {
    return /^\d{6}$/.test(pincode);
  },

  name: (name: string): boolean => {
    return name.trim().length >= 2 && name.trim().length <= 100;
  },

  required: (value: string): boolean => {
    return value.trim().length > 0;
  },
};

export const getValidationError = (field: string, value: string): string | null => {
  switch (field) {
    case 'phoneNumber':
      return validators.phoneNumber(value) ? null : 'Please enter a valid 10-digit phone number';
    case 'otp':
      return validators.otp(value) ? null : 'Please enter a valid 6-digit OTP';
    case 'email':
      return validators.email(value) ? null : 'Please enter a valid email address';
    case 'pincode':
      return validators.pincode(value) ? null : 'Please enter a valid 6-digit pincode';
    case 'name':
      return validators.name(value) ? null : 'Name must be at least 2 characters';
    default:
      return validators.required(value) ? null : 'This field is required';
  }
};
