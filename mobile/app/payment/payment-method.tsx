// Payment Method - Select/add payment method
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function PaymentMethodScreen() {
    const { t } = useTranslation();
    return (
        <View>
            <Text>Payment Method</Text>
        </View>
    );
}
