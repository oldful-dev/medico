// Symptom Card - Individual symptom selection card
// PRD: Fever, BP Check, Sugar, Body Pain, Post-Surgery Rehab, etc.
import { View, Text, Pressable } from 'react-native';

interface SymptomCardProps {
    symptom: string;
    icon?: string;
    isSelected?: boolean;
    onPress?: () => void;
}

export default function SymptomCard({ symptom, icon, isSelected, onPress }: SymptomCardProps) {
    return (
        <Pressable onPress={onPress}>
            <View>
                <Text>{symptom}</Text>
            </View>
        </Pressable>
    );
}
