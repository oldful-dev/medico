// Notification Badge - Badge indicator for notification count
import { View, Text } from 'react-native';

interface NotificationBadgeProps {
    count: number;
}

export default function NotificationBadge({ count }: NotificationBadgeProps) {
    if (count <= 0) return null;
    return (
        <View>
            <Text>{count > 99 ? '99+' : count}</Text>
        </View>
    );
}
