import { Stack } from 'expo-router';

export default function TransportationLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ title: 'Transportation' }} />
            <Stack.Screen name="request-trip" options={{ title: 'Request Trip' }} />
            <Stack.Screen name="trip-details" options={{ title: 'Trip Details' }} />
            <Stack.Screen name="tracking" options={{ title: 'Track Trip' }} />
        </Stack>
    );
}
