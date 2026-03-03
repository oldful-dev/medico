import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    Platform,
    ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Using local images or placeholder for Hero if a specific illustration isn't explicitly supplied
// For this teaser, we'll build a vibrant Hero with a prominent 'Oldful' logo or generic medical icon 
const imgPlaceholderHero = require('@/assets/images/8f136eff1200bb21c080348f6cdb7ad1c2831bdf.png');

const CATEGORIES = [
    { id: 1, title: 'Genuine Medicines', subtitle: '(Prescription & OTC)', icon: 'medical' },
    { id: 2, title: 'Sugar-Free Foods', subtitle: '(Biscuits, Atta, Snacks)', icon: 'fast-food' },
    { id: 3, title: 'Mobility Aids', subtitle: '(Walking Sticks, Walkers)', icon: 'walk' },
    { id: 4, title: 'Adult Care', subtitle: '(Diapers, Lotions, Hygiene)', icon: 'body' },
    { id: 5, title: 'Health Devices', subtitle: '(BP Monitors, Oximeters)', icon: 'pulse' },
];

export default function WellnessScreen() {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.screen}>
            {/* Header extension */}
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Header ─── */}
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>Oldful Wellness</Text>
            </View>

            <View style={styles.contentContainer}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* ─── The Visual Hook (Hero Section) ─── */}
                    <View style={styles.heroSection}>
                        <View style={styles.heroImageContainer}>
                            {/* We fallback to the meal service image or any generic asset since we lack a specific "senior receiving package" image, but styled beautifully */}
                            <Image source={imgPlaceholderHero} style={styles.heroImage} resizeMode="contain" />
                            <View style={styles.comingSoonBadge}>
                                <Text style={styles.comingSoonBadgeText}>COMING SOON</Text>
                            </View>
                        </View>

                        <Text style={styles.heroHeadline}>The Oldful Wellness Store is Opening Soon!</Text>
                        <Text style={styles.heroSubHeadline}>
                            Genuine Medicines, Senior Care Products, and Daily Essentials delivered to your door.
                        </Text>
                    </View>

                    {/* ─── "What can you buy here?" (Teaser Grid) ─── */}
                    <View style={styles.teaserSection}>
                        <Text style={styles.teaserSectionTitle}>What can you buy here?</Text>
                        <Text style={styles.teaserSectionSubtitle}>
                            A fully-stocked pharmacy and senior-care shop right at your fingertips.
                        </Text>

                        <View style={styles.gridContainer}>
                            {CATEGORIES.map((cat) => (
                                <View key={cat.id} style={styles.gridItem}>
                                    <View style={styles.iconCircle}>
                                        <Ionicons name={cat.icon as any} size={28} color="#A0A0A0" />
                                    </View>
                                    <View style={styles.gridTextGroup}>
                                        <Text style={styles.gridItemTitle}>{cat.title}</Text>
                                        <Text style={styles.gridItemSub}>{cat.subtitle}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.footerSpacing} />
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#048357', // Matches app theme header
    },
    /* ─── Header ─── */
    headerContainer: {
        backgroundColor: '#048357',
        alignItems: 'center',
        paddingVertical: 15,
        paddingBottom: 25,
    },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#FFFFFF',
        letterSpacing: -0.24,
    },
    /* ─── Main Content Container (Cream Box) ─── */
    contentContainer: {
        flex: 1,
        backgroundColor: '#FDFDE8',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    scrollContent: {
        paddingTop: 30,
        paddingHorizontal: 20,
        paddingBottom: 40,
    },

    /* ─── Hero Section ─── */
    heroSection: {
        alignItems: 'center',
        marginBottom: 35,
    },
    heroImageContainer: {
        width: 200,
        height: 180,
        backgroundColor: 'rgba(2, 116, 63, 0.05)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    heroImage: {
        width: 140,
        height: 140,
        opacity: 0.8,
    },
    comingSoonBadge: {
        position: 'absolute',
        bottom: -15,
        backgroundColor: '#02743F', // Green highlighting the coming soon
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#FDFDE8', // Matches body background
    },
    comingSoonBadgeText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 12,
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    heroHeadline: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 22,
        color: '#2F2F2F',
        textAlign: 'center',
        marginBottom: 10,
        paddingHorizontal: 10,
        lineHeight: 30,
    },
    heroSubHeadline: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14,
        color: '#555555',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 15,
    },

    /* ─── Teaser Layout ─── */
    teaserSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    teaserSectionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 18,
        color: '#2F2F2F',
        marginBottom: 6,
    },
    teaserSectionSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13,
        color: '#898989',
        marginBottom: 20,
    },

    gridContainer: {
        flexDirection: 'column',
        gap: 15,
    },
    gridItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9F9F9',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EFEFEF',
    },
    iconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#EAEAEA',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    gridTextGroup: {
        flex: 1,
        justifyContent: 'center',
    },
    gridItemTitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 15,
        color: '#707070', // Greyed-out text effect
        marginBottom: 2,
    },
    gridItemSub: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#A0A0A0', // Highly faded subtitle
    },
    footerSpacing: {
        height: 80,
    },
});
