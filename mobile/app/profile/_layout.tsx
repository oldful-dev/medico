import { Stack } from 'expo-router';

export default function ProfileLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="bookings/index" />
            <Stack.Screen name="activity-center" />
            <Stack.Screen name="medical-logs" />
            <Stack.Screen name="subscription" />
            <Stack.Screen name="legal-detail" />
        </Stack>
    );
}
