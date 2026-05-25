// Insurance - Landing
// PRD: Tailored for seniors/parents with pre-existing condition tracking
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    TextInput,
    Alert,
    ActivityIndicator,
    Image,
} from 'react-native';

// ─── Figma Assets ───
const familyIcon = require('../../assets/images/cb86876504871abc5e6db19e5612175dae2b0479.png');
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { locationService } from '@/services/device/locationService';
import { userService } from '@/services/api/userService';
import { bookingService } from '@/services/api/bookingService';
import { apiClient } from '@/services/api/apiClient';


// ─── Initial State Constants ───
const INITIAL_CONDITIONS = [
    { label: 'Diabetes', selected: true },
    { label: 'Hypertension (BP)', selected: true },
    { label: 'Heart Condition', selected: false },
    { label: 'None', selected: false, isNone: true },
];

const INITIAL_RECIPIENTS = [
    { label: 'Self', selected: true },
    { label: 'Parents', selected: false },
];

export default function InsuranceScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();

    // UI State
    const [recipients, setRecipients] = React.useState(INITIAL_RECIPIENTS);
    const [conditions, setConditions] = React.useState(INITIAL_CONDITIONS);
    const [requirements, setRequirements] = React.useState('');

    // API state
    const [cityId, setCityId] = React.useState('');
    const [serviceId, setServiceId] = React.useState('');
    const [address, setAddress] = React.useState('');
    const [isBooking, setIsBooking] = React.useState(false);
    const [isLoadingInit, setIsLoadingInit] = React.useState(true);

    React.useEffect(() => {
        (async () => {
            try {
                const hasPermission = await locationService.requestPermission();
                if (hasPermission) {
                    const coords = await locationService.getCurrentLocation();
                    const fetchedAddress = await locationService.getAddressFromCoordinates(coords);
                    setAddress(fetchedAddress);
                }
                const profileRes = await userService.getProfile();
                if (profileRes.success && profileRes.data) setCityId(profileRes.data.cityId);
                const serviceRes = await apiClient.get<any[]>('/services');
                if (serviceRes.success && serviceRes.data) {
                    const svc = serviceRes.data.find((s: any) => s.slug === 'insurance');
                    if (svc) setServiceId(svc.id);
                }
            } catch (err) { console.log('Insurance init failed', err); }
            finally { setIsLoadingInit(false); }
        })();
    }, []);

    const handleBookService = async () => {
        const activeRecipient = recipients.find(r => r.selected);
        if (!activeRecipient) {
            Alert.alert('Required', 'Please select who the insurance is for.');
            return;
        }
        if (!cityId || !serviceId) {
            Alert.alert('Error', 'Service initialization incomplete. Please try again.');
            return;
        }
        // Insurance is a consultation request — no Razorpay payment.
        // Booking is created immediately and goes to /service-confirmation.
        const activeConditions = conditions.filter(c => c.selected).map(c => c.label).join(', ') || 'None';
        try {
            setIsBooking(true);
            const res = await bookingService.createBooking({
                serviceId,
                cityId,
                scheduledDate: new Date().toISOString(),
                addressLine: address || 'Online Consultation',
                formDataJson: {
                    recipient: activeRecipient.label,
                    preExistingConditions: activeConditions,
                    requirements: requirements || undefined,
                },
            });
            if (res.success && res.data) {
                router.push({ pathname: '/service-confirmation', params: { bookingId: res.data.id } });
            } else {
                Alert.alert('Submission Failed', res.message || 'Something went wrong.');
            }
        } catch (error) {
            console.error('Insurance booking error:', error);
            Alert.alert('Error', 'Failed to submit request. Please try again.');
        } finally {
            setIsBooking(false);
        }
    };
    const selectRecipient = (index: number) => {
        const newRecipients = recipients.map((r, i) => ({
            ...r,
            selected: i === index
        }));
        setRecipients(newRecipients);
    };

    const toggleCondition = (index: number) => {
        const newConditions = [...conditions];

        // If "None" is selected, clear everything else
        if (newConditions[index].isNone) {
            newConditions.forEach((c, i) => {
                c.selected = i === index ? !c.selected : false;
            });
        } else {
            // Turn off "None" if a specific disease is selected
            newConditions[index].selected = !newConditions[index].selected;
            const noneIndex = newConditions.findIndex(c => c.isNone);
            if (noneIndex !== -1 && newConditions[index].selected) {
                newConditions[noneIndex].selected = false;
            }
        }

        setConditions(newConditions);
    };

    const dynamicStyles = makeStyles(isDarkMode);

    return (
        <View style={dynamicStyles.screen}>
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Header ─── */}
            <View style={dynamicStyles.header}>
                <TouchableOpacity onPress={() => router.back()} style={dynamicStyles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={dynamicStyles.headerTitle}>Insurance Plan</Text>
            </View>

            {/* ─── Content Card ─── */}
            <View style={dynamicStyles.contentCard}>
                <KeyboardAwareScrollView
                    style={dynamicStyles.scrollView}
                    contentContainerStyle={dynamicStyles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    enableOnAndroid
                    extraScrollHeight={20}
                >
                    {/* ─── Main Form Card (matches Figma Rectangle 157) ─── */}
                    <View style={dynamicStyles.formWrapper}>
                        {/* Title */}
                        <Text style={dynamicStyles.pageTitle}>Get an Insurance Plan</Text>
                        <Text style={dynamicStyles.pageSubtitle}>
                            Find the best health insurance plan tailored for you or your parents.
                        </Text>

                        {/* ─── Who Is It For? ─── */}
                        <View style={dynamicStyles.sectionCard}>
                            <Text style={dynamicStyles.sectionTitle}>Who is it for?</Text>
                            <View style={dynamicStyles.recipientRow}>
                                {recipients.map((item, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            dynamicStyles.recipientButton,
                                            item.selected && dynamicStyles.recipientButtonSelected,
                                        ]}
                                        onPress={() => selectRecipient(index)}
                                    >
                                        <Ionicons
                                            name={item.selected ? 'radio-button-on' : 'radio-button-off'}
                                            size={15}
                                            color={item.selected ? '#048357' : '#AAAEAC'}
                                        />
                                        {item.label === 'Parents' && (
                                            <Image
                                                source={familyIcon}
                                                style={dynamicStyles.familyIcon}
                                                resizeMode="contain"
                                            />
                                        )}
                                        <Text style={[
                                            dynamicStyles.recipientText,
                                            item.selected && dynamicStyles.recipientTextSelected,
                                        ]}>
                                            {item.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* ─── Pre-existing Conditions ─── */}
                        <Text style={dynamicStyles.conditionHeader}>
                            Do you existing have diseases?{'\n'}
                            <Text style={dynamicStyles.conditionSubHeader}>(Crucial for premium calculation)</Text>
                        </Text>

                        {conditions.map((cond, index) => (
                            <TouchableOpacity
                                key={index}
                                style={dynamicStyles.conditionItem}
                                onPress={() => toggleCondition(index)}
                            >
                                <View style={[
                                    dynamicStyles.conditionCheckbox,
                                    cond.selected && dynamicStyles.conditionCheckboxSelected,
                                ]}>
                                    {cond.selected && (
                                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                    )}
                                </View>
                                <Text style={[
                                    dynamicStyles.conditionLabel,
                                    cond.selected && dynamicStyles.conditionLabelSelected,
                                ]}>
                                    {cond.label}
                                </Text>
                            </TouchableOpacity>
                        ))}

                        {/* ─── Requirements Text Area ─── */}
                        <Text style={dynamicStyles.requirementsLabel}>Write what you&apos;re looking for</Text>
                        <View style={dynamicStyles.textAreaCard}>
                            <TextInput
                                style={dynamicStyles.textArea}
                                placeholder="Describe your requirements or preferences....."
                                placeholderTextColor="#AAAEAC"
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                value={requirements}
                                onChangeText={setRequirements}
                            />
                        </View>

                        {/* ─── Submit Button ─── */}
                        <View style={dynamicStyles.submitContainer}>
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
                                    <Text style={dynamicStyles.submitButtonText}>Submit Request</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAwareScrollView>
            </View>
        </View>
    );
}

const makeStyles = (isDarkMode: boolean) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#048357',
    },

    /* ─── Header ─── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#048357',
        paddingHorizontal: 16,
        paddingBottom: 20,
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

    /* ─── Content Card ─── */
    contentCard: {
        flex: 1,
        backgroundColor: isDarkMode ? '#0F172A' : '#FDFDE8',
        borderTopLeftRadius: 45,
        borderTopRightRadius: 45,
        overflow: 'hidden',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 17,
        paddingTop: 28,
        paddingBottom: 40,
    },

    /* ─── Form Wrapper (Figma Rectangle 157) ─── */
    formWrapper: {
        backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
        borderRadius: 14,
        padding: 18,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },

    /* ─── Page Title ─── */
    pageTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: isDarkMode ? '#F1F5F9' : '#555555',
        textAlign: 'left',
        marginBottom: 6,
        letterSpacing: -0.24,
    },
    pageSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: isDarkMode ? '#94A3B8' : '#777777',
        textAlign: 'left',
        lineHeight: 16,
        marginBottom: 20,
    },

    /* ─── Who is it for? Section ─── */
    sectionCard: {
        backgroundColor: isDarkMode ? '#1E293B' : '#FFFDFD',
        borderRadius: 12,
        padding: 14,
        marginBottom: 18,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        marginBottom: 10,
        letterSpacing: -0.24,
    },
    recipientRow: {
        flexDirection: 'row',
        gap: 10,
    },
    recipientButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 36,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(143,143,143,0.3)',
        gap: 4,
    },
    familyIcon: {
        width: 18,
        height: 18,
    },
    recipientButtonSelected: {
        borderColor: '#048357',
        backgroundColor: 'rgba(4, 131, 87, 0.05)',
    },
    recipientText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: '#555555',
    },
    recipientTextSelected: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#02743F',
    },

    /* ─── Pre-existing Conditions ─── */
    conditionHeader: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        marginBottom: 14,
        lineHeight: 20,
    },
    conditionSubHeader: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: '#777777',
    },
    conditionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    conditionCheckbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: '#DADADA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    conditionCheckboxSelected: {
        backgroundColor: '#048357',
        borderColor: '#048357',
    },
    conditionLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13,
        color: isDarkMode ? '#CBD5E1' : '#555555',
    },
    conditionLabelSelected: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#2F2F2F',
    },

    /* ─── Requirements Text Area ─── */
    requirementsLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        marginTop: 12,
        marginBottom: 8,
    },
    textAreaCard: {
        backgroundColor: isDarkMode ? '#1E293B' : '#FFFDFD',
        borderRadius: 10,
        borderWidth: 0.8,
        borderColor: isDarkMode ? '#334155' : 'rgba(143,143,143,0.2)',
        marginBottom: 20,
    },
    textArea: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: isDarkMode ? '#F1F5F9' : '#2F2F2F',
        padding: 14,
        height: 102,
    },

    /* ─── Submit Button ─── */
    submitContainer: {
        alignItems: 'center',
    },
    submitButton: {
        width: 230,
        height: 45,
        backgroundColor: '#02743F',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14,
        color: '#FFFFFF',
    },
});
