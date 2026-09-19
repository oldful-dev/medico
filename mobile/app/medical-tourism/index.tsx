import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  TextInput,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { CustomAlertModal } from "@/components/common/CustomAlertModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/context/ThemeContext";
import { useServiceInitialization } from "@/hooks/useServiceInitialization";
import FormInput from "@/components/common/FormInput";
import DocumentUploadBox from "@/components/common/DocumentUploadBox";
import { mediaService } from "@/services/api/mediaService";

// ─── Requirement options (Medical Tourism.pdf §2, step 3) ───
const REQUIREMENT_OPTIONS = [
  { id: "medical_treatment", label: "Medical Treatment" },
  { id: "second_opinion", label: "Second Medical Opinion" },
  { id: "health_checkup", label: "Health Check-up / Diagnostics" },
  { id: "cost_guidance", label: "Treatment Cost Guidance" },
  { id: "general_guidance", label: "General Medical Tourism Guidance" },
];

const CONTACT_METHOD_OPTIONS = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "email", label: "Email" },
  { id: "phone_call", label: "Phone Call" },
];

const TRAVEL_SUPPORT_OPTIONS = [
  { id: "visa_guidance", label: "Visa Guidance" },
  { id: "airport_pickup", label: "Airport Pickup" },
  { id: "accommodation", label: "Accommodation" },
  { id: "interpreter", label: "Interpreter" },
  { id: "local_transport", label: "Local Transport" },
  { id: "attendant_support", label: "Attendant Support" },
  { id: "medical_info_only", label: "Medical Information Only" },
];

const DISCLAIMER_TEXT =
  "Ayuxa provides medical tourism information, coordination, and support services. Ayuxa does not independently diagnose medical conditions, guarantee treatment outcomes, or replace advice from qualified medical professionals. Final diagnosis, treatment decisions, admission, pricing, and outcomes are determined by the relevant licensed hospital, doctor, or healthcare provider. Patients should review all medical, financial, travel, privacy, cancellation, and refund terms before proceeding.";

