// Slide to Call - Swipeable SOS activation
import { View, Text } from 'react-native';

interface SlideToCallProps {
    onSlideComplete?: () => void;
}

export default function SlideToCall({ onSlideComplete }: SlideToCallProps) {
    return (
        <View>
            <Text>Slide to Call</Text>
        </View>
    );
}
