// useBooking hook - Booking state and actions
import { useState, useCallback } from 'react';
import { bookingService, DoctorVisitBooking, NurseCareBooking, TripBooking, ServiceType } from '@/services/api/bookingService';

interface UseBookingReturn {
  isLoading: boolean;
  error: string | null;
  createDoctorVisit: (data: DoctorVisitBooking) => Promise<DoctorVisitBooking | null>;
  createNurseCare: (data: NurseCareBooking) => Promise<NurseCareBooking | null>;
  createTrip: (data: TripBooking) => Promise<TripBooking | null>;
  cancelBooking: (bookingId: string, serviceType: ServiceType) => Promise<boolean>;
}

export function useBookingActions(): UseBookingReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDoctorVisit = useCallback(async (data: DoctorVisitBooking) => {
    setIsLoading(true);
    setError(null);
    try {
      return await bookingService.createDoctorVisit(data);
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createNurseCare = useCallback(async (data: NurseCareBooking) => {
    setIsLoading(true);
    setError(null);
    try {
      return await bookingService.createNurseCare(data);
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTrip = useCallback(async (data: TripBooking) => {
    setIsLoading(true);
    setError(null);
    try {
      return await bookingService.createTrip(data);
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelBooking = useCallback(async (bookingId: string, serviceType: ServiceType) => {
    setIsLoading(true);
    setError(null);
    try {
      await bookingService.cancelBooking(bookingId, serviceType);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, createDoctorVisit, createNurseCare, createTrip, cancelBooking };
}
