import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CustomAlertModal } from "@/components/common/CustomAlertModal";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useUser } from "@/context/UserContext";
import { useAddress } from "@/context/AddressContext";
import { useTheme } from "@/context/ThemeContext";
import { Colors, Fonts, FontSize, Spacing, Radius } from "@/constants/theme";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useServiceInitialization } from "@/hooks/useServiceInitialization";
import { mediaService } from "@/services/api/mediaService";
import { bookingService } from "@/services/api/bookingService";
import ServiceDetailScreen from "@/components/services/ServiceDetailScreen";
import CustomDateTimePicker from "@/components/common/CustomDateTimePicker";
import ImageUploadBox from "@/components/common/ImageUploadBox";
import DocumentUploadBox from "@/components/common/DocumentUploadBox";
import { type AddressData } from "@/components/AddressPickerSection";
import { apiClient } from "@/services/api/apiClient";

// Field types already handled by their own dedicated block below
// (benefits copy, address card, date picker, comments, photo upload) — any
// OTHER type in formFieldsJson is rendered generically here instead of being
// silently dropped. This is what makes the admin form-builder truthful for
// Home Essentials: whatever field type is added there actually shows up.
const HANDLED_FIELD_TYPES = new Set(["benefits", "address_picker", "datetime", "comments"]);

interface HomeEssentialsBookingScreenProps {
  slug: string;
}

