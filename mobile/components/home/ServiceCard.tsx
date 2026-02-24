// Service Card Component - Grid item for each service
// Used on Home screen (Doctor Visit, Nurse Care, Transportation, Insurance)
import { View, Text, Pressable } from 'react-native';

interface ServiceCardProps {
    title: string;
    icon?: string;
    description?: string;
    onPress?: () => void;
}

export default function ServiceCard({ title, icon, description, onPress }: ServiceCardProps) {
    return (
        <Pressable onPress={onPress}>
            <View>
                <Text>{title}</Text>
                {description && <Text>{description}</Text>}
            </View>
        </Pressable>
    );
}
