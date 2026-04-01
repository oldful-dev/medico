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
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.screen}>
            {/* Header extension */}
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

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
                                <Text style={styles.comingSoonBadgeText}>{t('wellness.coming_soon').toUpperCase()}</Text>
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
        backgroundColor: Colors.primary, // Matches app theme header
    },
    /* ─── Header ─── */
    headerContainer: {
        backgroundColor: '#048357',
        alignItems: 'center',
        paddingVertical: 15,
        paddingBottom: 25,
    },
    headerTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textWhite,
        letterSpacing: -0.24,
    },
    /* ─── Main Content Container (Cream Box) ─── */
    contentContainer: {
        flex: 1,
        backgroundColor: Colors.bgScreen,
        borderTopLeftRadius: Radius.xl * 2,
        borderTopRightRadius: Radius.xl * 2,
        ...Shadow.card,
    },
    scrollContent: {
        paddingTop: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl * 2,
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
        backgroundColor: Colors.primaryDark, // Green highlighting the coming soon
        paddingHorizontal: Spacing.lg,
        paddingVertical: 6,
        borderRadius: Radius.xl,
        borderWidth: 2,
        borderColor: Colors.bgScreen, // Matches body background
    },
    comingSoonBadgeText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.bodySmall,
        color: Colors.textWhite,
        letterSpacing: 1,
    },
    heroHeadline: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading1,
        color: Colors.textBody,
        textAlign: 'center',
        marginBottom: Spacing.sm,
        paddingHorizontal: Spacing.sm,
        lineHeight: 30,
    },
    heroSubHeadline: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textDark,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: Spacing.lg,
    },

    /* ─── Teaser Layout ─── */
    teaserSection: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.xl,
        padding: Spacing.lg,
        ...Shadow.card,
    },
    teaserSectionTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textBody,
        marginBottom: 6,
    },
    teaserSectionSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
        marginBottom: Spacing.xl,
    },

    gridContainer: {
        flexDirection: 'column',
        gap: 15,
    },
    gridItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9F9F9',
        padding: Spacing.md,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
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
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: '#707070', // Greyed-out text effect
        marginBottom: 2,
    },
    gridItemSub: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textLight, // Highly faded subtitle
    },
    footerSpacing: {
        height: 80,
    },
});
