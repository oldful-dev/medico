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

export default function TabLayout() {
  const { t } = useTranslation();
  const { setProfile } = useUser();
  const { logout } = useAuth();
  const router = useRouter();
  const hasHandledError = useRef(false);
  const colors = useThemeColors();
  const { itemCount } = useCart();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await userService.getProfile();
        if (response.success && response.data) {
          setProfile(response.data);
        }
      } catch (error: any) {
        console.error("Failed to fetch user profile in global layout:", error);

        // Check if it's a timeout error
        if (
          error?.message?.includes("timed out") ||
          error?.message?.includes("timeout")
        ) {
          if (!hasHandledError.current) {
            hasHandledError.current = true;
            try {
              await logout();
              setTimeout(() => {
                router.replace("/(auth)/login" as any);
              }, 100);
            } catch (logoutErr) {
              console.error("Error during logout/redirect:", logoutErr);
              router.replace("/(auth)/login" as any);
            }
          }
        }
      }
    };
    fetchProfile();
  }, [setProfile, logout, router]);

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
          height: 83,
          paddingTop: 10,
          paddingBottom: Platform.OS === "ios" ? 24 : 10,
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
