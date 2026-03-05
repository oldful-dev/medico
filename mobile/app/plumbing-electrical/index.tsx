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
const imgHero = require('@/assets/images/8ce612b04a3a83f1e834c7b71a6dd2c0174cb918.png'); // Clamp/pliers icon
const imgCheckmark = require('@/assets/images/bd57304cc6eaf62cb9cca48825822022a152326a.png');
const imgMap = require('@/assets/images/0377518a275775aa53396ca4863e21dce08ad3b6.png');

export default function PlumbingElectricalScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [address, setAddress] = React.useState('');
    const [isFetchingLocation, setIsFetchingLocation] = React.useState(true);
    const [serviceType, setServiceType] = React.useState('');
    const [issue, setIssue] = React.useState('');

    React.useEffect(() => {
        (async () => {
            try {
                const hasPermission = await locationService.requestPermission();
                if (hasPermission) {
                    const coords = await locationService.getCurrentLocation();
                    const fetchedAddress = await locationService.getAddressFromCoordinates(coords);
                    setAddress(fetchedAddress);
                }
            } catch (err) {
                console.log("Failed to fetch location", err);
            } finally {
                setIsFetchingLocation(false);
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
                <Text style={styles.headerTitle}>Plumbing & Electrical</Text>
                <View style={{ width: 40 }} /> {/* spacer for center alignment */}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ─── Hero Section ─── */}
                <View style={styles.heroSection}>
                    <Image source={imgHero} style={styles.heroImage} resizeMode="contain" />
                    <View style={styles.heroTextContainer}>
                        <Text style={styles.heroTitle}>Plumbing & Electrical</Text>
                        <Text style={styles.heroSubtitle}>Concierge Services</Text>
                    </View>
                </View>

                <Text style={styles.heroDescription}>
                    Book a certified plumber or electrian for repairs and installations in your home
                </Text>

                {/* ─── Issue Details ─── */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Issue Details</Text>

                    <Text style={[styles.sectionTitle, { fontSize: 13, marginBottom: 8, marginTop: 5 }]}>Service Type</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="construct-outline" size={18} color="#048357" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Plumbing, Electrical..."
                            placeholderTextColor="#898989"
                            value={serviceType}
                            onChangeText={setServiceType}
                        />
                    </View>

                    <Text style={[styles.sectionTitle, { fontSize: 13, marginBottom: 8, marginTop: 15 }]}>Issue Description</Text>
                    <View style={[styles.inputContainer, { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
                        <Ionicons name="information-circle-outline" size={18} color="#048357" style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                            placeholder="Describe the issue you are facing..."
                            placeholderTextColor="#898989"
                            multiline
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

                {/* ─── Location Details ─── */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Location</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="location-outline" size={18} color="#048357" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder={isFetchingLocation ? "Fetching location..." : "Enter your full address"}
                            placeholderTextColor="#898989"
                            value={address}
                            onChangeText={setAddress}
                        />
                    </View>
                </View>

                {/* ─── Schedule ─── */}
                <View style={[styles.card, { marginBottom: 100 }]}>
                    <Text style={styles.sectionTitle}>Preferred Date & Time</Text>
                    <TouchableOpacity style={styles.datePickerButton}>
                        <Ionicons name="calendar-outline" size={20} color="#048357" style={{ marginRight: 10 }} />
                        <Text style={styles.datePickerText}>Select Date & Time</Text>
                    </TouchableOpacity>
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
                                    serviceName: 'Plumbing & Electrical',
                                    description: `${serviceType} - ${issue}`,
                                    address: address,
                                    fee: '₹99 (Booking Fee)'
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
        paddingHorizontal: 15,
        marginVertical: 10,
        marginBottom: 20,
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
    sectionTitle: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: Colors.textDark,
        marginBottom: 14,
        letterSpacing: -0.24,
    },

    /* ─── Inputs ─── */
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.borderLight,
        borderRadius: Radius.sm,
        paddingHorizontal: 12,
        height: 45,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
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
        height: 45,
    },
    datePickerText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textMuted,
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
