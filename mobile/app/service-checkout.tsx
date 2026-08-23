// Unified Service Checkout — All Ayuxa Services (Doctor, Nurse, Physio, Medicines, etc.)
// Flow: Address confirmation → Payment method → Razorpay → Success

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useTransition,
} from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Platform,
  NativeModules,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import { CustomAlertModal } from "@/components/common/CustomAlertModal";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import RazorpayCheckout from "react-native-razorpay";
import { Colors, Fonts, FontSize, Spacing, Radius } from "@/constants/theme";
import { useThemeColors, ThemeColors } from "@/hooks/use-theme-colors";
import { useTheme } from "@/context/ThemeContext";
import { paymentService, PaymentMethod } from "@/services/api/paymentService";
import { bookingService } from "@/services/api/bookingService";
import { planService, Plan, BillingCycle } from "@/services/api/planService";
import { meetupService } from "@/services/api/meetupService";
import { storageService, STORAGE_KEYS } from "@/services/device/storageService";
import { useUser } from "@/context/UserContext";
import { useAddress } from "@/context/AddressContext";
import { useTranslation } from "react-i18next";
import SubscriptionUpsellBanner, {
  PlanTypeNeeded,
} from "@/components/checkout/SubscriptionUpsellBanner";
import {
  AddressPickerSection,
  type AddressData,
} from "@/components/AddressPickerSection";
type PaymentFlowState =
  | "idle"
  | "creating_booking"
  | "initiating_order"
  | "checkout_opened"
  | "verifying"
  | "success"
  | "failed"
  | "cancelled";

