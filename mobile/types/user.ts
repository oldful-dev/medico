// User Types
export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  profileImage?: string;
  uniqueUserId: string; // PRD: Auto-generated Unique User ID
  city: string;
  preferredLanguage: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phoneNumber: string;
  relationship: 'spouse' | 'child' | 'sibling' | 'parent' | 'friend' | 'other';
}

export interface Address {
  id: string;
  label: string; // Home, Office, etc.
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  isDefault: boolean;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}
