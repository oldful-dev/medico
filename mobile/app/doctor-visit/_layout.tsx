import { Stack } from 'expo-router';

export default function DoctorVisitLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ title: 'Doctor Home Visit' }} />
            <Stack.Screen name="symptom-selection" options={{ title: 'Select Symptoms' }} />
            <Stack.Screen name="doctor-type" options={{ title: 'Doctor Type' }} />
            <Stack.Screen name="schedule" options={{ title: 'Schedule Visit' }} />
            <Stack.Screen name="confirmation" options={{ title: 'Booking Confirmed' }} />
            <Stack.Screen name="tracking" options={{ title: 'Track Visit' }} />
        </Stack>
    );
}
