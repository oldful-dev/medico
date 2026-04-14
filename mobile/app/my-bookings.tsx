import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Legacy route: Redirect to the unified Bookings tab
 */
export default function MyBookingsRedirect() {
    return <Redirect href="/order-history" />;
}