export default function MedicalTourismScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ subscriptionId?: string }>();
  const { isDarkMode } = useTheme();
  const dynamicStyles = makeStyles(isDarkMode);

  const {
    cityId,
    serviceId,
    dbService,
    isLoading: isLoadingInit,
    isReady,
  } = useServiceInitialization("medical-tourism");

  const consultationFee = dbService?.basePrice && dbService.basePrice > 0 ? dbService.basePrice : 2999;

  // ─── Step 3: Requirement ───
  const [requirementType, setRequirementType] = useState<string>("");

  // ─── Step 4: Patient Information ───
  const [patientName, setPatientName] = useState("");
  const [country, setCountry] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] = useState("whatsapp");
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [timeZone, setTimeZone] = useState("");

  // ─── Step 5: Medical Requirement ───
  const [medicalIssue, setMedicalIssue] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [requiredTreatment, setRequiredTreatment] = useState("");
  const [previousTreatment, setPreviousTreatment] = useState("");
  const [treatmentTimeline, setTreatmentTimeline] = useState("");

  // ─── Step 6: Upload Reports (optional) ───
  const [medicalReports, setMedicalReports] = useState<string[]>([]);

  // ─── Step 7: Travel and Support Needs ───
  const [travelSupportNeeds, setTravelSupportNeeds] = useState<string[]>([]);

  // ─── Step 9: Review and Consent ───
  const [consentContact, setConsentContact] = useState(false);
  const [consentShareInfo, setConsentShareInfo] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);

  const [isBooking, setIsBooking] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    iconName?: string;
  }>({ visible: false, title: "", message: "" });
  const triggerAlert = (title: string, message: string, iconName = "warning-outline") => {
    setAlertConfig({ visible: true, title, message, iconName });
  };

  const toggleTravelSupport = (id: string) => {
    setTravelSupportNeeds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const isFormValid =
    !!requirementType &&
    !!patientName.trim() &&
    !!country.trim() &&
    !!mobileNumber.trim() &&
    !!email.trim() &&
    !!medicalIssue.trim() &&
    consentContact &&
    consentShareInfo &&
    consentPrivacy;

  const handleSubmitEnquiry = async () => {
    if (!requirementType) {
      triggerAlert(t("common.required", "Required"), t("medical_tourism.alert_requirement", "Please select what you need help with."));
      return;
    }
    if (!patientName.trim() || !country.trim() || !mobileNumber.trim() || !email.trim()) {
      triggerAlert(t("common.required", "Required"), t("medical_tourism.alert_patient_info", "Please fill in all required patient information."));
      return;
    }
    if (!medicalIssue.trim()) {
      triggerAlert(t("common.required", "Required"), t("medical_tourism.alert_medical_issue", "Please briefly describe the medical issue or requirement."));
      return;
    }
    if (!consentContact || !consentShareInfo || !consentPrivacy) {
      triggerAlert(t("common.required", "Required"), t("medical_tourism.alert_consent", "Please accept all consent items to continue."));
      return;
    }
    if (!isReady || !cityId || !serviceId) {
      triggerAlert(t("common.error", "Error"), t("booking.init_incomplete", "Service initialization failed."));
      return;
    }

    try {
      setIsBooking(true);

      let uploadedReportUrls: string[] = [];
      if (medicalReports.length > 0) {
        // "health-reports" (not the service slug) so storage.service.js's
        // isPrivateFolder() serves these as signed URLs, not public — medical
        // reports/scans/diagnoses are sensitive PII, same as any other
        // health document in the app.
        uploadedReportUrls = await mediaService.uploadMultipleMedia(medicalReports, "health-reports");
      }

      const bookingPayload = JSON.stringify({
        serviceId,
        cityId,
        scheduledDate: new Date().toISOString(),
        formDataJson: {
          requirement_type: requirementType,
          patient_name: patientName.trim(),
          country: country.trim(),
          mobile_number: mobileNumber.trim(),
          email: email.trim(),
          preferred_contact_method: preferredContactMethod,
          preferred_language: preferredLanguage.trim() || undefined,
          time_zone: timeZone.trim() || undefined,
          medical_issue: medicalIssue.trim(),
          diagnosis: diagnosis.trim() || undefined,
          required_treatment: requiredTreatment.trim() || undefined,
          previous_treatment: previousTreatment.trim() || undefined,
          treatment_timeline: treatmentTimeline.trim() || undefined,
          medical_reports: uploadedReportUrls,
          travel_support_needs: travelSupportNeeds,
          consent_contact: consentContact,
          consent_share_info: consentShareInfo,
          consent_privacy: consentPrivacy,
        },
      });

      router.push({
        pathname: "/service-checkout",
        params: {
          bookingPayload,
          amount: String(consultationFee),
          label: "Medical Tourism Consultation",
          serviceSlug: dbService?.slug || "medical-tourism",
          paymentMode: "PAID",
          checkoutGroup: "A",
          hideLocation: "true",
          ...(params.subscriptionId && { subscriptionId: params.subscriptionId }),
        },
      });
    } catch (error) {
      console.error("Medical Tourism enquiry error:", error);
      triggerAlert(t("common.error", "Error"), t("medical_tourism.alert_submit_failed", "Failed to submit your enquiry. Please try again."));
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <View style={dynamicStyles.screen}>
      <View style={{ backgroundColor: "#048357", height: insets.top }} />
      <StatusBar style="light" />

      <View style={dynamicStyles.container}>
        <View style={dynamicStyles.headerRow}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/" as any);
            }}
            style={dynamicStyles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={dynamicStyles.headerTitle}>
            {t("medical_tourism.header", "Medical Tourism")}
          </Text>
        </View>

        <View
          style={[
            dynamicStyles.contentCard,
            { backgroundColor: isDarkMode ? "#252525" : "#FAF7ED" },
          ]}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <KeyboardAwareScrollView
              style={dynamicStyles.scrollView}
              contentContainerStyle={dynamicStyles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              enableOnAndroid
              extraScrollHeight={20}
            >
              {/* ─── Step 1: Home / Intro ─── */}
              <Text style={dynamicStyles.mainTitle}>
                {t("medical_tourism.title", "Ayuxa Medical Tourism")}
              </Text>
              <Text style={dynamicStyles.subTitle}>
                {t(
                  "medical_tourism.subtitle",
                  "Ayuxa helps international patients connect with suitable Indian hospitals, doctors, diagnostics, treatment providers, and support services.",
                )}
              </Text>

              {/* ─── Step 2: Consultation Fee banner ─── */}
              <View style={dynamicStyles.feeBanner}>
                <Ionicons name="pricetag" size={18} color="#FFFFFF" />
                <Text style={dynamicStyles.feeBannerText}>
                  {t("medical_tourism.consultation_fee_label", "Consultation Fee")}: ₹{consultationFee}
                </Text>
              </View>

              <View style={dynamicStyles.divider} />

              {/* ─── Step 3: Select Requirement ─── */}
              <View style={dynamicStyles.sectionContainer}>
                <Text style={dynamicStyles.sectionTitle}>
                  {t("medical_tourism.select_requirement", "What do you need help with?")}
                </Text>
                <View style={dynamicStyles.optionListVertical}>
                  {REQUIREMENT_OPTIONS.map((opt) => {
                    const isActive = requirementType === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[dynamicStyles.radioRow, isActive && dynamicStyles.radioRowActive]}
                        onPress={() => setRequirementType(opt.id)}
                      >
                        <Ionicons
                          name={isActive ? "radio-button-on" : "radio-button-off"}
                          size={18}
                          color={isActive ? "#02743F" : "#AAAEAC"}
                        />
                        <Text style={dynamicStyles.radioLabel}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* ─── Step 4: Patient Information ─── */}
              <View style={dynamicStyles.sectionContainer}>
                <Text style={dynamicStyles.sectionTitle}>
                  {t("medical_tourism.patient_information", "Patient Information")}
                </Text>
                <FormInput
                  isDarkMode={isDarkMode}
                  placeholder={t("medical_tourism.full_name", "Full Name") + " *"}
                  value={patientName}
                  onChangeText={setPatientName}
                  style={dynamicStyles.formInputSpacing}
                />
                <FormInput
                  isDarkMode={isDarkMode}
                  placeholder={t("medical_tourism.country", "Country") + " *"}
                  value={country}
                  onChangeText={setCountry}
                  style={dynamicStyles.formInputSpacing}
                />
                <FormInput
                  isDarkMode={isDarkMode}
                  placeholder={t("medical_tourism.mobile_number", "Mobile Number (with country code)") + " *"}
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  keyboardType="phone-pad"
                  style={dynamicStyles.formInputSpacing}
                />
                <FormInput
                  isDarkMode={isDarkMode}
                  placeholder={t("medical_tourism.email", "Email Address") + " *"}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  style={dynamicStyles.formInputSpacing}
                />

                <Text style={dynamicStyles.fieldLabel}>
                  {t("medical_tourism.preferred_contact_method", "Preferred Contact Method")}
                </Text>
                <View style={dynamicStyles.chipRow}>
                  {CONTACT_METHOD_OPTIONS.map((opt) => {
                    const isActive = preferredContactMethod === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[dynamicStyles.chip, isActive && dynamicStyles.chipActive]}
                        onPress={() => setPreferredContactMethod(opt.id)}
                      >
                        <Text style={[dynamicStyles.chipText, isActive && dynamicStyles.chipTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <FormInput
                  isDarkMode={isDarkMode}
                  placeholder={t("medical_tourism.preferred_language", "Preferred Language (optional)")}
                  value={preferredLanguage}
                  onChangeText={setPreferredLanguage}
                  style={dynamicStyles.formInputSpacingTop}
                />
                <FormInput
                  isDarkMode={isDarkMode}
                  placeholder={t("medical_tourism.time_zone", "Time Zone (optional)")}
                  value={timeZone}
                  onChangeText={setTimeZone}
                  style={dynamicStyles.formInputSpacing}
                />
              </View>

              {/* ─── Step 5: Medical Requirement ─── */}
              <View style={dynamicStyles.sectionContainer}>
                <Text style={dynamicStyles.sectionTitle}>
                  {t("medical_tourism.medical_requirement", "Medical Requirement")}
                </Text>
                <Text style={dynamicStyles.fieldLabel}>
                  {t("medical_tourism.medical_issue", "Brief Description of Medical Issue") + " *"}
                </Text>
                <TextInput
                  style={dynamicStyles.textArea}
                  placeholder={t("medical_tourism.medical_issue_placeholder", "Describe the condition or requirement...")}
                  placeholderTextColor={isDarkMode ? "#64748B" : "#888888"}
                  value={medicalIssue}
                  onChangeText={setMedicalIssue}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />
                <FormInput
                  isDarkMode={isDarkMode}
                  placeholder={t("medical_tourism.diagnosis", "Diagnosis (if known)")}
                  value={diagnosis}
                  onChangeText={setDiagnosis}
                  style={dynamicStyles.formInputSpacingTop}
                />
                <FormInput
                  isDarkMode={isDarkMode}
                  placeholder={t("medical_tourism.required_treatment", "Required Treatment / Specialty")}
                  value={requiredTreatment}
                  onChangeText={setRequiredTreatment}
                  style={dynamicStyles.formInputSpacing}
                />
                <Text style={[dynamicStyles.fieldLabel, { marginTop: 12 }]}>
                  {t("medical_tourism.previous_treatment", "Previous Treatment Details")}
                </Text>
                <TextInput
                  style={dynamicStyles.textArea}
                  placeholder={t("medical_tourism.previous_treatment_placeholder", "Any prior treatment or procedures...")}
                  placeholderTextColor={isDarkMode ? "#64748B" : "#888888"}
                  value={previousTreatment}
                  onChangeText={setPreviousTreatment}
                  multiline
                  numberOfLines={2}
                  maxLength={500}
                />
                <FormInput
                  isDarkMode={isDarkMode}
                  placeholder={t("medical_tourism.treatment_timeline", "Preferred Treatment Timeline")}
                  value={treatmentTimeline}
                  onChangeText={setTreatmentTimeline}
                  style={dynamicStyles.formInputSpacingTop}
                />
              </View>

              {/* ─── Step 6: Upload Reports (optional) ─── */}
              <View style={dynamicStyles.sectionContainer}>
                <Text style={dynamicStyles.sectionTitle}>
                  {t("medical_tourism.upload_reports", "Upload Medical Reports (Optional)")}
                </Text>
                <DocumentUploadBox
                  title={t("medical_tourism.upload_reports_title", "Scans, prescriptions, discharge summaries, test results")}
                  subtitle={t("medical_tourism.upload_reports_subtitle", "PDF, JPG, PNG up to 10MB each")}
                  onFilesChange={setMedicalReports}
                  maxFiles={5}
                  allowedTypes={["application/pdf", "image/jpeg", "image/png"]}
                />
              </View>

              {/* ─── Step 7: Travel and Support Needs ─── */}
              <View style={dynamicStyles.sectionContainer}>
                <Text style={dynamicStyles.sectionTitle}>
                  {t("medical_tourism.travel_support", "Travel and Support Needs")}
                </Text>
                <View style={dynamicStyles.checkboxList}>
                  {TRAVEL_SUPPORT_OPTIONS.map((opt) => {
                    const isSelected = travelSupportNeeds.includes(opt.id);
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={dynamicStyles.checkboxRow}
                        onPress={() => toggleTravelSupport(opt.id)}
                      >
                        <View style={[dynamicStyles.checkboxOutline, isSelected && dynamicStyles.checkboxOutlineActive]}>
                          {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                        </View>
                        <Text style={dynamicStyles.radioLabel}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* ─── Step 8/9: Disclaimer + Consent ─── */}
              <View style={dynamicStyles.sectionContainer}>
                <View style={dynamicStyles.infoBanner}>
                  <Ionicons name="information-circle-outline" size={20} color="#02743F" style={{ marginRight: 8 }} />
                  <Text style={dynamicStyles.infoText}>{DISCLAIMER_TEXT}</Text>
                </View>

                <ConsentRow
                  checked={consentContact}
                  onToggle={() => setConsentContact((v) => !v)}
                  label={t("medical_tourism.consent_contact", "I agree to be contacted by Ayuxa regarding this enquiry.")}
                  styles={dynamicStyles}
                />
                <ConsentRow
                  checked={consentShareInfo}
                  onToggle={() => setConsentShareInfo((v) => !v)}
                  label={t("medical_tourism.consent_share_info", "I consent to sharing relevant information with selected hospitals/providers.")}
                  styles={dynamicStyles}
                />
                <ConsentRow
                  checked={consentPrivacy}
                  onToggle={() => setConsentPrivacy((v) => !v)}
                  label={t("medical_tourism.consent_privacy", "I have read and accept the privacy policy and medical disclaimer.")}
                  styles={dynamicStyles}
                />
              </View>
            </KeyboardAwareScrollView>
          </KeyboardAvoidingView>

          {/* ─── Fixed Bottom Bar ─── */}
          <View
            style={[
              dynamicStyles.bottomBarContainer,
              {
                paddingBottom: insets.bottom || 20,
                backgroundColor: isDarkMode ? "#252525" : "#FAF7ED",
              },
            ]}
          >
            <TouchableOpacity
              style={[
                dynamicStyles.confirmButton,
                (!isFormValid || isBooking || isLoadingInit) && { opacity: 0.6 },
              ]}
              activeOpacity={isFormValid && !isBooking && !isLoadingInit ? 0.8 : 0.5}
              disabled={!isFormValid || isBooking || isLoadingInit}
              onPress={handleSubmitEnquiry}
            >
              {isBooking ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={dynamicStyles.confirmButtonText}>
                  {isLoadingInit
                    ? t("common.initializing", "Initializing...")
                    : t("medical_tourism.proceed_to_payment", "Proceed to Payment") + ` (₹${consultationFee})`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        iconName={alertConfig.iconName as any}
        buttonText="OK"
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

function ConsentRow({
  checked,
  onToggle,
  label,
  styles,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <TouchableOpacity style={styles.consentRow} onPress={onToggle}>
      <View style={[styles.checkboxOutline, checked && styles.checkboxOutlineActive]}>
        {checked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
      </View>
      <Text style={styles.consentLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#048357" },
    container: { flex: 1 },

    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      paddingHorizontal: 16,
      paddingBottom: 12,
      paddingTop: 8,
    },
    backButton: { padding: 4 },
    headerTitle: {
      fontFamily: Platform.select({ ios: "Poppins-SemiBold", android: "Poppins_600SemiBold", default: "System" }),
      fontWeight: "600",
      fontSize: 20,
      color: "#FAF7ED",
      letterSpacing: -0.24,
      marginLeft: 12,
    },

    contentCard: {
      flex: 1,
      backgroundColor: isDarkMode ? "#252525" : "#FAF7ED",
      borderTopLeftRadius: 51,
      borderTopRightRadius: 51,
      shadowColor: isDarkMode ? "#000000" : "#FAF7ED",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 42.8,
      elevation: 10,
      overflow: "hidden",
    },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 30 },

    mainTitle: {
      fontFamily: Platform.select({ ios: "Poppins-SemiBold", android: "Poppins_600SemiBold", default: "System" }),
      fontSize: 18,
      color: isDarkMode ? "#F1F5F9" : "#2F2F2F",
      marginBottom: 5,
    },
    subTitle: {
      fontFamily: Platform.select({ ios: "LexendDeca-Regular", android: "LexendDeca_400Regular", default: "System" }),
      fontSize: 14,
      lineHeight: 19,
      color: isDarkMode ? "#94A3B8" : "#898989",
      marginBottom: 15,
    },

    feeBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "#02743F",
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    feeBannerText: {
      fontFamily: Platform.select({ ios: "Poppins-SemiBold", android: "Poppins_600SemiBold", default: "System" }),
      fontSize: 15,
      color: "#FFFFFF",
    },

    divider: { height: 1, backgroundColor: isDarkMode ? "#334155" : "#D9D9D9", marginVertical: 15 },

    sectionContainer: { marginBottom: 28 },
    sectionTitle: {
      fontFamily: Platform.select({ ios: "LexendDeca-Medium", android: "LexendDeca_500Medium", default: "System" }),
      fontWeight: "500",
      fontSize: 15,
      color: isDarkMode ? "#FFFFFF" : "#2F2F2F",
      marginBottom: 12,
      marginLeft: 4,
      letterSpacing: -0.24,
    },
    fieldLabel: {
      fontFamily: Platform.select({ ios: "LexendDeca-Regular", android: "LexendDeca_400Regular", default: "System" }),
      fontSize: 13,
      color: isDarkMode ? "#CBD5E1" : "#555555",
      marginBottom: 8,
      marginLeft: 4,
    },

    formInputSpacing: { marginBottom: 12 },
    formInputSpacingTop: { marginTop: 4, marginBottom: 12 },

    optionListVertical: { gap: 10 },
    radioRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: isDarkMode ? "#1A1A1A" : "#FFFFFF",
      borderWidth: 1,
      borderColor: isDarkMode ? "#3A3A3A" : "#E5E7EB",
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    radioRowActive: { borderColor: "#02743F", backgroundColor: isDarkMode ? "#1E2E24" : "#E8F5E9" },
    radioLabel: {
      fontFamily: Platform.select({ ios: "LexendDeca-Regular", android: "LexendDeca_400Regular", default: "System" }),
      fontSize: 14,
      color: isDarkMode ? "#F1F5F9" : "#2F2F2F",
      flex: 1,
    },

    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDarkMode ? "#3A3A3A" : "#D9D9D9",
      backgroundColor: isDarkMode ? "#1A1A1A" : "#FFFFFF",
    },
    chipActive: { borderColor: "#02743F", backgroundColor: "#E8F5E9" },
    chipText: {
      fontFamily: Platform.select({ ios: "LexendDeca-Medium", android: "LexendDeca_500Medium", default: "System" }),
      fontSize: 13,
      color: isDarkMode ? "#F1F5F9" : "#2F2F2F",
    },
    chipTextActive: { color: "#02743F", fontWeight: "700" },

    textArea: {
      borderWidth: 1,
      borderColor: isDarkMode ? "#3A3A3A" : "#02743F",
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: isDarkMode ? "#F1F5F9" : "#2F2F2F",
      backgroundColor: isDarkMode ? "#1A1A1A" : "#FFFFFF",
      textAlignVertical: "top",
      minHeight: 70,
    },

    checkboxList: { gap: 10 },
    checkboxRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    checkboxOutline: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: isDarkMode ? "#64748B" : "#AAAEAC",
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxOutlineActive: { backgroundColor: "#02743F", borderColor: "#02743F" },

    infoBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: isDarkMode ? "#1E2E24" : "#E8F5E9",
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
    },
    infoText: {
      flex: 1,
      fontFamily: Platform.select({ ios: "LexendDeca-Regular", android: "LexendDeca_400Regular", default: "System" }),
      fontSize: 12,
      lineHeight: 17,
      color: isDarkMode ? "#CBD5E1" : "#3F5B47",
    },

    consentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
    consentLabel: {
      flex: 1,
      fontFamily: Platform.select({ ios: "LexendDeca-Regular", android: "LexendDeca_400Regular", default: "System" }),
      fontSize: 13,
      lineHeight: 18,
      color: isDarkMode ? "#F1F5F9" : "#2F2F2F",
    },

    bottomBarContainer: {
      paddingHorizontal: 18,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? "#334155" : "#E5E7EB",
    },
    confirmButton: {
      backgroundColor: "#02743F",
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    confirmButtonText: {
      fontFamily: Platform.select({ ios: "Poppins-SemiBold", android: "Poppins_600SemiBold", default: "System" }),
      fontSize: 15,
      color: "#FFFFFF",
    },
  });
