import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function DoctorVisitLayout() {
    const { t } = useTranslation();
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ title: 'Doctor Home Visit' }} />
            <Stack.Screen name="symptom-selection" options={{ title: 'Select Symptoms' }} />
            <Stack.Screen name="doctor-type" options={{ title: 'Doctor Type' }} />
            <Stack.Screen name="schedule" options={{ title: 'Schedule Visit' }} />
            <Stack.Screen name="confirmation" options={{ title: 'Booking Confirmed' }} />
            <Stack.Screen name="tracking" options={{ title: 'Track Visit' }} />
        </Stack>
    );
}
