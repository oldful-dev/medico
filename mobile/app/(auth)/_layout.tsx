import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="splash" />
            <Stack.Screen name="login" />
            <Stack.Screen name="otp-verification" />
            <Stack.Screen name="profile-setup" />
            <Stack.Screen name="city-selection" />
            <Stack.Screen name="language-selection" />
        </Stack>
    );
}
