// Request Trip - pickup/drop, date, time, special requirements
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function RequestTripScreen() {
    const { t } = useTranslation();
    return (
        <View>
            <Text>Request Trip</Text>
        </View>
    );
}
