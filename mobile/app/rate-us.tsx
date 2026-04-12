import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';

export default function RateUsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handleRateApp = () => {
        // In a real app, this would link to the Google Play Store or App Store ID
        // e.g., Linking.openURL('https://play.google.com/store/apps/details?id=com.oldful.app')
        console.log("Redirecting to Play Store...");
    };

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Rate Oldful</Text>
                <View style={{ width: 34 }} />
            </View>

            <View style={styles.contentCard}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Stars Graphic placeholder */}
                    <View style={styles.starsContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Ionicons key={star} name="star" size={40} color="#FFD700" style={styles.starIcon} />
                        ))}
                    </View>

                    <Text style={styles.pageTitle}>Enjoying Oldful?</Text>

                    <Text style={styles.pageDescription}>
                        Your feedback helps us improve our services and support more families. If you enjoyed using Oldful, please take a moment to rate us on the Play Store.
                    </Text>

                    {/* Why it matters */}
                    <View style={styles.infoCard}>
                        <Text style={styles.sectionTitle}>Why Your Feedback Matters</Text>

                        <View style={styles.listItem}>
                            <Ionicons name="heart" size={18} color={Colors.primary} />
                            <Text style={styles.listText}>Helps us improve elder care services</Text>
                        </View>
                        <View style={styles.listItem}>
                            <Ionicons name="people" size={18} color={Colors.primary} />
                            <Text style={styles.listText}>Helps other families discover trusted support</Text>
                        </View>
                        <View style={styles.listItem}>
                            <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
                            <Text style={styles.listText}>Helps us maintain high service standards</Text>
                        </View>
                    </View>

                    <View style={styles.spacer} />

                    {/* Rate Button */}
                    <TouchableOpacity
                        id="button_rate"
                        style={styles.rateButton}
                        activeOpacity={0.8}
                        onPress={handleRateApp}
                    >
                        <Ionicons name="logo-google-playstore" size={20} color={Colors.textWhite} style={{ marginRight: 8 }} />
                        <Text style={styles.rateButtonText}>Rate Oldful on Play Store</Text>
                    </TouchableOpacity>

                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.primary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.xl,
        paddingTop: Spacing.sm,
    },
    backButton: {
        padding: Spacing.xs,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textWhite,
        textAlign: 'center',
        letterSpacing: -0.24,
    },
    contentCard: {
        flex: 1,
        backgroundColor: Colors.bgScreen,
        borderTopLeftRadius: Radius.xl * 2,
        borderTopRightRadius: Radius.xl * 2,
        overflow: 'hidden',
    },
    scrollContent: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xl * 1.5,
        paddingBottom: Spacing.xl,
        alignItems: 'center',
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    starIcon: {
        marginHorizontal: 4,
    },
    pageTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading1,
        color: Colors.textDark,
        textAlign: 'center',
        marginBottom: Spacing.md,
        letterSpacing: -0.24,
    },
    pageDescription: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textBody,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: Spacing.xl,
        paddingHorizontal: Spacing.sm,
    },
    infoCard: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.md,
        padding: Spacing.xl,
        width: '100%',
        ...Shadow.card,
    },
    sectionTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: Colors.textDark,
        marginBottom: Spacing.lg,
        textAlign: 'center',
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
        gap: Spacing.sm,
    },
    listText: {
        flex: 1,
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textBody,
        lineHeight: 20,
    },
    spacer: {
        height: Spacing.xl * 2,
    },
    rateButton: {
        flexDirection: 'row',
        backgroundColor: Colors.primary,
        width: '100%',
        maxWidth: 320,
        height: 52,
        borderRadius: Radius.full,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadow.card,
    },
    rateButtonText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.button,
        color: Colors.textWhite,
    },
});
