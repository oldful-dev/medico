// Payment Success - Confirmation after successful payment
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function PaymentSuccessScreen() {
    const { t } = useTranslation();
    return (
        <View>
            <Text>Payment Successful</Text>
        </View>
    );
}
