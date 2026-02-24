// Booking Summary Card - Summary of booked service
import { View, Text } from 'react-native';

interface BookingSummaryCardProps {
    serviceType: string;
    date?: string;
    time?: string;
    staffName?: string;
    amount?: number;
    status?: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
}

export default function BookingSummaryCard({ serviceType, date, time, staffName, amount, status }: BookingSummaryCardProps) {
    return (
        <View>
            <Text>{serviceType}</Text>
            <Text>Status: {status}</Text>
        </View>
    );
}
