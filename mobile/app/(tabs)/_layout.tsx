// Tab Layout — Bottom navigation matching Figma Home Screen (374:417)
// Figma: bg #FFFFF8, rounded-tl/tr 20, shadow 0 4 30 rgba(30,30,30,0.63)
// Tabs: Home, Plans, Wellness, Account, Cart
// Labels: Poppins SemiBold 10px, active #02743F, inactive #AAAEAC
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { Colors, Fonts, Radius, Shadow } from '@/constants/theme';
import React, { useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { userService } from '@/services/api/userService';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const { t } = useTranslation();
  const { setProfile } = useUser();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await userService.getProfile();
        if (response.success && response.data) {
          setProfile(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch user profile in global layout:", error);
      }
    };
    fetchProfile();
  }, [setProfile]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primaryDark,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: {
          backgroundColor: Colors.bgHeader,
          borderTopLeftRadius: Radius.xl,
          borderTopRightRadius: Radius.xl,
          height: 83,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          ...Shadow.header,
          borderTopWidth: 0,
          position: 'absolute',
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.semiBold,
          fontSize: 10,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home.tab_title'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: t('plans.tab_title'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wellness"
        options={{
          title: t('wellness.tab_title'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('account.tab_title'),
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
