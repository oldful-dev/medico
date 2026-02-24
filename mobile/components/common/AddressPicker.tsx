// Address Picker - Address input with Google Maps integration
import { View, Text } from 'react-native';

interface AddressPickerProps {
    value?: string;
    onAddressSelect?: (address: string) => void;
}

export default function AddressPicker({ value, onAddressSelect }: AddressPickerProps) {
    return (
        <View>
            <Text>Address Picker</Text>
        </View>
    );
}
