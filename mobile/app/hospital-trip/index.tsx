import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/context/ThemeContext";
import { useThemeColors } from "@/hooks/use-theme-colors";
import CustomDateTimePicker from "@/components/common/CustomDateTimePicker";

import { useServiceInitialization } from "@/hooks/useServiceInitialization";
import { useUser } from "@/context/UserContext";
import { locationService } from "@/services/device/locationService";
import { userService } from "@/services/api/userService";
import {
  AddressPickerSection,
  type AddressData,
} from "@/components/AddressPickerSection";

// --- Figma Assets ---
const imgEye = require("@/assets/images/e9d68d0206e443ceceadd7907cd94f1c86fcacd4.png");
const imgBrain = require("@/assets/images/2e6febd890c9753178f23a84a8293d0b79e606b6.png");
const imgKidney = require("@/assets/images/bc2188e6d87da62a1af90ead7f0bf3503c62395c.png");
const imgLungs = require("@/assets/images/fde7739eae440fa8bbeccc49dfe81d9417584cdb.png");
const imgCancer = require("@/assets/images/12a939ac9402eccf1948ba9378dc7ffb078381cb.png");
const imgDental = require("@/assets/images/2e704f53861f02d36dae70114611506893870ca5.png");
const imgRadioIcon = require("@/assets/images/9e6f2fbe6164dacc5707082a5ca833130f9cddd9.png");
const imgOther = require("@/assets/images/e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png");
const imgHospitalIcon = require("@/assets/images/e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png");

