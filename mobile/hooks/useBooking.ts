// useBooking hook - Booking state and actions
import { useState, useCallback } from 'react';
import { bookingService, CreateBookingPayload, Booking } from '@/services/api/bookingService';

interface UseBookingReturn {
  isLoading: boolean;
  error: string | null;
  createDoctorVisit: (data: CreateBookingPayload) => Promise<Booking | null>;
  createNurseCare: (data: CreateBookingPayload) => Promise<Booking | null>;
  createTrip: (data: CreateBookingPayload) => Promise<Booking | null>;
  cancelBooking: (bookingId: string, serviceType?: string) => Promise<boolean>;
}

export function useBookingActions(): UseBookingReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDoctorVisit = useCallback(async (data: CreateBookingPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await bookingService.createBooking(data);
      return res.success && res.data ? res.data : null;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createNurseCare = useCallback(async (data: CreateBookingPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await bookingService.createBooking(data);
      return res.success && res.data ? res.data : null;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTrip = useCallback(async (data: CreateBookingPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await bookingService.createBooking(data);
      return res.success && res.data ? res.data : null;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelBooking = useCallback(async (bookingId: string, serviceType?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await bookingService.cancelBooking(bookingId);
      return res.success;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, createDoctorVisit, createNurseCare, createTrip, cancelBooking };
}
