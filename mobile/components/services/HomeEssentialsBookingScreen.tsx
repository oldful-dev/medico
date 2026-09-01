import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { CustomAlertModal } from '@/components/common/CustomAlertModal';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/context/UserContext';
import { useAddress } from '@/context/AddressContext';
import { useTheme } from '@/context/ThemeContext';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { mediaService } from '@/services/api/mediaService';
import { bookingService } from '@/services/api/bookingService';
import ServiceDetailScreen from '@/components/services/ServiceDetailScreen';
import CustomDateTimePicker from '@/components/common/CustomDateTimePicker';
import ImageUploadBox from '@/components/common/ImageUploadBox';
import { type AddressData } from '@/components/AddressPickerSection';

// Map icons manually to match assets
const acRepairIcon = require('@/assets/images/fa6360cf6179cebaed29a6c808bafae2d31ad753.png');
const plumbingIcon = require('@/assets/images/8ce612b04a3a83f1e834c7b71a6dd2c0174cb918.png');
const cleaningIcon = require('@/assets/images/ad6b9b061bc7b1487a0e73c2557f711136d2a4d9.png');
const driverIcon = require('@/assets/images/60d4d0afa5801aeaa9e593bc049e3b017ef5624c.png');
const billsIcon = require('@/assets/images/056ecb9c01dd2283b1c0db1e84c1eb94c6d8a45a.png');
const bankWorkIcon = require('@/assets/images/33ede0e57be708b9775957c3ecec7013b0a56c6d.png');
const groceryIcon = require('@/assets/images/8888c71f466119aa294bd00136ff887f616d4737.png');
const anythingElseIcon = require('@/assets/images/6c8ed456023258e8b4095af93909c6cbc6c4b909.png');

const ICON_MAPPING: Record<string, any> = {
  'appliance-repair': acRepairIcon,
  'plumbing-electrical': plumbingIcon,
  'deep-cleaning': cleaningIcon,
  'driving-cab': driverIcon,
  'bill-payment': billsIcon,
  'bank-paperwork': bankWorkIcon,
  'grocery-run': groceryIcon,
  'anything-else': anythingElseIcon,
  'paper-legal': bankWorkIcon,
  'sanitisation': cleaningIcon,
  'tech-helper': acRepairIcon,
};

const DEFAULT_META: Record<string, { headline: string; subhead: string }> = {
  'appliance-repair': {
    headline: 'AC & Appliance Repair',
    subhead: 'Book a reliable technician for AC, refrigerator, washing machine and other household appliance repairs.',
  },
  'plumbing-electrical': {
    headline: 'Plumbing & Electrical',
    subhead: 'Book a certified plumber or electrician for pipe leaks, wiring faults, and all other home repairs.',
  },
  'deep-cleaning': {
    headline: 'Deep Cleaning & Pest Control',
    subhead: 'Book professional deep cleaning or pest control for your home. Safe & certified.',
  },
  'driving-cab': {
    headline: 'Driver Request',
    subhead: '24/7 Driver for hospital visits, errands, or any destination. Safe & comfortable.',
  },
  'grocery-run': {
    headline: 'Grocery Delivery',
    subhead: 'Share your grocery list and our Ayuxa buddy will shop from your nearest store and deliver to you.',
  },
  'bill-payment': {
    headline: 'Bill Payment',
    subhead: 'Share your utility bill, our Ayuxa buddy will take care of everything.',
  },
  'bank-paperwork': {
    headline: 'Bank Paperwork',
    subhead: 'Get professional help with bank visits, passbook updates, KYC, and other paperwork.',
  },
  'paper-legal': {
    headline: 'Paperwork & Legal',
    subhead: 'Legal & paperwork assistance, pension, life certificate, and document verification.',
  },
  'anything-else': {
    headline: 'Anything Else',
    subhead: 'Need help with something not on our list? Tell us what you need and our Ayuxa buddy will handle it.',
  },
  'tech-helper': {
    headline: 'Media & Tech Support',
    subhead: 'Simplifying smart tech configuration, device pairing, and audio/visual setups.',
  },
  'sanitisation': {
    headline: 'Washroom Sanitisation',
    subhead: 'Crafting a spotless, revitalised space with uncompromising safety standards.',
  },
  'trip-travels': {
    headline: 'Trip & Travels',
    subhead: 'Travel planning, booking assistance, and full concierge support.',
  },
  'smart-upgrade': {
    headline: 'Smart Upgrade',
    subhead: 'Make your home elderly-friendly with smart safety and accessibility upgrades.',
  },
};

interface HomeEssentialsBookingScreenProps {
  slug: string;
}

