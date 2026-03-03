// Doctor Home Visit - Booking Screen
// PRD: Grid of symptoms, smart routing to GP or Physio, Time selection, Address confirmation
import React from 'react';
import {
    View,
    Text,
    Image,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// ─── Figma-exported Assets ───
// Problem Icons (images from disk)
const feverIcon = require('@/assets/images/85703338762dce300aaacb9a05f302adc3d527f4.png');
const bpSugarIcon = require('@/assets/images/a094df3aff84fca10f86363d2a72a2a9a16cb8b9.png');
const generalWeaknessIcon = require('@/assets/images/a4cc4e445884c7ec5ea2ea73c3cf8315b9a5fd4b.png');
const bodyPainIcon = require('@/assets/images/3a3fbbfc074010919d54378e2349e7a3ecdea262.png');
const postSurgeryIcon = require('@/assets/images/cc303b4d8fc2cc0ba55dc7a7b0eaaee1385183f1.png');
const strokeIcon = require('@/assets/images/9c25016906e38b6b999adf0f9fb6cb2adb589322.png');
const frozenShoulderIcon = require('@/assets/images/05879295a9b69201cfab443f22bf9218402f1522.png');
const otherIcon = require('@/assets/images/34a78d011624199a5541b871a68bb218b41e5aba.png');

// Doctor Type Icons
const gpDoctorIcon = require('@/assets/images/9bbd0539ddfd504d8362c951cb07d107b0df9fdf.png');
const physioIcon = require('@/assets/images/ad2bd697d39bc0738ca19a09e58ce4677761ca47.png');

// ─── Constants ───
const PROBLEMS = [
    { label: 'Fever/Flu', icon: feverIcon },
    { label: 'BP/Sugar check', icon: bpSugarIcon },
    { label: 'General Weakness', icon: generalWeaknessIcon },
    { label: 'Body pain/joint pain', icon: bodyPainIcon },
    { label: 'Poster-surgery Rehab', icon: postSurgeryIcon },
    { label: 'Stroke Recovery', icon: strokeIcon },
    { label: 'Frozen shoulder', icon: frozenShoulderIcon },
    { label: 'Other', icon: otherIcon },
];

export default function DoctorVisitScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();

    // ─── BULLETPROOF GRID MATH FOR SMALL SCREENS (< 370px) ───
    // 1. Calculate the exact workable width inside the card
    const scrollPadding = 50; // 25px paddingHorizontal on ScrollView * 2
    const cardPadding = 36; // 18px padding inside sectionCard * 2
    const availableWidth = width - scrollPadding - cardPadding;

    // 2. Exact Item Width: 31.5% ensures 3 items fit perfectly with room for space-between
    const exactProblemWidth = Math.floor(availableWidth * 0.315);
    // 3. Scale the image height dynamically so it doesn't stretch weirdly on small screens
    const exactIconHeight = exactProblemWidth * 0.85;

    // 4. Pad the array to ensure the last row strictly left-aligns
    const paddedProblems = [...PROBLEMS];
    while (paddedProblems.length % 3 !== 0) {
        paddedProblems.push({ empty: true });
    }

    return (
        <View style={styles.screen}>
            <StatusBar style="light" />

            {/* ─── Header Section (Green Background) ─── */}
            <SafeAreaView style={styles.headerSafe} edges={['top']}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Doctor Home Visit</Text>
                    {/* Placeholder for flex layout balance */}
                    <View style={styles.headerRight} />
                </View>
            </SafeAreaView>

            {/* ─── Main Content Card (Cream Background with Top Radius) ─── */}
            <View style={styles.contentCard}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Description Card */}
                    <View style={styles.descCard}>
                        <Text style={styles.descText}>
                            <Text style={styles.descTextBold}>Booking a doctor or </Text>
                            <Text style={styles.descTextGreen}>physiotherapist </Text>
                            <Text style={styles.descTextNormal}>to visit your home for non-emergency issues.</Text>
                        </Text>
                    </View>

                    {/* ─── Select Problem Card ─── */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Select Problem</Text>

                        <View style={styles.problemsGrid}>
                            {paddedProblems.map((item, index) => {
                                // Render invisible spacer if it's a padding item
                                if (item.empty) {
                                    return <View key={`empty-${index}`} style={{ width: exactProblemWidth }} />;
                                }

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.problemItem, { width: exactProblemWidth }]}
                                    >
                                        <View style={[styles.problemIconContainer, { height: exactIconHeight }]}>
                                            <Image source={item.icon} style={styles.problemIcon} resizeMode="cover" />
                                        </View>
                                        <Text style={styles.problemLabel}>{item.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Smart Banner */}
                        <View style={styles.smartBanner}>
                            <View style={styles.smartTag}>
                                <Text style={styles.smartTagText}>Smart :</Text>
                            </View>
                            <Text style={styles.smartBannerText}>
                                Post-surgery, frozen shoulder & stroke visits will auto-select physiotherapist
                            </Text>
                        </View>
                    </View>

                    {/* ─── Select Doctor Type Card ─── */}
                    <View style={styles.sectionCardSmall}>
                        <Text style={styles.sectionTitle}>Select Doctor Type</Text>
                        <View style={styles.doctorTypeRow}>
                            {/* Selected State (General Physician) */}
                            <TouchableOpacity style={[styles.doctorTypeButton, styles.doctorTypeActive]}>
                                <Image source={gpDoctorIcon} style={styles.doctorTypeIconGP} resizeMode="contain" />
                                <Text style={styles.doctorTypeActiveText} numberOfLines={2}>General Physician (MBBS)</Text>
                            </TouchableOpacity>

                            {/* Unselected State (Physiotherapist) */}
                            <TouchableOpacity style={styles.doctorTypeButton}>
                                <Image source={physioIcon} style={styles.doctorTypeIconPhysio} resizeMode="contain" />
                                <Text style={styles.doctorTypeInactiveText} numberOfLines={2}>Physiotherapist</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ─── When? Card ─── */}
                    <View style={styles.sectionCardSmall}>
                        <Text style={styles.sectionTitle}>When?</Text>

                        <TouchableOpacity style={styles.radioOption}>
                            <Ionicons name="radio-button-on" size={20} color="#048357" />
                            <Text style={styles.radioLabelMain}>Come ASAP <Text style={styles.radioLabelSub}>(Urgent)</Text></Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.radioOption}>
                            <Ionicons name="radio-button-off" size={20} color="#AAAEAC" />
                            <Text style={styles.radioLabelMainGreen}>Schedule for later <Text style={styles.radioLabelSub}>(Date & Time Picker)</Text></Text>
                        </TouchableOpacity>
                    </View>

                    {/* ─── Confirm Address Card ─── */}
                    <View style={styles.sectionCardSmall}>
                        <Text style={styles.sectionTitle}>Confirm Address</Text>

                        <View style={styles.addressBox}>
                            <Ionicons name="location-outline" size={16} color="#2F2F2F" style={styles.addressIcon} />
                            <Text style={styles.addressText} numberOfLines={1}>123 Baker st, London</Text>
                            <TouchableOpacity>
                                <Text style={styles.addressEdit}>Edit</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.addressHelper}>Auto-fitted from user profile(Google maps location).</Text>
                    </View>

                    {/* Bottom Padding for Fixed App Bar */}
                    <View style={styles.bottomSpacer} />
                </ScrollView>
            </View>

            {/* ─── Fixed Bottom Bar ─── */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.bookButton} activeOpacity={0.8}>
                    <Text style={styles.bookButtonText}>Book Appointment</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    /* ─── Screen Base ─── */
    screen: {
        flex: 1,
        backgroundColor: '#048357', // Hero green background
    },

    /* ─── Header ─── */
    headerSafe: {
        backgroundColor: '#048357',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 25,
        paddingTop: 10,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontWeight: '600',
        fontSize: 20,
        color: '#FFFFFF',
        letterSpacing: -0.24,
    },
    headerRight: {
        width: 32, // to balance back button width
    },

    /* ─── Main Content Card ─── */
    contentCard: {
        flex: 1,
        backgroundColor: '#FDFDE8', // Off-white cream
        borderTopLeftRadius: 45,
        borderTopRightRadius: 45,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 10,
        overflow: 'hidden',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 25,
        paddingTop: 20,
        paddingBottom: 40,
    },

    /* ─── Description Card ─── */
    descCard: {
        backgroundColor: 'rgba(255,255,255,0.43)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 20,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        // elevation: 2,
    },
    descText: {
        textAlign: 'center',
        lineHeight: 20,
    },
    descTextBold: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 14,
        color: '#2F2F2F',
    },
    descTextGreen: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 14,
        color: '#02743F',
    },
    descTextNormal: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: '400',
        fontSize: 14,
        color: '#777777',
    },

    /* ─── Generic Section Styling ─── */
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 18,
        marginBottom: 16,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 3,
    },
    sectionCardSmall: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 18,
        paddingVertical: 16,
        marginBottom: 16,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 3,
    },
    sectionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontWeight: '600',
        fontSize: 16,
        color: '#02743F',
        marginBottom: 16,
        letterSpacing: -0.24,
    },

    /* ─── Problems Grid (FIXED FOR SMALL SCREENS) ─── */
    problemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between', // CRITICAL: Ensures perfect spacing instead of breaking rows
    },
    problemItem: {
        // Width is handled dynamically inline
        backgroundColor: '#FDFDE8',
        borderRadius: 10,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 2,
        marginBottom: 10, // Replaces gap: 10 for wrapping rows securely
    },
    problemIconContainer: {
        // Height is handled dynamically inline
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
    },
    problemIcon: {
        width: '100%',
        height: '100%',
    },
    problemLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 10, // Dropped down slightly to 10 to fit on 0-320px screens perfectly
        color: '#2F2F2F',
        textAlign: 'center',
        paddingVertical: 8,
        paddingHorizontal: 2,
        lineHeight: 12,
        letterSpacing: -0.24,
    },

    /* ─── Smart Banner ─── */
    smartBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingHorizontal: 4,
    },
    smartTag: {
        backgroundColor: 'rgba(97,172,102,0.6)',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginRight: 6,
    },
    smartTagText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 10,
        color: '#1E1E1E',
    },
    smartBannerText: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: '400',
        fontSize: 10,
        color: 'rgba(2,116,63,0.82)',
        lineHeight: 14,
    },

    /* ─── Select Doctor Type ─── */
    doctorTypeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    doctorTypeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 42, // Increased slightly to comfortably hold wrapped text on 320px screens
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(143,143,143,0.54)',
        paddingHorizontal: 6,
    },
    doctorTypeActive: {
        borderColor: 'rgba(2,116,63,0.57)',
        backgroundColor: 'rgba(2,116,63,0.05)',
    },
    doctorTypeIconGP: {
        width: 23,
        height: 23,
        marginRight: 4,
    },
    doctorTypeIconPhysio: {
        width: 24,
        height: 24,
        marginRight: 4,
    },
    doctorTypeActiveText: {
        flexShrink: 1, // Stops text pushing out of the button on extremely small devices
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 9,
        color: '#02743F',
    },
    doctorTypeInactiveText: {
        flexShrink: 1, // Stops text pushing out of the button on extremely small devices
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 9, // Synced fonts to ensure both buttons are symmetrical
        color: '#02743F',
    },

    /* ─── When? ─── */
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    radioLabelMain: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 12,
        color: '#12653E',
    },
    radioLabelMainGreen: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 12,
        color: '#115234',
    },
    radioLabelSub: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: '400',
        fontSize: 11,
        color: '#777777',
    },

    /* ─── Confirm Address ─── */
    addressBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(217,217,217,0.29)',
        borderWidth: 1,
        borderColor: 'rgba(143,143,143,0.15)',
        borderRadius: 7,
        height: 37,
        paddingHorizontal: 12,
        marginBottom: 6,
    },
    addressIcon: {
        marginRight: 8,
    },
    addressText: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: '400',
        fontSize: 11,
        color: '#2F2F2F',
    },
    addressEdit: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: '400',
        fontSize: 11,
        color: '#02743F',
        marginLeft: 8,
    },
    addressHelper: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontWeight: '400',
        fontSize: 10,
        color: '#02743F',
        marginLeft: 4,
    },

    /* ─── Fixed Bottom Bar ─── */
    bottomSpacer: {
        height: 100,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFF0',
        height: 111,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        alignItems: 'center',
        paddingTop: 18,
    },
    bookButton: {
        width: '85%', // REPLACED Fixed 296 width to prevent overflow on small screens
        maxWidth: 340,
        height: 45,
        backgroundColor: '#02743F',
        borderRadius: 42,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bookButtonText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        fontSize: 14,
        color: '#FFFFFF',
    },
});