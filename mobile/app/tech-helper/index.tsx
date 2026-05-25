import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import ImageUploadBox from '@/components/common/ImageUploadBox';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { userService } from '@/services/api/userService';
import { apiClient } from '@/services/api/apiClient';
import { locationService } from '@/services/device/locationService';
import { mediaService } from '@/services/api/mediaService';

// Feature items array according to PRD
const ISSUES = [
    { id: 'phone', title: 'Phone Help', sub: '(WhatsApp, Zoom, Contacts setup)' },
    { id: 'tv_wifi', title: 'TV & Wi-Fi', sub: '(Netflix login, Remote fix)' },
    { id: 'banking', title: 'Banking App', sub: '(Teach me how to use UPI safely)' },
];

const resolvePrice = (svc: any): number => {
    if (!svc) return 0;
    if (svc.basePrice != null && svc.basePrice > 0) return Number(svc.basePrice);
    if (svc.pricingText) {
        const match = svc.pricingText.match(/[\d,]+/);
        if (match) return parseInt(match[0].replace(/,/g, ''), 10);
    }
    return 0;
};

export default function TechHelperScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ subscriptionId?: string }>();
    const { isDarkMode } = useTheme();

    // State for multi-select checkboxes
    const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
    const [otherIssue, setOtherIssue] = useState('');

    // State for mode selection (radio button)
    const [selectedMode, setSelectedMode] = useState<'home' | 'phone'>('home');
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
    const [showDatePicker, setShowDatePicker] = React.useState(false);
    const [showTimePicker, setShowTimePicker] = React.useState(false);
    const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
    const [cityId, setCityId] = React.useState('');
    const [serviceId, setServiceId] = React.useState('');
    const [serviceName, setServiceName] = React.useState('Tech Helper');
    const [servicePrice, setServicePrice] = React.useState(0);
    const [address, setAddress] = React.useState('');
    const [isBooking, setIsBooking] = React.useState(false);
    const [isLoadingInit, setIsLoadingInit] = React.useState(true);

    React.useEffect(() => {
        (async () => {
            try {
                // Fetch location for address
                const hasPermission = await locationService.requestPermission();
                if (hasPermission) {
                    const coords = await locationService.getCurrentLocation();
                    const fetchedAddress = await locationService.getAddressFromCoordinates(coords);
                    setAddress(fetchedAddress);
                }

                // Fetch User Profile for City ID
                const profileRes = await userService.getProfile();
                if (profileRes.success && profileRes.data) {
                    setCityId(profileRes.data.cityId);
                }

                // Fetch Service ID for Tech Helper
                const serviceRes = await apiClient.get<any[]>('/services');
                if (serviceRes.success && serviceRes.data) {
                    const svc = serviceRes.data.find((s: any) => s.slug === 'tech-helper');
                    if (svc) { setServiceId(svc.id); setServiceName(svc.name || 'Tech Helper'); setServicePrice(resolvePrice(svc)); }
                }

            } catch (err) {
                console.log("Initialization failed", err);
            } finally {
                setIsLoadingInit(false);
            }
        })();
    }, []);

    const handleBookService = async () => {
        const selectedLabels = selectedIssues.map(id => ISSUES.find(i => i.id === id)?.title).filter(Boolean);
        const desc = [...selectedLabels, otherIssue].filter(Boolean).join(', ');

        if (!desc || !selectedDate || !address) {
            Alert.alert('Missing Info', 'Please describe the issue, select a date, and ensure address is present.');
            return;
        }

        if (!cityId || !serviceId) {
            Alert.alert('Error', 'Service initialization incomplete. Please try again.');
            return;
        }

        // Derive mode-specific price: home = servicePrice, phone = 66% (rounded)
        const modePrice = selectedMode === 'home'
            ? servicePrice
            : Math.round(servicePrice * 0.66);

        try {
            setIsBooking(true);

            // Upload photos before navigating to checkout
            const uploadedImageUrls = selectedImages.length > 0
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
                params: { bookingPayload, amount: String(modePrice), label: serviceName, ...(params.subscriptionId && { subscriptionId: params.subscriptionId }) },
            });
        } catch (error) {
            console.error('Tech-helper error:', error);
            Alert.alert('Error', 'Failed to book. Please check your connection.');
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
                <Text style={dynamicStyles.headerTitle}>Tech Helper</Text>
            </View>

            {/* ─── Main Content Container ─── */}
            <View style={dynamicStyles.contentContainer}>
                <KeyboardAwareScrollView contentContainerStyle={dynamicStyles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={20}>

                    {/* Hero Title & Tagline */}
                    <Text style={dynamicStyles.mainTitle}>Tech Helper</Text>
                    <Text style={dynamicStyles.subTitle}>We fix phones, Wi-Fi, and TV remotes.</Text>
                    <View style={dynamicStyles.divider} />

                    {/* ─── What's the issue? (Multi-select) ─── */}
                    <Text style={dynamicStyles.sectionTitle}>What&apos;s the issue?</Text>

                    {ISSUES.map((issue) => {
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
                                    <Text style={[dynamicStyles.issueTitle, isSelected && dynamicStyles.issueTitleSelected]}>{issue.title}</Text>
                                    <Text style={dynamicStyles.issueSubTitle}>{issue.sub}</Text>
                                </View>
                            </TouchableOpacity>
                        )
                    })}

                    {/* ─── Something Else? (Text Box) ─── */}
                    <Text style={[dynamicStyles.sectionTitle, { marginTop: 10 }]}>Something Else?</Text>
                    <View style={dynamicStyles.textInputBox}>
                        <TextInput
                            style={dynamicStyles.textInput}
                            placeholder="Describe the problem you are facing..."
                            placeholderTextColor="#898989"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            value={otherIssue}
                            onChangeText={setOtherIssue}
                        />
                    </View>

                    {/* ─── Date & Time Picker ─── */}
                    <View style={{ marginTop: 20, marginBottom: 20 }}>
                        <Text style={dynamicStyles.sectionTitle}>Preferred Date & Time</Text>
                        <TouchableOpacity
                            style={dynamicStyles.dateTimeButton}
                            onPress={() => setShowDatePicker(true)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                            <Text style={[dynamicStyles.dateTimeText, selectedDate && dynamicStyles.dateTimeTextSelected]}>
                                {selectedDate
                                    ? selectedDate.toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })
                                    : 'Select date & time'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {showDatePicker && (
                        <DateTimePicker
                            value={selectedDate || new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            minimumDate={new Date()}
                            onChange={(event, date) => {
                                if (Platform.OS === 'android') {
                                    setShowDatePicker(false);
                                    if (event.type === 'set' && date) {
                                        setSelectedDate(date);
                                        setShowTimePicker(true);
                                    }
                                } else if (date) {
                                    setSelectedDate(date);
                                    setShowTimePicker(true);
                                }
                            }}
                        />
                    )}

                    {showTimePicker && (
                        <DateTimePicker
                            value={selectedDate || new Date()}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, date) => {
                                if (Platform.OS === 'android') {
                                    setShowTimePicker(false);
                                    if (event.type === 'set' && date) {
                                        setSelectedDate(date);
                                    }
                                } else if (date) {
                                    setSelectedDate(date);
                                    setShowTimePicker(false);
                                }
                            }}
                        />
                    )}

                    <View style={{ marginTop: 20 }}>
                        <ImageUploadBox
                            title="Upload Photos (Optional)"
                            subtitle="Show us the error message or broken device"
                            onImagesChange={setSelectedImages}
                        />
                    </View>

                    <View style={dynamicStyles.divider} />

                    {/* ─── Select Mode & Price (Radio Buttons) ─── */}
                    <Text style={dynamicStyles.sectionTitle}>Select Mode</Text>

                    {/* Mode: Home Visit */}
                    <TouchableOpacity
                        style={[dynamicStyles.radioCard, selectedMode === 'home' && dynamicStyles.radioCardSelected]}
                        activeOpacity={0.7}
                        onPress={() => setSelectedMode('home')}
                    >
                        <View style={[dynamicStyles.radioCircle, selectedMode === 'home' && dynamicStyles.radioCircleSelected]} />
                        <View style={dynamicStyles.radioTextGroup}>
                            <Text style={dynamicStyles.radioTitle}>Home Visit</Text>
                            <Text style={dynamicStyles.radioSubTitle}>A buddy comes to teach</Text>
                        </View>
                        <Text style={dynamicStyles.radioPrice}>
                                {servicePrice > 0 ? `₹${servicePrice}` : '...'}
                            </Text>
                    </TouchableOpacity>

                    {/* Mode: Phone Call */}
                    <TouchableOpacity
                        style={[dynamicStyles.radioCard, selectedMode === 'phone' && dynamicStyles.radioCardSelected]}
                        activeOpacity={0.7}
                        onPress={() => setSelectedMode('phone')}
                    >
                        <View style={[dynamicStyles.radioCircle, selectedMode === 'phone' && dynamicStyles.radioCircleSelected]} />
                        <View style={dynamicStyles.radioTextGroup}>
                            <Text style={dynamicStyles.radioTitle}>Phone Call</Text>
                            <Text style={dynamicStyles.radioSubTitle}>Remote help</Text>
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
                        <Text style={dynamicStyles.submitButtonText}>{isLoadingInit ? 'Initializing...' : isBooking ? 'Processing...' : 'Book Tech Support'}</Text>
                    </TouchableOpacity>

                </KeyboardAwareScrollView>
            </View>
        </View>
    );
}

const makeStyles = (isDarkMode: boolean) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.primary,
    },

    /* ─── Header ─── */
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

    /* ─── Content Area ─── */
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
    dateTimeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#1E293B' : Colors.bgCard,
        borderRadius: Radius.md,
        padding: 16,
        borderWidth: 1,
        borderColor: isDarkMode ? '#334155' : Colors.borderLight,
        marginBottom: 12,
    },
    dateTimeText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: isDarkMode ? '#64748B' : Colors.textLight,
        marginLeft: 10,
    },
    dateTimeTextSelected: {
        color: isDarkMode ? '#F1F5F9' : Colors.textDark,
        fontFamily: Fonts.medium,
    },
    sectionTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: isDarkMode ? '#F1F5F9' : Colors.textDark,
        marginBottom: 15,
    },

    /* ─── Checkboxes ─── */
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
        backgroundColor: 'rgba(4, 131, 87, 0.05)',
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

    /* ─── Text Input ─── */
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

    /* ─── Radio Cards ─── */
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
        backgroundColor: 'rgba(4, 131, 87, 0.05)',
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
        borderWidth: 6, // Forms the dot
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

    /* ─── Button ─── */
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
