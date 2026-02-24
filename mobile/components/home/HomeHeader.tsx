// Home Header Component
// PRD: Location selector, Search, Notifications bell, SOS button
import { View, Text } from 'react-native';

interface HomeHeaderProps {
    location?: string;
    notificationCount?: number;
}

export default function HomeHeader({ location, notificationCount }: HomeHeaderProps) {
    return (
        <View>
            <Text>Home Header</Text>
        </View>
    );
}
