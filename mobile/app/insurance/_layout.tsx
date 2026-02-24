import { Stack } from 'expo-router';

export default function InsuranceLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ title: 'Insurance' }} />
            <Stack.Screen name="health-assessment" options={{ title: 'Health Assessment' }} />
            <Stack.Screen name="pre-existing-conditions" options={{ title: 'Pre-existing Conditions' }} />
            <Stack.Screen name="plan-comparison" options={{ title: 'Compare Plans' }} />
            <Stack.Screen name="plan-details" options={{ title: 'Plan Details' }} />
            <Stack.Screen name="application" options={{ title: 'Apply' }} />
        </Stack>
    );
}
