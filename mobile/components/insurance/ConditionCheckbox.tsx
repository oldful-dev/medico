// Condition Checkbox - Pre-existing condition selector
// PRD: Diabetes, BP, Heart conditions, etc.
import { View, Text, Pressable } from 'react-native';

interface ConditionCheckboxProps {
    condition: string;
    isChecked?: boolean;
    onToggle?: () => void;
}

export default function ConditionCheckbox({ condition, isChecked, onToggle }: ConditionCheckboxProps) {
    return (
        <Pressable onPress={onToggle}>
            <View>
                <Text>{isChecked ? '☑' : '☐'} {condition}</Text>
            </View>
        </Pressable>
    );
}
