import React, { useState } from 'react';
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
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useServiceInitialization } from '@/hooks/useServiceInitialization';


// ─── Figma Assets ───
const imgThali = require('@/assets/images/6fdd60a0eb22e90770fb958a6ddcf54c1c9dc6b6.png'); // Meal image
const imgCheckmark = require('@/assets/images/019640d27de157c119b045c46aae6a6559dd3a79.png'); // Green Check Circle

export default function MealServiceScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ subscriptionId?: string }>();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();

    const [mealType, setMealType] = useState('Home Style');
    const [subMode, setSubMode] = useState('Monthly Subscription');
    const [noOnionGarlic, setNoOnionGarlic] = useState(false);
    const [spicy, setSpicy] = useState(false);
    const [otherReq, setOtherReq] = useState('');

    // Global Initialization
    const { cityId, serviceId, serviceName, servicePrice, address, isLoading: isLoadingInit } = useServiceInitialization('tiffin');
    const [isBooking, setIsBooking] = useState(false);

    const handleBookService = async () => {
        if (!mealType) {
            Alert.alert('Required', 'Please select a meal type.');
            return;
        }
        if (!subMode) {
            Alert.alert('Required', 'Please select a subscription mode.');
            return;
        }
        if (!address || address.trim().length < 5 || address === 'Fetching address...') {
            Alert.alert('Address Required', 'Could not fetch your address. Please wait or try again.');
            return;
        }
        if (!cityId || !serviceId) {
            Alert.alert('Error', 'Service initialization incomplete. Please try again.');
            return;
        }
        try {
            setIsBooking(true);

            // Navigate to checkout — booking created inside checkout after payment succeeds
            const bookingPayload = JSON.stringify({
                serviceId,
                cityId,
                scheduledDate: new Date().toISOString(),
                addressLine: address || undefined,
                formDataJson: {
                    mealType,
                    subscriptionMode: subMode,
                    noOnionGarlic,
                    spicy,
                    otherReq: otherReq || undefined,
                },
            });

            router.push({
                pathname: '/service-checkout',
                params: { bookingPayload, amount: String(servicePrice), label: serviceName || 'Meal Service', ...(params.subscriptionId && { subscriptionId: params.subscriptionId }) },
            });
        } catch (error) {
            console.error('Meal service error:', error);
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setIsBooking(false);
        }
    };
    const dynamicStyles = makeStyles(isDarkMode);

    const CheckedRadio = () => (
        <View style={dynamicStyles.radioContainer}>
            <Image source={imgCheckmark} style={dynamicStyles.checkedRadioIcon} />
        </View>
    );

    const UncheckedRadio = () => (
        <View style={dynamicStyles.radioContainer}>
            <View style={dynamicStyles.uncheckedRadioCircle} />
        </View>
    );

    const CheckedSolidRadio = () => (
        <View style={dynamicStyles.radioContainer}>
            <View style={dynamicStyles.solidCheckedRadio} />
        </View>
    );

    return (
        <View style={dynamicStyles.screen}>
            {/* Header extension */}
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Header ─── */}
            <View style={dynamicStyles.header}>
                <TouchableOpacity onPress={() => router.back()} style={dynamicStyles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={dynamicStyles.headerTitle}>Select Meal Plan</Text>
            </View>

            <KeyboardAwareScrollView contentContainerStyle={dynamicStyles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>

                {/* ─── Top Meal Selection Card ─── */}
                <View style={dynamicStyles.mealSelectionCard}>
                    <View style={dynamicStyles.mealOptionsContainer}>

                        <TouchableOpacity style={dynamicStyles.mealOptionItem} onPress={() => setMealType('Diabetic Friendly')} activeOpacity={0.7}>
                            {mealType === 'Diabetic Friendly' ? <CheckedRadio /> : <UncheckedRadio />}
                            <View>
                                <Text style={dynamicStyles.mealOptionTitle}>Diabetic Friendly</Text>
                                <Text style={dynamicStyles.mealOptionDesc}>(Low GI, Less rice)</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={dynamicStyles.mealOptionItem} onPress={() => setMealType('Home Style')} activeOpacity={0.7}>
                            {mealType === 'Home Style' ? <CheckedRadio /> : <UncheckedRadio />}
                            <View>
                                <Text style={dynamicStyles.mealOptionTitle}>Home Style</Text>
                                <Text style={dynamicStyles.mealOptionDesc}>(Roti,Dal, Sabzi)</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={dynamicStyles.mealOptionItem} onPress={() => setMealType('Soft Food')} activeOpacity={0.7}>
                            {mealType === 'Soft Food' ? <CheckedRadio /> : <UncheckedRadio />}
                            <View>
                                <Text style={dynamicStyles.mealOptionTitle}>Soft Food</Text>
                                <Text style={dynamicStyles.mealOptionDesc}>(Khichdi/porridge - for{'\n'}recovering patients)</Text>
                            </View>
                        </TouchableOpacity>

                    </View>

                    {/* Right side Image & Decoration */}
                    <View style={dynamicStyles.mealImageContainer}>
                        <Image source={imgThali} style={dynamicStyles.mealImage} resizeMode="contain" />
                    </View>

                    {/* Dots indicator at bottom */}
                    <View style={dynamicStyles.paginationDots}>
                        <View style={[dynamicStyles.dot, mealType === 'Diabetic Friendly' ? dynamicStyles.dotActive : dynamicStyles.dotInactive]} />
                        <View style={[dynamicStyles.dot, mealType === 'Home Style' ? dynamicStyles.dotActive : dynamicStyles.dotInactive]} />
                        <View style={[dynamicStyles.dot, mealType === 'Soft Food' ? dynamicStyles.dotActive : dynamicStyles.dotInactive]} />
                    </View>
                </View>

                {/* ─── Subscription Mode ─── */}
                <Text style={dynamicStyles.sectionTitle}>Subscription Mode</Text>
                <View style={dynamicStyles.sectionCard}>
                    <TouchableOpacity style={dynamicStyles.optionRow} onPress={() => setSubMode('Trial')} activeOpacity={0.7}>
                        {subMode === 'Trial' ? <CheckedSolidRadio /> : <UncheckedRadio />}
                        <Text style={dynamicStyles.optionMainText}>Trial<Text style={dynamicStyles.optionSubText}>(3 Days)</Text></Text>
                    </TouchableOpacity>
                    <View style={{ height: 18 }} />
                    <TouchableOpacity style={dynamicStyles.optionRow} onPress={() => setSubMode('Monthly Subscription')} activeOpacity={0.7}>
                        {subMode === 'Monthly Subscription' ? <CheckedSolidRadio /> : <UncheckedRadio />}
                        <Text style={dynamicStyles.optionMainText}>Monthly Subscription</Text>
                    </TouchableOpacity>
                </View>

                {/* ─── Dietary Preferences ─── */}
                <Text style={dynamicStyles.sectionTitle}>Dietary Preferences</Text>
                <View style={dynamicStyles.sectionCard}>

                    <TouchableOpacity style={dynamicStyles.preferenceRow} onPress={() => setNoOnionGarlic(!noOnionGarlic)} activeOpacity={0.7}>
                        <View style={dynamicStyles.switchBox}>
                            {noOnionGarlic ? <Image source={imgCheckmark} style={dynamicStyles.checkedSwitchIcon} /> : <View style={dynamicStyles.uncheckedRadioCircle} />}
                        </View>
                        <Text style={dynamicStyles.preferenceText}>No Onion/Garlic?</Text>
                    </TouchableOpacity>

                    <View style={{ height: 16 }} />

                    <TouchableOpacity style={dynamicStyles.preferenceRow} onPress={() => setSpicy(!spicy)} activeOpacity={0.7}>
                        <View style={dynamicStyles.switchBox}>
                            {spicy ? <Image source={imgCheckmark} style={dynamicStyles.checkedSwitchIcon} /> : <View style={dynamicStyles.uncheckedRadioCircle} />}
                        </View>
                        <Text style={dynamicStyles.preferenceText}>Spicy / Non-Spicy?</Text>
                    </TouchableOpacity>

                </View>

                {/* ─── Something Else? ─── */}
                <Text style={dynamicStyles.sectionTitle}>Something Else?</Text>
                <View style={[dynamicStyles.textAreaContainer, { paddingHorizontal: 0 }]}>
                    <TextInput
                        style={[dynamicStyles.textAreaPlaceholder, { flex: 1, paddingHorizontal: 15 }]}
                        placeholder="Enter any other requirement (e.g. No Salt)"
                        placeholderTextColor="#898989"
                        value={otherReq}
                        onChangeText={setOtherReq}
                    />
                </View>

                {/* ─── Action Button ─── */}
                <TouchableOpacity
                    style={[dynamicStyles.submitButton, (isBooking || isLoadingInit) && { opacity: 0.6 }]}
                    activeOpacity={0.8}
                    disabled={isBooking || isLoadingInit}
                    onPress={handleBookService}
                >
                    {isLoadingInit ? (
                        <Text style={dynamicStyles.submitButtonText}>Initializing...</Text>
                    ) : isBooking ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={dynamicStyles.submitButtonText}>Request Tiffin</Text>
                    )}
                </TouchableOpacity>

            </KeyboardAwareScrollView>
        </View>
    );
}

