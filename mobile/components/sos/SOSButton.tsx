// SOS Button Component
// PRD: Slide-to-Call or 3-second countdown to prevent accidental triggers
// Used on Home screen header
import { View, Text } from 'react-native';

interface SOSButtonProps {
    onActivate?: () => void;
    variant?: 'slide' | 'countdown';
}

export default function SOSButton({ onActivate, variant = 'slide' }: SOSButtonProps) {
    return (
        <View>
            <Text>SOS</Text>
        </View>
    );
}
