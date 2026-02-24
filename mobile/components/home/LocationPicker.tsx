// Location Picker - City/area selector with "Coming Soon" badge support
import { View, Text } from 'react-native';

interface LocationPickerProps {
    currentCity?: string;
    onCityChange?: (city: string) => void;
}

export default function LocationPicker({ currentCity, onCityChange }: LocationPickerProps) {
    return (
        <View>
            <Text>Location: {currentCity}</Text>
        </View>
    );
}