const makeStyles = (isDarkMode: boolean) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: isDarkMode ? '#0F172A' : '#FDFDE8',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#048357',
        paddingHorizontal: 16,
        paddingBottom: 15,
        paddingTop: 10,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#FFFFFF',
        textAlign: 'left', marginLeft: 12,
        letterSpacing: -0.24,
    },
    scrollContent: {
        paddingHorizontal: 15,
        paddingTop: 20,
        paddingBottom: 40,
    },

    /* ─── Top Meal Selection Card ─── */
    mealSelectionCard: {
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
        borderRadius: 10,
        padding: 18,
        paddingTop: 20,
        marginBottom: 25,
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 5,
        minHeight: 182,
        position: 'relative',
    },
    mealOptionsContainer: {
        flex: 1,
        zIndex: 2,
    },
    mealOptionItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    mealOptionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        lineHeight: 20,
    },
    mealOptionDesc: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#777777',
        marginTop: 2,
    },
    mealImageContainer: {
        position: 'absolute',
        right: -10, // Let it bleed out slightly to match design
        top: 25,
        width: 170,
        height: 115,
        zIndex: 1,
    },
    mealImage: {
        width: '100%',
        height: '100%',
        // Slight rotation matches screenshot
        transform: [{ rotate: '-8.37deg' }],
    },
    paginationDots: {
        position: 'absolute',
        bottom: 15,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 3,
    },
    dotInactive: {
        backgroundColor: 'rgba(4, 131, 87, 0.4)', // Faded green
    },
    dotActive: {
        backgroundColor: '#048357', // Solid green
    },

    /* ─── Section Header ─── */
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 16,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        marginLeft: 5,
        marginBottom: 12,
    },

    /* ─── Outlined Cards ─── */
    sectionCard: {
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
        borderWidth: 1,
        borderColor: '#048357',
        borderRadius: 10,
        padding: 20,
        paddingVertical: 22,
        marginBottom: 20,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionMainText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 16,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
    },
    optionSubText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: 'normal',
    },

    /* ─── Dietary Preferences ─── */
    preferenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    switchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    preferenceText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 16,
        color: '#898989',
    },
    checkedSwitchIcon: {
        width: 20,
        height: 20,
        marginRight: 6,
    },

    /* ─── Text Area ─── */
    textAreaContainer: {
        height: 53,
        borderWidth: 1,
        borderColor: '#048357',
        borderRadius: 10,
        paddingHorizontal: 15,
        justifyContent: 'center',
        marginBottom: 35,
        backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
    },
    textAreaPlaceholder: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 15,
        color: isDarkMode ? '#CBD5E1' : '#555555',
    },

    /* ─── Reusable Components ─── */
    radioContainer: {
        width: 24,
        marginRight: 8,
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        marginTop: 2,
    },
    checkedRadioIcon: {
        width: 16,
        height: 16,
    },
    uncheckedRadioCircle: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#777777', // subtle gray
    },
    solidCheckedRadio: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#048357',
    },

    /* ─── Submit Button ─── */
    submitButton: {
        backgroundColor: '#02743F',
        borderRadius: 22,
        height: 44,
        width: 230,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 15,
    },
    submitButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#FFFFFF',
        fontSize: 14,
    },
});