type MethodOption = {
  type: PaymentMethod;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const PAYMENT_METHODS: MethodOption[] = [
  {
    type: "UPI",
    label: "UPI (GPay / PhonePe / Paytm)",
    icon: "phone-portrait-outline",
  },
  { type: "CARD", label: "Credit / Debit Card", icon: "card-outline" },
  { type: "CASH", label: "Cash on Delivery", icon: "cash-outline" },
];

const mapLabelToCategory = (label: string): string => {
  const lower = label.toLowerCase();
  if (lower.includes("doctor") || lower.includes("consult"))
    return "DOCTOR_HOME_VISIT";
  if (lower.includes("nurse") || lower.includes("care")) return "HOME_NURSE";
  if (lower.includes("physio") || lower.includes("fitness"))
    return "PHYSIO_FITNESS";
  if (lower.includes("medicine") || lower.includes("pharmacy"))
    return "MEDICINES";
  if (
    lower.includes("meal") ||
    lower.includes("food") ||
    lower.includes("tiffin")
  )
    return "TIFFIN";
  if (lower.includes("equipment") || lower.includes("rental"))
    return "EQUIPMENT_RENTAL";
  if (lower.includes("tech") || lower.includes("helper")) return "TECH_HELPER";
  if (
    lower.includes("clean") ||
    lower.includes("grocery") ||
    lower.includes("shopping") ||
    lower.includes("essential")
  )
    return "HOME_ESSENTIALS";
  if (lower.includes("plumb") || lower.includes("electr"))
    return "PLUMBING_ELECTRICAL";
  if (lower.includes("appliance") || lower.includes("repair"))
    return "APPLIANCE_REPAIR";
  if (lower.includes("bill") || lower.includes("payment"))
    return "BILL_PAYMENT";
  if (lower.includes("bank") || lower.includes("paperwork"))
    return "BANK_PAPERWORK";
  if (lower.includes("legal") || lower.includes("paper"))
    return "LEGAL_PAPERWORK";
  if (lower.includes("hospital") || lower.includes("trip"))
    return "HOSPITAL_TRIP";
  if (
    lower.includes("transport") ||
    lower.includes("cab") ||
    lower.includes("driving")
  )
    return "TRANSPORTATION";
  if (lower.includes("meetup") || lower.includes("event"))
    return "LOCAL_MEETUP";
  return "OTHER";
};

export default function ServiceCheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, refreshData } = useUser();
  const { activeAddress, selectActiveAddress } = useAddress();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();
  const styles = makeStyles(colors, isDarkMode);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    bookingPayload?: string;
    subscriptionId?: string;
    amount?: string;
    label?: string;
    email?: string;
    phone?: string;
    userName?: string;
    meetupId?: string;
    meetupParams?: string;
    refreshProfileOnSuccess?: string;
    pickupAddress?: string;
    skipUpsell?: string;
    checkoutGroup?: string;
    paymentMode?: string;
    isDynamic?: string;
    hideLocation?: string;
    serviceSlug?: string;
  }>();

  const [isPaidBookingOverride, setIsPaidBookingOverride] = useState(false);

  const baseAmount = parseFloat(params.amount ?? "0");
  const label = params.label ?? "Service Booking";
  const category = params.serviceSlug
    ? params.serviceSlug.toUpperCase().replace(/-/g, "_")
    : mapLabelToCategory(label);
  const isZeroPayment =
    params.paymentMode !== "PAID" && !isPaidBookingOverride;
  const [calculatedPrices, setCalculatedPrices] = useState<{
    totalAmount: number;
    taxPercentage?: number;
    requiredPlanType?: "CARE" | "HOMEMAKER" | null;
    ayuxaRevenue?: number;
    providerRevenue?: number;
    breakdown: {
      serviceFee?: number;
      vendorFee?: number;
      diagnosticFee?: number;
      bookingFee?: number;
      platformFee?: number;
      taxes?: number;
      ayuxaServiceFee?: number;
      benefitDiscount: number;
      convenienceFee?: number;
      emergencyFee?: number;
      visitFee?: number;
      nightCharge?: number;
      surgeCharge?: number;
    };
    benefitApplied: boolean;
    remainingCountAfterOrder?: number;
  } | null>(null);

  // ─── Determine which plan type covers this service (for upsell banner) ────────
  // CARE plan covers: Lifeline + Companion benefits
  const CARE_CATEGORIES = [
    // Doctor / Consult
    "DOCTOR_HOME_VISIT",
    "DOCTOR_VISIT",
    "TELECONSULT",
    // Nursing
    "HOME_NURSE",
    "NURSE_VISIT",
    "CAREGIVER_VISIT",
    "CAREGIVER",
    // Hospital / Transport
    "HOSPITAL_TRIP",
    "HOSPITAL_ACCOMPANIMENT",
    "TRANSPORTATION",
    "PICKUP_DROP",
    // Diagnostics
    "BLOOD_TEST",
    "SCAN_ECG",
    "DIAGNOSTICS",
    // Physio
    "PHYSIO_FITNESS",
    // Companionship / Spiritual
    "COMPANIONSHIP_CALL",
    "COMPANIONSHIP",
    "SPIRITUAL_ESCORT",
    // Medicines
    "MEDICINE_DELIVERY",
    // Events
    "LOCAL_MEETUP",
    "MEETUP",
    // Support / SOS
    "PHONE_SUPPORT",
    "SOS",
    // Plan meta
    "BASE_PLAN",
    "CARE_MANAGER",
    "FAMILY_PORTAL",
  ];
  // HOME plan covers: Home Essentials benefits
  const HOME_CATEGORIES = [
    // Electrical / Plumbing / Repairs
    "PLUMBING_ELECTRICAL",
    "APPLIANCE_REPAIR",
    "AC_APPLIANCE_REPAIR",
    "HANDYMEN",
    // Cleaning
    "DEEP_CLEANING",
    "SANITATION",
    // Bills / Paperwork
    "BILL_PAYMENT",
    "BANK_PAPERWORK",
    "LEGAL_PAPERWORK",
    "PAPERWORK_LEGAL",
    "PAPERWORK_ASSIST",
    // Tech
    "TECH_HELPER",
    "TECH_SUPPORT",
    // Grocery / Essentials
    "HOME_ESSENTIALS",
    "GROCERY_RUN",
    "GROCERY_DELIVERY",
    "GROCERY_ASSIST",
    // Audit / Custom
    "HOME_AUDIT",
    "CUSTOM_REQUEST",
    "ZERO_SERVICE_FEE",
  ];
  const upsellPlanType: PlanTypeNeeded | null =
    (calculatedPrices?.requiredPlanType as any) ||
    (CARE_CATEGORIES.includes(category)
      ? "CARE"
      : HOME_CATEGORIES.includes(category)
        ? "HOMEMAKER"
        : null);

  // User has an active sub covering this specific category?
  const hasActivePlanForCategoryRaw =
    profile?.subscriptions?.some(
      (s: any) =>
        s.status === "ACTIVE" &&
        ((upsellPlanType === "CARE" &&
          (s.plan?.planType === "CARE" ||
            s.planType === "CARE" ||
            s.category === "CARE")) ||
          (upsellPlanType === "HOMEMAKER" &&
            (s.plan?.planType === "HOMEMAKER" ||
              s.planType === "HOMEMAKER" ||
              s.category === "HOMEMAKER"))),
    ) ?? false;

  const hasActivePlanForCategory =
    hasActivePlanForCategoryRaw && !isPaidBookingOverride;

  const showUpsellBanner =
    !!upsellPlanType &&
    !hasActivePlanForCategory &&
    !params.subscriptionId &&
    !!params.bookingPayload;

  React.useEffect(() => {
    console.log("💳 [SERVICE CHECKOUT] Screen loaded");
    console.log("💳 [SERVICE CHECKOUT] Label:", params.label);
    console.log("💳 [SERVICE CHECKOUT] Amount:", params.amount);
    console.log("💳 [SERVICE CHECKOUT] MeetupId:", params.meetupId);
    console.log("💳 [SERVICE CHECKOUT] Profile:", !!profile);
  }, [params.label, params.amount, params.meetupId, profile]);

  // Parse meetup details if this is a meetup booking
  const meetupParamsObj = params.meetupParams
    ? (() => {
        try {
          const obj = JSON.parse(params.meetupParams);
          if (typeof obj.includedItems === "string")
            obj.includedItems = JSON.parse(obj.includedItems);
          if (typeof obj.extraCharges === "string")
            obj.extraCharges = JSON.parse(obj.extraCharges);
          return obj;
        } catch {
          return null;
        }
      })()
    : null;

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("UPI");
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [, setFlowState] = useState<PaymentFlowState>("idle");
  const [, setPendingRecovery] = useState(false);
  const [quotaExceededVisible, setQuotaExceededVisible] = useState(false);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    iconName?: string;
    buttonText?: string;
    onClose?: () => void;
    secondaryButtonText?: string;
    onSecondaryPress?: () => void;
    secondaryDestructive?: boolean;
  }>({
    visible: false,
    title: "",
    message: "",
  });

  const triggerAlert = (
    title: string,
    message: string,
    iconName = "warning-outline",
    buttonText = "OK",
    onClose?: () => void,
    secondaryButtonText?: string,
    onSecondaryPress?: () => void,
    secondaryDestructive = false
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      iconName,
      buttonText,
      onClose,
      secondaryButtonText,
      onSecondaryPress,
      secondaryDestructive,
    });
  };

  const [eligiblePlans, setEligiblePlans] = useState<Plan[]>([]);
  const [loadingEligiblePlans, setLoadingEligiblePlans] = useState(false);
  const [isUpgraded, setIsUpgraded] = useState(false);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [selectedDuration, setSelectedDuration] =
    useState<BillingCycle>("QUARTERLY");

  const selectedUpgradePlan = eligiblePlans[selectedPlanIndex] || null;
  const [savingsInfo, setSavingsInfo] = useState<{
    bookingFeeWaived: number;
    platformFeeWaived: number;
    gstWaived: number;
    totalSavings: number;
    finalPayable: number;
    bookingTotalWithoutUpgrade: number;
    bookingTotalWithUpgrade: number;
    planPrice: number;
  } | null>(null);
  const [savingsLoading, setSavingsLoading] = useState(false);

  // ─── Address Selection ──────────────────────────────────────────────
  // selectedAddress seeds from — and stays in sync with — the centralized
  // AddressContext.activeAddress (authoritative). A stray bookingPayload
  // address is only used as a one-time hydrate fallback when no active
  // address exists yet — it must never compete with/override a real
  // activeAddress once one is set (see Phase 6 checkout rule).
  const [selectedAddress, setSelectedAddress] = useState<any>(
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
  const [landmark, setLandmark] = useState(activeAddress?.landmark || "");

  useEffect(() => {
    if (!activeAddress) return;
    setSelectedAddress((prev: any) => {
      if (prev && prev.id === activeAddress.id && prev.line1 === activeAddress.line1) return prev;
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
    if (activeAddress.landmark) setLandmark(activeAddress.landmark);
  }, [activeAddress]);

  // Hydrate-only fallback: an unmigrated upstream screen may still pass the
  // address solely via bookingPayload. Only applies while no activeAddress
  // exists yet — never overrides a real activeAddress.
  useEffect(() => {
    if (activeAddress || selectedAddress) return;
    if (params.bookingPayload) {
      try {
        const parsed = JSON.parse(params.bookingPayload);
        if (parsed.addressLine) {
          setSelectedAddress({
            line1: parsed.addressLine,
            cityName: parsed.cityName || "",
            pincode: parsed.pincode || "",
            latitude: parsed.latitude || 28.7041,
            longitude: parsed.longitude || 77.1025,
            landmark: parsed.landmark || "",
          });
          if (parsed.landmark) {
            setLandmark(parsed.landmark);
          }
        }
      } catch (e) {
        console.warn("Failed to parse bookingPayload address:", e);
      }
    }
  }, [params.bookingPayload, activeAddress, selectedAddress]);

  // ─── Benefit calculation state ──────────────────────────────────────
  const [calcLoading, setCalcLoading] = useState(false);

  // ─── Calculate checkout with benefits ──────────────────────────────
  useEffect(() => {
    if (params.bookingPayload) {
      const fetchCalculation = async () => {
        setCalcLoading(true);
        try {
          const category = params.serviceSlug
            ? params.serviceSlug.toUpperCase().replace(/-/g, "_")
            : mapLabelToCategory(label);
          const res = await paymentService.calculateCheckout({
            serviceCategory: category,
            vendorFee: baseAmount,
            baseAyuxaFee: 0,
            diagnosticFee: 0,
            isPaidBooking: isPaidBookingOverride,
          });
          if (res.success && res.data) {
            setCalculatedPrices(res.data);
          }
        } catch (e) {
          console.warn("Failed to calculate checkout with benefits:", e);
        } finally {
          setCalcLoading(false);
        }
      };
      fetchCalculation();
    }
  }, [
    params.bookingPayload,
    label,
    params.isDynamic,
    params.serviceSlug,
    isPaidBookingOverride,
  ]);

  useEffect(() => {
    const fetchEligiblePlans = async () => {
      if (hasActivePlanForCategory) return;

      const neededType = CARE_CATEGORIES.includes(category)
        ? "CARE"
        : HOME_CATEGORIES.includes(category)
          ? "HOMEMAKER"
          : null;

      if (!neededType) return;

      try {
        setLoadingEligiblePlans(true);
        const res = await planService.getPlansByType(neededType);
        if (res.success && res.data) {
          setEligiblePlans(res.data);
          setSelectedPlanIndex(0);
        }
      } catch (e) {
        console.warn("Failed to fetch eligible plans:", e);
      } finally {
        setLoadingEligiblePlans(false);
      }
    };
    fetchEligiblePlans();
  }, [category, hasActivePlanForCategory]);

  useEffect(() => {
    const recalculateSavings = async () => {
      if (!isUpgraded || !selectedUpgradePlan) {
        setSavingsInfo(null);
        return;
      }

      try {
        setSavingsLoading(true);
        const res = await paymentService.calculateMembershipSavings({
          serviceCategory: category,
          vendorFee: baseAmount,
          diagnosticFee: 0,
          planId: selectedUpgradePlan.id,
          billingCycle: selectedDuration,
        });
        if (res.success && res.data) {
          setSavingsInfo(res.data);
        }
      } catch (e) {
        console.warn("Failed to calculate membership savings:", e);
      } finally {
        setSavingsLoading(false);
      }
    };
    recalculateSavings();
  }, [isUpgraded, selectedDuration, baseAmount, selectedUpgradePlan, category]);

  const benefitApplied =
    hasActivePlanForCategory ||
    !!calculatedPrices?.benefitApplied ||
    isUpgraded;

  const baseBookingFee = calculatedPrices
    ? ((calculatedPrices.breakdown as any).originalBookingFee !== undefined
        ? (calculatedPrices.breakdown as any).originalBookingFee
        : calculatedPrices.breakdown.bookingFee)
    : 299;
  const basePlatformFee = calculatedPrices
    ? ((calculatedPrices.breakdown as any).originalPlatformFee !== undefined
        ? (calculatedPrices.breakdown as any).originalPlatformFee
        : calculatedPrices.breakdown.platformFee)
    : 50;

  const bookingFee =
    hasActivePlanForCategory || isUpgraded ? 0 : baseBookingFee;
  const platformFee =
    hasActivePlanForCategory || isUpgraded ? 0 : basePlatformFee;

  const convenienceFee = calculatedPrices
    ? calculatedPrices.breakdown.convenienceFee || 0
    : 0;
  const emergencyFee = calculatedPrices
    ? calculatedPrices.breakdown.emergencyFee || 0
    : 0;
  const visitFee = calculatedPrices
    ? calculatedPrices.breakdown.visitFee || 0
    : 0;
  const nightCharge = calculatedPrices
    ? calculatedPrices.breakdown.nightCharge || 0
    : 0;
  const surgeCharge = calculatedPrices
    ? calculatedPrices.breakdown.surgeCharge || 0
    : 0;

  const extraFeesSum =
    bookingFee +
    platformFee +
    convenienceFee +
    emergencyFee +
    visitFee +
    nightCharge +
    surgeCharge;
  const displayVendorFee = calculatedPrices?.breakdown.vendorFee ?? baseAmount;

  const isHomeEssential = HOME_CATEGORIES.includes(category);
  const isGroupA = [
    "PLUMBING_ELECTRICAL",
    "APPLIANCE_REPAIR",
    "AC_APPLIANCE_REPAIR",
    "GROCERY_DELIVERY",
    "GROCERY_RUN",
  ].includes(category);
  const fallbackTaxPercentage = isHomeEssential ? 18 : 6;
  const taxRate = calculatedPrices
    ? (calculatedPrices.taxPercentage ?? fallbackTaxPercentage)
    : fallbackTaxPercentage;

  const taxes = isZeroPayment
    ? 0
    : isUpgraded && savingsInfo
      ? Math.max(
          0,
          (calculatedPrices?.breakdown.taxes ??
            Math.round(
                (isHomeEssential ? baseAmount + extraFeesSum : extraFeesSum) *
                  (taxRate / 100),
              )) - savingsInfo.gstWaived,
        )
      : calculatedPrices?.breakdown.taxes ??
        Math.round(
            (isHomeEssential ? baseAmount + extraFeesSum : extraFeesSum) *
              (taxRate / 100),
          );

  const originalBookingFee = isZeroPayment ? 0 : baseBookingFee;
  const originalPlatformFee = isZeroPayment ? 0 : basePlatformFee;

  const originalExtraFeesSum =
    originalBookingFee +
    originalPlatformFee +
    convenienceFee +
    emergencyFee +
    visitFee +
    nightCharge +
    surgeCharge;
  const originalTaxes = isZeroPayment
    ? 0
    : calculatedPrices && !benefitApplied
      ? calculatedPrices.breakdown.taxes ?? 0
      : Math.round(
          (isHomeEssential
            ? baseAmount + originalExtraFeesSum
            : originalExtraFeesSum) *
            (taxRate / 100),
        );
  const taxSavings = Math.max(0, (originalTaxes ?? 0) - (taxes ?? 0));

  // Full standard-rate total (service fee + unwaived booking/platform fee +
  // unwaived tax) — used when the user chooses to pay full price after
  // exhausting their plan limit. `finalAmount` state is fed by an async
  // effect keyed on isPaidBookingOverride/calculatedPrices, so it is still
  // the stale (subscription-waived) figure at the exact moment the "Book at
  // Standard Rate" button's onPress handler runs handlePay synchronously.
  // This is derived from values already computed in the current render, so
  // it carries no such lag.
  const standardRateAmount = Math.round(
    baseAmount + originalExtraFeesSum + originalTaxes,
  );

  const totalFeeSavings =
    isUpgraded && savingsInfo
      ? savingsInfo.totalSavings
      : originalBookingFee -
        bookingFee +
        (originalPlatformFee - platformFee) +
        taxSavings;

  const amountWithTaxAndFee = isZeroPayment
    ? 0
    : isUpgraded && savingsInfo
      ? savingsInfo.bookingTotalWithUpgrade
      : calculatedPrices
        ? calculatedPrices.totalAmount
        : baseAmount + extraFeesSum + taxes;
  const [finalAmount, setFinalAmount] = useState(
    Math.round(amountWithTaxAndFee),
  );

  useEffect(() => {
    if (isZeroPayment) {
      setFinalAmount(0);
    } else if (isUpgraded && savingsInfo) {
      setFinalAmount(Math.round(savingsInfo.finalPayable - discount));
    } else {
      setFinalAmount(Math.round(amountWithTaxAndFee - discount));
    }
  }, [amountWithTaxAndFee, discount, isZeroPayment, isUpgraded, savingsInfo]);

  // ─── Pending order recovery ─────────────────────────────────────────
  const sessionBookingId = useRef<string | null>(null);
  const pendingOrderId = useRef<string | null>(null);

  useEffect(() => {
    const checkPendingOrder = async () => {
      try {
        const pendingOrderIdStr = await storageService.getItem(
          STORAGE_KEYS.PENDING_ORDER_ID,
        );
        const pendingBookingId = await storageService.getItem(
          STORAGE_KEYS.PENDING_BOOKING_ID,
        );
        if (pendingOrderIdStr && pendingBookingId) {
          setPendingRecovery(true);
          sessionBookingId.current = pendingBookingId;
          triggerAlert(
            "Pending Payment Found",
            "You have a payment that was interrupted. Would you like to check its status?",
            "wallet-outline",
            "Check Status",
            async () => {
              setAlertConfig(prev => ({ ...prev, visible: false }));
              await storageService.removeItem(
                STORAGE_KEYS.PENDING_ORDER_ID,
              );
              await storageService.removeItem(
                STORAGE_KEYS.PENDING_BOOKING_ID,
              );
              router.replace({
                pathname: "/service-confirmation",
                params: { bookingId: pendingBookingId },
              });
            },
            "Dismiss",
            async () => {
              setAlertConfig(prev => ({ ...prev, visible: false }));
              await storageService.removeItem(
                STORAGE_KEYS.PENDING_ORDER_ID,
              );
              await storageService.removeItem(
                STORAGE_KEYS.PENDING_BOOKING_ID,
              );
              setPendingRecovery(false);
            }
          );
        }
      } catch (e) {
        console.warn("Pending order check failed:", e);
      }
    };
    checkPendingOrder();
  }, [router]);

  // ─── Apply coupon ───────────────────────────────────────────────────
  const handleApplyCoupon = useCallback(async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await paymentService.applyCoupon({
        couponCode: couponCode.trim(),
        amount: amountWithTaxAndFee,
      });
      if (res.success && res.data?.valid) {
        setDiscount(res.data.discount);
        setFinalAmount(amountWithTaxAndFee - res.data.discount);
        setCouponApplied(true);
        triggerAlert(
          "Coupon Applied!",
          `You saved ₹${res.data.discount.toLocaleString("en-IN")}`,
          "checkmark-circle-outline"
        );
      } else {
        triggerAlert(
          "Invalid Coupon",
          "This coupon code is not valid or has expired.",
          "warning-outline"
        );
      }
    } catch {
      triggerAlert("Error", "Could not apply coupon. Please try again.", "warning-outline");
    } finally {
      setCouponLoading(false);
    }
  }, [couponCode, amountWithTaxAndFee]);

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCouponApplied(false);
    setDiscount(0);
    setFinalAmount(amountWithTaxAndFee);
  };

  const clearPendingOrder = async () => {
    await storageService.removeItem(STORAGE_KEYS.PENDING_ORDER_ID);
    await storageService.removeItem(STORAGE_KEYS.PENDING_BOOKING_ID);
  };

  const cancelPaymentOnBackend = async () => {
    if (pendingOrderId.current) {
      try {
        await paymentService.cancelPayment(pendingOrderId.current);
      } catch (e) {
        console.warn("cancelPayment call failed (non-blocking):", e);
      }
    }
  };

  // ─── Open Razorpay native popup ─────────────────────────────────────
  const handlePay = useCallback(
    async (isPaidBookingForce?: boolean) => {
      // Re-entrancy guard: a fast double-tap could otherwise fire this twice
      // before the `disabled={payLoading}` prop re-renders, double-submitting
      // the booking and stacking two Alert.alert calls (the second silently
      // replaces the first, making errors look like they never showed).
      if (payLoading) return;

      let payloadAddressLine = "";
      if (params.bookingPayload) {
        try {
          const parsed = JSON.parse(params.bookingPayload);
          payloadAddressLine = parsed.addressLine || "";
        } catch {}
      }

      if (!params.meetupId && !selectedAddress && !payloadAddressLine) {
        triggerAlert(
          t("service_checkout.address_required_title"),
          t("service_checkout.address_required_msg"),
          "location-outline"
        );
        return;
      }

      // When the user explicitly chose "pay full price" after exhausting
      // their plan limit, charge the standard-rate total computed fresh in
      // this render rather than `finalAmount` state, which is still the
      // subscription-waived figure until the next async re-render/refetch.
      const isForcedPaid = isPaidBookingForce || isPaidBookingOverride;
      const chargeAmount = isForcedPaid ? standardRateAmount : finalAmount;

      setPayLoading(true);
      try {
        setFlowState("creating_booking");
        if (
          !params.meetupId &&
          !sessionBookingId.current &&
          params.bookingPayload
        ) {
          const payload = JSON.parse(params.bookingPayload as string);

          // Construct full address line for administrative visibility
          const addressParts = [];
          if (selectedAddress) {
            if (selectedAddress.line1) addressParts.push(selectedAddress.line1);
            if (selectedAddress.line2) addressParts.push(selectedAddress.line2);
            if (selectedAddress.cityName)
              addressParts.push(selectedAddress.cityName);
            if (selectedAddress.state) addressParts.push(selectedAddress.state);
            if (selectedAddress.pincode)
              addressParts.push(selectedAddress.pincode);
            if (selectedAddress.landmark)
              addressParts.push(`Landmark: ${selectedAddress.landmark}`);
          }
          const fullAddressLine =
            addressParts.length > 0
              ? addressParts.join(", ")
              : payload.addressLine;

          const lat =
            selectedAddress?.latitude !== undefined &&
            selectedAddress?.latitude !== null
              ? Number(selectedAddress.latitude)
              : payload.latitude;
          const lng =
            selectedAddress?.longitude !== undefined &&
            selectedAddress?.longitude !== null
              ? Number(selectedAddress.longitude)
              : payload.longitude;

          // For INQUIRY services, still send the real reference price (not a
          // hardcoded 0) — the backend decides the actual charge from its own
          // price floor + subscription quota check, and returns LIMIT_EXCEEDED
          // if the user isn't covered, rather than trusting a client-zeroed amount.
          const bookingRes = await bookingService.createBooking({
            ...payload,
            amount: isZeroPayment
              ? displayVendorFee
              : isUpgraded && savingsInfo
                ? savingsInfo.bookingTotalWithUpgrade
                : chargeAmount,
            paymentMethod: isZeroPayment ? "REQUEST" : selectedMethod,
            addressLine: fullAddressLine,
            latitude: lat,
            longitude: lng,
            isPaidBooking: isForcedPaid,
            formDataJson: {
              ...(payload.formDataJson || {}),
              ...(isUpgraded
                ? {
                    isMembershipUpgrade: true,
                    upgradePlanId: selectedUpgradePlan?.id,
                    upgradeBillingCycle: selectedDuration,
                  }
                : {}),
            },
          });
          if (!bookingRes.success || !bookingRes.data) {
            setFlowState("failed");
            triggerAlert(
              "Booking Error",
              bookingRes.message ??
                "Could not create booking. Please try again.",
              "warning-outline"
            );
            return;
          }
          sessionBookingId.current = bookingRes.data.id;
        }

        if (isZeroPayment) {
          setFlowState("success");
          triggerAlert(
            "Request Submitted",
            category === "MEDICINES"
              ? "Your medicine order has been successfully placed."
              : category === "TIFFIN"
                ? "Your meal service request has been successfully submitted."
                : "Your physio booking request has been successfully submitted.",
            "checkmark-circle-outline",
            "OK",
            () => {
              setAlertConfig(prev => ({ ...prev, visible: false }));
              router.replace({
                pathname: "/service-confirmation",
                params: { bookingId: sessionBookingId.current! },
              });
            }
          );
          return;
        }

        if (selectedMethod === "CASH") {
          setFlowState("success");
          triggerAlert(
            "Booking Received",
            "Your service has been scheduled. Please pay ₹" +
              chargeAmount +
              " in cash to our provider when they arrive.",
            "checkmark-circle-outline",
            "OK",
            () => {
              setAlertConfig(prev => ({ ...prev, visible: false }));
              router.replace({
                pathname: "/service-confirmation",
                params: { bookingId: sessionBookingId.current! },
              });
            }
          );
          return;
        }

        setFlowState("initiating_order");
        const initiateRes = await paymentService.initiatePayment({
          ...(params.meetupId && { meetupId: params.meetupId }),
          ...(sessionBookingId.current &&
            !params.meetupId && { bookingId: sessionBookingId.current }),
          subscriptionId: params.subscriptionId,
          amount: chargeAmount,
          paymentMethod: selectedMethod,
          couponCode: couponApplied ? couponCode : undefined,
          ...(isUpgraded &&
            selectedUpgradePlan && {
              upgradePlanId: selectedUpgradePlan.id,
              upgradeBillingCycle: selectedDuration,
            }),
        });

        if (!initiateRes.success || !initiateRes.data) {
          setFlowState("failed");
          triggerAlert(
            "Payment Error",
            initiateRes.message ?? "Could not initiate payment.",
            "warning-outline"
          );
          return;
        }

        const {
          orderId,
          amount: orderAmount,
          key: backendKey,
          paymentNotRequired,
        } = initiateRes.data as any;
        pendingOrderId.current = orderId;

        if (paymentNotRequired) {
          setFlowState("success");
          router.replace({
            pathname: "/payment/payment-success",
            params: {
              bookingId: sessionBookingId.current ?? "",
              amount: "0",
              invoiceNumber: "FREE-BOOKING",
              isSubscription: params.subscriptionId ? "1" : "0",
              bookingPayload: params.bookingPayload || "",
            },
          });
          return;
        }

        if (!NativeModules.RNRazorpayCheckout) {
          triggerAlert(
            "Build Required",
            "Razorpay involves native code and cannot run in standard Expo Go.\nRun `npx expo run:android` to build a Custom Dev Client.",
            "code-working-outline"
          );
          return;
        }

        await storageService.setItem(STORAGE_KEYS.PENDING_ORDER_ID, orderId);
        if (sessionBookingId.current) {
          await storageService.setItem(
            STORAGE_KEYS.PENDING_BOOKING_ID,
            sessionBookingId.current,
          );
        }

        setFlowState("checkout_opened");
        const options: any = {
          description: label,
          image:
            "https://storage.googleapis.com/ayuxacare-assets/mobile/assets/images/onlylogo.png",
          currency: "INR",
          key: backendKey || process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || "",
          amount: String(Math.round(orderAmount * 100)),
          name: "Ayuxa Healthcare",
          order_id: orderId,
          prefill: {
            name: params.userName || "",
            contact: params.phone || "",
            email: params.email || "",
            method: selectedMethod.toLowerCase(),
          },
          theme: { color: colors.primary },
          config: {
            display: {
              blocks: {
                banks: {
                  name: selectedMethod === "UPI" ? "UPI" : "Card",
                  instruments: [
                    {
                      method: selectedMethod.toLowerCase() as any,
                    },
                  ],
                },
              },
              sequence: ["block.banks"],
              preferences: {
                show_default_blocks: false,
              },
            },
          },
        };

        const data = await RazorpayCheckout.open(options);

        setFlowState("verifying");
        const verifyRes = await paymentService.verifyPayment({
          razorpayPaymentId: data.razorpay_payment_id,
          razorpayOrderId: data.razorpay_order_id,
          razorpaySignature: data.razorpay_signature,
        });

        await clearPendingOrder();

        if (verifyRes.success) {
          setFlowState("success");

          if (params.refreshProfileOnSuccess === "1") {
            try {
              await refreshData();
            } catch {
              /* non-blocking */
            }
          }

          if (params.meetupId && params.bookingPayload) {
            try {
              const payload = JSON.parse(params.bookingPayload as string);
              console.log(
                "Registering for meetup:",
                params.meetupId,
                "with payload:",
                payload,
              );
              const regRes = await meetupService.registerForMeetup(
                params.meetupId,
                {
                  fullName: payload.fullName,
                  mobile: payload.mobile,
                  age: payload.age,
                  gender: payload.gender,
                  assistanceJson: payload.assistanceJson,
                  specialNotes: payload.specialNotes,
                  pickupEnabled: payload.pickupEnabled,
                  pickupAddress: payload.pickupAddress,
                  pickupLandmark: payload.pickupLandmark,
                  pickupContact: payload.pickupContact,
                  preferredPickupTime: payload.preferredPickupTime,
                },
              );

              console.log("Meetup registration response:", regRes);
              if (regRes.success && regRes.data) {
                const meetupParams = params.meetupParams
                  ? JSON.parse(params.meetupParams as string)
                  : {};
                const bookingPayloadObj = params.bookingPayload
                  ? JSON.parse(params.bookingPayload as string)
                  : {};
                router.replace({
                  pathname: "/service-confirmation",
                  params: {
                    bookingCode: regRes.data.bookingCode,
                    meetupEventDate: meetupParams.meetupEventDate || "",
                    meetupStartTime: meetupParams.meetupStartTime || "",
                    meetupEndTime: meetupParams.meetupEndTime || "",
                    meetupVenue: meetupParams.meetupVenue || "",
                    meetupPinCode: meetupParams.meetupPinCode || "",
                    pickupEnabled: bookingPayloadObj.pickupEnabled
                      ? "true"
                      : "false",
                    pickupAddress: bookingPayloadObj.pickupAddress || "",
                    preferredTime: bookingPayloadObj.preferredPickupTime || "",
                  },
                });
                return;
              } else {
                triggerAlert(
                  "Registration Failed",
                  regRes.message ||
                    "Could not register for meetup. Please try again.",
                  "warning-outline"
                );
              }
            } catch (e: any) {
              console.error("Meetup registration error:", e);
              triggerAlert(
                "Error",
                e?.message || "Failed to register for meetup",
                "warning-outline"
              );
            }
          }

          router.replace({
            pathname: "/payment/payment-success",
            params: {
              bookingId: sessionBookingId.current ?? "",
              amount: String(chargeAmount),
              invoiceNumber: verifyRes.data?.invoice?.invoiceNumber ?? "",
              invoicePdfUrl: verifyRes.data?.invoice?.pdfUrl ?? "",
              isSubscription: params.subscriptionId ? "1" : "0",
              bookingPayload: params.bookingPayload || "",
            },
          });
        } else {
          setFlowState("failed");
          triggerAlert(
            "Verification Failed",
            "Payment was received but could not be verified. Our team will resolve this within 24 hours. Please do NOT retry the payment.",
            "warning-outline"
          );
        }
      } catch (error: any) {
        await clearPendingOrder();

        if (error?.details?.code === "LIMIT_EXCEEDED") {
          setFlowState("failed");
          setQuotaExceededVisible(true);
          return;
        }

        if (error?.code === 0) {
          setFlowState("cancelled");
          await cancelPaymentOnBackend();
          await clearPendingOrder();
          triggerAlert(
            "Payment Cancelled",
            "You can try again whenever you are ready. Your booking details have been saved.",
            "warning-outline"
          );
          return;
        }

        setFlowState("failed");
        await cancelPaymentOnBackend();
        await clearPendingOrder();
        const msg =
          error?.description ?? error?.message ?? "Something went wrong.";
        triggerAlert(
          "Payment Failed",
          msg,
          "warning-outline",
          "Retry Payment",
          () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            setFlowState("idle");
          },
          "Go Back",
          () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            router.back();
          }
        );
      } finally {
        setPayLoading(false);
      }
    },
    [
      payLoading,
      finalAmount,
      standardRateAmount,
      selectedMethod,
      couponApplied,
      couponCode,
      params,
      label,
      router,
      refreshData,
      selectedAddress,
      colors.primary,
      colors.textWhite,
      isUpgraded,
      eligiblePlans,
      selectedPlanIndex,
      selectedUpgradePlan,
      selectedDuration,
      savingsInfo,
      isZeroPayment,
      category,
      t,
      isPaidBookingOverride,
    ],
  );

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.primary }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <StatusBar style="light" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t("service_checkout.header_title")}
          </Text>
        </View>

        <View style={styles.mainContainer}>
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Meetup Service & Pickup Details */}
            {params.meetupId && meetupParamsObj && (
              <View style={[styles.card, styles.meetupCard]}>
                {/* Included in Service Charge */}
                {meetupParamsObj.includedItems &&
                  meetupParamsObj.includedItems.length > 0 && (
                    <>
                      <Text style={styles.subHeading}>
                        {t("service_checkout.included_in_charge")}
                      </Text>
                      {meetupParamsObj.includedItems.map(
                        (item: string, i: number) => (
                          <View key={i} style={styles.includeRow}>
                            <Ionicons
                              name="checkmark-circle"
                              size={15}
                              color={colors.primary}
                            />
                            <Text style={styles.includeText}>{item}</Text>
                          </View>
                        ),
                      )}
                      <View style={styles.divider} />
                    </>
                  )}

                {/* Additional Charges (Extra) */}
                {meetupParamsObj.extraCharges &&
                  meetupParamsObj.extraCharges.length > 0 && (
                    <>
                      <Text style={styles.extraHeading}>
                        Additional Charges (Extra)
                      </Text>
                      {meetupParamsObj.extraCharges.map(
                        (item: string, i: number) => (
                          <View key={i} style={styles.extraRow}>
                            <Ionicons
                              name="close-circle"
                              size={15}
                              color="#EF4444"
                            />
                            <Text style={styles.extraText}>{item}</Text>
                          </View>
                        ),
                      )}
                      <View style={styles.divider} />
                    </>
                  )}

                {/* Pickup Details */}
                {params.pickupAddress && (
                  <>
                    <Text style={styles.subHeading}>
                      {t("service_checkout.pickup_details")}
                    </Text>
                    <View style={styles.pickupDetailRow}>
                      <Text style={styles.pickupLabel}>
                        {t("service_checkout.service_address")}:
                      </Text>
                      <Text style={styles.pickupValue}>
                        {params.pickupAddress}
                      </Text>
                    </View>
                    {meetupParamsObj.pickupLandmark && (
                      <View style={styles.pickupDetailRow}>
                        <Text style={styles.pickupLabel}>
                          {t("meetup.landmark_label")}:
                        </Text>
                        <Text style={styles.pickupValue}>
                          {meetupParamsObj.pickupLandmark}
                        </Text>
                      </View>
                    )}
                    {meetupParamsObj.preferredTime && (
                      <View style={styles.pickupDetailRow}>
                        <Text style={styles.pickupLabel}>
                          {t("service_checkout.pickup_time_label")}:
                        </Text>
                        <Text style={styles.pickupValue}>
                          {meetupParamsObj.preferredTime}
                        </Text>
                      </View>
                    )}
                    {meetupParamsObj.alternateContact && (
                      <View style={styles.pickupDetailRow}>
                        <Text style={styles.pickupLabel}>
                          {t("service_checkout.organizer_label")}:
                        </Text>
                        <Text style={styles.pickupValue}>
                          {meetupParamsObj.alternateContact}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Order Summary */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {isZeroPayment
                  ? t("service_checkout.booking_request_title")
                  : t("service_checkout.service_summary")}
              </Text>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowValue}>
                  ₹{displayVendorFee.toLocaleString("en-IN")}
                </Text>
              </View>

              {isZeroPayment ? (
                <Text style={styles.inquiryNote}>
                  {t("service_checkout.inquiry_note")}
                </Text>
              ) : (
              /* Breakdown Section */
              <View style={styles.breakdownSection}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>
                    {t("service_checkout.service_fee")}
                  </Text>
                  {displayVendorFee <= 0 ? (
                    <Text
                      style={[
                        styles.breakdownValue,
                        {
                          color: isDarkMode ? colors.primary : "#2e7d32",
                          fontFamily: Fonts.semiBold,
                        },
                      ]}
                    >
                      {t("service_checkout.free")}
                    </Text>
                  ) : (
                    <Text style={styles.breakdownValue}>
                      ₹{displayVendorFee.toLocaleString("en-IN")}
                    </Text>
                  )}
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>
                    {t("service_checkout.booking_fee")}
                  </Text>
                  {benefitApplied ? (
                    originalBookingFee > 0 ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Text
                          style={[
                            styles.breakdownValue,
                            {
                              textDecorationLine: "line-through",
                              color: colors.textMuted,
                            },
                          ]}
                        >
                          ₹{originalBookingFee}
                        </Text>
                        <Text
                          style={[
                            styles.breakdownValue,
                            {
                              color: isDarkMode ? colors.primary : "#2e7d32",
                              fontFamily: Fonts.semiBold,
                            },
                          ]}
                        >
                          {" "}
                          {t("service_checkout.free")}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.breakdownValue,
                          {
                            color: isDarkMode ? colors.primary : "#2e7d32",
                            fontFamily: Fonts.semiBold,
                          },
                        ]}
                      >
                        {t("service_checkout.free")}
                      </Text>
                    )
                  ) : (
                    <Text style={styles.breakdownValue}>₹{bookingFee}</Text>
                  )}
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>
                    {t("service_checkout.platform_fee")}
                  </Text>
                  {benefitApplied ? (
                    originalPlatformFee > 0 ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Text
                          style={[
                            styles.breakdownValue,
                            {
                              textDecorationLine: "line-through",
                              color: colors.textMuted,
                            },
                          ]}
                        >
                          ₹{originalPlatformFee}
                        </Text>
                        <Text
                          style={[
                            styles.breakdownValue,
                            {
                              color: isDarkMode ? colors.primary : "#2e7d32",
                              fontFamily: Fonts.semiBold,
                            },
                          ]}
                        >
                          {" "}
                          {t("service_checkout.free")}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.breakdownValue,
                          {
                            color: isDarkMode ? colors.primary : "#2e7d32",
                            fontFamily: Fonts.semiBold,
                          },
                        ]}
                      >
                        {t("service_checkout.free")}
                      </Text>
                    )
                  ) : (
                    <Text style={styles.breakdownValue}>₹{platformFee}</Text>
                  )}
                </View>
                {convenienceFee > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      {t("checkout.convenience_fee") || "Convenience Fee"}
                    </Text>
                    <Text style={styles.breakdownValue}>₹{convenienceFee}</Text>
                  </View>
                )}
                {emergencyFee > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      {t("checkout.emergency_fee") || "Emergency Premium"}
                    </Text>
                    <Text style={styles.breakdownValue}>₹{emergencyFee}</Text>
                  </View>
                )}
                {visitFee > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      {t("checkout.visit_fee") || "Visit Charge"}
                    </Text>
                    <Text style={styles.breakdownValue}>₹{visitFee}</Text>
                  </View>
                )}
                {nightCharge > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      {t("checkout.night_charge") || "Night Premium"}
                    </Text>
                    <Text style={styles.breakdownValue}>₹{nightCharge}</Text>
                  </View>
                )}
                {surgeCharge > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      {t("checkout.surge_charge") || "Surge Charge"}
                    </Text>
                    <Text style={styles.breakdownValue}>₹{surgeCharge}</Text>
                  </View>
                )}
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>
                    {t("service_checkout.taxes_gst")} ({taxRate}%)
                  </Text>
                  {benefitApplied &&
                  originalTaxes > taxes &&
                  originalTaxes > 0 ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Text
                        style={[
                          styles.breakdownValue,
                          {
                            textDecorationLine: "line-through",
                            color: colors.textMuted,
                          },
                        ]}
                      >
                        ₹{originalTaxes}
                      </Text>
                      <Text
                        style={[
                          styles.breakdownValue,
                          {
                            color:
                              taxes === 0
                                ? isDarkMode
                                  ? colors.primary
                                  : "#2e7d32"
                                : colors.textDark,
                            fontFamily:
                              taxes === 0 ? Fonts.semiBold : Fonts.regular,
                          },
                        ]}
                      >
                        {" "}
                        {taxes === 0
                          ? t("service_checkout.free")
                          : `₹${taxes.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.breakdownValue}>
                      ₹
                      {taxes.toLocaleString("en-IN", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  )}
                </View>
                {benefitApplied && (
                  <Text style={styles.benefitNote}>
                    {t("service_checkout.plan_benefit_applied")}
                  </Text>
                )}
              </View>
              )}

              {!isZeroPayment && couponApplied && (
                <View style={styles.row}>
                  <Text
                    style={[
                      styles.rowLabel,
                      { color: isDarkMode ? colors.primary : "#2e7d32" },
                    ]}
                  >
                    {t("service_checkout.coupon_discount")}
                  </Text>
                  <Text
                    style={[
                      styles.rowValue,
                      { color: isDarkMode ? colors.primary : "#2e7d32" },
                    ]}
                  >
                    - ₹{discount.toLocaleString("en-IN")}
                  </Text>
                </View>
              )}
              {!isZeroPayment && (
                <View style={[styles.row, styles.totalRow]}>
                  <Text style={styles.totalLabel}>
                    {t("service_checkout.total")}
                  </Text>
                  <Text style={styles.totalValue}>
                    ₹
                    {(amountWithTaxAndFee - discount).toLocaleString("en-IN", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </Text>
                </View>
              )}

              {!isZeroPayment && benefitApplied && totalFeeSavings > 0 && (
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>
                    {t("service_checkout.you_saved_fees", {
                      amount:
                        Math.round(totalFeeSavings).toLocaleString("en-IN"),
                    })}
                  </Text>
                </View>
              )}
            </View>

            {/* ─── Subscription Upsell Banner ─────────────────────────────── */}
            {showUpsellBanner && upsellPlanType && !isZeroPayment && (
              <SubscriptionUpsellBanner
                planTypeNeeded={upsellPlanType}
                serviceLabel={label}
                bookingFee={baseBookingFee}
                platformFee={basePlatformFee}
              />
            )}

            {/* Service Address — hide for meetup */}
            {!params.meetupId &&
              (params.isDynamic === "true" && params.hideLocation !== "true" ? (
                <AddressPickerSection
                  selectedAddress={selectedAddress}
                  onAddressChange={(addr) => {
                    setSelectedAddress(addr);
                    if (addr.landmark) setLandmark(addr.landmark);
                  }}
                  title={t("order_medicines.address_label")}
                  showPhoneField={false}
                  showLandmarkField={true}
                  landmark={landmark}
                  onLandmarkChange={setLandmark}
                  allowManualEntry={true}
                />
              ) : (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>
                    {t("service_checkout.service_address")}
                  </Text>
                  {profile?.addresses && profile.addresses.length > 0 ? (
                    <View style={{ gap: 10 }}>
                      {profile.addresses.map((addr: any) => (
                        <TouchableOpacity
                          key={addr.id}
                          style={[
                            styles.addressCard,
                            selectedAddress?.id === addr.id &&
                              styles.addressCardActive,
                          ]}
                          onPress={() => selectActiveAddress(addr)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={
                              selectedAddress?.id === addr.id
                                ? "radio-button-on"
                                : "radio-button-off"
                            }
                            size={20}
                            color={
                              selectedAddress?.id === addr.id
                                ? colors.primary
                                : colors.textMuted
                            }
                          />
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.addressLabel}>
                              {addr.line1}
                              {addr.line2 ? ", " + addr.line2 : ""},{" "}
                              {addr.cityName}
                            </Text>
                            <Text style={styles.addressSub}>{addr.label}</Text>
                            {addr.isDefault && (
                              <Text style={styles.defaultBadge}>
                                {t("service_checkout.default_address")}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View>
                      <Text style={styles.noAddressText}>
                        No saved addresses. Please add one in your profile.
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.payBtn,
                          { marginTop: 12, backgroundColor: colors.primary },
                        ]}
                        onPress={() => router.push("/manage-addresses")}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="add-outline" size={18} color="#fff" />
                        <Text style={styles.payBtnText}>
                          {t("service_checkout.add_address")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}

            {/* Coupon */}
            {!isZeroPayment && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {t("service_checkout.promo_code")}
                </Text>
                {couponApplied ? (
                  <View style={styles.couponApplied}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={isDarkMode ? colors.primary : "#2e7d32"}
                    />
                    <Text style={styles.couponAppliedText}>
                      &quot;{couponCode}&quot; applied — saved ₹{discount}
                    </Text>
                    <TouchableOpacity onPress={handleRemoveCoupon}>
                      <Ionicons
                        name="close-circle-outline"
                        size={18}
                        color="#999"
                      />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.couponRow}>
                    <TextInput
                      style={styles.couponInput}
                      placeholder="Enter coupon code"
                      placeholderTextColor={colors.textMuted}
                      value={couponCode}
                      onChangeText={setCouponCode}
                      autoCapitalize="characters"
                      returnKeyType="done"
                      onSubmitEditing={handleApplyCoupon}
                    />
                    <TouchableOpacity
                      style={[
                        styles.couponBtn,
                        (!couponCode.trim() || couponLoading) &&
                          styles.couponBtnDisabled,
                      ]}
                      onPress={handleApplyCoupon}
                      disabled={!couponCode.trim() || couponLoading}
                    >
                      {couponLoading ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.textWhite}
                        />
                      ) : (
                        <Text style={styles.couponBtnText}>
                          {t("service_checkout.apply")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Payment Method */}
            {!isZeroPayment && (() => {
              const isMembershipUpgradeSelected = isUpgraded && !!selectedUpgradePlan;
              const isSub = !!params.subscriptionId;
              const availableMethods = (isSub || isMembershipUpgradeSelected)
                ? PAYMENT_METHODS.filter((m) => m.type !== "CASH")
                : PAYMENT_METHODS;

              if ((isSub || isMembershipUpgradeSelected) && selectedMethod === "CASH") {
                setTimeout(() => setSelectedMethod("UPI"), 0);
              }

              return (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>
                    {t("service_checkout.payment_method")}
                  </Text>
                  {availableMethods.map((m) => (
                    <TouchableOpacity
                      key={m.type}
                      style={[
                        styles.methodRow,
                        selectedMethod === m.type && styles.methodRowActive,
                      ]}
                      onPress={() => setSelectedMethod(m.type)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={m.icon}
                        size={20}
                        color={
                          selectedMethod === m.type
                            ? colors.primary
                            : colors.textMuted
                        }
                      />
                      <Text
                        style={[
                          styles.methodLabel,
                          selectedMethod === m.type && styles.methodLabelActive,
                        ]}
                      >
                        {m.label}
                      </Text>
                      <Ionicons
                        name={
                          selectedMethod === m.type
                            ? "radio-button-on"
                            : "radio-button-off"
                        }
                        size={20}
                        color={
                          selectedMethod === m.type
                            ? colors.primary
                            : colors.textMuted
                        }
                        style={{ marginLeft: "auto" }}
                      />
                    </TouchableOpacity>
                  ))}
                  {isMembershipUpgradeSelected && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, paddingHorizontal: 4 }}>
                      <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
                      <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "500" }}>
                        Membership upgrades require online payment (UPI/Card) to activate instant benefits.
                      </Text>
                    </View>
                  )}
                </View>
              );
            })()}

            {/* Checkout Membership Upgrade Card (Swiggy One style) */}
            {!isZeroPayment && params.paymentMode !== 'INQUIRY' && params.paymentMode !== 'inquiry' &&
              (HOME_CATEGORIES.includes(category) ||
              CARE_CATEGORIES.includes(category)) &&
              !hasActivePlanForCategory &&
              eligiblePlans.length > 0 && (
                <View style={[styles.card, styles.upgradeCard]}>
                  <TouchableOpacity
                    style={styles.upgradeHeader}
                    onPress={() => setIsUpgraded(!isUpgraded)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isUpgraded ? "checkbox" : "square-outline"}
                      size={24}
                      color={colors.primary}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.upgradeTitle}>
                        {CARE_CATEGORIES.includes(category)
                          ? t("service_checkout.upgrade_care")
                          : t("service_checkout.upgrade_home")}
                      </Text>
                      {savingsInfo && savingsInfo.totalSavings > 0 ? (
                        <Text
                          style={[
                            styles.upgradeSaveText,
                            { color: colors.primary },
                          ]}
                        >
                          {t("service_checkout.upgrade_save_amount", {
                            amount: savingsInfo.totalSavings,
                          })}
                        </Text>
                      ) : (
                        <Text style={styles.upgradeSubtitle}>
                          {t("service_checkout.upgrade_subtitle")}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  {isUpgraded && (
                    <View style={styles.upgradeDetails}>
                      <View style={styles.waiverList}>
                        <Text style={styles.waiverItem}>
                          {t("service_checkout.booking_fee_waived")}
                        </Text>
                        <Text style={styles.waiverItem}>
                          {t("service_checkout.platform_fee_waived")}
                        </Text>
                        <Text style={styles.waiverItem}>
                          {t("service_checkout.gst_waived")}
                        </Text>
                      </View>

                      {eligiblePlans.length > 1 && (
                        <>
                          <Text style={styles.planSelectorLabel}>
                            {t("service_checkout.select_plan_option")}
                          </Text>
                          <View style={styles.planSelector}>
                            {eligiblePlans.map((plan, idx) => (
                              <TouchableOpacity
                                key={plan.id}
                                style={[
                                  styles.planSelectorBtn,
                                  selectedPlanIndex === idx &&
                                    styles.planSelectorBtnActive,
                                ]}
                                onPress={() => setSelectedPlanIndex(idx)}
                                activeOpacity={0.8}
                              >
                                <Text
                                  style={[
                                    styles.planSelectorText,
                                    selectedPlanIndex === idx &&
                                      styles.planSelectorTextActive,
                                  ]}
                                >
                                  {plan.name}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </>
                      )}

                      <Text style={styles.durationSelectorLabel}>
                        {t("service_checkout.select_plan_duration")}
                      </Text>
                      <View style={styles.durationSelector}>
                        {[
                          {
                            key: "QUARTERLY" as BillingCycle,
                            label: t("service_checkout.months_3"),
                            price: selectedUpgradePlan?.quarterlyPrice,
                          },
                          {
                            key: "BIANNUAL" as BillingCycle,
                            label: t("service_checkout.months_6"),
                            price: selectedUpgradePlan?.biannualPrice,
                          },
                          {
                            key: "YEARLY" as BillingCycle,
                            label: t("service_checkout.months_12"),
                            price: selectedUpgradePlan?.yearlyPrice,
                          },
                        ].map((dur) => (
                          <TouchableOpacity
                            key={dur.key}
                            style={[
                              styles.durationBtn,
                              selectedDuration === dur.key &&
                                styles.durationBtnActive,
                            ]}
                            onPress={() => setSelectedDuration(dur.key)}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.durationText,
                                selectedDuration === dur.key &&
                                  styles.durationTextActive,
                              ]}
                            >
                              {dur.label}
                            </Text>
                            <Text
                              style={[
                                styles.durationPrice,
                                selectedDuration === dur.key &&
                                  styles.durationPriceActive,
                              ]}
                            >
                              ₹{dur.price}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}

            {/* Security note */}
            <View style={styles.securityNote}>
              <Ionicons
                name={
                  selectedMethod === "CASH"
                    ? "information-circle-outline"
                    : "shield-checkmark-outline"
                }
                size={16}
                color={colors.textMuted}
              />
              <Text style={styles.securityText}>
                {selectedMethod === "CASH"
                  ? "Please prepare exact change if possible. Our provider will collect the amount upon arrival."
                  : "Secured by Razorpay. Your payment information is encrypted and safe."}
              </Text>
            </View>
          </ScrollView>

          {/* Pay Button wrapped in SafeAreaView for bottom safe area */}
          <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.payBtn, payLoading && styles.payBtnLoading]}
                onPress={() => handlePay()}
                disabled={payLoading}
                activeOpacity={0.85}
              >
                {payLoading ? (
                  <ActivityIndicator color={colors.textWhite} />
                ) : (
                  <>
                    <Ionicons
                      name={
                        isZeroPayment
                           ? "send-outline"
                           : selectedMethod === "CASH"
                             ? "checkmark-circle-outline"
                             : "lock-closed-outline"
                      }
                      size={18}
                      color={colors.textWhite}
                    />
                    <Text style={styles.payBtnText}>
                      {isZeroPayment
                        ? params.checkoutGroup === "D"
                          ? t("common.submit_request", "Submit Request")
                          : category === "MEDICINES"
                            ? t("common.place_order", "Place Order")
                            : category === "TIFFIN"
                              ? t("common.request_tiffin", "Request Tiffin")
                              : t("common.book_appointment", "Book Appointment")
                        : selectedMethod === "CASH"
                          ? `${t("common.confirm_booking", "Confirm Booking")} (₹${finalAmount.toLocaleString("en-IN")})`
                          : `${t("common.pay", "Pay")} ₹${finalAmount.toLocaleString("en-IN")}`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Free-quota-exceeded prompt — 3 real actions, so it can't use the
            2-button CustomAlertModal, and native Alert.alert is globally
            muted app-wide (see app/_layout.tsx). Self-contained here. */}
        <Modal
          visible={quotaExceededVisible}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setQuotaExceededVisible(false)}
        >
          <View style={styles.quotaOverlay}>
            <View style={styles.quotaDialog}>
              <View style={styles.quotaIconBox}>
                <Ionicons name="alert-circle" size={30} color={colors.primary} />
              </View>
              <Text style={styles.quotaTitle}>Free Quota Used Up</Text>
              <Text style={styles.quotaMessage}>
                You&apos;ve used all your free bookings for this service this month.{"\n\n"}
                You can still book — standard rates apply, or upgrade your plan for more free visits.
              </Text>

              <TouchableOpacity
                style={styles.quotaPrimaryBtn}
                activeOpacity={0.85}
                onPress={() => {
                  setQuotaExceededVisible(false);
                  setIsPaidBookingOverride(true);
                  // Pass `true` directly rather than relying on the
                  // isPaidBookingOverride state update above — that state
                  // hasn't been applied to this render yet, so handlePay
                  // computes its own standardRateAmount from the force flag
                  // instead of reading stale (subscription-waived) totals.
                  handlePay(true);
                }}
              >
                <Text style={styles.quotaPrimaryBtnText}>
                  Book at Standard Rate (₹{standardRateAmount.toLocaleString("en-IN")})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quotaOutlineBtn}
                activeOpacity={0.85}
                onPress={() => {
                  setQuotaExceededVisible(false);
                  router.push("/plans");
                }}
              >
                <Text style={styles.quotaOutlineBtnText}>Upgrade Plan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quotaCancelBtn}
                activeOpacity={0.7}
                onPress={() => setQuotaExceededVisible(false)}
              >
                <Text style={styles.quotaCancelBtnText}>Not Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <CustomAlertModal
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          iconName={alertConfig.iconName as any || "warning-outline"}
          buttonText={alertConfig.buttonText || "OK"}
          onClose={alertConfig.onClose || (() => setAlertConfig(prev => ({ ...prev, visible: false })))}
          secondaryButtonText={alertConfig.secondaryButtonText}
          onSecondaryPress={alertConfig.onSecondaryPress}
          secondaryDestructive={alertConfig.secondaryDestructive}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ThemeColors, isDarkMode: boolean) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.primary },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.lg,
    },
    backBtn: { padding: 8 },
    headerTitle: {
      fontFamily: Fonts.semiBold,
      fontSize: FontSize.heading2,
      color: colors.textWhite,
      marginLeft: 12,
    },

    mainContainer: {
      flex: 1,
      backgroundColor: isDarkMode ? "#111827" : (colors.bgScreen ?? "#FAFAF0"),
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: "hidden",
    },
    body: {
      flex: 1,
      backgroundColor: "transparent",
    },
    bodyContent: {
      padding: Spacing.xl,
      paddingBottom: Spacing.xl,
      gap: Spacing.lg,
    },

    card: {
      backgroundColor: colors.bgCard,
      borderRadius: Radius.lg ?? 12,
      padding: Spacing.xl,
      gap: Spacing.md,
      elevation: 1,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.2 : 0.06,
      shadowRadius: 3,
    },
    cardTitle: {
      fontFamily: Fonts.semiBold,
      fontSize: FontSize.body,
      color: colors.textDark,
      marginBottom: Spacing.xs ?? 4,
    },

    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    rowLabel: {
      fontFamily: Fonts.regular,
      fontSize: FontSize.body,
      color: colors.textMuted,
    },
    rowValue: {
      fontFamily: Fonts.medium,
      fontSize: FontSize.body,
      color: colors.textDark,
    },

    detailRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    detailLabel: {
      fontFamily: Fonts.regular,
      fontSize: FontSize.caption ?? 12,
      color: colors.textMuted,
    },
    detailValue: {
      fontFamily: Fonts.medium,
      fontSize: FontSize.body,
      color: colors.textDark,
      marginTop: 4,
    },

    meetupCard: { gap: 0 },
    divider: {
      height: 1,
      backgroundColor: colors.borderLight,
      marginVertical: 10,
    },
    subHeading: {
      fontFamily: Fonts.semiBold,
      fontSize: 13,
      color: colors.textDark,
      marginBottom: 10,
    },
    extraHeading: {
      fontFamily: Fonts.semiBold,
      fontSize: 13,
      color: "#DC2626",
      marginBottom: 10,
    },

    includeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 8,
    },
    includeText: {
      fontFamily: Fonts.regular,
      fontSize: 13,
      color: colors.textBody,
      flex: 1,
    },

    extraRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 8,
    },
    extraText: {
      fontFamily: Fonts.regular,
      fontSize: 13,
      color: "#DC2626",
      flex: 1,
    },

    pickupDetailRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      marginBottom: 8,
    },
    pickupLabel: {
      fontFamily: Fonts.regular,
      fontSize: 12,
      color: colors.textMuted,
      minWidth: 60,
    },
    pickupValue: {
      fontFamily: Fonts.regular,
      fontSize: 13,
      color: colors.textDark,
      flex: 1,
    },

    breakdownSection: {
      backgroundColor: colors.bgCardMuted,
      borderRadius: Radius.md,
      padding: Spacing.md,
      gap: Spacing.sm,
      marginVertical: Spacing.sm,
    },
    breakdownRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: Spacing.xs,
    },
    breakdownLabel: {
      fontFamily: Fonts.regular,
      fontSize: FontSize.caption ?? 12,
      color: colors.textMuted,
    },
    breakdownValue: {
      fontFamily: Fonts.medium,
      fontSize: FontSize.caption ?? 12,
      color: colors.textDark,
    },

    totalRow: {
      marginTop: Spacing.sm,
      paddingTop: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    totalLabel: {
      fontFamily: Fonts.semiBold,
      fontSize: FontSize.body,
      color: colors.textDark,
    },
    totalValue: {
      fontFamily: Fonts.semiBold,
      fontSize: 20,
      color: colors.primary,
    },

    addressCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: Spacing.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: colors.borderLight,
    },
    addressCardActive: {
      borderColor: colors.primary,
      backgroundColor: isDarkMode ? "rgba(52, 199, 89, 0.1)" : "#F0FAF4",
    },
    addressLabel: {
      fontFamily: Fonts.medium,
      fontSize: FontSize.body,
      color: colors.textDark,
    },
    addressSub: {
      fontFamily: Fonts.regular,
      fontSize: FontSize.caption ?? 12,
      color: colors.textMuted,
      marginTop: 4,
    },
    defaultBadge: {
      fontFamily: Fonts.semiBold,
      fontSize: 10,
      color: colors.primary,
      marginTop: 4,
    },
    noAddressText: {
      fontFamily: Fonts.regular,
      fontSize: FontSize.body,
      color: colors.textMuted,
      textAlign: "center",
      paddingVertical: Spacing.lg,
    },

    couponRow: { flexDirection: "row", gap: Spacing.sm },
    couponInput: {
      flex: 1,
      height: 44,
      borderWidth: 1.5,
      borderColor: colors.borderLight,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      fontFamily: Fonts.medium,
      fontSize: FontSize.body,
      color: colors.textDark,
      backgroundColor: colors.bgCard,
    },
    couponBtn: {
      paddingHorizontal: Spacing.lg,
      height: 44,
      backgroundColor: colors.primary,
      borderRadius: Radius.md,
      justifyContent: "center",
      alignItems: "center",
    },
    couponBtnDisabled: { opacity: 0.45 },
    couponBtnText: {
      fontFamily: Fonts.semiBold,
      fontSize: FontSize.body,
      color: colors.textWhite,
    },
    couponApplied: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: isDarkMode ? "rgba(52, 199, 89, 0.1)" : "#E8F5E9",
      padding: Spacing.md,
      borderRadius: Radius.sm,
    },
    couponAppliedText: {
      flex: 1,
      fontFamily: Fonts.medium,
      fontSize: FontSize.caption ?? 13,
      color: isDarkMode ? "#34C759" : "#2e7d32",
    },

    methodRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: colors.borderLight,
    },
    methodRowActive: {
      borderColor: colors.primary,
      backgroundColor: isDarkMode ? "rgba(52, 199, 89, 0.1)" : "#F0FAF4",
    },
    methodLabel: {
      flex: 1,
      fontFamily: Fonts.regular,
      fontSize: FontSize.body,
      color: colors.textMuted,
    },
    methodLabelActive: { color: colors.textDark, fontFamily: Fonts.medium },

    securityNote: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: Spacing.md,
    },
    securityText: {
      flex: 1,
      fontFamily: Fonts.regular,
      fontSize: FontSize.caption ?? 12,
      color: colors.textMuted,
      lineHeight: 18,
    },

    footerContainer: {
      backgroundColor: isDarkMode ? "#111827" : (colors.bgScreen ?? "#FAFAF0"),
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    footer: {
      backgroundColor: isDarkMode ? "#111827" : (colors.bgScreen ?? "#FAFAF0"),
      padding: Spacing.xl,
    },
    payBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: Radius.lg ?? 12,
    },
    payBtnLoading: { opacity: 0.7 },
    payBtnText: {
      fontFamily: Fonts.semiBold,
      fontSize: FontSize.body,
      color: colors.textWhite,
    },

    benefitNote: {
      fontFamily: Fonts.medium,
      fontSize: 10,
      color: isDarkMode ? colors.primary : "#2e7d32",
      textAlign: "right",
      marginTop: -2,
    },
    inquiryNote: {
      fontFamily: Fonts.regular,
      fontSize: FontSize.caption,
      color: colors.textMuted,
      marginTop: Spacing.sm,
      lineHeight: 18,
    },
    savingsBadge: {
      backgroundColor: isDarkMode ? "rgba(52, 199, 89, 0.1)" : "#E8F5E9",
      borderRadius: Radius.sm ?? 6,
      paddingVertical: 10,
      paddingHorizontal: Spacing.md,
      alignItems: "center",
      justifyContent: "center",
      marginTop: Spacing.md,
    },
    savingsText: {
      fontFamily: Fonts.semiBold,
      fontSize: FontSize.caption ?? 12,
      color: isDarkMode ? "#34C759" : "#2e7d32",
    },
    upgradeCard: {
      borderColor: colors.primary,
      borderWidth: 1.5,
      backgroundColor: isDarkMode ? "rgba(4, 131, 87, 0.05)" : "#F0FDF4",
    },
    upgradeHeader: {
      flexDirection: "row",
      alignItems: "center",
    },
    upgradeTitle: {
      fontFamily: Fonts.bold,
      fontSize: 16,
      color: colors.textDark,
    },
    upgradeSubtitle: {
      fontFamily: Fonts.regular,
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    upgradeSaveText: {
      fontFamily: Fonts.bold,
      fontSize: 13,
      marginTop: 2,
    },
    upgradeDetails: {
      marginTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      paddingTop: Spacing.md,
      gap: Spacing.md,
    },
    waiverList: {
      gap: 6,
    },
    waiverItem: {
      fontFamily: Fonts.semiBold,
      fontSize: 13,
      color: isDarkMode ? colors.primary : "#15803d",
    },
    durationSelectorLabel: {
      fontFamily: Fonts.medium,
      fontSize: 12,
      color: colors.textMuted,
    },
    durationSelector: {
      flexDirection: "row",
      gap: 8,
    },
    durationBtn: {
      flex: 1,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      paddingVertical: Spacing.md,
      alignItems: "center",
      backgroundColor: colors.bgCard,
    },
    durationBtnActive: {
      borderColor: colors.primary,
      backgroundColor: isDarkMode ? "rgba(4, 131, 87, 0.1)" : "#E6F4EE",
    },
    durationText: {
      fontFamily: Fonts.medium,
      fontSize: 12,
      color: colors.textDark,
    },
    durationTextActive: {
      fontFamily: Fonts.bold,
      color: colors.primary,
    },
    durationPrice: {
      fontFamily: Fonts.regular,
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    durationPriceActive: {
      fontFamily: Fonts.semiBold,
      color: colors.primary,
    },
    planSelectorLabel: {
      fontFamily: Fonts.medium,
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 8,
    },
    planSelector: {
      flexDirection: "row",
      gap: 8,
      marginTop: 4,
    },
    planSelectorBtn: {
      flex: 1,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      paddingVertical: Spacing.sm ?? 8,
      alignItems: "center",
      backgroundColor: colors.bgCard,
    },
    planSelectorBtnActive: {
      borderColor: colors.primary,
      backgroundColor: isDarkMode ? "rgba(4, 131, 87, 0.1)" : "#E6F4EE",
    },
    planSelectorText: {
      fontFamily: Fonts.medium,
      fontSize: 12,
      color: colors.textDark,
    },
    planSelectorTextActive: {
      fontFamily: Fonts.bold,
      color: colors.primary,
    },
    quotaOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },
    quotaDialog: {
      backgroundColor: colors.bgScreen,
      borderRadius: Radius.xl || 16,
      padding: 24,
      width: "100%",
      alignItems: "center",
    },
    quotaIconBox: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: isDarkMode ? "rgba(4, 131, 87, 0.15)" : "#E8F5EC",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 14,
    },
    quotaTitle: {
      fontFamily: Fonts.bold,
      fontSize: FontSize.heading1 || 20,
      color: colors.textDark,
      marginBottom: 8,
      textAlign: "center",
    },
    quotaMessage: {
      fontFamily: Fonts.regular,
      fontSize: FontSize.bodySmall || 14,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 20,
    },
    quotaPrimaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: Radius.lg || 12,
      paddingVertical: 14,
      width: "100%",
      alignItems: "center",
      marginBottom: 10,
    },
    quotaPrimaryBtnText: {
      fontFamily: Fonts.semiBold,
      fontSize: FontSize.button || 16,
      color: "#FFFFFF",
    },
    quotaOutlineBtn: {
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: Radius.lg || 12,
      paddingVertical: 14,
      width: "100%",
      alignItems: "center",
      marginBottom: 10,
    },
    quotaOutlineBtnText: {
      fontFamily: Fonts.semiBold,
      fontSize: FontSize.button || 16,
      color: colors.primary,
    },
    quotaCancelBtn: {
      paddingVertical: 10,
      width: "100%",
      alignItems: "center",
    },
    quotaCancelBtnText: {
      fontFamily: Fonts.medium,
      fontSize: FontSize.bodySmall || 14,
      color: colors.textMuted,
    },
  });
