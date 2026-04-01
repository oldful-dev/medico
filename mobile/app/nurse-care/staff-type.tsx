// Staff Type Selection
// PRD: Qualified Nurse (IV, Tracheostomy, medical procedures) vs Bedside Attendant (bathing, feeding, daily living)
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function StaffTypeScreen() {
    const { t } = useTranslation();
    return (
        <View>
            <Text>Staff Type Selection</Text>
        </View>
    );
}
