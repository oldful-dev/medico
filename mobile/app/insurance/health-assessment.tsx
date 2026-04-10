// Health Assessment - Initial health survey for insurance
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function HealthAssessmentScreen() {
    const { t } = useTranslation();
    return (
        <View>
            <Text>Health Assessment</Text>
        </View>
    );
}
