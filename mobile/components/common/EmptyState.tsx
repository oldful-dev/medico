// Empty State - Shown when no data is available
import { View, Text } from 'react-native';

interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export default function EmptyState({ title, description, icon, actionLabel, onAction }: EmptyStateProps) {
    return (
        <View>
            <Text>{title}</Text>
            {description && <Text>{description}</Text>}
        </View>
    );
}