export default function HomeEssentialsBookingScreen({
  slug,
}: HomeEssentialsBookingScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ subscriptionId?: string }>();
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();

  const { getServiceBySlug, refreshData } = useUser();
  const { activeAddress } = useAddress();
  const dbService = getServiceBySlug(slug);

  const [serviceChargeConfig, setServiceChargeConfig] = useState<any>(null);

  // Fully DB-driven — no hardcoded per-slug fallback text. If a Service row
  // is missing headline/subhead (shouldn't happen once admin-managed), this
  // falls through to a generic label rather than a stale hardcoded string.
  const headline = dbService?.headline || dbService?.name || "Home Essentials";
  const subhead =
    dbService?.subhead || dbService?.tagline || "Concierge Services";
  const checkoutGroup = dbService?.checkoutGroup || "D";

  // Any admin-defined field beyond the fixed set (benefits/address/date/
  // comments) — dropdown, radio, checkbox, text_input, file_upload, etc.
  // Rendered generically below; never silently dropped.
  const extraFields: any[] = React.useMemo(() => {
    const sections = dbService?.formFieldsJson?.sections;
    if (!Array.isArray(sections)) return [];
    const fields = sections[0]?.fields;
    if (!Array.isArray(fields)) return [];
    return fields.filter((f: any) => f?.type && !HANDLED_FIELD_TYPES.has(f.type));
  }, [dbService]);

  const {
    isReady,
    cityId,
    serviceId,
    serviceName,
    servicePrice,
    isLoading: isLoadingInit,
  } = useServiceInitialization(slug);

  // Form states
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    undefined,
  );
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [landmark, setLandmark] = useState("");
  const [comments, setComments] = useState("");
  // Answers for any custom formFieldsJson fields beyond the fixed set
  // (dropdown, radio, checkbox, file_upload, etc.) — keyed by field id.
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});
  const setCustomAnswer = (fieldId: string, value: any) =>
    setCustomAnswers((prev) => ({ ...prev, [fieldId]: value }));
  const [deliveryMethod, setDeliveryMethod] = useState<"online" | "home_visit">(
    "online",
  );
  const [isBooking, setIsBooking] = useState(false);
  // selectedAddress now seeds from — and stays in sync with — the
  // centralized Active Service Location.
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(
    activeAddress
      ? {
          id: activeAddress.id,
          line1: activeAddress.line1,
          line2: activeAddress.line2,
          cityName: activeAddress.cityName,
          pincode: activeAddress.pincode,
          landmark: activeAddress.landmark,
          latitude: activeAddress.latitude,
          longitude: activeAddress.longitude,
          state: activeAddress.state,
        }
      : null,
  );
  const [landmarkInitialized, setLandmarkInitialized] = useState(false);

  // Native Alert.alert is globally muted app-wide (see app/_layout.tsx)
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    iconName: string;
  }>({
    visible: false,
    title: "",
    message: "",
    iconName: "warning-outline",
  });
  const alertCloseAction = useRef<(() => void) | null>(null);
  const triggerAlert = (
    title: string,
    message: string,
    iconName = "warning-outline",
    onCloseAction?: () => void,
  ) => {
    alertCloseAction.current = onCloseAction ?? null;
    setAlertConfig({ visible: true, title, message, iconName });
  };
  const closeAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
    const action = alertCloseAction.current;
    alertCloseAction.current = null;
    if (action) action();
  };

  // Always fetch latest catalog data and service charge from DB when opening screen
  useEffect(() => {
    refreshData();
    // Fetch dynamic category pricing rule from backend
    (async () => {
      try {
        const category = slug.toUpperCase().replace(/-/g, "_");
        const res = await apiClient.get<any>(
          `/pricing/service-charge/${category}`,
        );
        if (res.success && res.data) {
          setServiceChargeConfig(res.data);
        }
      } catch (e) {
        // non-blocking
      }
    })();
  }, [slug]);

  // Follow the centralized active address whenever it changes elsewhere
  // in the app, unless the user has already made their own pick here.
  useEffect(() => {
    if (!activeAddress) return;
    setSelectedAddress((prev) => {
      if (
        prev &&
        prev.id === activeAddress.id &&
        prev.line1 === activeAddress.line1
      )
        return prev;
      return {
        id: activeAddress.id,
        line1: activeAddress.line1,
        line2: activeAddress.line2,
        cityName: activeAddress.cityName,
        pincode: activeAddress.pincode,
        landmark: activeAddress.landmark,
        latitude: activeAddress.latitude,
        longitude: activeAddress.longitude,
        state: activeAddress.state,
      };
    });
    if (!landmarkInitialized && activeAddress.landmark) {
      setLandmark(activeAddress.landmark);
      setLandmarkInitialized(true);
    }
  }, [activeAddress, landmarkInitialized]);

  const handleAddressChange = (addr: AddressData) => {
    setSelectedAddress(addr);
    if (addr.landmark) setLandmark(addr.landmark);
    setLandmarkInitialized(true);
  };

  // Determine field visibility based on checkout group
  const showDatePicker =
    checkoutGroup === "A" ||
    checkoutGroup === "D" ||
    (checkoutGroup === "C" && deliveryMethod === "home_visit");
  const hideLocationCard = false;
  const showPhotoUpload =
    checkoutGroup === "A" ||
    checkoutGroup === "B" ||
    (checkoutGroup === "D" &&
      slug !== "driving-cab" &&
      slug !== "anything-else");
  const isZeroPayment = checkoutGroup === "D";

  // Dynamic Price resolution from:
  // 1) Admin ServiceCharge override (onlineServiceFee / offlineServiceFee)
  // 2) Admin Service formFieldsJson options
  // 3) Admin Service basePrice
  const resolvedOnlinePrice = React.useMemo(() => {
    if (serviceChargeConfig?.onlineServiceFee != null) {
      return Number(serviceChargeConfig.onlineServiceFee);
    }
    if (
      dbService?.formFieldsJson &&
      typeof dbService.formFieldsJson === "object"
    ) {
      const sections = Array.isArray((dbService.formFieldsJson as any).sections)
        ? (dbService.formFieldsJson as any).sections
        : [];
      for (const s of sections) {
        for (const f of s.fields || []) {
          const opt = (f.options || []).find(
            (o: any) =>
              o?.label?.toLowerCase()?.includes("online") ||
              o?.id?.toLowerCase()?.includes("online"),
          );
          if (opt && typeof opt.price === "number") return opt.price;
        }
      }
    }
    return dbService?.basePrice && dbService.basePrice > 0
      ? dbService.basePrice
      : 100;
  }, [serviceChargeConfig, dbService]);

  const resolvedVisitPrice = React.useMemo(() => {
    if (serviceChargeConfig?.offlineServiceFee != null) {
      return Number(serviceChargeConfig.offlineServiceFee);
    }
    if (
      dbService?.formFieldsJson &&
      typeof dbService.formFieldsJson === "object"
    ) {
      const sections = Array.isArray((dbService.formFieldsJson as any).sections)
        ? (dbService.formFieldsJson as any).sections
        : [];
      for (const s of sections) {
        for (const f of s.fields || []) {
          const opt = (f.options || []).find(
            (o: any) =>
              o?.label?.toLowerCase()?.includes("offline") ||
              o?.label?.toLowerCase()?.includes("visit") ||
              o?.id?.toLowerCase()?.includes("offline") ||
              o?.id?.toLowerCase()?.includes("visit"),
          );
          if (opt && typeof opt.price === "number") return opt.price;
        }
      }
    }
    return dbService?.basePrice && dbService.basePrice > 0
      ? Math.max(dbService.basePrice, 200)
      : 200;
  }, [serviceChargeConfig, dbService]);

  const getPricingLabel = () => {
    if (dbService?.pricingText) {
      return dbService.pricingText;
    }

    const baseFee =
      dbService?.basePrice !== undefined &&
      dbService?.basePrice !== null &&
      dbService.basePrice > 0
        ? dbService.basePrice
        : 299;
    if (checkoutGroup === "A") {
      return t(
        "service_detail.pricing_a",
        "₹{{price}} Service Charge + Vendor Bill",
        { price: baseFee },
      );
    }
    if (checkoutGroup === "B") {
      return t(
        "service_detail.pricing_b",
        "₹{{price}} Service Charge (Max 2 Bills)",
        { price: baseFee },
      );
    }
    if (checkoutGroup === "C") {
      if (deliveryMethod === "online") {
        return t(
          "service_detail.pricing_c_online",
          "₹{{price}} (Online Video Call)",
          { price: resolvedOnlinePrice },
        );
      } else {
        return t("service_detail.pricing_c_visit", "₹{{price}} (Home Visit)", {
          price: resolvedVisitPrice,
        });
      }
    }
    return t("service_detail.pricing_d", "Zero Service Charge (Inquiry)");
  };

  const getAmount = () => {
    const baseFee =
      dbService?.basePrice !== undefined &&
      dbService?.basePrice !== null &&
      dbService.basePrice > 0
        ? dbService.basePrice
        : 299;
    if (checkoutGroup === "A" || checkoutGroup === "B") return baseFee;
    if (checkoutGroup === "C")
      return deliveryMethod === "online"
        ? resolvedOnlinePrice
        : resolvedVisitPrice;
    return 0;
  };

  const isExtraFieldEmpty = (field: any) => {
    const val = customAnswers[field.id];
    if (field.type === "toggle") return false; // booleans are never "empty"
    return val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0);
  };

  const isFormValid = React.useMemo(() => {
    if (!comments.trim()) return false;
    if (
      !hideLocationCard &&
      !(selectedAddress?.line1 && selectedAddress.line1.trim().length >= 5)
    )
      return false;
    if (showDatePicker && !scheduledDate) return false;
    if (checkoutGroup === "B" && selectedImages.length === 0) return false;
    for (const field of extraFields) {
      if (field.required && isExtraFieldEmpty(field)) return false;
    }
    return true;
  }, [
    comments,
    hideLocationCard,
    selectedAddress,
    showDatePicker,
    scheduledDate,
    checkoutGroup,
    selectedImages,
    extraFields,
    customAnswers,
  ]);

  const handleBook = async () => {
    // 1. Validate comments field
    if (!comments.trim()) {
      triggerAlert(
        t("common.required", "Required"),
        t(
          "service_detail.comments_required",
          "Please enter comments or details of your request.",
        ),
      );
      return;
    }

    // 2. Validate location if required
    if (
      !hideLocationCard &&
      (!selectedAddress?.line1 || selectedAddress.line1.trim().length < 5)
    ) {
      triggerAlert(
        t("common.required", "Required"),
        t("service_detail.address_required", "Please provide a valid address."),
      );
      return;
    }

    // 3. Validate date if required
    if (showDatePicker && !scheduledDate) {
      triggerAlert(
        t("common.required", "Required"),
        t(
          "service_detail.date_required",
          "Please select a date and time slot.",
        ),
      );
      return;
    }

    if (showDatePicker && scheduledDate && scheduledDate <= new Date()) {
      triggerAlert(
        t("common.error", "Error"),
        t(
          "service_detail.invalid_time",
          "Please select a future date and time.",
        ),
      );
      return;
    }

    // 4. Validate photo upload if strictly required (Group B)
    if (checkoutGroup === "B" && selectedImages.length === 0) {
      triggerAlert(
        t("common.required", "Required"),
        t(
          "service_detail.bill_photo_required",
          "Please upload a photo of the bills.",
        ),
      );
      return;
    }

    // 5. Validate any custom admin-defined fields
    for (const field of extraFields) {
      if (field.required && isExtraFieldEmpty(field)) {
        triggerAlert(
          t("common.required", "Required"),
          `${field.label || "This field"} is required.`,
        );
        return;
      }
    }

    if (!isReady) {
      triggerAlert(
        t("common.error", "Error"),
        t("booking.init_incomplete", "Service initialization failed."),
      );
      return;
    }

    try {
      setIsBooking(true);

      // Upload photos first
      let uploadedImageUrls: string[] = [];
      if (showPhotoUpload && selectedImages.length > 0) {
        uploadedImageUrls = await mediaService.uploadMultipleMedia(
          selectedImages,
          slug,
        );
      }

      // Upload any custom image_upload/file_upload fields
      const resolvedCustomAnswers = { ...customAnswers };
      for (const field of extraFields) {
        if (
          (field.type === "image_upload" || field.type === "file_upload") &&
          Array.isArray(customAnswers[field.id]) &&
          customAnswers[field.id].length > 0
        ) {
          resolvedCustomAnswers[field.id] = await mediaService.uploadMultipleMedia(
            customAnswers[field.id],
            slug,
          );
        }
      }

      // Booking location comes from the address the user actually
      // confirmed on screen — never a fresh device GPS read.
      const addressLine = selectedAddress?.line1
        ? [selectedAddress.line1, selectedAddress.line2]
            .filter(Boolean)
            .join(", ")
        : undefined;

      const bookingPayloadObj = {
        serviceId,
        cityId,
        scheduledDate: scheduledDate
          ? scheduledDate.toISOString()
          : new Date().toISOString(),
        addressLine: hideLocationCard ? undefined : addressLine,
        landmark: landmark.trim() || undefined,
        latitude: selectedAddress?.latitude,
        longitude: selectedAddress?.longitude,
        formDataJson: {
          comments: comments.trim(),
          attachments: uploadedImageUrls,
          deliveryMethod: checkoutGroup === "C" ? deliveryMethod : undefined,
          ...resolvedCustomAnswers,
        },
      };

      // Group D Zero-Payment: bypass Razorpay and call booking creation route immediately
      if (isZeroPayment) {
        const res = await bookingService.createBooking({
          ...bookingPayloadObj,
          amount: 0,
          paymentMethod: "REQUEST",
        });

        if (res.success && res.data) {
          const bookingId = res.data.id;
          triggerAlert(
            t("common.success", "Success"),
            t(
              "service_detail.request_submitted",
              "Your request has been successfully submitted!",
            ),
            "checkmark-circle-outline",
            () =>
              router.replace({
                pathname: "/service-confirmation",
                params: { bookingId },
              }),
          );
        } else {
          triggerAlert(
            t("common.error", "Error"),
            res.message || "Failed to submit request.",
          );
        }
      } else {
        // Groups A, B, C redirect to service-checkout screen
        const selectedOption =
          checkoutGroup === "C"
            ? deliveryMethod === "online"
              ? "Online"
              : "Offline"
            : undefined;
        router.push({
          pathname: "/service-checkout",
          params: {
            bookingPayload: JSON.stringify(bookingPayloadObj),
            amount: String(getAmount()),
            label: serviceName || headline,
            serviceSlug: slug,
            checkoutGroup,
            ...(selectedOption && { selectedOption }),
            ...(params.subscriptionId && {
              subscriptionId: params.subscriptionId,
            }),
          },
        });
      }
    } catch (error) {
      console.error("Booking failed:", error);
      triggerAlert(
        t("common.error", "Error"),
        "Failed to upload files. Please try again.",
      );
    } finally {
      setIsBooking(false);
    }
  };

  const styles = makeStyles(isDarkMode, colors);

  const bulletItems = [
    t(
      "service_detail.bullet_homemaker",
      "Covered under Homemaker subscription plan benefits",
    ),
    t(
      "service_detail.bullet_professional",
      "Certified, verified, and safe professionals",
    ),
    t("service_detail.bullet_support", "24/7 dedicated support tracking"),
  ];

  return (
    <ServiceDetailScreen
      headerTitle={headline}
      heroTitle={headline}
      heroSubtitle={t("service_detail.home_essentials", "Home Essentials")}
      description={subhead}
      heroIcon={dbService?.icon}
      pricingLabel={getPricingLabel()}
      pricingNote={
        checkoutGroup === "D"
          ? undefined
          : t(
              "service_detail.pricing_disclaimer",
              "*Pricing is subject to actual work assessment.",
            )
      }
      bulletItems={bulletItems}
      address={selectedAddress?.line1 || ""}
      landmark={landmark}
      onLandmarkChange={setLandmark}
      onBook={handleBook}
      isLoading={isLoadingInit || isBooking}
      disabled={!isFormValid}
      hidePricing={isZeroPayment}
      hideLocation={hideLocationCard}
      selectedAddress={selectedAddress}
      onAddressChange={handleAddressChange}
      bookButtonLabel={
        isZeroPayment ? t("common.submit_request", "Submit Request") : undefined
      }
    >
      {/* Group C: Tech Support Online vs Visit selection */}
      {checkoutGroup === "C" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {t("service_detail.delivery_method", "Delivery Method")}
          </Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                deliveryMethod === "online" && styles.toggleBtnActive,
              ]}
              onPress={() => setDeliveryMethod("online")}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  deliveryMethod === "online" && styles.toggleBtnTextActive,
                ]}
              >
                {t(
                  "service_detail.online_call",
                  "Online Video Call (₹{{price}})",
                  { price: resolvedOnlinePrice },
                )}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                deliveryMethod === "home_visit" && styles.toggleBtnActive,
              ]}
              onPress={() => setDeliveryMethod("home_visit")}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  deliveryMethod === "home_visit" && styles.toggleBtnTextActive,
                ]}
              >
                {t("service_detail.home_visit", "Home Visit (₹{{price}})", {
                  price: resolvedVisitPrice,
                })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Custom admin-defined fields (formFieldsJson) beyond the fixed set */}
      {extraFields.map((field: any) => (
        <View key={field.id} style={styles.card}>
          {field.type !== "info_banner" && field.type !== "toggle" && (
            <Text style={styles.cardTitle}>
              {field.label} {field.required ? "*" : ""}
            </Text>
          )}

          {field.type === "text_input" && (
            <TextInput
              style={styles.textInput}
              placeholder={field.placeholder || t("common.enter_here", "Enter here...")}
              placeholderTextColor={isDarkMode ? "#64748B" : "#9CA3AF"}
              value={customAnswers[field.id] || ""}
              onChangeText={(val) => setCustomAnswer(field.id, val)}
            />
          )}

          {field.type === "textarea" && (
            <TextInput
              style={styles.textArea}
              placeholder={field.placeholder || t("common.enter_here", "Enter here...")}
              placeholderTextColor={isDarkMode ? "#64748B" : "#9CA3AF"}
              value={customAnswers[field.id] || ""}
              onChangeText={(val) => setCustomAnswer(field.id, val)}
              multiline
              numberOfLines={3}
            />
          )}

          {field.type === "number_input" && (
            <TextInput
              style={styles.textInput}
              placeholder={field.placeholder || t("common.enter_here", "Enter here...")}
              placeholderTextColor={isDarkMode ? "#64748B" : "#9CA3AF"}
              keyboardType="numeric"
              value={customAnswers[field.id] || ""}
              onChangeText={(val) => {
                let cleaned = val.replace(/[^0-9.-]/g, "");
                cleaned = cleaned.replace(/(?!^)-/g, "");
                const firstDot = cleaned.indexOf(".");
                if (firstDot !== -1) {
                  cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
                }
                setCustomAnswer(field.id, cleaned);
              }}
            />
          )}

          {field.type === "phone_input" && (
            <TextInput
              style={styles.textInput}
              placeholder={field.placeholder || t("common.enter_phone", "Enter 10-digit phone number")}
              placeholderTextColor={isDarkMode ? "#64748B" : "#9CA3AF"}
              keyboardType="phone-pad"
              maxLength={15}
              value={customAnswers[field.id] || ""}
              onChangeText={(val) => setCustomAnswer(field.id, val)}
            />
          )}

          {(field.type === "dropdown" || field.type === "radio") && (
            <View style={styles.radioList}>
              {(field.options || []).map((opt: any) => {
                const isSelected = customAnswers[field.id] === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={styles.radioOption}
                    onPress={() => setCustomAnswer(field.id, opt.id)}
                  >
                    <View style={[styles.radioOutline, isSelected && styles.radioOutlineActive]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <Text style={styles.optionLabel}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {field.type === "checkbox" && (
            <View style={styles.radioList}>
              {(field.options || []).map((opt: any) => {
                const current = Array.isArray(customAnswers[field.id]) ? customAnswers[field.id] : [];
                const isSelected = current.includes(opt.id);
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={styles.radioOption}
                    onPress={() => {
                      const next = isSelected
                        ? current.filter((x: string) => x !== opt.id)
                        : [...current, opt.id];
                      setCustomAnswer(field.id, next);
                    }}
                  >
                    <View style={[styles.checkboxOutline, isSelected && styles.checkboxOutlineActive]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                    <Text style={styles.optionLabel}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {field.type === "toggle" && (
            <View style={styles.toggleFieldRow}>
              <Text style={styles.optionLabel}>{field.placeholder || field.label}</Text>
              <Switch
                value={!!customAnswers[field.id]}
                onValueChange={(val) => setCustomAnswer(field.id, val)}
                trackColor={{ false: "#E5E7EB", true: colors.primary }}
                thumbColor={customAnswers[field.id] ? "#FFFFFF" : "#F4F3F1"}
              />
            </View>
          )}

          {field.type === "image_upload" && (
            <ImageUploadBox
              title={field.placeholder || t("service_detail.upload_optional_photos", "Upload Photos (Optional)")}
              subtitle={t("service_detail.image_upload_subtitle", "JPG, PNG up to 10MB")}
              onImagesChange={(images) => setCustomAnswer(field.id, images)}
              maxImages={3}
            />
          )}

          {field.type === "file_upload" && (
            <DocumentUploadBox
              title={field.placeholder || t("service_detail.upload_document", "Upload Document (Optional)")}
              subtitle={t("service_detail.document_upload_subtitle", "PDF up to 10MB")}
              onFilesChange={(files) => setCustomAnswer(field.id, files)}
              maxFiles={1}
            />
          )}

          {field.type === "info_banner" && (
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.infoText}>{field.placeholder || field.label}</Text>
            </View>
          )}
        </View>
      ))}

      {/* Date & Time Picker */}
      {showDatePicker && (
        <View style={styles.card}>
          <CustomDateTimePicker
            label={t("booking.schedule_appointment", "Schedule Appointment")}
            value={scheduledDate}
            onDateChange={setScheduledDate}
          />
        </View>
      )}

      {/* Comments input field (mandatory for all services) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {t("service_detail.comments", "Comments / Requirements")} *
        </Text>
        <TextInput
          style={styles.textArea}
          placeholder={t(
            "service_detail.comments_placeholder",
            "Describe your requirements or any instructions here...",
          )}
          placeholderTextColor={isDarkMode ? "#64748B" : "#9CA3AF"}
          value={comments}
          onChangeText={setComments}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Photo Upload Box */}
      {showPhotoUpload && (
        <ImageUploadBox
          title={
            checkoutGroup === "B"
              ? t("service_detail.upload_bill_photos", "Upload Bill Copies") +
                " *"
              : t(
                  "service_detail.upload_optional_photos",
                  "Upload Photos (Optional)",
                )
          }
          subtitle={t(
            "service_detail.image_upload_subtitle",
            "JPG, PNG up to 10MB",
          )}
          onImagesChange={setSelectedImages}
          maxImages={5}
        />
      )}

      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        iconName={alertConfig.iconName as any}
        buttonText={t("common.ok", "OK")}
        onClose={closeAlert}
      />
    </ServiceDetailScreen>
  );
}

const makeStyles = (isDarkMode: boolean, colors: any) =>
  StyleSheet.create({
    card: {
      backgroundColor: isDarkMode ? "#1E293B" : "#FFFFFF",
      borderRadius: 13,
      padding: 18,
      marginBottom: 15,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.3 : 0.06,
      shadowRadius: 4,
      elevation: 1,
    },
    cardTitle: {
      fontFamily: Fonts.semiBold,
      fontSize: 14,
      color: isDarkMode ? "#F8FAFC" : "#2F2F2F",
      marginBottom: 10,
    },
    textArea: {
      fontFamily: Fonts.regular,
      fontSize: 13,
      borderWidth: 1,
      borderColor: isDarkMode ? "#334155" : "#E5E7EB",
      backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF",
      color: isDarkMode ? "#F3F4F6" : "#1F2937",
      borderRadius: 8,
      padding: 10,
      minHeight: 80,
      textAlignVertical: "top",
    },
    toggleRow: {
      flexDirection: "row",
      gap: 10,
    },
    toggleBtn: {
      flex: 1,
      paddingVertical: 12,
      borderWidth: 1.5,
      borderColor: isDarkMode ? "#334155" : "#E5E7EB",
      borderRadius: 8,
      alignItems: "center",
      backgroundColor: isDarkMode ? "#0F172A" : "#F9FAFB",
    },
    toggleBtnActive: {
      borderColor: colors.primary,
      backgroundColor: isDarkMode
        ? "rgba(52, 199, 89, 0.15)"
        : "rgba(2,116,63,0.06)",
    },
    toggleBtnText: {
      fontFamily: Fonts.medium,
      fontSize: 12,
      color: isDarkMode ? "#94A3B8" : "#4B5563",
    },
    toggleBtnTextActive: {
      color: colors.primary,
      fontFamily: Fonts.semiBold,
    },
    textInput: {
      fontFamily: Fonts.regular,
      fontSize: 13,
      borderWidth: 1,
      borderColor: isDarkMode ? "#334155" : "#E5E7EB",
      backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF",
      color: isDarkMode ? "#F3F4F6" : "#1F2937",
      borderRadius: 8,
      padding: 10,
      height: 40,
    },
    radioList: {
      flexDirection: "column",
      gap: 10,
    },
    radioOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    radioOutline: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: isDarkMode ? "#475569" : "#D1D5DB",
      alignItems: "center",
      justifyContent: "center",
    },
    radioOutlineActive: {
      borderColor: colors.primary,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    checkboxOutline: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: isDarkMode ? "#475569" : "#D1D5DB",
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxOutlineActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    optionLabel: {
      fontFamily: Fonts.regular,
      fontSize: 13,
      color: isDarkMode ? "#CBD5E1" : "#4B5563",
    },
    toggleFieldRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    infoBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDarkMode ? "rgba(52, 199, 89, 0.1)" : "rgba(2,116,63,0.06)",
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDarkMode ? "rgba(52, 199, 89, 0.2)" : "rgba(2,116,63,0.15)",
    },
    infoText: {
      fontFamily: Fonts.medium,
      fontSize: 12,
      color: colors.primary,
      flex: 1,
    },
  });
