// Loading Spinner - Full screen and inline loading indicator
import { View, ActivityIndicator, Text } from 'react-native';

interface LoadingSpinnerProps {
    message?: string;
    fullScreen?: boolean;
}

export default function LoadingSpinner({ message, fullScreen = false }: LoadingSpinnerProps) {
    return (
        <View>
            <ActivityIndicator />
            {message && <Text>{message}</Text>}
        </View>
    );
}
