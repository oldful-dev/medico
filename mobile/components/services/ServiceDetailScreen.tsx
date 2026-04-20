/**
 * ServiceDetailScreen — Shared layout wrapper for all Concierge service screens.
 *
 * Figma reference: AC & Appliance Repair screen (node 334:295)
 * Layout (top → bottom):
 *   1. Dark green header (back arrow + title)
 *   2. Hero row (service image + title + subtitle)
 *   3. Description text (centered, muted)
 *   4. Pricing card (bold price chip + disclaimer + bullet checklist)
 *   5. Location card (address input + map thumbnail)
 *   6. [children] — service-specific form fields (date picker, text inputs, etc.)
 *   7. "Book Service" button (full-width rounded pill)
 *
 * Per-service variables:  image, headerTitle, heroTitle, heroSubtitle,
 *                          description, pricingLabel, pricingNote, bulletItems
 */

import React from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    ImageSourcePropType,
    ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Radius, Shadow } from '@/constants/theme';

// ─── Shared static map thumbnail used across all service screens ───
const imgMap = require('@/assets/images/0377518a275775aa53396ca4863e21dce08ad3b6.png');

export interface ServiceDetailScreenProps {
    /** Navigation header title (e.g. "AC & Appliance Repair") */
    headerTitle: string;
    /** Hero section large title (usually same as headerTitle) */
    heroTitle: string;
    /** Hero section subtitle (e.g. "Concierge Services") */
    heroSubtitle: string;
    /** Body description paragraph (centered, muted) */
    description: string;
    /** Hero image (require'd PNG from assets) */
    heroImage: ImageSourcePropType;
    /** Pricing chip label (e.g. "₹499 Booking Fee + Vendor's Bill") */
    pricingLabel: string;
    /** Pricing disclaimer (e.g. "*The vendor's bill depends on actual work needed.") */
    pricingNote?: string;
    /** Bullet checklist items under pricing */
    bulletItems: string[];
    /** Current address string shown in the location card */
    address: string;
    /** Called when user taps "Book Service" */
    onBook: () => void;
    /** Disables the book button while loading / processing */
    isLoading?: boolean;
    /** Label override for book button */
    bookButtonLabel?: string;
    /** Hide pricing section (for services without fixed pricing) */
    hidePricing?: boolean;
    /** Hide location card (for fully online services) */
    hideLocation?: boolean;
    /** Service-specific form fields rendered between location card and book button */
    children?: React.ReactNode;
}

export default function ServiceDetailScreen({
    headerTitle,
    heroTitle,
    heroSubtitle,
    description,
    heroImage,
    pricingLabel,
    pricingNote,
    bulletItems,
    address,
    onBook,
    isLoading = false,
    bookButtonLabel,
    hidePricing = false,
    hideLocation = false,
    children,
}: ServiceDetailScreenProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const buttonLabel = bookButtonLabel ?? (isLoading ? 'Processing...' : 'Book Service');

    return (
        <View style={styles.screen}>
            {/* Status bar safe area — matches header bg */}
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* ─── Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
            </View>

            <KeyboardAwareScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid
                extraScrollHeight={20}
            >
                {/* ─── Hero Row ─── */}
                {/* Figma: 109×109 image left, title+subtitle right */}
                <View style={styles.heroRow}>
                    <Image source={heroImage} style={styles.heroImage} resizeMode="contain" />
                    <View style={styles.heroText}>
                        <Text style={styles.heroTitle}>{heroTitle}</Text>
                        <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
                    </View>
                </View>

                {/* ─── Description ─── */}
                <Text style={styles.heroDescription}>{description}</Text>

                {/* ─── Pricing Card ─── */}
                {!hidePricing && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Pricing</Text>

                        {/* Price chip — Figma: light grey rounded rect, ₹amount bold + rest regular */}
                        <View style={styles.priceChip}>
                            <Text style={styles.priceChipText}>{pricingLabel}</Text>
                        </View>

                        {/* Disclaimer — small italic muted text */}
                        {pricingNote && (
                            <Text style={styles.priceNote}>{pricingNote}</Text>
                        )}

                        {/* Separator line */}
                        <View style={styles.divider} />

                        {/* Bullet items — Figma: 15×15 green circle image with white check + text */}
                        {bulletItems.map((item, i) => (
                            <View key={i} style={styles.bulletRow}>
                                <View style={styles.bulletDot}>
                                    <Ionicons name="checkmark" size={9} color="#FFFFFF" />
                                </View>
                                <Text style={styles.bulletText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* ─── Location Card ─── */}
                {/* Figma: white card, "Location" label, address input row (220w×38h), map thumbnail (69×69) right */}
                {!hideLocation && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Location</Text>
                        <View style={styles.locationRow}>
                            {/* Address input — Figma: 220px wide, 38px tall, 1px border, pin icon left */}
                            <View style={styles.locationInputBox}>
                                <Ionicons name="location-outline" size={15} color={Colors.primary} style={{ marginRight: 5 }} />
                                <Text style={styles.locationText} numberOfLines={1}>
                                    {address || 'Fetching location...'}
                                </Text>
                            </View>
                            {/* Map — Figma: 69×69, border-radius ~12, right of input */}
                            <Image source={imgMap} style={styles.mapThumb} />
                        </View>
                    </View>
                )}

                {/* ─── Service-specific fields ─── */}
                {children}

                {/* ─── Book Service Button ─── */}
                <View style={styles.buttonWrap}>
                    <TouchableOpacity
                        style={[styles.bookButton, isLoading && { opacity: 0.65 }]}
                        activeOpacity={0.85}
                        disabled={isLoading}
                        onPress={onBook}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.bookButtonText}>{buttonLabel}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAwareScrollView>
        </View>
    );
}

// ─── Shared Styles — used by per-screen form field children ─────────────────
export const sharedStyles = StyleSheet.create({
    /** White card — matches ServiceDetailScreen card style exactly */
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 13,
        padding: 18,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
    },
    /** Form field label — Figma: 13px LexendDeca medium, #2F2F2F */
    sectionLabel: {
        fontFamily: Fonts.medium,
        fontSize: 13,
        color: '#2F2F2F',
        marginBottom: 8,
        marginTop: 12,
        letterSpacing: -0.1,
    },
    /** Single-line input row — Figma: height 45, 1px #D9D9D9 border, white bg */
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D9D9D9',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 45,
        backgroundColor: '#FFFFFF',
    },
    /** Text inside inputRow — Figma: 14px LexendDeca regular */
    inputText: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: '#2F2F2F',
    },
    /** Multi-line textarea — Figma: same border as inputRow, minHeight 90 */
    textAreaBox: {
        borderWidth: 1,
        borderColor: '#D9D9D9',
        borderRadius: 8,
        padding: 12,
        minHeight: 90,
        backgroundColor: '#FFFFFF',
    },
    textAreaText: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: '#2F2F2F',
    },
    /** Left icon inside inputRow */
    inputIcon: {
        marginRight: 8,
    },
});


