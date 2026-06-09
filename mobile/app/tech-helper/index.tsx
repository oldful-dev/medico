import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import ImageUploadBox from '@/components/common/ImageUploadBox';
import CustomDateTimePicker from '@/components/common/CustomDateTimePicker';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { mediaService } from '@/services/api/mediaService';

export default function TechHelperScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ subscriptionId?: string }>();
  const { isDarkMode } = useTheme();
  const colors = useThemeColors();

  // Service and location initialization
  const {
    cityId,
    serviceId,
    serviceName,
    servicePrice,
    address,
    isLoading: isLoadingInit,
  } = useServiceInitialization('tech-helper');

  // Feature items using translations
  const ISSUES = [
    {
      id: 'phone',
      title: t('tech_helper.issue_phone'),
      sub: t('tech_helper.issue_phone_sub'),
    },
    {
      id: 'tv_wifi',
      title: t('tech_helper.issue_tv_wifi'),
      sub: t('tech_helper.issue_tv_wifi_sub'),
    },
    {
      id: 'banking',
      title: t('tech_helper.issue_banking'),
      sub: t('tech_helper.issue_banking_sub'),
    },
  ];

  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [otherIssue, setOtherIssue] = useState('');
  const [selectedMode, setSelectedMode] = useState<'home' | 'phone'>('home');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isBooking, setIsBooking] = useState(false);

  const handleBookService = async () => {
    const selectedLabels = selectedIssues
      .map(id => ISSUES.find(i => i.id === id)?.title)
      .filter(Boolean);
    const desc = [...selectedLabels, otherIssue].filter(Boolean).join(', ');

    if (!desc || !selectedDate || !address) {
      Alert.alert(t('tech_helper.missing_info'), t('tech_helper.missing_info_desc'));
      return;
    }

    if (!cityId || !serviceId) {
      Alert.alert(t('tech_helper.error'), t('tech_helper.init_error'));
      return;
    }

    const modePrice =
      selectedMode === 'home'
        ? servicePrice
        : Math.round(servicePrice * 0.66);

    try {
      setIsBooking(true);

      const uploadedImageUrls =
        selectedImages.length > 0
          ? await mediaService.uploadMultipleMedia(selectedImages, 'tech-helper')
          : [];

      const bookingPayload = JSON.stringify({
        serviceId,
        cityId,
        scheduledDate: selectedDate!.toISOString(),
        addressLine: address,
        formDataJson: {
          issues: selectedIssues,
          otherIssue,
          mode: selectedMode,
          description: desc,
          attachments: uploadedImageUrls,
          fee: modePrice,
        },
      });

      router.push({
        pathname: '/payment/checkout',
        params: {
          bookingPayload,
          amount: String(modePrice),
          label: serviceName || t('tech_helper.header'),
          ...(params.subscriptionId && { subscriptionId: params.subscriptionId }),
        },
      });
    } catch (error) {
      console.error('Tech-helper error:', error);
      Alert.alert(t('tech_helper.error'), t('tech_helper.generic_error'));
    } finally {
      setIsBooking(false);
    }
  };

  const toggleIssue = (id: string) => {
    setSelectedIssues(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const dynamicStyles = makeStyles(isDarkMode);

  return (
    <View style={dynamicStyles.screen}>
      {/* Header extension */}
      <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
      <StatusBar style="light" backgroundColor={Colors.primary} />

      {/* ─── Header ─── */}
      <View style={dynamicStyles.headerContainer}>
        <TouchableOpacity onPress={() => router.back()} style={dynamicStyles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>{t('tech_helper.header')}</Text>
      </View>

      {/* ─── Main Content ─── */}
      <View style={dynamicStyles.contentContainer}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <KeyboardAwareScrollView
            contentContainerStyle={dynamicStyles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid
            extraScrollHeight={20}
          >
            {/* Title & Subtitle */}
            <Text style={dynamicStyles.mainTitle}>{t('tech_helper.main_title')}</Text>
            <Text style={dynamicStyles.subTitle}>{t('tech_helper.sub_title')}</Text>
            <View style={dynamicStyles.divider} />

            {/* ─── What's the issue? ─── */}
            <Text style={dynamicStyles.sectionTitle}>{t('tech_helper.select_issue')}</Text>

            {ISSUES.map(issue => {
              const isSelected = selectedIssues.includes(issue.id);
              return (
                <TouchableOpacity
                  key={issue.id}
                  style={[dynamicStyles.checkboxCard, isSelected && dynamicStyles.checkboxCardSelected]}
                  activeOpacity={0.7}
                  onPress={() => toggleIssue(issue.id)}
                >
                  <View style={[dynamicStyles.checkbox, isSelected && dynamicStyles.checkboxSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <View style={dynamicStyles.checkboxTextGroup}>
                    <Text style={[dynamicStyles.issueTitle, isSelected && dynamicStyles.issueTitleSelected]}>
                      {issue.title}
                    </Text>
                    <Text style={dynamicStyles.issueSubTitle}>{issue.sub}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* ─── Something Else? ─── */}
            <Text style={[dynamicStyles.sectionTitle, { marginTop: 10 }]}>
              {t('tech_helper.something_else')}
            </Text>
            <View style={dynamicStyles.textInputBox}>
              <TextInput
                style={dynamicStyles.textInput}
                placeholder={t('tech_helper.describe_placeholder')}
                placeholderTextColor="#898989"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={otherIssue}
                onChangeText={setOtherIssue}
              />
            </View>

            <View style={{ marginTop: 20, marginBottom: 20 }}>
              <CustomDateTimePicker
                label={t('tech_helper.preferred_date_time')}
                value={selectedDate}
                onDateChange={setSelectedDate}
                minimumDate={new Date()}
              />
            </View>

            <View style={{ marginTop: 20 }}>
              <ImageUploadBox
                title={t('tech_helper.upload_photos')}
                subtitle={t('tech_helper.upload_subtitle')}
                onImagesChange={setSelectedImages}
              />
            </View>

            <View style={dynamicStyles.divider} />

            {/* ─── Select Mode ─── */}
            <Text style={dynamicStyles.sectionTitle}>{t('tech_helper.select_mode')}</Text>

            {/* Home Visit */}
            <TouchableOpacity
              style={[dynamicStyles.radioCard, selectedMode === 'home' && dynamicStyles.radioCardSelected]}
              activeOpacity={0.7}
              onPress={() => setSelectedMode('home')}
            >
              <View style={[dynamicStyles.radioCircle, selectedMode === 'home' && dynamicStyles.radioCircleSelected]} />
              <View style={dynamicStyles.radioTextGroup}>
                <Text style={dynamicStyles.radioTitle}>{t('tech_helper.home_visit')}</Text>
                <Text style={dynamicStyles.radioSubTitle}>{t('tech_helper.home_visit_desc')}</Text>
              </View>
              <Text style={dynamicStyles.radioPrice}>
                {servicePrice > 0 ? `₹${servicePrice}` : '...'}
              </Text>
            </TouchableOpacity>

            {/* Phone Call */}
            <TouchableOpacity
              style={[dynamicStyles.radioCard, selectedMode === 'phone' && dynamicStyles.radioCardSelected]}
              activeOpacity={0.7}
              onPress={() => setSelectedMode('phone')}
            >
              <View style={[dynamicStyles.radioCircle, selectedMode === 'phone' && dynamicStyles.radioCircleSelected]} />
              <View style={dynamicStyles.radioTextGroup}>
                <Text style={dynamicStyles.radioTitle}>{t('tech_helper.phone_call')}</Text>
                <Text style={dynamicStyles.radioSubTitle}>{t('tech_helper.phone_call_desc')}</Text>
              </View>
              <Text style={dynamicStyles.radioPrice}>
                {servicePrice > 0 ? `₹${Math.round(servicePrice * 0.66)}` : '...'}
              </Text>
            </TouchableOpacity>

            {/* ─── Book Support Button ─── */}
            <View style={dynamicStyles.footerSpacing} />
            <TouchableOpacity
              style={[dynamicStyles.submitButton, (isBooking || isLoadingInit) && { opacity: 0.7 }]}
              activeOpacity={0.8}
              disabled={isBooking || isLoadingInit}
              onPress={handleBookService}
            >
              {isLoadingInit ? (
                <Text style={dynamicStyles.submitButtonText}>{t('tech_helper.initializing')}</Text>
              ) : isBooking ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={dynamicStyles.submitButtonText}>{t('tech_helper.book_btn')}</Text>
              )}
            </TouchableOpacity>
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

// styles remain unchanged (same as original)
const makeStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: Colors.primary,
    },
    headerContainer: {
      backgroundColor: Colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
      paddingBottom: 25,
      paddingHorizontal: 16,
    },
    backButton: {
      padding: 5,
      marginRight: 12,
    },
    headerTitle: {
      fontFamily: Fonts.semiBold,
      fontSize: FontSize.heading2,
      color: Colors.textWhite,
      letterSpacing: -0.24,
      flex: 1,
    },
    contentContainer: {
      flex: 1,
      backgroundColor: isDarkMode ? '#0F172A' : Colors.bgScreen,
      borderTopLeftRadius: Radius.xl * 2,
      borderTopRightRadius: Radius.xl * 2,
      ...Shadow.card,
    },
    scrollContent: {
      paddingTop: Spacing.xl,
      paddingHorizontal: Spacing.xl,
      paddingBottom: 40,
    },
    mainTitle: {
      fontFamily: Fonts.semiBold,
      fontSize: FontSize.heading1,
      color: isDarkMode ? '#F1F5F9' : Colors.textDark,
      marginBottom: 5,
      textAlign: 'center',
    },
    subTitle: {
      fontFamily: Fonts.regular,
      fontSize: FontSize.body,
      color: isDarkMode ? '#94A3B8' : Colors.textMuted,
      textAlign: 'center',
      marginBottom: 20,
    },
    divider: {
      height: 1,
      backgroundColor: isDarkMode ? '#334155' : '#D9D9D9',
      marginVertical: 15,
    },
    sectionTitle: {
      fontFamily: Fonts.semiBold,
      fontSize: FontSize.heading3,
      color: isDarkMode ? '#F1F5F9' : Colors.textDark,
      marginBottom: 15,
    },
    checkboxCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#1E293B' : Colors.bgCard,
      borderRadius: Radius.md,
      padding: Spacing.lg,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : Colors.borderLight,
      ...Shadow.card,
    },
    checkboxCardSelected: {
      borderColor: Colors.primary,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: isDarkMode ? '#64748B' : Colors.textLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    checkboxSelected: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    checkboxTextGroup: {
      flex: 1,
    },
    issueTitle: {
      fontFamily: Fonts.medium,
      fontSize: FontSize.body,
      color: isDarkMode ? '#F1F5F9' : Colors.textDark,
    },
    issueTitleSelected: {
      color: Colors.primary,
    },
    issueSubTitle: {
      fontFamily: Fonts.regular,
      fontSize: FontSize.bodySmall,
      color: isDarkMode ? '#94A3B8' : Colors.textMuted,
      marginTop: 2,
    },
    textInputBox: {
      backgroundColor: isDarkMode ? '#1E293B' : Colors.bgCard,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : Colors.borderLight,
      padding: Spacing.lg,
      minHeight: 100,
    },
    textInput: {
      fontFamily: Fonts.regular,
      fontSize: FontSize.body,
      color: isDarkMode ? '#F1F5F9' : Colors.textDark,
      flex: 1,
    },
    radioCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#1E293B' : Colors.bgCard,
      borderRadius: Radius.md,
      padding: 18,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : Colors.borderLight,
    },
    radioCardSelected: {
      borderColor: Colors.primary,
      borderWidth: 1.5,
    },
    radioCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: isDarkMode ? '#64748B' : Colors.textLight,
      marginRight: 15,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioCircleSelected: {
      borderColor: Colors.primary,
      borderWidth: 6,
    },
    radioTextGroup: {
      flex: 1,
    },
    radioTitle: {
      fontFamily: Fonts.medium,
      fontSize: FontSize.body,
      color: isDarkMode ? '#F1F5F9' : Colors.textDark,
    },
    radioSubTitle: {
      fontFamily: Fonts.regular,
      fontSize: FontSize.bodySmall,
      color: isDarkMode ? '#94A3B8' : Colors.textMuted,
      marginTop: 2,
    },
    radioPrice: {
      fontFamily: Fonts.semiBold,
      fontSize: FontSize.heading2,
      color: Colors.primary,
    },
    footerSpacing: {
      height: 20,
    },
    submitButton: {
      backgroundColor: Colors.primary,
      height: 50,
      borderRadius: Radius.full,
      justifyContent: 'center',
      alignItems: 'center',
      ...Shadow.card,
    },
    submitButtonText: {
      fontFamily: Fonts.medium,
      color: Colors.textWhite,
      fontSize: FontSize.button,
    },
  });