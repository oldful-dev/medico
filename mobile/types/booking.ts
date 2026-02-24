// Booking Types
export type ServiceType = 'doctor-visit' | 'nurse-care' | 'transportation';
export type BookingStatus = 'pending' | 'confirmed' | 'assigned' | 'in-progress' | 'completed' | 'cancelled' | 'refunded';

// Doctor Visit Types
export type DoctorType = 'general-physician' | 'physiotherapist';
export type Symptom = 
  | 'fever'
  | 'bp-check'
  | 'sugar-check'
  | 'body-pain'
  | 'post-surgery-rehab'
  | 'general-checkup'
  | 'wound-dressing'
  | 'injection'
  | 'other';

export interface DoctorVisit {
  id: string;
  symptoms: Symptom[];
  doctorType: DoctorType;
  doctorName?: string;
  scheduledDate: string;
  scheduledTime: string;
  addressId: string;
  notes?: string;
  status: BookingStatus;
  amount: number;
  prescriptionUrl?: string;
}

// Nurse Care Types
export type StaffType = 'qualified-nurse' | 'bedside-attendant';
export type ShiftDuration = 'short-visit' | '12-hour' | '24-hour';

export interface NurseCare {
  id: string;
  staffType: StaffType;
  staffName?: string;
  shiftDuration: ShiftDuration;
  startDate: string;
  endDate?: string;
  requirements: string[];
  addressId: string;
  notes?: string;
  status: BookingStatus;
  amount: number;
}

// Transportation Types
export interface Trip {
  id: string;
  pickupAddress: string;
  dropAddress: string;
  scheduledDate: string;
  scheduledTime: string;
  vehicleType?: string;
  driverName?: string;
  specialRequirements?: string;
  status: BookingStatus;
  amount: number;
}
