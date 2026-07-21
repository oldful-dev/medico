// Tab Layout — Bottom navigation matching Figma Home Screen (374:417)
// Figma: bg #FFFFF8, rounded-tl/tr 20, shadow 0 4 30 rgba(30,30,30,0.63)
// Tabs: Home, Plans, Wellness, Account, Cart
// Labels: Poppins SemiBold 10px, active #02743F, inactive #AAAEAC
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { Colors, Fonts, Radius, Shadow } from "@/constants/theme";
import { useThemeColors } from "@/hooks/use-theme-colors";
import React, { useEffect, useRef } from "react";
import { useUser } from "@/context/UserContext";
import { useAuth } from "@/context/AuthContext";
import { userService } from "@/services/api/userService";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useCart } from "@/context/CartContext";

import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const { t } = useTranslation();
  const { setProfile } = useUser();
  const { logout } = useAuth();
  const router = useRouter();
  const hasHandledError = useRef(false);
  const colors = useThemeColors();
  const { itemCount } = useCart();
  const insets = useSafeAreaInsets();



  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: colors.bgHeader,
          borderTopLeftRadius: Radius.xl,
          borderTopRightRadius: Radius.xl,
          height: 73 + insets.bottom,
          paddingTop: 10,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          ...Shadow.header,
          borderTopWidth: 0,
          position: "absolute",
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
          title: t("home.tab_title"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: t("plans.tab_title"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wellness"
        options={{
          title: t("wellness.tab_title"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="medkit" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t("account.tab_title"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={22} color={color} />
          ),
          tabBarBadge: itemCount > 0 ? itemCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.sosRed,
            color: "#FFFFFF",
            fontSize: 10,
            lineHeight: 14,
          },
        }}
      />
    </Tabs>
  );
}
