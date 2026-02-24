// Insurance Plan Card - Display insurance plan summary
import { View, Text, Pressable } from 'react-native';

interface InsurancePlanCardProps {
    planName: string;
    coverage?: string;
    premium?: number;
    features?: string[];
    onPress?: () => void;
}

export default function InsurancePlanCard({ planName, coverage, premium, features, onPress }: InsurancePlanCardProps) {
    return (
        <Pressable onPress={onPress}>
            <View>
                <Text>{planName}</Text>
                <Text>Coverage: {coverage}</Text>
                <Text>Premium: ₹{premium}/month</Text>
            </View>
        </Pressable>
    );
}
