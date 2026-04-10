// Trip Tracking - Real-time vehicle tracking
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function TripTrackingScreen() {
    const { t } = useTranslation();
    return (
        <View>
            <Text>Track Trip</Text>
        </View>
    );
}
