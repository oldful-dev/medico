import { Stack } from 'expo-router';

export default function NurseCareLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ title: 'Home Nurse & Caretaker' }} />
            <Stack.Screen name="staff-type" options={{ title: 'Staff Type' }} />
            <Stack.Screen name="shift-selection" options={{ title: 'Select Shift' }} />
            <Stack.Screen name="requirements" options={{ title: 'Care Requirements' }} />
            <Stack.Screen name="schedule" options={{ title: 'Schedule' }} />
            <Stack.Screen name="confirmation" options={{ title: 'Booking Confirmed' }} />
        </Stack>
    );
}
