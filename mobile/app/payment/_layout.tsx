import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function PaymentLayout() {
    const { t } = useTranslation();
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
            <Stack.Screen name="payment-method" options={{ title: 'Payment Method' }} />
            <Stack.Screen name="payment-success" options={{ title: 'Payment Successful' }} />
            <Stack.Screen name="refund-request" options={{ title: 'Request Refund' }} />
            <Stack.Screen name="refund-status" options={{ title: 'Refund Status' }} />
        </Stack>
    );
}
