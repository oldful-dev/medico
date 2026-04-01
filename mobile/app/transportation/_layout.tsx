import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function TransportationLayout() {
    const { t } = useTranslation();
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ title: 'Transportation' }} />
            <Stack.Screen name="request-trip" options={{ title: 'Request Trip' }} />
            <Stack.Screen name="trip-details" options={{ title: 'Trip Details' }} />
            <Stack.Screen name="tracking" options={{ title: 'Track Trip' }} />
        </Stack>
    );
}
