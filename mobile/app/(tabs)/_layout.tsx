// Tab Layout — Bottom navigation matching Figma Home Screen (374:417)
// Figma: bg #FFFFF8, rounded-tl/tr 20, shadow 0 4 30 rgba(30,30,30,0.63)
// Tabs: Home, Plans, Wellness, Account, Cart
// Labels: Poppins SemiBold 10px, active #02743F, inactive #AAAEAC
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#02743F',
        tabBarInactiveTintColor: '#AAAEAC',
        tabBarStyle: {
          backgroundColor: '#FFFFF8',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          height: 83,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          shadowColor: '#1E1E1E',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.63,
          shadowRadius: 30,
          elevation: 20,
          borderTopWidth: 0,
          position: 'absolute',
        },
        tabBarLabelStyle: {
          fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
          fontWeight: '600',
          fontSize: 10,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: 'Plans',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wellness"
        options={{
          title: 'Wellness',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={21} color={color} />
          ),
        }}
      />
      {/* Hide non-tab screens from the tab bar */}
      <Tabs.Screen name="homepage" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
