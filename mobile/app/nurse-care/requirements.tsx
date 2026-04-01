// Care Requirements - Specific needs for the patient
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function RequirementsScreen() {
    const { t } = useTranslation();
    return (
        <View>
            <Text>Care Requirements</Text>
        </View>
    );
}