export default function HospitalTripScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ subscriptionId?: string }>();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();

  const { profile, refreshData } = useUser();
  const [selectedSpecialist, setSelectedSpecialist] = useState<string | null>(
    null,
  );
  const [otherSpecialistText, setOtherSpecialistText] = useState("");
  const [hospitalPreference, setHospitalPreference] = useState<
    "preferred" | "recommend" | null
  >(null);
  const [hospitalQuery, setHospitalQuery] = useState("");
  const [selectedDoctorType, setSelectedDoctorType] = useState<
    "preferred" | "recommend"
  >("preferred");
  const [preferredDoctor, setPreferredDoctor] = useState("");
  const [landmark, setLandmark] = useState("");
  const [transportAddon, setTransportAddon] = useState(false);
  const [supportAddon, setSupportAddon] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(
    null,
  );

  // API state (Refactored to Hook)
  const {
    cityId,
    serviceId,
    serviceName,
    servicePrice,
    address,
    setAddress,
    locationDenied,
    isLoading: isLoadingInit,
    isReady,
  } = useServiceInitialization("hospital-trip");

  const [isBooking, setIsBooking] = useState(false);

  // Sync selectedAddress with initial fetched address on mount or when fetched
  React.useEffect(() => {
    if (address && address !== "Fetching address..." && !selectedAddress) {
      setSelectedAddress({
        line1: address,
        cityName: "",
        pincode: "",
        latitude: 28.7041,
        longitude: 77.1025,
      });
    }
  }, [address]);

  const SPECIALISTS = [
    { id: "eye", label: t("hospital_trip.eye_specialist"), icon: imgEye },
    { id: "brain", label: t("hospital_trip.brain_nerves"), icon: imgBrain },
    { id: "kidney", label: t("hospital_trip.kidney_urinary"), icon: imgKidney },
    { id: "lungs", label: t("hospital_trip.lungs_breathing"), icon: imgLungs },
    { id: "dental", label: t("hospital_trip.dental_care"), icon: imgDental },
    {
      id: "cancer",
      label: t("hospital_trip.cancer_specialist"),
      icon: imgCancer,
    },
    {
      id: "other",
      label: t("hospital_trip.other_specialist", "Other"),
      icon: imgOther,
    },
  ];

  // Silently upsert the address back to profile when user books
  const syncAddressToProfile = async (
    addressText: string,
    landmarkText: string,
  ) => {
    if (!profile?.id || !addressText.trim()) return;
    try {
      const existing =
        profile.addresses?.find((a: any) => a.isDefault) ||
        profile.addresses?.[0];
      const payload = {
        label: existing?.label || "Home",
        line1: addressText.trim(),
        cityName: existing?.cityName || "",
        state: existing?.state || "",
        pincode: existing?.pincode || "",
        landmark: landmarkText.trim() || undefined,
        isDefault: true,
      };
      if (existing?.id) {
        await userService.updateAddress(profile.id, existing.id, payload);
      } else {
        await userService.addAddress(profile.id, payload);
      }
      await refreshData(true);
    } catch {
      // non-fatal — booking still proceeds
    }
  };

  const handleBookService = async () => {
    if (!selectedSpecialist) {
      Alert.alert(
        t("hospital_trip.alert_select_specialist"),
        t("hospital_trip.alert_select_specialist_msg"),
      );
      return;
    }
    if (selectedSpecialist === "other" && !otherSpecialistText.trim()) {
      Alert.alert(
        t(
          "hospital_trip.alert_other_specialist_required",
          "Specify Specialist",
        ),
        t(
          "hospital_trip.alert_other_specialist_msg",
          "Please specify the requirement or specialist.",
        ),
      );
      return;
    }
    if (!hospitalPreference) {
      Alert.alert(
        t("hospital_trip.alert_select_hospital"),
        t("hospital_trip.alert_select_hospital_msg"),
      );
      return;
    }
    if (hospitalPreference === "preferred" && !hospitalQuery.trim()) {
      Alert.alert(
        t("hospital_trip.alert_hospital_required"),
        t("hospital_trip.alert_hospital_required_msg"),
      );
      return;
    }
    if (selectedDoctorType === "preferred" && !preferredDoctor.trim()) {
      Alert.alert(
        t("hospital_trip.alert_doctor_required"),
        t("hospital_trip.alert_doctor_required_msg"),
      );
      return;
    }
    if (!selectedDate) {
      Alert.alert(
        t("hospital_trip.alert_date_required"),
        t("hospital_trip.alert_date_required_msg"),
      );
      return;
    }
    if (
      !address ||
      address.trim().length < 5 ||
      address === "Fetching address..."
    ) {
      Alert.alert(
        t("hospital_trip.alert_address_required"),
        locationDenied
          ? t("hospital_trip.alert_address_denied")
          : t("hospital_trip.alert_address_failed"),
      );
      return;
    }
    if (!isReady) {
      Alert.alert(t("common.error"), t("booking.init_incomplete"));
      return;
    }
    try {
      setIsBooking(true);

      // Sync address to profile (non-blocking, non-fatal)
      syncAddressToProfile(address, landmark);

      const gps = await locationService.getCurrentLocation().catch(() => null);

      // Navigate to checkout
      const bookingPayload = JSON.stringify({
        serviceId,
        cityId,
        scheduledDate: selectedDate!.toISOString(),
        addressLine: address || undefined,
        landmark: landmark || undefined,
        latitude: gps?.latitude,
        longitude: gps?.longitude,
        formDataJson: {
          specialist:
            selectedSpecialist === "other"
              ? otherSpecialistText
              : SPECIALISTS.find((s) => s.id === selectedSpecialist)?.label ||
                selectedSpecialist,
          hospitalPreference,
          hospital:
            hospitalPreference === "preferred" ? hospitalQuery : undefined,
          doctorPreference: selectedDoctorType,
          preferredDoctor:
            selectedDoctorType === "preferred" ? preferredDoctor : undefined,
          transport: transportAddon,
          support: supportAddon,
        },
      });

      router.push({
        pathname: "/service-checkout",
        params: {
          bookingPayload,
          amount: String(servicePrice),
          label: serviceName || "Hospital Visit Assistance",
          serviceSlug: "hospital-trip",
          ...(params.subscriptionId && {
            subscriptionId: params.subscriptionId,
          }),
        },
      });
    } catch (error) {
      console.error("Hospital trip error:", error);
      Alert.alert(t("common.error"), t("booking.something_wrong"));
    } finally {
      setIsBooking(false);
    }
  };

  const dynamicStyles = makeStyles(isDarkMode);

  return (
    <View style={dynamicStyles.screen}>
      {/* Dark green background covers top half */}
      <View style={{ backgroundColor: "#048357", height: insets.top }} />
      <StatusBar style="light" backgroundColor="#048357" />

      <View style={dynamicStyles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={dynamicStyles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={dynamicStyles.headerTitle} numberOfLines={1}>
            {t("hospital_trip.header")}
          </Text>
          <Text style={dynamicStyles.headerSubtitle} numberOfLines={1}>
            {t("hospital_trip.header_subtitle", "Covered under Care Plan")}
          </Text>
        </View>
        <View style={dynamicStyles.carePlanPill}>
          <Ionicons name="shield-checkmark" size={12} color="#fff" />
          <Text style={dynamicStyles.carePlanPillText}>
            {t("hospital_trip.care_plan_tag", "CARE")}
          </Text>
        </View>
      </View>

      {/* Main Content Area (Rounded Cream Box) */}
      <View style={dynamicStyles.contentContainer}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <KeyboardAwareScrollView
            contentContainerStyle={dynamicStyles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid
            extraScrollHeight={20}
          >
            {/* --- Hero / Titles --- */}
            <Text style={dynamicStyles.mainTitle}>
              {t("hospital_trip.main_title")}
            </Text>
            <Text style={dynamicStyles.subTitle}>
              {t("hospital_trip.select_specialist")}
            </Text>

            {/* Care-plan coverage chip */}
            <View style={dynamicStyles.coverageChip}>
              <Ionicons name="checkmark-circle" size={14} color="#02743F" />
              <Text style={dynamicStyles.coverageChipText}>
                {t(
                  "hospital_trip.coverage_note",
                  "Booking & platform fees waived with an active Care Plan",
                )}
              </Text>
            </View>

            <View style={dynamicStyles.divider} />

            {/* --- Specialists Grid --- */}
            <View style={dynamicStyles.specialistGrid}>
              {SPECIALISTS.map((item) => {
                const isSelected = selectedSpecialist === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      dynamicStyles.specialistCard,
                      isSelected && dynamicStyles.specialistCardSelected,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => setSelectedSpecialist(item.id)}
                  >
                    {isSelected && (
                      <View style={dynamicStyles.specialistCheckmark}>
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      </View>
                    )}
                    <Image
                      source={item.icon}
                      style={dynamicStyles.specialistIcon}
                      resizeMode="contain"
                    />
                    <Text
                      style={[
                        dynamicStyles.specialistLabel,
                        isSelected && dynamicStyles.specialistLabelSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Other specialist text input */}
            {selectedSpecialist === "other" && (
              <View style={dynamicStyles.otherSpecialistInput}>
                <TextInput
                  style={dynamicStyles.doctorTextInput}
                  placeholder={t(
                    "hospital_trip.other_specialist_placeholder",
                    "Describe your requirement or specialist...",
                  )}
                  placeholderTextColor={isDarkMode ? "#64748B" : "#888888"}
                  value={otherSpecialistText}
                  onChangeText={setOtherSpecialistText}
                />
              </View>
            )}

            <View style={dynamicStyles.divider} />

            {/* --- Hospital Details --- */}
            <View style={dynamicStyles.sectionHeaderRow}>
              <Ionicons
                name="medkit-outline"
                size={20}
                color={isDarkMode ? "#34D399" : "#02743F"}
                style={{ marginRight: 8 }}
              />
              <Text style={[dynamicStyles.sectionTitle, { marginBottom: 0 }]}>
                {t("hospital_trip.hospital_details", "Hospital Details")}
              </Text>
            </View>

            <TouchableOpacity
              style={dynamicStyles.doctorOptionRow}
              activeOpacity={0.7}
              onPress={() => setHospitalPreference("preferred")}
            >
              <View
                style={[
                  dynamicStyles.radioCircle,
                  hospitalPreference === "preferred" &&
                    dynamicStyles.radioCircleSelected,
                ]}
              />
              <Text style={dynamicStyles.doctorOptionText}>
                {t("hospital_trip.preferred_hospital_option")}
              </Text>
            </TouchableOpacity>

            {hospitalPreference === "preferred" && (
              <View style={dynamicStyles.doctorNameInput}>
                <TextInput
                  style={dynamicStyles.doctorTextInput}
                  placeholder={t("hospital_trip.hospital_name_placeholder")}
                  placeholderTextColor={isDarkMode ? "#64748B" : "#888888"}
                  value={hospitalQuery}
                  onChangeText={setHospitalQuery}
                />
              </View>
            )}

            <TouchableOpacity
              style={dynamicStyles.doctorOptionRow}
              activeOpacity={0.7}
              onPress={() => setHospitalPreference("recommend")}
            >
              <View
                style={[
                  dynamicStyles.radioCircle,
                  hospitalPreference === "recommend" &&
                    dynamicStyles.radioCircleSelected,
                ]}
              />
              <Text style={dynamicStyles.doctorOptionText}>
                {t("hospital_trip.recommend_hospital")}
              </Text>
            </TouchableOpacity>

            <View style={dynamicStyles.divider} />

            {/* --- Select Doctor --- */}
            <Text style={[dynamicStyles.sectionTitle, { marginLeft: 0 }]}>
              {t("hospital_trip.select_doctor")}
            </Text>

            <TouchableOpacity
              style={dynamicStyles.doctorOptionRow}
              activeOpacity={0.7}
              onPress={() => setSelectedDoctorType("preferred")}
            >
              <View
                style={[
                  dynamicStyles.radioCircle,
                  selectedDoctorType === "preferred" &&
                    dynamicStyles.radioCircleSelected,
                ]}
              />
              <Text style={dynamicStyles.doctorOptionText}>
                {t("hospital_trip.preferred_doctor")}
              </Text>
            </TouchableOpacity>

            {selectedDoctorType === "preferred" && (
              <View style={dynamicStyles.doctorNameInput}>
                <TextInput
                  style={dynamicStyles.doctorTextInput}
                  placeholder={t("hospital_trip.doctor_name_placeholder")}
                  placeholderTextColor={isDarkMode ? "#64748B" : "#888888"}
                  value={preferredDoctor}
                  onChangeText={setPreferredDoctor}
                />
              </View>
            )}

            <TouchableOpacity
              style={dynamicStyles.doctorOptionRow}
              activeOpacity={0.7}
              onPress={() => setSelectedDoctorType("recommend")}
            >
              <View
                style={[
                  dynamicStyles.radioCircle,
                  selectedDoctorType === "recommend" &&
                    dynamicStyles.radioCircleSelected,
                ]}
              />
              <Text style={dynamicStyles.doctorOptionText}>
                {t("hospital_trip.recommend_doctor")}
              </Text>
            </TouchableOpacity>

            <View style={dynamicStyles.divider} />

            {/* --- Schedule --- */}
            <CustomDateTimePicker
              label={t("hospital_trip.destination_details")}
              value={selectedDate}
              onDateChange={setSelectedDate}
            />

            {/* --- Service Add-ons --- */}
            <View style={dynamicStyles.addonsContainer}>
              <Text style={dynamicStyles.sectionTitle}>
                {t("hospital_trip.service_addons")}
              </Text>

              {/* Addon: Transport */}
              <TouchableOpacity
                style={dynamicStyles.addonRow}
                activeOpacity={0.7}
                onPress={() => setTransportAddon(!transportAddon)}
              >
                {transportAddon ? (
                  <View style={dynamicStyles.checkedBoxBig}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={dynamicStyles.uncheckedCircle} />
                )}
                <Text style={dynamicStyles.addonText}>
                  {t("hospital_trip.transport_addon")}
                </Text>
              </TouchableOpacity>

              {/* Addon: Support */}
              <TouchableOpacity
                style={dynamicStyles.addonRow}
                activeOpacity={0.7}
                onPress={() => setSupportAddon(!supportAddon)}
              >
                {supportAddon ? (
                  <View style={dynamicStyles.checkedBoxBig}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={dynamicStyles.uncheckedCircle} />
                )}
                <Text style={dynamicStyles.addonText}>
                  {t("hospital_trip.support_addon")}
                </Text>
              </TouchableOpacity>

              <View style={dynamicStyles.addonDivider} />

              {/* Cost Summary */}
              <View style={dynamicStyles.costRow}>
                {/* In Figma, there's a small car icon here, using car icon from Ionicons for now */}
                <Ionicons
                  name="car"
                  size={20}
                  color="#C42A2A"
                  style={{ marginRight: 6 }}
                />
                <Text style={dynamicStyles.costText}>
                  <Text style={dynamicStyles.costAmount}>₹{servicePrice}</Text>
                  <Text style={dynamicStyles.costLabel}>
                    {" "}
                    {t("hospital_trip.booking_fee")}{" "}
                  </Text>
                  <Text style={dynamicStyles.costActuals}>
                    {t("hospital_trip.fee_actuals")}
                  </Text>
                </Text>
              </View>
            </View>

            {/* --- Pickup Address (Global AddressPickerSection) --- */}
            <AddressPickerSection
              selectedAddress={selectedAddress}
              onAddressChange={(addr) => {
                setSelectedAddress(addr);
                setAddress(
                  `${addr.line1}${addr.line2 ? ", " + addr.line2 : ""}`,
                );
                if (addr.landmark) setLandmark(addr.landmark);
              }}
              title={t("hospital_trip.confirm_pickup")}
              showPhoneField={false}
              showLandmarkField={true}
              landmark={landmark}
              onLandmarkChange={setLandmark}
              allowManualEntry={true}
            />

            {/* --- Confirm Button --- */}
            <TouchableOpacity
              style={[
                dynamicStyles.submitButton,
                (isBooking || isLoadingInit) && { opacity: 0.6 },
              ]}
              activeOpacity={0.8}
              disabled={isBooking || isLoadingInit}
              onPress={handleBookService}
            >
              {isLoadingInit ? (
                <Text style={dynamicStyles.submitButtonText}>
                  {t("common.initializing")}
                </Text>
              ) : isBooking ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Ionicons name="car" size={18} color="#fff" />
                  <Text style={dynamicStyles.submitButtonText}>
                    {t("hospital_trip.confirm_btn")}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const makeStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: "#048357",
    },

    /* --- Header --- */
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 25,
      backgroundColor: "#048357",
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      fontFamily: Platform.select({
        ios: "Poppins-SemiBold",
        android: "Poppins_600SemiBold",
        default: "System",
      }),
      fontSize: 18,
      color: "#FFFFFF",
      letterSpacing: -0.24,
    },
    headerSubtitle: {
      fontFamily: Platform.select({
        ios: "LexendDeca-Regular",
        android: "LexendDeca_400Regular",
        default: "System",
      }),
      fontSize: 11,
      color: "rgba(255,255,255,0.7)",
      marginTop: 1,
    },
    carePlanPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(255,255,255,0.2)",
      borderRadius: 20,
      paddingHorizontal: 9,
      paddingVertical: 5,
      marginLeft: 8,
    },
    carePlanPillText: {
      fontFamily: Platform.select({
        ios: "Poppins-SemiBold",
        android: "Poppins_600SemiBold",
        default: "System",
      }),
      fontSize: 10,
      color: "#fff",
      letterSpacing: 0.5,
    },

    /* --- Main Content Container (Cream Box) --- */
    contentContainer: {
      flex: 1,
      backgroundColor: isDarkMode ? "#0F172A" : "#FDFDE8",
      borderTopLeftRadius: 45,
      borderTopRightRadius: 45,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 10,
    },
    scrollContent: {
      paddingTop: 25,
      paddingHorizontal: 25,
      paddingBottom: 40,
    },

    /* --- Hero --- */
    mainTitle: {
      fontFamily: Platform.select({
        ios: "Poppins-SemiBold",
        android: "Poppins_600SemiBold",
        default: "System",
      }),
      fontSize: 18,
      color: isDarkMode ? "#F1F5F9" : "#2F2F2F",
      marginBottom: 5,
      textAlign: "left",
    },
    subTitle: {
      fontFamily: Platform.select({
        ios: "LexendDeca-Regular",
        android: "LexendDeca_400Regular",
        default: "System",
      }),
      fontSize: 14,
      color: isDarkMode ? "#94A3B8" : "#898989",
      textAlign: "left",
      marginBottom: 10,
    },
    coverageChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: isDarkMode
        ? "rgba(2,116,63,0.2)"
        : "rgba(2,116,63,0.08)",
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 7,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: isDarkMode ? "rgba(2,116,63,0.4)" : "rgba(2,116,63,0.2)",
    },
    coverageChipText: {
      fontFamily: Platform.select({
        ios: "LexendDeca-Regular",
        android: "LexendDeca_400Regular",
        default: "System",
      }),
      fontSize: 12,
      color: isDarkMode ? "#34D399" : "#02743F",
      flex: 1,
      lineHeight: 17,
    },
    divider: {
      height: 1,
      backgroundColor: isDarkMode ? "#334155" : "#D9D9D9",
      marginVertical: 15,
    },

    /* --- Specialists Grid --- */
    specialistGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 15,
    },
    specialistCard: {
      width: "31%",
      aspectRatio: 1,
      height: 110,
      backgroundColor: isDarkMode
        ? "rgba(255,255,255,0.08)"
        : "rgba(217, 217, 217, 0.48)",
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
      padding: 5,
      position: "relative",
    },
    specialistCardSelected: {
      borderWidth: 2,
      borderColor: "#02743F",
      backgroundColor: isDarkMode
        ? "rgba(2,116,63,0.15)"
        : "rgba(2,116,63,0.06)",
    },
    specialistCheckmark: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: "#02743F",
      alignItems: "center",
      justifyContent: "center",
    },
    specialistIcon: {
      width: 60,
      height: 60,
      marginBottom: 5,
    },
    specialistLabel: {
      fontFamily: Platform.select({
        ios: "LexendDeca-Medium",
        android: "LexendDeca_500Medium",
        default: "System",
      }),
      fontSize: 11,
      color: isDarkMode ? "#CCCCCC" : "#848484",
      textAlign: "center",
      lineHeight: 14,
    },
    specialistLabelSelected: {
      color: isDarkMode ? "#34D399" : "#02743F",
    },

    /* --- Destination Details --- */
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 15,
    },
    sectionHeaderIcon: {
      width: 20,
      height: 19,
      marginRight: 8,
    },
    sectionTitle: {
      fontFamily: Platform.select({
        ios: "Poppins-SemiBold",
        android: "Poppins_600SemiBold",
        default: "System",
      }),
      fontSize: 18,
      color: isDarkMode ? "#F1F5F9" : "#2F2F2F",
      marginBottom: 15,
    },

    inputCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF",
      borderRadius: 10,
      paddingHorizontal: 15,
      height: 57,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: isDarkMode ? "#334155" : "#777",
    },
    hospitalIcon: {
      width: 34,
      height: 34,
      marginRight: 10,
    },
    inputStack: {
      flex: 1,
      justifyContent: "center",
    },
    hospitalInput: {
      fontFamily: Platform.select({
        ios: "LexendDeca-Regular",
        android: "LexendDeca_400Regular",
        default: "System",
      }),
      fontSize: 15,
      color: isDarkMode ? "#F1F5F9" : "#2F2F2F",
      padding: 0,
      marginBottom: 2,
    },
    hospitalInputHint: {
      fontFamily: Platform.select({
        ios: "LexendDeca-Regular",
        android: "LexendDeca_400Regular",
        default: "System",
      }),
      fontSize: 8,
      color: isDarkMode ? "#94A3B8" : "#555555",
    },
    checkedBox: {
      width: 16,
      height: 16,
      backgroundColor: "#6FCF45",
      borderRadius: 4,
      marginRight: 15,
      justifyContent: "center",
      alignItems: "center",
    },
    selectedHospitalText: {
      fontFamily: Platform.select({
        ios: "Poppins-SemiBold",
        android: "Poppins_600SemiBold",
        default: "System",
      }),
      fontSize: 12,
      color: isDarkMode ? "#F1F5F9" : "#2F2F2F",
    },

    /* --- Select Doctor --- */
    doctorOptionRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    radioCircle: {
      width: 19,
      height: 19,
      borderRadius: 9.5,
      borderWidth: 1,
      borderColor: "#A0A0A0",
      marginRight: 10,
      marginLeft: 4,
      justifyContent: "center",
      alignItems: "center",
    },
    radioCircleSelected: {
      borderColor: "#02743F",
      borderWidth: 5,
    },
    doctorOptionText: {
      fontFamily: Platform.select({
        ios: "LexendDeca-Medium",
        android: "LexendDeca_500Medium",
        default: "System",
      }),
      fontSize: 15,
      color: isDarkMode ? "#E2E8F0" : "#2F2F2F",
    },
    doctorNameInput: {
      height: 53,
      borderWidth: 1,
      borderColor: isDarkMode ? "#475569" : "#777",
      borderRadius: 10,
      justifyContent: "center",
      paddingHorizontal: 15,
      marginLeft: 20,
      marginRight: 10,
      marginBottom: 15,
      backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF",
    },
    otherSpecialistInput: {
      height: 53,
      borderWidth: 1,
      borderColor: isDarkMode ? "#475569" : "#777",
      borderRadius: 10,
      justifyContent: "center",
      paddingHorizontal: 15,
      marginTop: 15,
      marginBottom: 5,
      backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF",
    },
    doctorTextInput: {
      fontFamily: Platform.select({
        ios: "LexendDeca-Medium",
        android: "LexendDeca_500Medium",
        default: "System",
      }),
      fontSize: 15,
      color: isDarkMode ? "#F1F5F9" : "#2F2F2F",
    },

    /* --- Schedule --- */
    scheduleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    scheduleCard: {
      width: "48%",
      height: 83,
      borderWidth: 2,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
    },
    scheduleIcon: {
      width: 25,
      height: 25,
      marginBottom: 3,
      position: "absolute",
      top: 10,
      left: 10,
    },
    scheduleValue: {
      fontFamily: Platform.select({
        ios: "LexendDeca-Medium",
        android: "LexendDeca_500Medium",
        default: "System",
      }),
      fontSize: 16,
      color: isDarkMode ? "#E2E8F0" : "#555",
      marginTop: 15,
    },
    scheduleLabel: {
      fontFamily: Platform.select({
        ios: "LexendDeca-Regular",
        android: "LexendDeca_400Regular",
        default: "System",
      }),
      fontSize: 16,
      color: isDarkMode ? "#94A3B8" : "#555",
      marginTop: 5,
    },
    scheduleIconTime: {
      width: 35,
      height: 35,
      position: "absolute",
      top: 5,
      left: 5,
    },
    scheduleValueTime: {
      fontFamily: Platform.select({
        ios: "LexendDeca-Medium",
        android: "LexendDeca_500Medium",
        default: "System",
      }),
      fontSize: 20,
      color: isDarkMode ? "#E2E8F0" : "#555",
      marginTop: 10,
    },
    scheduleValueTimePeriod: {
      fontFamily: Platform.select({
        ios: "LexendDeca-Regular",
        android: "LexendDeca_400Regular",
        default: "System",
      }),
      fontSize: 12,
    },

    /* --- Add-ons Container --- */
    addonsContainer: {
      backgroundColor: isDarkMode ? "#1A1A1A" : "#FFFFFF",
      borderRadius: 11,
      padding: 20,
      paddingBottom: 15,
      marginBottom: 30,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 3,
    },
    addonRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 15,
    },
    checkedBoxBig: {
      width: 24,
      height: 24,
      backgroundColor: "#6FCF45",
      borderRadius: 6,
      marginRight: 10,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 2,
    },
    uncheckedCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: "#A0A0A0",
      marginRight: 10,
      marginTop: 2,
    },
    addonText: {
      fontFamily: Platform.select({
        ios: "LexendDeca-Regular",
        android: "LexendDeca_400Regular",
        default: "System",
      }),
      fontSize: 14,
      color: isDarkMode ? "#E2E8F0" : "#555555",
      flex: 1,
      lineHeight: 18,
    },
    addonBold: {
      fontFamily: Platform.select({
        ios: "LexendDeca-Medium",
        android: "LexendDeca_500Medium",
        default: "System",
      }),
      color: isDarkMode ? "#E2E8F0" : "#555555",
    },
    addonDivider: {
      height: 1,
      backgroundColor: isDarkMode ? "#334155" : "#D9D9D9",
      marginVertical: 10,
    },
    costRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 5,
    },
    costText: {},
    costAmount: {
      fontFamily: Platform.select({
        ios: "LexendDeca-Medium",
        android: "LexendDeca_500Medium",
        default: "System",
      }),
      fontSize: 16,
      color: isDarkMode ? "#F1F5F9" : "#2F2F2F",
    },
    costLabel: {
      fontFamily: Platform.select({
        ios: "LexendDeca-Regular",
        android: "LexendDeca_400Regular",
        default: "System",
      }),
      fontSize: 14,
      color: isDarkMode ? "#F1F5F9" : "#2F2F2F",
    },
    costActuals: {
      fontFamily: Platform.select({
        ios: "LexendDeca-Medium",
        android: "LexendDeca_500Medium",
        default: "System",
      }),
      fontSize: 16,
      color: isDarkMode ? "#F1F5F9" : "#2F2F2F",
    },

    /* --- Submit Button --- */
    submitButton: {
      backgroundColor: "#02743F",
      height: 52,
      borderRadius: 26,
      justifyContent: "center",
      alignItems: "center",
      alignSelf: "stretch",
      marginTop: 4,
    },
    submitButtonText: {
      fontFamily: Platform.select({
        ios: "LexendDeca-Medium",
        android: "LexendDeca_500Medium",
        default: "System",
      }),
      color: "#FFFFFF",
      fontSize: 15,
    },
  });
