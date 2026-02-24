// Custom Button - Themed button with loading state
import { View, Text, Pressable, ActivityIndicator } from 'react-native';

interface CustomButtonProps {
    title: string;
    onPress?: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'outline';
    loading?: boolean;
    disabled?: boolean;
}

export default function CustomButton({ title, onPress, variant = 'primary', loading, disabled }: CustomButtonProps) {
    return (
        <Pressable onPress={onPress} disabled={disabled || loading}>
            <View>
                {loading ? <ActivityIndicator /> : <Text>{title}</Text>}
            </View>
        </Pressable>
    );
}
