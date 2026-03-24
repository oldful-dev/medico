import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useServiceInit } from '@/hooks/useServiceInit';
import { bookingService } from '@/services/api/bookingService';
import { mediaService } from '@/services/api/mediaService';
import DynamicFormRenderer from './DynamicFormRenderer';
import type { ServiceFormConfig, FormState, FormField, FormSection } from '@/types/serviceForm';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';

interface Props {
  slug: string;
  needsLocation?: boolean;
}

// Initialize form state from field defaults
function initFormState(config: ServiceFormConfig): FormState {
  const state: FormState = {};
  for (const section of config.sections) {
    for (const field of section.fields) {
      if (field.default_value !== undefined) {
        state[field.id] = field.default_value;
      } else if (field.type === 'checkbox') {
        state[field.id] = [];
      } else if (field.type === 'image_upload') {
        state[field.id] = [];
      } else if (field.type === 'stepper') {
        state[field.id] = field.min ?? 1;
      } else if (field.type === 'toggle') {
        state[field.id] = false;
      }
    }
  }
  return state;
}

// Collect all image_upload field IDs
function getImageUploadFields(config: ServiceFormConfig): string[] {
  const ids: string[] = [];
  for (const section of config.sections) {
    for (const field of section.fields) {
      if (field.type === 'image_upload') ids.push(field.id);
    }
  }
  return ids;
}

// Validate required fields
function validateForm(config: ServiceFormConfig, formState: FormState): string | null {
  for (const section of config.sections) {
    for (const field of section.fields) {
      if (!field.required) continue;
      const val = formState[field.id];
      if (val === undefined || val === null || val === '') {
        return `Please fill in "${field.label || field.id}"`;
      }
      if (Array.isArray(val) && val.length === 0) {
        return `Please select at least one option for "${field.label || field.id}"`;
      }
    }
  }
  return null;
}

