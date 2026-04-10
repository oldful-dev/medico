import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function NurseCareLayout() {
    const { t } = useTranslation();
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
