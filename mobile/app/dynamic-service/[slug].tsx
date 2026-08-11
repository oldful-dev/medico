import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, ActivityIndicator } from 'react-native';
import { CustomAlertModal } from '@/components/common/CustomAlertModal';
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
import { Ionicons } from '@expo/vector-icons';
import { AddressPickerSection, type AddressData } from '@/components/AddressPickerSection';
import { safeScrollToPosition } from '@/utils/scrollUtils';

const isEmoji = (str?: string) => {
  if (!str) return false;
  const clean = str.trim();
  return clean.length <= 4 && !clean.includes('.') && !clean.includes('/') && !clean.includes(':');
};

export default function DynamicServiceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const params = useLocalSearchParams<{ subscriptionId?: string }>();
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();
  const styles = makeStyles(isDarkMode, colors);

  const { getServiceBySlug, profile, refreshData } = useUser();

  useEffect(() => {
    refreshData();
  }, []);

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

  const dbService = getServiceBySlug(slug);

  if (!dbService) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgScreen }}>
        {isLoadingInit ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <Text style={{ fontFamily: Fonts.medium, color: colors.textDark }}>
            {t('booking.service_not_found', 'Service not found')}
          </Text>
        )}
      </View>
    );
  }

  const headline = dbService.headline || dbService.name || '';
  const subhead = dbService.subhead || dbService.tagline || '';
  const checkoutGroup = dbService.checkoutGroup || 'D';

  const isDiagnosticsDynamic = dbService.isDynamic && dbService.category === 'DIAGNOSTICS_FITNESS';
  const paymentMode = isDiagnosticsDynamic ? (dbService.paymentMode || 'INQUIRY') : null;
  const isZeroPayment = isDiagnosticsDynamic ? (paymentMode === 'INQUIRY') : (checkoutGroup === 'D');

  // States
  const [formAnswers, setFormAnswers] = useState<Record<string, any>>({});
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [landmark, setLandmark] = useState('');
  const [comments, setComments] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    iconName?: string;
    onClose?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const triggerAlert = (title: string, message: string, iconName = 'warning-outline', onClose?: () => void) => {
    setAlertConfig({ visible: true, title, message, iconName, onClose });
  };

  const scrollViewRef = useRef<any>(null);
  const [addressInitialized, setAddressInitialized] = useState(false);
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

  // Parse form schema fields
  const dynamicFields = dbService?.formFieldsJson?.sections?.[0]?.fields || [];

  // Address initialization
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

  // Determine standard configurations
  const hasConfiguredFields = dynamicFields.length > 0;
  const hasAddressPickerField = dynamicFields.some((f: any) => f.type === 'address_picker');
  const hasDateTimeField = dynamicFields.some((f: any) => f.type === 'datetime');

  const showDatePicker = hasConfiguredFields ? hasDateTimeField : (isDiagnosticsDynamic ? true : (checkoutGroup === 'A' || checkoutGroup === 'D'));
  const hideLocationCard = false;
  const showPhotoUpload = hasConfiguredFields ? false : (isDiagnosticsDynamic ? false : (checkoutGroup === 'A' || checkoutGroup === 'B'));

  const getAmount = () => {
    return dbService?.basePrice || 0;
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormAnswers(prev => ({ ...prev, [fieldId]: value }));
  };

  const isFormValid = React.useMemo(() => {
    const hasValidAddress = !!(selectedAddress?.line1 || (address && address.trim().length >= 5 && address !== 'Fetching address...'));

    if (hasConfiguredFields) {
      for (const field of dynamicFields) {
        if (!field.required) continue;
        if (field.type === 'address_picker') {
          if (!hasValidAddress) return false;
        } else if (field.type === 'datetime') {
          if (!scheduledDate) return false;
        } else if (field.type === 'comments') {
          if (!comments.trim()) return false;
        } else if (field.type === 'benefits' || field.type === 'info_banner') {
          continue;
        } else {
          const val = formAnswers[field.id];
          const isEmpty = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
          if (isEmpty) return false;
        }
      }
      return true;
    }

    for (const field of dynamicFields) {
      if (!field.required || field.type === 'info_banner') continue;
      const val = formAnswers[field.id];
      const isEmpty = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
      if (isEmpty) return false;
    }

    if (!comments.trim()) return false;
    if (!hideLocationCard && !hasValidAddress) return false;
    if (showDatePicker && !scheduledDate) return false;
    if (checkoutGroup === 'B' && selectedImages.length === 0 && !isDiagnosticsDynamic) return false;

    return true;
  }, [hasConfiguredFields, dynamicFields, selectedAddress, address, scheduledDate, comments, formAnswers, hideLocationCard, showDatePicker, checkoutGroup, selectedImages, isDiagnosticsDynamic]);

  const handleBook = async () => {
    const errs: string[] = [];

    if (hasConfiguredFields) {
      for (const field of dynamicFields) {
        if (field.type === 'address_picker') {
          if (field.required && (!selectedAddress?.line1 && (!address || address.trim().length < 5 || address === 'Fetching address...'))) {
            errs.push(t('service_detail.address_required', 'Please provide a valid address.'));
          }
        } else if (field.type === 'datetime') {
          if (field.required && !scheduledDate) {
            errs.push(t('service_detail.date_required', 'Please select a date and time slot.'));
          } else if (scheduledDate && scheduledDate <= new Date()) {
            errs.push(t('service_detail.invalid_time', 'Please select a future date and time.'));
          }
        } else if (field.type === 'comments') {
          if (field.required && !comments.trim()) {
            errs.push(t('service_detail.comments_required', 'Please enter comments or details of your request.'));
          }
        } else if (field.type === 'benefits' || field.type === 'info_banner') {
          continue;
        } else {
          if (field.required) {
            const val = formAnswers[field.id];
            const isEmpty = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
            if (isEmpty) {
              errs.push(`${field.label} is required.`);
            }
          }
        }
      }
    } else {
      for (const field of dynamicFields) {
        if (field.required && field.type !== 'info_banner') {
          const val = formAnswers[field.id];
          const isEmpty = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
          if (isEmpty) {
            errs.push(`${field.label} is required.`);
          }
        }
      }

      if (!comments.trim()) {
        errs.push(t('service_detail.comments_required', 'Please enter comments or details of your request.'));
      }

      if (!hideLocationCard && (!selectedAddress?.line1 && (!address || address.trim().length < 5 || address === 'Fetching address...'))) {
        errs.push(t('service_detail.address_required', 'Please provide a valid address.'));
      }

      if (showDatePicker && !scheduledDate) {
        errs.push(t('service_detail.date_required', 'Please select a date and time slot.'));
      } else if (showDatePicker && scheduledDate && scheduledDate <= new Date()) {
        errs.push(t('service_detail.invalid_time', 'Please select a future date and time.'));
      }

      if (checkoutGroup === 'B' && selectedImages.length === 0 && !isDiagnosticsDynamic) {
        errs.push(t('service_detail.bill_photo_required', 'Please upload a photo of the bills.'));
      }
    }

    if (errs.length > 0) {
      triggerAlert(t('common.error', 'Validation Error'), errs.join('\n'));
      return;
    }

    if (!isReady) {
      triggerAlert(t('common.error', 'Error'), t('booking.init_incomplete', 'Service initialization failed.'));
      return;
    }

    try {
      setIsBooking(true);

      // Upload files for custom image_upload fields
      const finalAnswers = { ...formAnswers };
      for (const field of dynamicFields) {
        if (field.type === 'image_upload' && Array.isArray(formAnswers[field.id]) && formAnswers[field.id].length > 0) {
          const uploadedUrls = await mediaService.uploadMultipleMedia(formAnswers[field.id], slug);
          finalAnswers[field.id] = uploadedUrls;
        }
      }

      // Upload base checkout group photos if any
      let uploadedBaseImageUrls: string[] = [];
      if (showPhotoUpload && selectedImages.length > 0) {
        uploadedBaseImageUrls = await mediaService.uploadMultipleMedia(selectedImages, slug);
      }

      const bookingPayloadObj = {
        serviceId,
        cityId,
        scheduledDate: scheduledDate ? scheduledDate.toISOString() : new Date().toISOString(),
        addressLine: hideLocationCard ? undefined : address,
        landmark: landmark.trim() || undefined,
        formDataJson: {
          comments: comments.trim(),
          attachments: uploadedBaseImageUrls,
          ...finalAnswers
        }
      };

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
            () => {
              setAlertConfig(prev => ({ ...prev, visible: false }));
              router.replace({
                pathname: '/service-confirmation',
                params: { bookingId }
              });
            }
          );
        } else {
          triggerAlert(t('common.error', 'Error'), res.message || 'Failed to submit request.');
        }
      } else {
        router.push({
          pathname: '/service-checkout',
          params: {
            bookingPayload: JSON.stringify(bookingPayloadObj),
            amount: String(getAmount()),
            label: serviceName || headline,
            checkoutGroup: isDiagnosticsDynamic ? 'D' : checkoutGroup,
            paymentMode: paymentMode || dbService.paymentMode || undefined,
            isDynamic: 'true',
            hideLocation: hideLocationCard ? 'true' : 'false',
            serviceSlug: slug,
            ...(params.subscriptionId && { subscriptionId: params.subscriptionId })
          }
        });
      }
    } catch (e) {
      console.error(e);
      triggerAlert(t('common.error', 'Error'), 'Failed to submit request. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const bulletItems = [
    t('service_detail.bullet_homemaker', 'Covered under your Ayuxa health plan benefits'),
    t('service_detail.bullet_professional', 'Certified, verified, and safe professionals'),
    t('service_detail.bullet_support', '24/7 dedicated support tracking'),
  ];

  const finalBulletItems = hasConfiguredFields ? [] : bulletItems;

  const headerIcon = dbService?.icon || undefined;

  const bookButtonLabel = isDiagnosticsDynamic
    ? (paymentMode === 'INQUIRY' ? t('common.submit_request', 'Submit Request') : `Pay ₹${getAmount()}`)
    : (isZeroPayment ? t('common.submit_request', 'Submit Request') : undefined);

  return (
    <ServiceDetailScreen
      headerTitle={headline}
      heroTitle={headline}
      heroSubtitle={t('service_detail.ayuxa_care_service', 'Ayuxa Care Service')}
      description={subhead}
      heroIcon={headerIcon}
      pricingLabel={isZeroPayment ? '' : `₹${getAmount()}`}
      pricingNote={isDiagnosticsDynamic ? dbService.pricingText || undefined : undefined}
      bulletItems={finalBulletItems}
      address={address}
      landmark={landmark}
      onLandmarkChange={setLandmark}
      onBook={handleBook}
      isLoading={isLoadingInit || isBooking}
      disabled={!isFormValid}
      hidePricing={isZeroPayment}
      hideLocation={true}
      scrollViewRef={scrollViewRef}
      bookButtonLabel={bookButtonLabel}
    >
      {hasConfiguredFields ? (
        dynamicFields.map((field: any) => {
          const isDark = isDarkMode;
          const fieldKey = field.type === 'address_picker' ? 'address' : field.type === 'datetime' ? 'date' : field.type === 'comments' ? 'comments' : field.id;
          return (
            <View key={field.id} style={styles.card}>
              {!['info_banner', 'benefits', 'address_picker', 'datetime', 'comments'].includes(field.type) && (
                <Text style={styles.cardTitle}>
                  {field.label} {field.required ? '*' : ''}
                </Text>
              )}

              {field.type === 'benefits' && (
                <View>
                  <Text style={[styles.cardTitle, { color: colors.primary, marginBottom: 14 }]}>
                    {field.label || t('booking_details.benefits', 'Service Benefits')}
                  </Text>
                  {field.options?.map((opt: any, i: number) => (
                    <View key={opt.id || i} style={styles.bulletRow}>
                      <View style={styles.bulletDot}>
                        <Ionicons name="checkmark" size={9} color="#FFFFFF" />
                      </View>
                      <Text style={styles.bulletText}>{opt.label}</Text>
                    </View>
                  ))}
                </View>
              )}

              {field.type === 'address_picker' && (
                <AddressPickerSection
                  selectedAddress={selectedAddress}
                  onAddressChange={handleAddressChange}
                  title={field.label || t('order_medicines.address_label')}
                  showPhoneField={false}
                  showLandmarkField={true}
                  landmark={landmark}
                  onLandmarkChange={setLandmark}
                  allowManualEntry={true}
                />
              )}

              {field.type === 'datetime' && (
                <CustomDateTimePicker
                  label={field.label || t('booking.schedule_appointment', 'Schedule Appointment')}
                  value={scheduledDate}
                  onDateChange={setScheduledDate}
                />
              )}

              {field.type === 'comments' && (
                <View>
                  <Text style={styles.cardTitle}>
                    {field.label || t('service_detail.comments', 'Comments / Requirements')} {field.required ? '*' : ''}
                  </Text>
                  <TextInput
                    style={[styles.textArea, { color: isDark ? '#F3F4F6' : '#1F2937' }]}
                    placeholder={field.placeholder || t('service_detail.comments_placeholder', 'Describe your requirements or any instructions here...')}
                    placeholderTextColor="#9CA3AF"
                    value={comments}
                    onChangeText={setComments}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}

              {field.type === 'text_input' && (
                <TextInput
                  style={[styles.input, { color: isDark ? '#F3F4F6' : '#1F2937' }]}
                  placeholder={field.placeholder || t('common.enter_here', 'Enter here...')}
                  placeholderTextColor="#9CA3AF"
                  value={formAnswers[field.id] || ''}
                  onChangeText={(val) => handleFieldChange(field.id, val)}
                />
              )}

              {field.type === 'textarea' && (
                <TextInput
                  style={[styles.textArea, { color: isDark ? '#F3F4F6' : '#1F2937' }]}
                  placeholder={field.placeholder || t('common.enter_here', 'Enter here...')}
                  placeholderTextColor="#9CA3AF"
                  value={formAnswers[field.id] || ''}
                  onChangeText={(val) => handleFieldChange(field.id, val)}
                  multiline
                  numberOfLines={3}
                />
              )}

              {(field.type === 'dropdown' || field.type === 'radio') && (
                <View style={styles.radioList}>
                  {field.options?.map((opt: any) => {
                    const isSelected = formAnswers[field.id] === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={styles.radioOption}
                        onPress={() => handleFieldChange(field.id, opt.id)}
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

              {field.type === 'checkbox' && (
                <View style={styles.checkboxList}>
                  {field.options?.map((opt: any) => {
                    const current = Array.isArray(formAnswers[field.id]) ? formAnswers[field.id] : [];
                    const isSelected = current.includes(opt.id);
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={styles.checkboxOption}
                        onPress={() => {
                          const next = isSelected ? current.filter((x: string) => x !== opt.id) : [...current, opt.id];
                          handleFieldChange(field.id, next);
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

              {field.type === 'image_upload' && (
                <ImageUploadBox
                  title={field.placeholder || t('service_detail.upload_optional_photos', 'Upload Photos (Optional)')}
                  subtitle={t('service_detail.image_upload_subtitle', 'JPG, PNG up to 10MB')}
                  onImagesChange={(images) => handleFieldChange(field.id, images)}
                  maxImages={3}
                />
              )}

              {field.type === 'toggle' && (
                <View style={styles.toggleRow}>
                  <Text style={styles.optionLabel}>{field.placeholder || field.label}</Text>
                  <Switch
                    value={!!formAnswers[field.id]}
                    onValueChange={(val) => handleFieldChange(field.id, val)}
                    trackColor={{ false: '#E5E7EB', true: Colors.primary }}
                    thumbColor={formAnswers[field.id] ? '#FFFFFF' : '#F4F3F1'}
                  />
                </View>
              )}

              {field.type === 'info_banner' && (
                <View style={styles.infoBanner}>
                  <Ionicons name="information-circle-outline" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.infoText}>{field.placeholder || field.label}</Text>
                </View>
              )}
            </View>
          );
        })
      ) : (
        <>
          {/* Legacy fallback mode: render hardcoded items in legacy order */}
          {!hideLocationCard && (
            <View>
              <AddressPickerSection
                selectedAddress={selectedAddress}
                onAddressChange={(addr) => handleAddressChange(addr)}
                title={t('order_medicines.address_label')}
                showPhoneField={false}
                showLandmarkField={true}
                landmark={landmark}
                onLandmarkChange={setLandmark}
                allowManualEntry={true}
              />
            </View>
          )}

          {/* Render Dynamic Form Fields */}
          {dynamicFields.map((field: any) => {
            const isDark = isDarkMode;
            return (
              <View key={field.id} style={styles.card}>
                {field.type !== 'info_banner' && (
                  <Text style={styles.cardTitle}>
                    {field.label} {field.required ? '*' : ''}
                  </Text>
                )}

                {field.type === 'text_input' && (
                  <TextInput
                    style={[styles.input, { color: isDark ? '#F3F4F6' : '#1F2937' }]}
                    placeholder={field.placeholder || t('common.enter_here', 'Enter here...')}
                    placeholderTextColor="#9CA3AF"
                    value={formAnswers[field.id] || ''}
                    onChangeText={(val) => handleFieldChange(field.id, val)}
                  />
                )}

                {field.type === 'textarea' && (
                  <TextInput
                    style={[styles.textArea, { color: isDark ? '#F3F4F6' : '#1F2937' }]}
                    placeholder={field.placeholder || t('common.enter_here', 'Enter here...')}
                    placeholderTextColor="#9CA3AF"
                    value={formAnswers[field.id] || ''}
                    onChangeText={(val) => handleFieldChange(field.id, val)}
                    multiline
                    numberOfLines={3}
                  />
                )}

                {(field.type === 'dropdown' || field.type === 'radio') && (
                  <View style={styles.radioList}>
                    {field.options?.map((opt: any) => {
                      const isSelected = formAnswers[field.id] === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={styles.radioOption}
                          onPress={() => handleFieldChange(field.id, opt.id)}
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

                {field.type === 'checkbox' && (
                  <View style={styles.checkboxList}>
                    {field.options?.map((opt: any) => {
                      const current = Array.isArray(formAnswers[field.id]) ? formAnswers[field.id] : [];
                      const isSelected = current.includes(opt.id);
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={styles.checkboxOption}
                          onPress={() => {
                            const next = isSelected ? current.filter((x: string) => x !== opt.id) : [...current, opt.id];
                            handleFieldChange(field.id, next);
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

                {field.type === 'datetime' && (
                  <CustomDateTimePicker
                    label={field.placeholder || t('booking.select_date_time', 'Select Date & Time')}
                    value={formAnswers[field.id] ? new Date(formAnswers[field.id]) : undefined}
                    onDateChange={(date) => handleFieldChange(field.id, date ? date.toISOString() : undefined)}
                  />
                )}

                {field.type === 'image_upload' && (
                  <ImageUploadBox
                    title={field.placeholder || t('service_detail.upload_optional_photos', 'Upload Photos (Optional)')}
                    subtitle={t('service_detail.image_upload_subtitle', 'JPG, PNG up to 10MB')}
                    onImagesChange={(images) => handleFieldChange(field.id, images)}
                    maxImages={3}
                  />
                )}

                {field.type === 'toggle' && (
                  <View style={styles.toggleRow}>
                    <Text style={styles.optionLabel}>{field.placeholder || field.label}</Text>
                    <Switch
                      value={!!formAnswers[field.id]}
                      onValueChange={(val) => handleFieldChange(field.id, val)}
                      trackColor={{ false: '#E5E7EB', true: Colors.primary }}
                      thumbColor={formAnswers[field.id] ? '#FFFFFF' : '#F4F3F1'}
                    />
                  </View>
                )}

                {field.type === 'info_banner' && (
                  <View style={styles.infoBanner}>
                    <Ionicons name="information-circle-outline" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.infoText}>{field.placeholder || field.label}</Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* Date Picker (base config) */}
          {showDatePicker && (
            <View style={styles.card}>
              <CustomDateTimePicker
                label={t('booking.schedule_appointment', 'Schedule Appointment')}
                value={scheduledDate}
                onDateChange={setScheduledDate}
              />
            </View>
          )}

          {/* Comments Input */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('service_detail.comments', 'Comments / Requirements')} *</Text>
            <TextInput
              style={[styles.textArea, { color: isDarkMode ? '#F3F4F6' : '#1F2937' }]}
              placeholder={t('service_detail.comments_placeholder', 'Describe your requirements or any instructions here...')}
              placeholderTextColor="#9CA3AF"
              value={comments}
              onChangeText={setComments}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Base Photo Upload */}
          {showPhotoUpload && (
            <View>
              <ImageUploadBox
                title={checkoutGroup === 'B' ? t('service_detail.upload_bill_photos', 'Upload Bill Copies') + ' *' : t('service_detail.upload_optional_photos', 'Upload Photos (Optional)')}
                subtitle={t('service_detail.image_upload_subtitle', 'JPG, PNG up to 10MB')}
                onImagesChange={setSelectedImages}
                maxImages={5}
              />
            </View>
          )}
        </>
      )}

      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        iconName={alertConfig.iconName as any || 'warning-outline'}
        buttonText="OK"
        onClose={alertConfig.onClose || (() => setAlertConfig(prev => ({ ...prev, visible: false })))}
      />
    </ServiceDetailScreen>
  );
}

const makeStyles = (isDarkMode: boolean, colors: any) => StyleSheet.create({
  card: {
    backgroundColor: isDarkMode ? '#1E293B' : '#FAF7ED',
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
  input: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#E5E7EB',
    backgroundColor: isDarkMode ? '#0F172A' : '#FAF7ED',
    color: isDarkMode ? '#F3F4F6' : '#1F2937',
    borderRadius: 8,
    padding: 10,
    height: 40,
  },
  textArea: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#E5E7EB',
    backgroundColor: isDarkMode ? '#0F172A' : '#FAF7ED',
    color: isDarkMode ? '#F3F4F6' : '#1F2937',
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  radioList: {
    flexDirection: 'column',
    gap: 10,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioOutline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: isDarkMode ? '#475569' : '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
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
  checkboxList: {
    flexDirection: 'column',
    gap: 10,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxOutline: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: isDarkMode ? '#475569' : '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOutlineActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionLabel: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: isDarkMode ? '#CBD5E1' : '#4B5563',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(52, 199, 89, 0.1)' : 'rgba(2,116,63,0.06)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(52, 199, 89, 0.2)' : 'rgba(2,116,63,0.15)',
  },
  infoText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: colors.primary,
    flex: 1,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  bulletDot: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  bulletText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: isDarkMode ? '#CBD5E1' : '#2F2F2F',
    flex: 1,
    letterSpacing: -0.1,
  },
});