export default function HomeEssentialsBookingScreen({ slug }: HomeEssentialsBookingScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ subscriptionId?: string }>();
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  
  const { getServiceBySlug, refreshData } = useUser();
  const { activeAddress } = useAddress();
  const dbService = getServiceBySlug(slug);

  // Fallback metadata
  const defaultMeta = DEFAULT_META[slug] || { headline: 'Home Essentials', subhead: 'Concierge Services' };
  const translationKey = slug ? slug.replace(/-/g, '_') : '';
  const headline = dbService?.headline || dbService?.name || (translationKey ? t(`services.${translationKey}`, defaultMeta.headline) : defaultMeta.headline);
  const subhead = dbService?.subhead || dbService?.tagline || (translationKey ? t(`services.${translationKey}_subhead`, defaultMeta.subhead) : defaultMeta.subhead);
  const checkoutGroup = dbService?.checkoutGroup || 'D';

  const {
    isReady,
    cityId,
    serviceId,
    serviceName,
    servicePrice,
    isLoading: isLoadingInit
  } = useServiceInitialization(slug);

  // Form states
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [landmark, setLandmark] = useState('');
  const [comments, setComments] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'online' | 'home_visit'>('online');
  const [isBooking, setIsBooking] = useState(false);
  // selectedAddress now seeds from — and stays in sync with — the
  // centralized Active Service Location.
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(
    activeAddress ? {
      id: activeAddress.id,
      line1: activeAddress.line1,
      line2: activeAddress.line2,
      cityName: activeAddress.cityName,
      pincode: activeAddress.pincode,
      landmark: activeAddress.landmark,
      latitude: activeAddress.latitude,
      longitude: activeAddress.longitude,
      state: activeAddress.state,
    } : null
  );
  const [landmarkInitialized, setLandmarkInitialized] = useState(false);

  // Native Alert.alert is globally muted app-wide (see app/_layout.tsx)
  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; iconName: string }>({
    visible: false,
    title: '',
    message: '',
    iconName: 'warning-outline',
  });
  const alertCloseAction = useRef<(() => void) | null>(null);
  const triggerAlert = (title: string, message: string, iconName = 'warning-outline', onCloseAction?: () => void) => {
    alertCloseAction.current = onCloseAction ?? null;
    setAlertConfig({ visible: true, title, message, iconName });
  };
  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
    const action = alertCloseAction.current;
    alertCloseAction.current = null;
    if (action) action();
  };

  // Always fetch latest catalog data from DB when opening screen
  useEffect(() => {
    refreshData();
  }, []);

  // Follow the centralized active address whenever it changes elsewhere
  // in the app, unless the user has already made their own pick here.
  useEffect(() => {
    if (!activeAddress) return;
    setSelectedAddress(prev => {
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
    if (!landmarkInitialized && activeAddress.landmark) {
      setLandmark(activeAddress.landmark);
      setLandmarkInitialized(true);
    }
  }, [activeAddress, landmarkInitialized]);

  const handleAddressChange = (addr: AddressData) => {
    setSelectedAddress(addr);
    if (addr.landmark) setLandmark(addr.landmark);
    setLandmarkInitialized(true);
    // AddressPickerSection already calls selectActiveAddress internally.
  };

  // Determine field visibility based on checkout group
  const showDatePicker = checkoutGroup === 'A' || checkoutGroup === 'D' || (checkoutGroup === 'C' && deliveryMethod === 'home_visit');
  const hideLocationCard = false;
  const showPhotoUpload = checkoutGroup === 'A' || checkoutGroup === 'B' || (checkoutGroup === 'D' && slug !== 'driving-cab' && slug !== 'anything-else');
  const isZeroPayment = checkoutGroup === 'D';

  // Set base charge dynamically for pricing card
  const getPricingLabel = () => {
    // Admin's "Display Pricing Text" is a per-service override — if set,
    // it wins over the generic per-checkout-group text below (which was
    // built before that admin field existed and never got wired to it).
    if (dbService?.pricingText) {
      return dbService.pricingText;
    }

    const baseFee = dbService?.basePrice !== undefined && dbService?.basePrice !== null ? dbService.basePrice : (checkoutGroup === 'C' ? 499 : 299);
    if (checkoutGroup === 'A') {
      return t('service_detail.pricing_a', '₹299 Service Charge + Vendor Bill')
        .replace('299', String(baseFee));
    }
    if (checkoutGroup === 'B') {
      return t('service_detail.pricing_b', '₹299 Service Charge (Max 2 Bills)')
        .replace('299', String(baseFee));
    }
    if (checkoutGroup === 'C') {
      if (deliveryMethod === 'online') {
        return t('service_detail.pricing_c_online', '₹499 (Online Video Call)')
          .replace('499', String(baseFee));
      } else {
        return t('service_detail.pricing_c_visit', '₹999 (Home Visit)')
          .replace('999', String(baseFee + 500));
      }
    }
    return t('service_detail.pricing_d', 'Zero Service Charge (Inquiry)');
  };

  const getAmount = () => {
    const baseFee = dbService?.basePrice !== undefined && dbService?.basePrice !== null ? dbService.basePrice : (checkoutGroup === 'C' ? 499 : 299);
    if (checkoutGroup === 'A' || checkoutGroup === 'B') return baseFee;
    if (checkoutGroup === 'C') return deliveryMethod === 'online' ? baseFee : (baseFee + 500);
    return 0;
  };

  const isFormValid = React.useMemo(() => {
    if (!comments.trim()) return false;
    if (!hideLocationCard && !(selectedAddress?.line1 && selectedAddress.line1.trim().length >= 5)) return false;
    if (showDatePicker && !scheduledDate) return false;
    if (checkoutGroup === 'B' && selectedImages.length === 0) return false;
    return true;
  }, [comments, hideLocationCard, selectedAddress, showDatePicker, scheduledDate, checkoutGroup, selectedImages]);

  const handleBook = async () => {
    // 1. Validate comments field
    if (!comments.trim()) {
      triggerAlert(t('common.required', 'Required'), t('service_detail.comments_required', 'Please enter comments or details of your request.'));
      return;
    }

    // 2. Validate location if required
    if (!hideLocationCard && (!selectedAddress?.line1 || selectedAddress.line1.trim().length < 5)) {
      triggerAlert(t('common.required', 'Required'), t('service_detail.address_required', 'Please provide a valid address.'));
      return;
    }

    // 3. Validate date if required
    if (showDatePicker && !scheduledDate) {
      triggerAlert(t('common.required', 'Required'), t('service_detail.date_required', 'Please select a date and time slot.'));
      return;
    }

    if (showDatePicker && scheduledDate && scheduledDate <= new Date()) {
      triggerAlert(t('common.error', 'Error'), t('service_detail.invalid_time', 'Please select a future date and time.'));
      return;
    }

    // 4. Validate photo upload if strictly required (Group B)
    if (checkoutGroup === 'B' && selectedImages.length === 0) {
      triggerAlert(t('common.required', 'Required'), t('service_detail.bill_photo_required', 'Please upload a photo of the bills.'));
      return;
    }

    if (!isReady) {
      triggerAlert(t('common.error', 'Error'), t('booking.init_incomplete', 'Service initialization failed.'));
      return;
    }

    try {
      setIsBooking(true);

      // Upload photos first
      let uploadedImageUrls: string[] = [];
      if (showPhotoUpload && selectedImages.length > 0) {
        uploadedImageUrls = await mediaService.uploadMultipleMedia(selectedImages, slug);
      }

      // Booking location comes from the address the user actually
      // confirmed on screen — never a fresh device GPS read.
      const addressLine = selectedAddress?.line1
        ? [selectedAddress.line1, selectedAddress.line2].filter(Boolean).join(', ')
        : undefined;

      const bookingPayloadObj = {
        serviceId,
        cityId,
        scheduledDate: scheduledDate ? scheduledDate.toISOString() : new Date().toISOString(),
        addressLine: hideLocationCard ? undefined : addressLine,
        landmark: landmark.trim() || undefined,
        latitude: selectedAddress?.latitude,
        longitude: selectedAddress?.longitude,
        formDataJson: {
          comments: comments.trim(),
          attachments: uploadedImageUrls,
          deliveryMethod: checkoutGroup === 'C' ? deliveryMethod : undefined
        }
      };

      // Group D Zero-Payment: bypass Razorpay and call booking creation route immediately
      if (isZeroPayment) {
        const res = await bookingService.createBooking({
          ...bookingPayloadObj,
          amount: 0,
          paymentMethod: 'REQUEST'
        });

        if (res.success && res.data) {
          const bookingId = res.data.id;
          triggerAlert(
            t('common.success', 'Success'),
            t('service_detail.request_submitted', 'Your request has been successfully submitted!'),
            'checkmark-circle-outline',
            () => router.replace({
              pathname: '/service-confirmation',
              params: { bookingId }
            })
          );
        } else {
          triggerAlert(t('common.error', 'Error'), res.message || 'Failed to submit request.');
        }
      } else {
        // Groups A, B, C redirect to service-checkout screen
        router.push({
          pathname: '/service-checkout',
          params: {
            bookingPayload: JSON.stringify(bookingPayloadObj),
            amount: String(getAmount()),
            label: serviceName || headline,
            checkoutGroup,
            ...(params.subscriptionId && { subscriptionId: params.subscriptionId })
          }
        });
      }
    } catch (error) {
      console.error('Booking failed:', error);
      triggerAlert(t('common.error', 'Error'), 'Failed to upload files. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const styles = makeStyles(isDarkMode, colors);

  const bulletItems = [
    t('service_detail.bullet_homemaker', 'Covered under Homemaker subscription plan benefits'),
    t('service_detail.bullet_professional', 'Certified, verified, and safe professionals'),
    t('service_detail.bullet_support', '24/7 dedicated support tracking'),
  ];

  return (
    <ServiceDetailScreen
      headerTitle={headline}
      heroTitle={headline}
      heroSubtitle={t('service_detail.home_essentials', 'Home Essentials')}
      description={subhead}
      heroImage={ICON_MAPPING[slug] || anythingElseIcon}
      heroIcon={dbService?.icon}
      pricingLabel={getPricingLabel()}
      pricingNote={checkoutGroup === 'D' ? undefined : t('service_detail.pricing_disclaimer', '*Pricing is subject to actual work assessment.')}
      bulletItems={bulletItems}
      address={selectedAddress?.line1 || ''}
      landmark={landmark}
      onLandmarkChange={setLandmark}
      onBook={handleBook}
      isLoading={isLoadingInit || isBooking}
      disabled={!isFormValid}
      hidePricing={isZeroPayment}
      hideLocation={hideLocationCard}
      selectedAddress={selectedAddress}
      onAddressChange={handleAddressChange}
      bookButtonLabel={isZeroPayment ? t('common.submit_request', 'Submit Request') : undefined}
    >
      {/* Group C: Tech Support Online vs Visit selection */}
      {checkoutGroup === 'C' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('service_detail.delivery_method', 'Delivery Method')}</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, deliveryMethod === 'online' && styles.toggleBtnActive]}
              onPress={() => setDeliveryMethod('online')}
            >
              <Text style={[styles.toggleBtnText, deliveryMethod === 'online' && styles.toggleBtnTextActive]}>
                {t('service_detail.online_call', 'Online Video Call (₹499)')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, deliveryMethod === 'home_visit' && styles.toggleBtnActive]}
              onPress={() => setDeliveryMethod('home_visit')}
            >
              <Text style={[styles.toggleBtnText, deliveryMethod === 'home_visit' && styles.toggleBtnTextActive]}>
                {t('service_detail.home_visit', 'Home Visit (₹999)')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Date & Time Picker */}
      {showDatePicker && (
        <View style={styles.card}>
          <CustomDateTimePicker
            label={t('booking.schedule_appointment', 'Schedule Appointment')}
            value={scheduledDate}
            onDateChange={setScheduledDate}
          />
        </View>
      )}

      {/* Comments input field (mandatory for all services) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('service_detail.comments', 'Comments / Requirements')} *</Text>
        <TextInput
          style={styles.textArea}
          placeholder={t('service_detail.comments_placeholder', 'Describe your requirements or any instructions here...')}
          placeholderTextColor={isDarkMode ? '#64748B' : '#9CA3AF'}
          value={comments}
          onChangeText={setComments}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Photo Upload Box */}
      {showPhotoUpload && (
        <ImageUploadBox
          title={checkoutGroup === 'B' ? t('service_detail.upload_bill_photos', 'Upload Bill Copies') + ' *' : t('service_detail.upload_optional_photos', 'Upload Photos (Optional)')}
          subtitle={t('service_detail.image_upload_subtitle', 'JPG, PNG up to 10MB')}
          onImagesChange={setSelectedImages}
          maxImages={5}
        />
      )}

      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        iconName={alertConfig.iconName as any}
        buttonText={t('common.ok', 'OK')}
        onClose={closeAlert}
      />
    </ServiceDetailScreen>
  );
}

const makeStyles = (isDarkMode: boolean, colors: any) => StyleSheet.create({
  card: {
    backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
    borderRadius: 13,
    padding: 18,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDarkMode ? 0.3 : 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: isDarkMode ? '#F8FAFC' : '#2F2F2F',
    marginBottom: 10,
  },
  textArea: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#E5E7EB',
    backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF',
    color: isDarkMode ? '#F3F4F6' : '#1F2937',
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: isDarkMode ? '#334155' : '#E5E7EB',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#0F172A' : '#F9FAFB',
  },
  toggleBtnActive: {
    borderColor: colors.primary,
    backgroundColor: isDarkMode ? 'rgba(52, 199, 89, 0.15)' : 'rgba(2,116,63,0.06)',
  },
  toggleBtnText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: isDarkMode ? '#94A3B8' : '#4B5563',
  },
  toggleBtnTextActive: {
    color: colors.primary,
    fontFamily: Fonts.semiBold,
  },
});

