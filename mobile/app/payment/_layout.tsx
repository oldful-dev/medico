import { Stack } from 'expo-router';

export default function PaymentLayout() {
    return (
        <Stack>
            <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
            <Stack.Screen name="payment-method" options={{ title: 'Payment Method' }} />
            <Stack.Screen name="payment-success" options={{ title: 'Payment Successful' }} />
            <Stack.Screen name="refund-request" options={{ title: 'Request Refund' }} />
            <Stack.Screen name="refund-status" options={{ title: 'Refund Status' }} />
        </Stack>
    );
}
