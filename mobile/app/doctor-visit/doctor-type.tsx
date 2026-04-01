// Doctor Type Selection - GP vs Physiotherapist
// PRD: Auto-suggested based on symptoms, user can override
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function DoctorTypeScreen() {
    const { t } = useTranslation();
    return (
        <View>
            <Text>Doctor Type Selection</Text>
        </View>
    );
}
