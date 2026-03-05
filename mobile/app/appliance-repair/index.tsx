import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
    ScrollView,
    TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { locationService } from '@/services/device/locationService';
import ImageUploadBox from '@/components/common/ImageUploadBox';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
const imgHero = require('@/assets/images/fa6360cf6179cebaed29a6c808bafae2d31ad753.png');
const imgCheckmark = require('@/assets/images/bd57304cc6eaf62cb9cca48825822022a152326a.png');
const imgMap = require('@/assets/images/0377518a275775aa53396ca4863e21dce08ad3b6.png');

export default function ApplianceRepairScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [appliance, setAppliance] = React.useState('');
    const [issue, setIssue] = React.useState('');
    const [address, setAddress] = React.useState('Fetching address...');

    React.useEffect(() => {
        (async () => {
            try {
                const hasPermission = await locationService.requestPermission();
                if (hasPermission) {
                    const coords = await locationService.getCurrentLocation();
                    const fetchedAddress = await locationService.getAddressFromCoordinates(coords);
                    setAddress(fetchedAddress);
                } else {
                    setAddress('Location permission denied');
                }
            } catch (err) {
                console.log("Failed to fetch address", err);
                setAddress('Location unavailable');
            }
        })();
    }, []);

    return (
        <View style={styles.screen}>
            {/* White/light content status bar text over dark green header */}
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* ─── Custom Dark Green Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>AC & Appliance Repair</Text>
                <View style={{ width: 40 }} /> {/* spacer for center alignment */}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ─── Hero Section ─── */}
                <View style={styles.heroSection}>
                    <Image source={imgHero} style={styles.heroImage} resizeMode="contain" />
                    <View style={styles.heroTextContainer}>
                        <Text style={styles.heroTitle}>AC & Appliance Repair</Text>
                        <Text style={styles.heroSubtitle}>Concierge Services</Text>
                    </View>
                </View>

                <Text style={styles.heroDescription}>
                    Book a reliabl technician for AC, refrigerator, washing machine, and other household appliance repairs.
                </Text>

                {/* ─── Appliance Details ─── */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Appliance <Text style={{ fontWeight: 'normal', color: '#898989', fontSize: 13 }}>e.g. AC, Fridge...</Text></Text>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Appliance Model / Name"
                            placeholderTextColor="#898989"
                            value={appliance}
                            onChangeText={setAppliance}
                        />
                    </View>

                    <Text style={[styles.sectionTitle, { marginTop: 15 }]}>Issue Description</Text>
                    <View style={styles.textAreaContainer}>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Describe the problem you are facing..."
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            placeholderTextColor="#898989"
                            value={issue}
                            onChangeText={setIssue}
                        />
                    </View>
                </View>

                {/* ─── Upload Photos ─── */}
                <ImageUploadBox
                    title="Upload Photos of the Issue"
                    subtitle="Help our technician understand the problem better"
                />

                {/* ─── Schedule Appointment ─── */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Schedule Appointment</Text>
                    <TouchableOpacity style={styles.datePickerButton}>
                        <Ionicons name="calendar-outline" size={20} color="#048357" style={{ marginRight: 10 }} />
                        <Text style={styles.datePickerText}>Select Date & Time</Text>
                    </TouchableOpacity>
                </View>

                {/* ─── Location Card ─── */}
                <View style={styles.locationCard}>
                    <Text style={styles.sectionTitle}>Location</Text>
                    <View style={styles.locationContainer}>
                        <View style={styles.locationInputBox}>
                            <Ionicons name="location-outline" size={18} color="#048357" style={styles.locationIcon} />
                            <Text style={styles.locationTextPrimary} numberOfLines={1}>
                                {address}
                            </Text>
                        </View>
                        <Image source={imgMap} style={styles.mapImage} />
                    </View>
                </View>


                {/* ─── Book Service Button ─── */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.bookButton}
                        activeOpacity={0.8}
                        onPress={() => {
                            router.push({
                                pathname: '/service-confirmation',
                                params: {
                                    serviceName: 'AC & Appliance Repair',
                                    description: `${appliance} - ${issue}`,
                                    address: address,
                                    fee: '₹149 (Booking Fee)'
                                }
                            });
                        }}
                    >
                        <Text style={styles.bookButtonText}>Book Service</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.bgScreen, // Light cream color matching Figma
    },

    /* ─── Header ─── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingBottom: 15,
        paddingTop: 10,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textWhite,
        textAlign: 'center',
        letterSpacing: -0.24,
    },

    scrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingTop: 30,
        paddingBottom: 40,
    },

    /* ─── Hero Section ─── */
    heroSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
        justifyContent: 'center',
    },
    heroImage: {
        width: 109,
        height: 109,
        marginRight: 10,
    },
    heroTextContainer: {
        flex: 1,
    },
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

    /* ─── Cards Shared ─── */
    card: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.md,
        padding: 18,
        paddingVertical: 20,
        marginBottom: 15,
        ...Shadow.card,
    },
    locationCard: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.md,
        padding: 18,
        marginBottom: 20,
        ...Shadow.card,
    },
    sectionTitle: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: Colors.textDark,
        marginBottom: 14,
        letterSpacing: -0.24,
    },

    /* ─── Inputs ─── */
    textAreaContainer: {
        borderWidth: 1,
        borderColor: Colors.borderLight,
        borderRadius: Radius.sm,
        padding: 10,
        minHeight: 100,
    },
    textArea: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    inputContainer: {
        borderWidth: 1,
        borderColor: Colors.borderLight,
        borderRadius: Radius.sm,
        paddingHorizontal: 10,
        height: 40,
        justifyContent: 'center',
    },
    input: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.borderLight,
        borderRadius: Radius.sm,
        paddingHorizontal: 10,
        height: 40,
    },
    datePickerText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textMuted,
    },

    /* ─── Location Section Details ─── */
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    locationInputBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 0.8,
        borderColor: Colors.borderLight,
        borderRadius: Radius.sm,
        height: 38,
        paddingHorizontal: 10,
        marginRight: 10,
    },
    locationIcon: {
        marginRight: 6,
    },
    locationTextPrimary: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textDark,
    },
    locationTextBold: {
        fontFamily: Fonts.medium,
    },
    mapImage: {
        width: 69,
        height: 69,
        borderRadius: 15,
    },


    /* ─── Main Action Button ─── */
    buttonContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    bookButton: {
        backgroundColor: Colors.primary,
        width: 281,
        height: 48,
        borderRadius: Radius.full,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadow.card,
    },
    bookButtonText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.button,
        color: Colors.textWhite,
    },
});
