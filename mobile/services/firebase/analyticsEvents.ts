// ──────────────────────────────────────────────
//  Firebase Analytics Event Tracking
//  Tracks key user flows: auth, booking, payment, SOS
// ──────────────────────────────────────────────

import { logEvent } from './firebaseConfig';

export const AnalyticsEvents = {
    // Auth
    trackLogin: (method: string = 'otp') => {
        logEvent('login', { method });
    },

    trackSignUp: () => {
        logEvent('sign_up', { method: 'otp' });
    },

    trackLogout: () => {
        logEvent('logout');
    },

    // Booking
    trackBookingStarted: (serviceType: string) => {
        logEvent('booking_started', { service_type: serviceType });
    },

    trackBookingCompleted: (serviceType: string, bookingCode: string) => {
        logEvent('booking_completed', { service_type: serviceType, booking_code: bookingCode });
    },

    trackBookingCancelled: (bookingId: string) => {
        logEvent('booking_cancelled', { booking_id: bookingId });
    },

    // Payment
    trackPaymentInitiated: (amount: number, method: string) => {
        logEvent('payment_initiated', { amount: String(amount), method });
    },

    trackPaymentSuccess: (amount: number) => {
        logEvent('purchase', { value: String(amount), currency: 'INR' });
    },

    trackPaymentFailed: (reason: string) => {
        logEvent('payment_failed', { reason });
    },

    // SOS
    trackSOSTriggered: () => {
        logEvent('sos_triggered');
    },

    trackSOSCancelled: () => {
        logEvent('sos_cancelled');
    },

    // Navigation / Screens
    trackScreenView: (screenName: string) => {
        logEvent('screen_view', { screen_name: screenName });
    },

    // Services
    trackServiceViewed: (serviceName: string) => {
        logEvent('service_viewed', { service_name: serviceName });
    },

    // Support
    trackSupportTicketCreated: () => {
        logEvent('support_ticket_created');
    },

    // Lab Tests
    trackLabTestBooked: (testType: string) => {
        logEvent('lab_test_booked', { test_type: testType });
    },

    // Subscription
    trackPlanViewed: (planName: string) => {
        logEvent('plan_viewed', { plan_name: planName });
    },

    trackPlanSubscribed: (planName: string, cycle: string) => {
        logEvent('plan_subscribed', { plan_name: planName, billing_cycle: cycle });
    },
};
