// SOS Service - Emergency alert handling
// PRD: GPS fetch, WhatsApp/SMS to admin & family, hotline call

import { locationService, LocationCoordinates } from './locationService';

export interface SOSAlert {
  userId: string;
  location: LocationCoordinates;
  timestamp: Date;
  emergencyContacts: string[];
  status: 'triggered' | 'acknowledged' | 'resolved';
}

export const sosService = {
  triggerSOS: async (): Promise<SOSAlert> => {
    // TODO: 
    // 1. Fetch GPS location
    // 2. Send alert to backend
    // 3. Backend triggers WhatsApp/SMS to admin & emergency contacts
    // 4. Initiate hotline call
    throw new Error('Not implemented');
  },

  cancelSOS: async (alertId: string): Promise<void> => {
    // TODO: Cancel an active SOS alert
  },

  callEmergencyHotline: async (): Promise<void> => {
    // TODO: Use Linking to make phone call to emergency hotline
  },

  shareLocationViaWhatsApp: async (contacts: string[], location: LocationCoordinates): Promise<void> => {
    // TODO: Open WhatsApp with pre-filled location message
  },

  shareLocationViaSMS: async (contacts: string[], location: LocationCoordinates): Promise<void> => {
    // TODO: Send SMS with location link
  },
};
