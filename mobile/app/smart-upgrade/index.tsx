import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Alert, KeyboardAvoidingView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { planService } from '@/services/api/planService';
import { useUser } from '@/context/UserContext';
import { useTranslation } from 'react-i18next';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';

// ─── Figma Assets ───
const imgLightning = require('@/assets/images/50ffab5c68d190752695666bb7ec8bee1bc4842a.png'); // Lightning bolt
const imgChart = require('@/assets/images/45958abae6d20cd413b2ccd515807fab5af92fa7.png'); // Pricing table chart

export default function SmartUpgradeScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { profile } = useUser();
    const colors = useThemeColors();
    const { isDarkMode } = useTheme();
    const styles = makeStyles(colors, isDarkMode);
    const [isBooking, setIsBooking] = React.useState(false);

    // ─── Upgrade handler ────────────────────────────────────────────
    // Same flow as the Plans page:
    // 1. Fetch plans from API to get the Homemaker Plan ID + current quarterly price
    // 2. Call POST /api/subscriptions/initiate → get subscriptionId
    // 3. Navigate to /payment/checkout with subscriptionId (Razorpay opens there)
    // 4. After verify: checkout calls refreshData() to globally update user profile

    const handleUpgrade = async () => {
        if (!profile) {
            Alert.alert(t('smart_upgrade.login_required'), t('smart_upgrade.login_required_desc'));
            return;
        }

        // Check if already on an active plan
        const hasActivePlan = profile.subscriptions?.some((s: any) => s.status === 'ACTIVE');
        if (hasActivePlan) {
            Alert.alert(t('smart_upgrade.already_subscribed'), t('smart_upgrade.already_subscribed_desc'));
            return;
        }

        try {
            setIsBooking(true);

            // Step 1: Fetch plans to get the Homemaker Plan ID + quarterly price
            const plansRes = await planService.getPlans();
            if (!plansRes.success || !plansRes.data?.length) {
                Alert.alert(t('smart_upgrade.error'), t('smart_upgrade.load_plan_error'));
                return;
            }

            // Find the Homemaker Plan (fallback to first plan if not found)
            const plan = plansRes.data.find(p =>
                p.name.toLowerCase().includes('homemaker')
            ) ?? plansRes.data[0];

            const price = plan.quarterlyPrice; // Smart Upgrade promotes the quarterly rate

            // Step 2: Initiate subscription on backend (PAYMENT_PENDING)
            const subRes = await planService.initiateSubscription({
                planId: plan.id,
                billingCycle: 'QUARTERLY',
                amount: price,
            });

            if (!subRes.success || !subRes.data) {
                Alert.alert(t('smart_upgrade.upgrade_failed'), subRes.message ?? t('smart_upgrade.initiate_error'));
                return;
            }

            // Step 3: Navigate to checkout → opens Razorpay natively
            // refreshProfileOnSuccess ensures the active plan badge updates globally after payment
            router.push({
                pathname: '/payment/checkout',
                params: {
                    subscriptionId: subRes.data.id,
                    amount: String(price),
                    label: `${plan.name} — Quarterly`,
                    userName: profile.name ?? '',
                    phone: profile.phone ?? '',
                    email: profile.email ?? '',
                    refreshProfileOnSuccess: '1',
                },
            });
        } catch (error) {
            console.error('Upgrade error:', error);
            Alert.alert(t('smart_upgrade.error'), t('smart_upgrade.process_error'));
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <View style={styles.screen}>
            {/* Header extension */}
            <View style={{ backgroundColor: isDarkMode ? colors.bgHeader : colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={isDarkMode ? colors.bgHeader : colors.primary} />

            {/* ─── Header ─── */}
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('smart_upgrade.header')}</Text>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <KeyboardAwareScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false} 
                keyboardShouldPersistTaps="handled"
                enableOnAndroid
            >
                {/* ─── Main Content Box (Gradient) ─── */}
                <LinearGradient
                    colors={isDarkMode ? ['#143D30', colors.bgCard] : ['#7BFBCE', '#FFFFFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.gradientCard}
                >
                    {/* Title with Emoji */}
                    <View style={styles.titleGroup}>
                        <Text style={styles.cardTitle}>{t('smart_upgrade.card_title')}</Text>
                        <Text style={styles.lightningEmoji}>⚡</Text>
                    </View>

                    <Text style={styles.cardSubtitleMain}>{t('smart_upgrade.tagline_1')}</Text>
                    <Text style={styles.cardSubtitleMain}>{t('smart_upgrade.tagline_2')}</Text>

                    <Text style={styles.priceIntroText}>
                        {t('smart_upgrade.price_intro')} <Text style={styles.priceBold}>{t('smart_upgrade.price_bold')}</Text>
                    </Text>

                    {/* ─── Pricing Chart Image ─── */}
                    <View style={styles.chartContainer}>
                        <Image source={imgChart} style={styles.chartImage} resizeMode="contain" />
                    </View>

                    {/* ─── Upgrade Button ─── */}
                    <TouchableOpacity
                        style={[styles.upgradeButton, isBooking && { opacity: 0.7 }]}
                        activeOpacity={0.8}
                        disabled={isBooking}
                        onPress={handleUpgrade}
                    >
                        <Text style={styles.upgradeButtonText}>
                        {isBooking ? t('smart_upgrade.processing') : t('smart_upgrade.upgrade_btn')}
                        </Text>
                    </TouchableOpacity>

                    {/* ─── Important Disclaimer ─── */}
                    <Text style={styles.disclaimerHeader}>
                        {t('smart_upgrade.disclaimer_header')} <Text style={styles.disclaimerSubtitle}>{t('smart_upgrade.disclaimer_sub')}</Text>
                    </Text>

                    <View style={styles.disclaimerBox}>
                        <View style={styles.disclaimerItem}>
                           <Text style={styles.disclaimerText}>
                                <Text style={styles.disclaimerBold}>{t('smart_upgrade.disc_booking_fee_label')} </Text>
                                {t('smart_upgrade.disc_booking_fee_text')}
                            </Text>
                        </View>
                        <View style={styles.divider} />

                        <View style={styles.disclaimerItem}>
                            <Text style={styles.disclaimerText}>
                                <Text style={styles.disclaimerBold}>{t('smart_upgrade.disc_vendor_label')} </Text>
                                {t('smart_upgrade.disc_vendor_text')}
                            </Text>
                        </View>
                        <View style={styles.divider} />

                        <View style={styles.disclaimerItem}>
                            <Text style={styles.disclaimerText}>
                                <Text style={styles.disclaimerBold}>{t('smart_upgrade.disc_supervision_label')} </Text>
                                {t('smart_upgrade.disc_supervision_text')}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </KeyboardAwareScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const makeStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: isDarkMode ? colors.bgScreen : colors.primary,
    },
    headerContainer: {
        backgroundColor: isDarkMode ? colors.bgHeader : colors.primary,
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
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    gradientCard: {
        borderRadius: 20,
        padding: 20,
        marginTop: 8,
    },
    titleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: isDarkMode ? colors.textDark : '#1A1A1A',
        flex: 1,
    },
    lightningEmoji: {
        fontSize: 24,
    },
    cardSubtitleMain: {
        fontSize: 14,
        fontWeight: '600',
        color: isDarkMode ? colors.textBody : '#2F2F2F',
        marginBottom: 2,
    },
    priceIntroText: {
        fontSize: 13,
        color: isDarkMode ? colors.textMuted : '#444',
        marginTop: 10,
        marginBottom: 4,
    },
    priceBold: {
        fontWeight: '800',
        color: isDarkMode ? colors.primaryText : '#02743F',
        fontSize: 15,
    },
    chartContainer: {
        alignItems: 'center',
        marginVertical: 16,
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
        borderRadius: 12,
        padding: 10,
    },
    chartImage: {
        width: '100%',
        height: 180,
    },
    upgradeButton: {
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        marginBottom: 20,
    },
    upgradeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    disclaimerHeader: {
        fontSize: 13,
        fontWeight: '700',
        color: isDarkMode ? colors.textDark : '#1A1A1A',
        marginBottom: 8,
    },
    disclaimerSubtitle: {
        fontWeight: '400',
        color: isDarkMode ? colors.textMuted : '#666',
    },
    disclaimerBox: {
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
        borderRadius: 10,
        padding: 12,
    },
    disclaimerItem: {
        paddingVertical: 8,
    },
    disclaimerText: {
        fontSize: 12,
        color: isDarkMode ? '#CCC' : '#555',
        lineHeight: 18,
    },
    disclaimerBold: {
        fontWeight: '700',
        color: isDarkMode ? '#EEE' : '#222',
    },
    divider: {
        height: 1,
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
        marginHorizontal: -10,
    },
});
