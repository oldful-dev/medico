// Symptom Selection Screen
// PRD: Grid of symptom cards (Fever, BP Check, Sugar, Body Pain, Post-Surgery Rehab, etc.)
// Smart logic to route to GP (MBBS) or Physiotherapist based on symptoms
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function SymptomSelectionScreen() {
    const { t } = useTranslation();
    return (
        <View>
            <Text>Symptom Selection</Text>
        </View>
    );
}
