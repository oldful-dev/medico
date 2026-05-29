// Address Picker - Address input with Google Maps integration
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

interface AddressPickerProps {
    value?: string;
    onAddressSelect?: (address: string) => void;
}

export default function AddressPicker({ value, onAddressSelect }: AddressPickerProps) {
    const { t } = useTranslation();
    return (
        <View>
            <Text>{t('common.address_picker')}</Text>
        </View>
    );
}
