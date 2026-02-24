// Shift Duration Card - For nurse care shift selection
import { View, Text, Pressable } from 'react-native';

interface ShiftDurationCardProps {
    label: string;
    duration: string;
    price?: number;
    isSelected?: boolean;
    onPress?: () => void;
}

export default function ShiftDurationCard({ label, duration, price, isSelected, onPress }: ShiftDurationCardProps) {
    return (
        <Pressable onPress={onPress}>
            <View>
                <Text>{label}</Text>
                <Text>{duration}</Text>
            </View>
        </Pressable>
    );
}
