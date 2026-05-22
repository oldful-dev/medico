import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    TextInput,
    Modal,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import CustomDateTimePicker from '@/components/common/CustomDateTimePicker';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';
import { bookingService } from '@/services/api/bookingService';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function TripTravelsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colors = useThemeColors();

    // Form state
    const [destination, setDestination] = useState('');
    const [travelDates, setTravelDates] = useState<Date | undefined>(undefined);
    const [numTravellers, setNumTravellers] = useState('');
    const [purposeOfTravel, setPurposeOfTravel] = useState('');
    const [specialRequirements, setSpecialRequirements] = useState('');
    const [additionalDetails, setAdditionalDetails] = useState('');

    // Modal states
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTravellerPicker, setShowTravellerPicker] = useState(false);
    const [showPurposePicker, setShowPurposePicker] = useState(false);

    const [isBooking, setIsBooking] = React.useState(false);

    const { isReady, cityId, serviceId, isLoading: isLoadingInit } = useServiceInitialization('trip-travels');

    // Options
    const travellerCounts = Array.from({ length: 10 }, (_, i) => (i + 1).toString());
    const purposes = [
        { id: '1', label: 'Leisure / Vacation' },
        { id: '2', label: 'Business Travel' },
        { id: '3', label: 'Family Getaway' },
        { id: '4', label: 'Adventure Trip' },
        { id: '5', label: 'Wellness Retreat' },
        { id: '6', label: 'Cultural Tour' },
        { id: '7', label: 'Other' },
    ];

    const handleSubmit = async () => {
        // Validation
        if (!destination.trim()) {
            Alert.alert('Required Field', 'Please enter your destination');
            return;
        }
        if (!travelDates) {
            Alert.alert('Required Field', 'Please select travel dates');
            return;
        }
        if (!numTravellers) {
            Alert.alert('Required Field', 'Please select number of travellers');
            return;
        }
        if (!purposeOfTravel) {
            Alert.alert('Required Field', 'Please select purpose of travel');
            return;
        }

        if (!cityId || !serviceId) {
            Alert.alert('Error', 'Service initialization incomplete. Please try again.');
            return;
        }

        try {
            setIsBooking(true);
            const res = await bookingService.createBooking({
                serviceId,
                cityId,
                scheduledDate: travelDates.toISOString(),
                addressLine: destination,
                formDataJson: {
                    type: 'TRIP',
                    destination,
                    travelDates: travelDates.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                    numTravellers: parseInt(numTravellers),
                    purposeOfTravel,
                    specialRequirements: specialRequirements.trim() || null,
                    additionalDetails: additionalDetails.trim() || null,
                },
            });
            if (res.success && res.data) {
                router.push({ pathname: '/service-confirmation', params: { bookingId: res.data.id } });
            } else {
                Alert.alert('Booking Failed', res.message || 'Something went wrong.');
            }
        } catch (error) {
            console.error('Trip booking error:', error);
            Alert.alert('Error', 'Failed to submit inquiry. Please check your connection.');
        } finally {
            setIsBooking(false);
        }
    };

    const s = makeStyles(colors);
    const formattedDate = travelDates ? travelDates.toLocaleDateString() : '';

    return (
        <View style={[s.container, { paddingTop: insets.top }]}>
            <StatusBar style="light" backgroundColor="#02743F" />

            {/* Header with back button + title */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Trip & Travel</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAwareScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.scrollContent}
                enableOnAndroid
                extraScrollHeight={20}
            >
                {/* Hero Section — centered icon + title + subtitle */}
                <View style={s.heroSection}>
                    <View style={s.heroIcon}>
                        <Ionicons name="airplane" size={40} color="#02743F" />
                    </View>
                    <Text style={s.heroTitle}>Where do you want to go?</Text>
                    <Text style={s.heroSubtitle}>
                        Share your travel plan and{'\n'}we'll assist you better.
                    </Text>
                </View>

                {/* Form */}
                <View style={s.formSection}>
                    {/* Destination */}
                    <View style={s.formGroup}>
                        <Text style={s.label}>
                            Destination (Preferred) <Text style={s.required}>*</Text>
                        </Text>
                        <TextInput
                            style={s.input}
                            placeholder="Enter destination"
                            placeholderTextColor={colors.textMuted}
                            value={destination}
                            onChangeText={setDestination}
                            editable={!isLoadingInit}
                        />
                    </View>

                    {/* Travel Dates */}
                    <View style={s.formGroup}>
                        <Text style={s.label}>
                            Travel Dates <Text style={s.required}>*</Text>
                        </Text>
                        <TouchableOpacity
                            style={s.input}
                            onPress={() => setShowDatePicker(true)}
                            activeOpacity={0.7}
                        >
                            <Text style={formattedDate ? s.inputText : s.inputPlaceholder}>
                                {formattedDate || 'Select travel dates'}
                            </Text>
                            <Ionicons name="calendar" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Number of Travellers */}
                    <View style={s.formGroup}>
                        <Text style={s.label}>
                            Number of Travellers <Text style={s.required}>*</Text>
                        </Text>
                        <TouchableOpacity
                            style={s.input}
                            onPress={() => setShowTravellerPicker(true)}
                            activeOpacity={0.7}
                        >
                            <Text style={numTravellers ? s.inputText : s.inputPlaceholder}>
                                {numTravellers ? `${numTravellers} ${numTravellers === '1' ? 'person' : 'people'}` : 'Select number of travellers'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {/* Purpose of Travel */}
                    <View style={s.formGroup}>
                        <Text style={s.label}>
                            Purpose of Travel <Text style={s.required}>*</Text>
                        </Text>
                        <TouchableOpacity
                            style={s.input}
                            onPress={() => setShowPurposePicker(true)}
                            activeOpacity={0.7}
                        >
                            <Text style={purposeOfTravel ? s.inputText : s.inputPlaceholder}>
                                {purposeOfTravel || 'Select purpose'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {/* Special Requirements */}
                    <View style={s.formGroup}>
                        <Text style={s.label}>Special Requirements / Assistance</Text>
                        <TextInput
                            style={[s.input, s.textarea]}
                            placeholder="Enter your requirements"
                            placeholderTextColor={colors.textMuted}
                            value={specialRequirements}
                            onChangeText={setSpecialRequirements}
                            multiline
                            numberOfLines={4}
                            editable={!isLoadingInit}
                        />
                    </View>

                    {/* Additional Details */}
                    <View style={s.formGroup}>
                        <Text style={s.label}>Additional Details (Optional)</Text>
                        <TextInput
                            style={[s.input, s.textarea]}
                            placeholder="Enter any additional information"
                            placeholderTextColor={colors.textMuted}
                            value={additionalDetails}
                            onChangeText={setAdditionalDetails}
                            multiline
                            numberOfLines={4}
                            editable={!isLoadingInit}
                        />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[s.submitButton, isBooking && { opacity: 0.6 }]}
                        onPress={handleSubmit}
                        disabled={isBooking || isLoadingInit}
                        activeOpacity={0.85}
                    >
                        <Text style={s.submitButtonText}>
                            {isBooking ? 'Submitting...' : 'Submit Enquiry'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAwareScrollView>

            {/* Date Picker Modal */}
            {showDatePicker && (
                <Modal transparent visible={showDatePicker} animationType="slide">
                    <View style={s.modalOverlay}>
                        <View style={s.modal}>
                            <View style={s.modalHeader}>
                                <Text style={s.modalTitle}>Select Travel Dates</Text>
                                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                    <Ionicons name="close" size={24} color={colors.textDark} />
                                </TouchableOpacity>
                            </View>
                            <CustomDateTimePicker
                                value={travelDates}
                                onChange={(date) => {
                                    setTravelDates(date);
                                    setShowDatePicker(false);
                                }}
                            />
                        </View>
                    </View>
                </Modal>
            )}

            {/* Traveller Count Picker Modal */}
            <Modal transparent visible={showTravellerPicker} animationType="slide">
                <View style={s.modalOverlay}>
                    <View style={s.modal}>
                        <View style={s.modalHeader}>
                            <Text style={s.modalTitle}>Number of Travellers</Text>
                            <TouchableOpacity onPress={() => setShowTravellerPicker(false)}>
                                <Ionicons name="close" size={24} color={colors.textDark} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={travellerCounts}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={s.optionItem}
                                    onPress={() => {
                                        setNumTravellers(item);
                                        setShowTravellerPicker(false);
                                    }}
                                >
                                    <Text style={[s.optionText, numTravellers === item && { color: colors.primary, fontWeight: '600' }]}>
                                        {item} {item === '1' ? 'person' : 'people'}
                                    </Text>
                                    {numTravellers === item && (
                                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* Purpose Picker Modal */}
            <Modal transparent visible={showPurposePicker} animationType="slide">
                <View style={s.modalOverlay}>
                    <View style={s.modal}>
                        <View style={s.modalHeader}>
                            <Text style={s.modalTitle}>Purpose of Travel</Text>
                            <TouchableOpacity onPress={() => setShowPurposePicker(false)}>
                                <Ionicons name="close" size={24} color={colors.textDark} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={purposes}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={s.optionItem}
                                    onPress={() => {
                                        setPurposeOfTravel(item.label);
                                        setShowPurposePicker(false);
                                    }}
                                >
                                    <Text style={[s.optionText, purposeOfTravel === item.label && { color: colors.primary, fontWeight: '600' }]}>
                                        {item.label}
                                    </Text>
                                    {purposeOfTravel === item.label && (
                                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function makeStyles(colors: any) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.bgScreen,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: '#02743F',
        },
        headerTitle: {
            fontSize: 18,
            fontWeight: '600',
            color: '#FFFFFF',
            flex: 1,
            textAlign: 'center',
        },
        scrollContent: {
            paddingBottom: 40,
        },
        heroSection: {
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingVertical: 36,
            backgroundColor: colors.bgScreen,
        },
        heroIcon: {
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: '#E8F5E9',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
        },
        heroTitle: {
            fontSize: 22,
            fontWeight: '600',
            color: colors.textDark,
            marginBottom: 8,
            textAlign: 'center',
        },
        heroSubtitle: {
            fontSize: 14,
            fontWeight: '500',
            color: '#888888',
            textAlign: 'center',
            lineHeight: 22,
        },
        formSection: {
            paddingHorizontal: 20,
            paddingTop: 8,
        },
        formGroup: {
            marginBottom: 22,
        },
        label: {
            fontSize: 14,
            fontWeight: '600',
            color: '#2F2F2F',
            marginBottom: 10,
        },
        required: {
            color: '#dc2626',
        },
        input: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 14,
            paddingVertical: 13,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 8,
            backgroundColor: '#FFFFFF',
            minHeight: 48,
        },
        inputText: {
            flex: 1,
            fontSize: 14,
            fontWeight: '500',
            color: '#2F2F2F',
        },
        inputPlaceholder: {
            flex: 1,
            fontSize: 14,
            color: '#C2C2C2',
        },
        textarea: {
            height: 110,
            paddingVertical: 12,
            textAlignVertical: 'top',
            paddingTop: 12,
        },
        submitButton: {
            backgroundColor: '#02743F',
            paddingVertical: 14,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 28,
            marginBottom: 24,
            minHeight: 48,
        },
        submitButtonText: {
            fontSize: 16,
            fontWeight: '600',
            color: '#FFFFFF',
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            justifyContent: 'flex-end',
        },
        modal: {
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '75%',
            paddingBottom: 20,
        },
        modalHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 18,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
        },
        modalTitle: {
            fontSize: 16,
            fontWeight: '600',
            color: '#2F2F2F',
        },
        optionItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 0,
        },
        optionText: {
            fontSize: 14,
            fontWeight: '500',
            color: '#2F2F2F',
        },
    });
}
