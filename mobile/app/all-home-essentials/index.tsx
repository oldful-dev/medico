import React from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { Fonts, Colors } from "@/constants/theme";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/services/api/apiClient";
import { getAssetUrl } from "@/utils/getAssetUrl";

// Home essentials icons
const acRepairIcon = require("@/assets/images/fa6360cf6179cebaed29a6c808bafae2d31ad753.png");
const plumbingIcon = require("@/assets/images/8ce612b04a3a83f1e834c7b71a6dd2c0174cb918.png");
const cleaningIcon = require("@/assets/images/ad6b9b061bc7b1487a0e73c2557f711136d2a4d9.png");
const driverIcon = require("@/assets/images/60d4d0afa5801aeaa9e593bc049e3b017ef5624c.png");
const billsIcon = require("@/assets/images/056ecb9c01dd2283b1c0db1e84c1eb94c6d8a45a.png");
const bankWorkIcon = require("@/assets/images/33ede0e57be708b9775957c3ecec7013b0a56c6d.png");
const groceryIcon = require("@/assets/images/8888c71f466119aa294bd00136ff887f616d4737.png");
const anythingElseIcon = require("@/assets/images/6c8ed456023258e8b4095af93909c6cbc6c4b909.png");

const ICON_MAPPING: Record<string, any> = {
  "appliance-repair": acRepairIcon,
  "plumbing-electrical": plumbingIcon,
  "deep-cleaning": cleaningIcon,
  "driving-cab": driverIcon,
  "bill-payment": billsIcon,
  "bank-paperwork": bankWorkIcon,
  "grocery-run": groceryIcon,
  "anything-else": anythingElseIcon,
  "paper-legal": bankWorkIcon,
  "sanitisation": cleaningIcon,
  "tech-helper": acRepairIcon,
};

const isEmoji = (str?: string) => {
  if (!str) return false;
  const clean = str.trim();
  return clean.length <= 4 && !clean.includes('.') && !clean.includes('/') && !clean.includes(':');
};

export default function AllHomeEssentialsScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [services, setServices] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isParentDisabled, setIsParentDisabled] = React.useState(false);

  React.useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any[]>("/services?isEnabled=true");
      if (res.success && res.data) {
        // Check if the parent home-essentials service itself is enabled
        const isParentEnabled = res.data.some((s: any) => s.slug === "home-essentials");
        if (!isParentEnabled) {
          setIsParentDisabled(true);
          setServices([]);
          return;
        }
        setIsParentDisabled(false);

        // Utility to resolve mismatched slugs to valid mobile routes
        const resolveSlugToRoute = (slug: string) => {
          if (slug === "tech-helper-essentials") return "/tech-helper";
          if (slug === "home-essentials") return "/all-home-essentials";
          if (slug === "bank-paperwork") return "/paper-legal";

          const STATIC_ESSENTIALS = [
            "appliance-repair",
            "plumbing-electrical",
            "deep-cleaning",
            "driving-cab",
            "bill-payment",
            "grocery-run",
            "anything-else",
            "paper-legal",
            "sanitisation",
            "tech-helper"
          ];
          if (STATIC_ESSENTIALS.includes(slug)) {
            return `/${slug}`;
          }
          return `/home-essentials-dynamic/${slug}`;
        };

        // Filter for Home Essentials, excluding parent categories, smart-upgrade, trip-travels, bank-paperwork
        const filtered = res.data
          .filter(
            (s: any) =>
              s.serviceType === "HOME_ESSENTIALS" &&
              s.slug !== "home-essentials" &&
              s.slug !== "smart-upgrade" &&
              s.slug !== "trip-travels" &&
              s.slug !== "bank-paperwork",
          )
          .map((s: any) => ({
            ...s,
            route: resolveSlugToRoute(s.slug),
            iconAsset: (s.icon && !isEmoji(s.icon)) ? { uri: getAssetUrl(s.icon) } : (ICON_MAPPING[s.slug] || anythingElseIcon),
          }));
        setServices(filtered);
      }
    } catch (error) {
      console.error("Failed to fetch services:", error);
    } finally {
      setLoading(false);
    }
  };

  const styles = makeStyles(isDarkMode, insets);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDarkMode ? "#F1F5F9" : "#2F2F2F"}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("home.all_home_essentials", "All Home Essentials")}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <Text
            style={{
              textAlign: "center",
              marginTop: 40,
              fontFamily: Fonts.medium,
              fontSize: 14,
              color: isDarkMode ? "#94A3B8" : "#6B7280",
            }}
          >
            {t("common.loading", "Loading...")}
          </Text>
        ) : isParentDisabled ? (
          <Text
            style={{
              textAlign: "center",
              marginTop: 40,
              fontFamily: Fonts.medium,
              fontSize: 14,
              color: isDarkMode ? "#94A3B8" : "#6B7280",
            }}
          >
            {t("services.currently_unavailable", "Services currently unavailable")}
          </Text>
        ) : (
          <View style={styles.listContainer}>
            {services.map((item, i) => {
              const key = item.slug ? item.slug.replace(/-/g, "_") : "";
              const displayHeadline = key ? t(`services.${key}`, item.headline || item.name || "") : (item.headline || item.name || "");
              const displaySubhead = key ? t(`services.${key}_subhead`, item.subhead || item.tagline || "") : (item.subhead || item.tagline || "");

              return (
                <TouchableOpacity
                  key={item.id || `service-${i}`}
                  style={styles.card}
                  activeOpacity={0.7}
                  onPress={() => router.push(item.route as any)}
                >
                  <View style={styles.iconContainer}>
                    <Image
                      source={item.iconAsset}
                      style={styles.icon}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.headline}>{displayHeadline}</Text>
                    <Text style={styles.subhead}>{displaySubhead}</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={isDarkMode ? "#94A3B8" : "#9CA3AF"}
                    style={styles.chevron}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (isDarkMode: boolean, insets: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: isDarkMode ? "#0F172A" : "#FFFFE3",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    backButton: {
      paddingRight: 15,
    },
    headerTitle: {
      fontFamily: Fonts.bold,
      fontSize: 20,
      color: isDarkMode ? "#F1F5F9" : "#034C2A",
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 40 + insets.bottom,
      paddingTop: 10,
    },
    listContainer: {
      flexDirection: "column",
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? "#334155" : "#F1F5F9",
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDarkMode ? "#0F172A" : "#F4FBF7",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
      borderWidth: 1,
      borderColor: isDarkMode ? "#1E293B" : "#E8F5EE",
    },
    icon: {
      width: 28,
      height: 28,
    },
    textContainer: {
      flex: 1,
      justifyContent: "center",
    },
    headline: {
      fontFamily: Fonts.bold,
      fontSize: 14.5,
      color: isDarkMode ? "#F1F5F9" : "#1F2937",
      marginBottom: 4,
    },
    subhead: {
      fontFamily: Fonts.regular,
      fontSize: 11.5,
      color: isDarkMode ? "#94A3B8" : "#6B7280",
      lineHeight: 16,
    },
    chevron: {
      marginLeft: 8,
    },
  });