export default function DynamicServiceScreen({ slug, needsLocation = true }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    cityId,
    serviceId,
    address,
    setAddress,
    isManualAddress,
    service,
    formConfig,
    isLoadingInit,
    error,
  } = useServiceInit(slug, { needsLocation });

  const [formState, setFormState] = useState<FormState>({});
  const [isBooking, setIsBooking] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize form state once config is loaded
  React.useEffect(() => {
    if (formConfig && !initialized) {
      setFormState(initFormState(formConfig));
      setInitialized(true);
    }
  }, [formConfig, initialized]);

  const layout = formConfig?.layout;
  const headerStyle = layout?.header_style || 'green_bar';

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormState(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleBookService = async () => {
    if (!cityId || !serviceId) {
      Alert.alert('Error', 'Service initialization incomplete. Please try again.');
      return;
    }
    if (!formConfig) {
      Alert.alert('Error', 'Form configuration not loaded.');
      return;
    }

    const validationError = validateForm(formConfig, formState);
    if (validationError) {
      Alert.alert('Missing Info', validationError);
      return;
    }

    try {
      setIsBooking(true);

      // Upload images from all image_upload fields
      const imageFieldIds = getImageUploadFields(formConfig);
      const formDataJson: Record<string, any> = { ...formState };

      for (const fieldId of imageFieldIds) {
        const localUris = formState[fieldId];
        if (localUris && localUris.length > 0) {
          const uploadedUrls = await mediaService.uploadMultipleMedia(localUris, slug);
          formDataJson[fieldId] = uploadedUrls;
        }
      }

      // Convert Date objects to ISO strings
      for (const key of Object.keys(formDataJson)) {
        if (formDataJson[key] instanceof Date) {
          formDataJson[key] = formDataJson[key].toISOString();
        }
      }

      // Find a scheduledDate from datetime fields
      let scheduledDate: string | undefined;
      for (const section of formConfig.sections) {
        for (const field of section.fields) {
          if (field.type === 'datetime' && formState[field.id]) {
            const dateVal = formState[field.id];
            scheduledDate = dateVal instanceof Date ? dateVal.toISOString() : dateVal;
            break;
          }
        }
        if (scheduledDate) break;
      }

      const res = await bookingService.createBooking({
        serviceId,
        cityId,
        scheduledDate: scheduledDate || new Date().toISOString(),
        addressLine: address || undefined,
        formDataJson,
      });

      if (res.success && res.data) {
        router.push({
          pathname: '/service-confirmation',
          params: { bookingId: res.data.id },
        });
      } else {
        Alert.alert('Booking Failed', res.message || 'Something went wrong.');
      }
    } catch (err) {
      console.error(`${slug} booking error:`, err);
      Alert.alert('Error', 'Failed to create booking. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as any);
  };

  // Loading state
  if (isLoadingInit && !formConfig) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Error state
  if (error && !formConfig) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={goBack}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No form config → service exists but no formFieldsJson yet
  if (!formConfig) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Ionicons name="construct-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errorText}>This service is being set up.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={goBack}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ctaText = layout?.cta_text || 'Book Service';
  const ctaLoadingText = layout?.cta_loading_text || 'Processing...';
  const title = service?.name || '';
  const heroImageUrl = layout?.hero_image_url || service?.heroImageUrl;

  // ─── Address Confirmation Block ───
  const AddressBlock = () => (
    <View style={styles.addressSection}>
      <View style={styles.addressHeader}>
        <Ionicons name="location-outline" size={18} color={Colors.primary} />
        <Text style={styles.addressLabel}>Confirm Address</Text>
      </View>
      <TextInput
        style={styles.addressInput}
        value={address}
        onChangeText={setAddress}
        placeholder="Enter your address..."
        placeholderTextColor={Colors.textMuted}
        multiline
      />
    </View>
  );

  // ─── green_hero layout ───
  if (headerStyle === 'green_hero') {
    return (
      <View style={styles.screenGreen}>
        <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
        <StatusBar style="light" backgroundColor={Colors.primary} />

        <View style={styles.heroHeader}>
          <TouchableOpacity onPress={goBack} style={styles.backButtonAbsolute}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.heroHeaderTitle}>{title}</Text>
          {layout?.header_subtitle && (
            <Text style={styles.heroHeaderSubtitle}>{layout.header_subtitle}</Text>
          )}
        </View>

        <View style={styles.creamContent}>
          <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled">
            <DynamicFormRenderer
              sections={formConfig.sections}
              formState={formState}
              onFieldChange={handleFieldChange}
            />
            {needsLocation && <AddressBlock />}
          </KeyboardAwareScrollView>

          <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
            <TouchableOpacity
              style={[styles.ctaButton, (isBooking || isLoadingInit) && { opacity: 0.6 }]}
              activeOpacity={0.8}
              disabled={isBooking || isLoadingInit}
              onPress={handleBookService}
            >
              {isBooking ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.ctaButtonText}>
                  {isLoadingInit ? 'Initializing...' : ctaText}
                </Text>
              )}
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </View>
    );
  }

  // ─── cream_flat layout ───
  if (headerStyle === 'cream_flat') {
    return (
      <View style={styles.screenCream}>
        <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
        <StatusBar style="light" backgroundColor={Colors.primary} />

        <View style={styles.flatHeader}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
          </TouchableOpacity>
          <Text style={styles.flatHeaderTitle}>{title}</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAwareScrollView contentContainerStyle={styles.scrollContentFlat} showsVerticalScrollIndicator={false} enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled">
          {heroImageUrl && (
            <View style={styles.heroSection}>
              <Image source={{ uri: heroImageUrl }} style={styles.heroImage} resizeMode="contain" />
              <View style={styles.heroTextContainer}>
                <Text style={styles.heroTitle}>{title}</Text>
                {layout?.hero_subtitle && (
                  <Text style={styles.heroSubtitle}>{layout.hero_subtitle}</Text>
                )}
              </View>
            </View>
          )}
          {layout?.description && (
            <Text style={styles.heroDescription}>{layout.description}</Text>
          )}

          <DynamicFormRenderer
            sections={formConfig.sections}
            formState={formState}
            onFieldChange={handleFieldChange}
          />
          {needsLocation && <AddressBlock />}

          <View style={styles.ctaContainer}>
            <TouchableOpacity
              style={[styles.ctaButton, (isBooking || isLoadingInit) && { opacity: 0.6 }]}
              activeOpacity={0.8}
              disabled={isBooking || isLoadingInit}
              onPress={handleBookService}
            >
              {isBooking ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.ctaButtonText}>
                  {isLoadingInit ? 'Initializing...' : ctaText}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </View>
    );
  }

  // ─── green_bar layout (default) ───
  return (
    <View style={styles.screenGreen}>
      <StatusBar style="light" />

      <SafeAreaView style={styles.greenBarHeaderSafe} edges={['top']}>
        <View style={styles.greenBarHeaderRow}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.greenBarHeaderTitle}>{title}</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      <View style={styles.greenBarContentCard}>
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContentGreenBar}
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          extraScrollHeight={20}
          keyboardShouldPersistTaps="handled"
        >
          {layout?.description && (
            <Text style={styles.descText}>{layout.description}</Text>
          )}

          <DynamicFormRenderer
            sections={formConfig.sections}
            formState={formState}
            onFieldChange={handleFieldChange}
          />
          {needsLocation && <AddressBlock />}
        </KeyboardAwareScrollView>

        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.ctaButton, (isBooking || isLoadingInit) && { opacity: 0.6 }]}
            activeOpacity={0.8}
            disabled={isBooking || isLoadingInit}
            onPress={handleBookService}
          >
            {isBooking ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.ctaButtonText}>
                {isLoadingInit ? 'Initializing...' : ctaText}
              </Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ─── Shared ───
  screen: { flex: 1, backgroundColor: Colors.bgScreen },
  center: { justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { fontFamily: Fonts.regular, fontSize: FontSize.body, color: Colors.textMuted, marginTop: 12 },
  errorText: { fontFamily: Fonts.regular, fontSize: FontSize.body, color: Colors.textMuted, marginTop: 12, textAlign: 'center' },
  retryButton: { marginTop: 20, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 24, paddingVertical: 10 },
  retryButtonText: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: Colors.primary },

  ctaButton: {
    backgroundColor: Colors.primary,
    width: '100%',
    maxWidth: 281,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.card,
  },
  ctaButtonText: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.button,
    color: Colors.textWhite,
  },
  ctaContainer: { alignItems: 'center', marginVertical: 20 },

  bottomBar: {
    backgroundColor: '#FDFDE8',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: Platform.OS === 'android' ? 20 : 10,
    alignItems: 'center',
  },

  backButton: { padding: 5 },
  backButtonAbsolute: { position: 'absolute', top: 20, left: 16, padding: 5, zIndex: 10 },
  headerRight: { width: 32 },

  // ─── green_bar ───
  screenGreen: { flex: 1, backgroundColor: Colors.primary },
  greenBarHeaderSafe: { backgroundColor: Colors.primary },
  greenBarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  greenBarHeaderTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.24,
  },
  greenBarContentCard: {
    flex: 1,
    backgroundColor: '#FDFDE8',
    borderTopLeftRadius: 51,
    borderTopRightRadius: 51,
    overflow: 'hidden',
  },
  scrollContentGreenBar: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 20,
  },
  descText: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 20,
    color: '#555555',
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 24,
    letterSpacing: -0.24,
  },

  // ─── green_hero ───
  heroHeader: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 40,
    position: 'relative',
  },
  heroHeaderTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 26,
    color: '#FFFFFF',
    letterSpacing: -0.24,
    marginBottom: 8,
  },
  heroHeaderSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: '#D9D9D9',
    textAlign: 'center',
    letterSpacing: -0.24,
    paddingHorizontal: 20,
  },
  creamContent: {
    flex: 1,
    backgroundColor: '#FDFDE8',
    borderTopLeftRadius: 45,
    borderTopRightRadius: 45,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingTop: 25,
    paddingBottom: 20,
  },

  // ─── cream_flat ───
  screenCream: { flex: 1, backgroundColor: Colors.bgScreen },
  flatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 15,
    paddingTop: 10,
  },
  flatHeaderTitle: {
    flex: 1,
    fontFamily: Fonts.semiBold,
    fontSize: FontSize.heading2,
    color: Colors.textWhite,
    textAlign: 'center',
    letterSpacing: -0.24,
  },
  scrollContentFlat: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 30,
    paddingBottom: 40,
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    justifyContent: 'center',
  },
  heroImage: { width: 109, height: 109, marginRight: 10 },
  heroTextContainer: { flex: 1 },
  heroTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSize.heading2,
    color: Colors.textDark,
    marginBottom: 2,
    letterSpacing: -0.24,
  },
  heroSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.body,
    color: Colors.textMuted,
    letterSpacing: -0.24,
  },
  heroDescription: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.body,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
    letterSpacing: -0.24,
    paddingHorizontal: 10,
  },

  // ─── Address Confirmation ───
  addressSection: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  addressLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.body,
    color: Colors.textDark,
    letterSpacing: -0.24,
  },
  addressInput: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.bodySmall,
    color: Colors.textBody,
    backgroundColor: '#F8F8F8',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
    textAlignVertical: 'top',
  },
});