const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.bgScreen, // Cream #FDFDE8
    },

    /* Header — dark green bar */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: 16,
        paddingBottom: 14,
        paddingTop: 10,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textWhite,
        marginLeft: 12,
        letterSpacing: -0.24,
    },

    scrollContent: {
        paddingHorizontal: 17,
        paddingTop: 20,
        paddingBottom: 40,
    },

    /* Hero row — Figma: image at x=16, title at x=118, both within 390w frame */
    heroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        paddingHorizontal: 8,
    },
    heroImage: {
        width: 109,
        height: 109,
        marginRight: 10,
    },
    heroText: {
        flex: 1,
    },
    heroTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: 18,
        color: '#555555',
        marginBottom: 4,
        letterSpacing: -0.24,
    },
    heroSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: '#777777',
        letterSpacing: -0.24,
    },

    /* Description paragraph — Figma: centered, #848484, 14px, lineHeight 20 */
    heroDescription: {
        fontFamily: Fonts.regular,
        fontSize: 14,
        color: '#848484',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
        paddingHorizontal: 4,
        letterSpacing: -0.1,
    },

    /* Card — Figma: white rounded rect, elevation 1, borderRadius ~13 */
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 13,
        padding: 18,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
    },
    cardTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: 16,
        color: '#1A1A1A',
        marginBottom: 12,
        letterSpacing: -0.24,
    },

    /* Pricing chip — Figma: #EBEBEB bg, full-width, 40px tall, border-radius 6 */
    priceChip: {
        backgroundColor: '#EBEBEB',
        borderRadius: 6,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 6,
    },
    priceChipText: {
        fontFamily: Fonts.semiBold,
        fontSize: 14,
        color: '#1A1A1A',
        letterSpacing: -0.2,
    },
    priceNote: {
        fontFamily: Fonts.regular,
        fontSize: 11.5,
        color: '#898989',
        marginBottom: 4,
        letterSpacing: -0.1,
    },
    divider: {
        height: 1,
        backgroundColor: '#EBEBEB',
        marginTop: 10,
        marginBottom: 12,
    },

    /* Bullet row — Figma: 15×15 green circle (screenshot badge icon) + text, 22px row gap */
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    bulletDot: {
        width: 15,
        height: 15,
        borderRadius: 7.5,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        flexShrink: 0,
    },
    bulletText: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: '#2F2F2F',
        flex: 1,
        letterSpacing: -0.1,
    },

    /* Location card — Figma: address input 220w×38h, map 69×69 beside it */
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    locationInputBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D9D9D9',
        borderRadius: 8,
        height: 38,
        paddingHorizontal: 10,
        backgroundColor: '#FFFFFF',
    },
    locationText: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: '#2F2F2F',
        letterSpacing: -0.1,
    },
    mapThumb: {
        width: 69,
        height: 69,
        borderRadius: 12,
        flexShrink: 0,
    },

    /* Book button — Figma: 281×45, primary green, full border-radius */
    buttonWrap: {
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    bookButton: {
        backgroundColor: Colors.primary,
        width: 230,
        height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bookButtonText: {
        fontFamily: Fonts.semiBold,
        fontSize: 14,
        color: '#FFFFFF',
        letterSpacing: 0.1,
    },
});
