import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function InsuranceLayout() {
    const { t } = useTranslation();
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ title: 'Insurance' }} />
            <Stack.Screen name="health-assessment" options={{ title: 'Health Assessment' }} />
            <Stack.Screen name="pre-existing-conditions" options={{ title: 'Pre-existing Conditions' }} />
            <Stack.Screen name="plan-comparison" options={{ title: 'Compare Plans' }} />
            <Stack.Screen name="plan-details" options={{ title: 'Plan Details' }} />
            <Stack.Screen name="application" options={{ title: 'Apply' }} />
        </Stack>
    );
}
