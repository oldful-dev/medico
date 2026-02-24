// OTP Input - 6-digit OTP entry component
import { View, Text } from 'react-native';

interface OTPInputProps {
    length?: number;
    onComplete?: (otp: string) => void;
}

export default function OTPInput({ length = 6, onComplete }: OTPInputProps) {
    return (
        <View>
            <Text>OTP Input ({length} digits)</Text>
        </View>
    );
}
