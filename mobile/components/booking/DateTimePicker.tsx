// Date Time Picker - Reusable date and time slot selector
import { View, Text } from 'react-native';

interface DateTimePickerProps {
    selectedDate?: Date;
    selectedSlot?: string;
    onDateChange?: (date: Date) => void;
    onSlotChange?: (slot: string) => void;
}

export default function DateTimePicker({ selectedDate, selectedSlot, onDateChange, onSlotChange }: DateTimePickerProps) {
    return (
        <View>
            <Text>Date Time Picker</Text>
        </View>
    );
}
