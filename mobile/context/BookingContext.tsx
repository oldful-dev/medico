// Booking Context - Active booking state management
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface BookingState {
    activeBookings: any[];
    currentBooking: any | null;
}

interface BookingContextType extends BookingState {
    setActiveBookings: (bookings: any[]) => void;
    setCurrentBooking: (booking: any | null) => void;
    addBooking: (booking: any) => void;
    removeBooking: (bookingId: string) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
    const [activeBookings, setActiveBookings] = useState<any[]>([]);
    const [currentBooking, setCurrentBooking] = useState<any | null>(null);

    const addBooking = (booking: any) => {
        setActiveBookings(prev => [...prev, booking]);
    };

    const removeBooking = (bookingId: string) => {
        setActiveBookings(prev => prev.filter(b => b.id !== bookingId));
    };

    return (
        <BookingContext.Provider value={{
            activeBookings, setActiveBookings,
            currentBooking, setCurrentBooking,
            addBooking, removeBooking,
        }}>
            {children}
        </BookingContext.Provider>
    );
}

export function useBooking() {
    const context = useContext(BookingContext);
    if (!context) throw new Error('useBooking must be used within BookingProvider');
    return context;
}
