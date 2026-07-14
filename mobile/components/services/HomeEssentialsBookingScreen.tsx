import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/context/UserContext';
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
import { userService } from '@/services/api/userService';

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

interface HomeEssentialsBookingScreenProps {
  slug: string;
}

export default function HomeEssentialsBookingScreen({ slug }: HomeEssentialsBookingScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ subscriptionId?: string }>();
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  
  const { getServiceBySlug, profile } = useUser();
  const dbService = getServiceBySlug(slug);

  // Fallback metadata
  const headline = dbService?.headline || dbService?.name || '';
  const subhead = dbService?.subhead || dbService?.tagline || '';
  const checkoutGroup = dbService?.checkoutGroup || 'D';

  const {
    isReady,
    cityId,
    serviceId,
    serviceName,
    servicePrice,
    address,
    setAddress,
    isLoading: isLoadingInit
  } = useServiceInitialization(slug);

  // Form states
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [landmark, setLandmark] = useState('');
  const [comments, setComments] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'online' | 'home_visit'>('online');
  const [isBooking, setIsBooking] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);

  // Sync selectedAddress with initial fetched address on mount or when fetched
  useEffect(() => {
    if (address && address !== 'Fetching address...' && !selectedAddress) {
      setSelectedAddress({
        line1: address,
        cityName: '',
        pincode: '',
        latitude: 28.7041,
        longitude: 77.1025,
      });
    }
  }, [address]);

  const handleAddressChange = (addr: AddressData) => {
    setSelectedAddress(addr);
    setAddress(`${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}`);
    if (addr.landmark) setLandmark(addr.landmark);
  };

  // Determine field visibility based on checkout group
  const showDatePicker = checkoutGroup === 'A' || checkoutGroup === 'D' || (checkoutGroup === 'C' && deliveryMethod === 'home_visit');
  const hideLocationCard = false;
  const showPhotoUpload = checkoutGroup === 'A' || checkoutGroup === 'B' || (checkoutGroup === 'D' && slug !== 'driving-cab' && slug !== 'anything-else');
  const isZeroPayment = checkoutGroup === 'D';

  // Address initialization fallback
  const [addressInitialized, setAddressInitialized] = useState(false);
  useEffect(() => {
    if (addressInitialized) return;
    const addressEmpty = !address || address === 'Fetching address...' || address === '';
    if (addressEmpty && profile?.addresses?.length) {
      const defaultAddr = profile.addresses.find((a: any) => a.isDefault) || profile.addresses[0];
      if (defaultAddr) {
        const parts = [defaultAddr.line1, defaultAddr.line2, defaultAddr.cityName].filter(Boolean);
        setAddress(parts.join(', '));
        if (defaultAddr.landmark) setLandmark(defaultAddr.landmark);
        setAddressInitialized(true);
      }
    } else if (!addressEmpty) {
      setAddressInitialized(true);
    }
  }, [profile, address]);

  const syncAddressToProfile = async (addressText: string, landmarkText: string) => {
    if (!profile?.id || !addressText.trim()) return;
    try {
      const existing = profile.addresses?.find((a: any) => a.isDefault) || profile.addresses?.[0];
      const payload = {
        label: existing?.label || 'Home',
        line1: addressText.trim(),
        cityName: existing?.cityName || '',
        state: existing?.state || '',
        pincode: existing?.pincode || '',
        landmark: landmarkText.trim() || undefined,
        isDefault: true,
      };
      if (existing?.id) {
        await userService.updateAddress(profile.id, existing.id, payload);
      } else {
        await userService.addAddress(profile.id, payload);
      }
    } catch {
      // non-fatal
    }
  };

  // Set base charge dynamically for pricing card
  const getPricingLabel = () => {
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

  const handleBook = async () => {
    // 1. Validate comments field
    if (!comments.trim()) {
      Alert.alert(t('common.required', 'Required'), t('service_detail.comments_required', 'Please enter comments or details of your request.'));
      return;
    }

    // 2. Validate location if required
    if (!hideLocationCard && (!address || address.trim().length < 5 || address === 'Fetching address...')) {
      Alert.alert(t('common.required', 'Required'), t('service_detail.address_required', 'Please provide a valid address.'));
      return;
    }

    // 3. Validate date if required
    if (showDatePicker && !scheduledDate) {
      Alert.alert(t('common.required', 'Required'), t('service_detail.date_required', 'Please select a date and time slot.'));
      return;
    }

    if (showDatePicker && scheduledDate && scheduledDate <= new Date()) {
      Alert.alert(t('common.error', 'Error'), t('service_detail.invalid_time', 'Please select a future date and time.'));
      return;
    }

    // 4. Validate photo upload if strictly required (Group B)
    if (checkoutGroup === 'B' && selectedImages.length === 0) {
      Alert.alert(t('common.required', 'Required'), t('service_detail.bill_photo_required', 'Please upload a photo of the bills.'));
      return;
    }

    if (!isReady) {
      Alert.alert(t('common.error', 'Error'), t('booking.init_incomplete', 'Service initialization failed.'));
      return;
    }

    try {
      setIsBooking(true);

      // Sync address to profile (non-blocking, non-fatal)
      syncAddressToProfile(address, landmark);

      // Upload photos first
      let uploadedImageUrls: string[] = [];
      if (showPhotoUpload && selectedImages.length > 0) {
        uploadedImageUrls = await mediaService.uploadMultipleMedia(selectedImages, slug);
      }

      const bookingPayloadObj = {
        serviceId,
        cityId,
        scheduledDate: scheduledDate ? scheduledDate.toISOString() : new Date().toISOString(),
        addressLine: hideLocationCard ? undefined : address,
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
          Alert.alert(
            t('common.success', 'Success'),
            t('service_detail.request_submitted', 'Your request has been successfully submitted!'),
            [
              {
                text: t('common.ok', 'OK'),
                onPress: () => router.replace({
                  pathname: '/service-confirmation',
                  params: { bookingId }
                })
              }
            ]
          );
        } else {
          Alert.alert(t('common.error', 'Error'), res.message || 'Failed to submit request.');
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
      Alert.alert(t('common.error', 'Error'), 'Failed to upload files. Please try again.');
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
      address={address}
      landmark={landmark}
      onLandmarkChange={setLandmark}
      onBook={handleBook}
      isLoading={isLoadingInit || isBooking}
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

