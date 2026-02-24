// SOS Countdown Overlay - Full screen countdown before triggering emergency
import { View, Text } from 'react-native';

interface SOSCountdownProps {
    seconds?: number;
    onComplete?: () => void;
    onCancel?: () => void;
}

export default function SOSCountdown({ seconds = 3, onComplete, onCancel }: SOSCountdownProps) {
    return (
        <View>
            <Text>SOS Countdown: {seconds}</Text>
        </View>
    );
}
