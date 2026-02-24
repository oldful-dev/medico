// Staff Selection Card - Doctor/Nurse/Attendant profile card
import { View, Text, Pressable } from 'react-native';

interface StaffSelectionCardProps {
    name: string;
    qualification?: string;
    type: 'doctor' | 'nurse' | 'attendant';
    rating?: number;
    isSelected?: boolean;
    onPress?: () => void;
}

export default function StaffSelectionCard({ name, qualification, type, rating, isSelected, onPress }: StaffSelectionCardProps) {
    return (
        <Pressable onPress={onPress}>
            <View>
                <Text>{name}</Text>
                <Text>{qualification}</Text>
            </View>
        </Pressable>
    );
}
