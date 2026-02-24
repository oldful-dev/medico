// User Service - Profile CRUD, emergency contacts, address management
import { apiClient } from './apiClient';

export interface UserProfile {
  userId: string;
  name: string;
  phoneNumber: string;
  gender: string;
  dateOfBirth?: string;
  email?: string;
  address?: Address;
  emergencyContacts: EmergencyContact[];
  preferredLanguage?: string;
  city: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface EmergencyContact {
  id: string;
  name: string;
  phoneNumber: string;
  relationship: string;
}

export const userService = {
  getProfile: async (): Promise<UserProfile> => {
    // TODO: GET /users/profile
    throw new Error('Not implemented');
  },

  createProfile: async (data: Partial<UserProfile>): Promise<UserProfile> => {
    // TODO: POST /users/profile
    throw new Error('Not implemented');
  },

  updateProfile: async (data: Partial<UserProfile>): Promise<UserProfile> => {
    // TODO: PUT /users/profile
    throw new Error('Not implemented');
  },

  addEmergencyContact: async (contact: Omit<EmergencyContact, 'id'>): Promise<EmergencyContact> => {
    // TODO: POST /users/emergency-contacts
    throw new Error('Not implemented');
  },

  removeEmergencyContact: async (contactId: string): Promise<void> => {
    // TODO: DELETE /users/emergency-contacts/:id
  },

  updateAddress: async (address: Address): Promise<Address> => {
    // TODO: PUT /users/address
    throw new Error('Not implemented');
  },
};
