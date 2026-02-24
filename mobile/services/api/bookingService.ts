// Booking Service - Doctor visits, Nurse care, Transportation bookings
import { apiClient } from './apiClient';

export type ServiceType = 'doctor-visit' | 'nurse-care' | 'transportation';
export type DoctorType = 'general-physician' | 'physiotherapist';
export type StaffType = 'qualified-nurse' | 'bedside-attendant';
export type ShiftDuration = 'short-visit' | '12-hour' | '24-hour';
export type BookingStatus = 'pending' | 'confirmed' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';

export interface DoctorVisitBooking {
  id?: string;
  symptoms: string[];
  doctorType: DoctorType;
  scheduledDate: string;
  scheduledTime: string;
  address: string;
  notes?: string;
  status?: BookingStatus;
}

export interface NurseCareBooking {
  id?: string;
  staffType: StaffType;
  shiftDuration: ShiftDuration;
  startDate: string;
  endDate?: string;
  requirements: string[];
  address: string;
  notes?: string;
  status?: BookingStatus;
}

export interface TripBooking {
  id?: string;
  pickupAddress: string;
  dropAddress: string;
  scheduledDate: string;
  scheduledTime: string;
  specialRequirements?: string;
  status?: BookingStatus;
}

export const bookingService = {
  // Doctor Visit
  createDoctorVisit: async (data: DoctorVisitBooking): Promise<DoctorVisitBooking> => {
    // TODO: POST /bookings/doctor-visit
    throw new Error('Not implemented');
  },

  getDoctorVisitById: async (id: string): Promise<DoctorVisitBooking> => {
    // TODO: GET /bookings/doctor-visit/:id
    throw new Error('Not implemented');
  },

  // Nurse Care
  createNurseCare: async (data: NurseCareBooking): Promise<NurseCareBooking> => {
    // TODO: POST /bookings/nurse-care
    throw new Error('Not implemented');
  },

  getNurseCareById: async (id: string): Promise<NurseCareBooking> => {
    // TODO: GET /bookings/nurse-care/:id
    throw new Error('Not implemented');
  },

  // Transportation
  createTrip: async (data: TripBooking): Promise<TripBooking> => {
    // TODO: POST /bookings/trip
    throw new Error('Not implemented');
  },

  getTripById: async (id: string): Promise<TripBooking> => {
    // TODO: GET /bookings/trip/:id
    throw new Error('Not implemented');
  },

  // Common
  getBookingHistory: async (serviceType?: ServiceType): Promise<any[]> => {
    // TODO: GET /bookings/history
    throw new Error('Not implemented');
  },

  cancelBooking: async (bookingId: string, serviceType: ServiceType): Promise<void> => {
    // TODO: POST /bookings/:serviceType/:id/cancel
  },
};
