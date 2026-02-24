// Navigation Types - Type-safe route parameters
export type RootStackParamList = {
  '(auth)': undefined;
  '(tabs)': undefined;
  'modal': undefined;
  'sos-emergency': undefined;
  'notifications': undefined;
  'search': undefined;
  'doctor-visit': undefined;
  'nurse-care': undefined;
  'transportation': undefined;
  'insurance': undefined;
  'payment': undefined;
};

export type AuthStackParamList = {
  'splash': undefined;
  'login': undefined;
  'otp-verification': { phoneNumber: string };
  'profile-setup': { isNewUser: boolean };
  'city-selection': undefined;
  'language-selection': undefined;
};

export type TabParamList = {
  'index': undefined;
  'plans': undefined;
  'wellness': undefined;
  'account': undefined;
  'cart': undefined;
};
