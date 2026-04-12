import { Stack } from 'expo-router';

export default function NurseCareLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="staff-type" />
            <Stack.Screen name="shift-selection" />
            <Stack.Screen name="requirements" />
            <Stack.Screen name="schedule" />
            <Stack.Screen name="confirmation" />
        </Stack>
    );
}
