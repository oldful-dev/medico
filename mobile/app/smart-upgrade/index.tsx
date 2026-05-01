import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
    Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { planService } from '@/services/api/planService';
import { useUser } from '@/context/UserContext';

// ─── Figma Assets ───
const imgLightning = require('@/assets/images/50ffab5c68d190752695666bb7ec8bee1bc4842a.png'); // Lightning bolt
const imgChart = require('@/assets/images/45958abae6d20cd413b2ccd515807fab5af92fa7.png'); // Pricing table chart

export default function SmartUpgradeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { profile } = useUser();
    const [isBooking, setIsBooking] = React.useState(false);

    // ─── Upgrade handler ────────────────────────────────────────────
    // Same flow as the Plans page:
    // 1. Fetch plans from API to get the Homemaker Plan ID + current quarterly price
    // 2. Call POST /api/subscriptions/initiate → get subscriptionId
    // 3. Navigate to /payment/checkout with subscriptionId (Razorpay opens there)
    // 4. After verify: checkout calls refreshData() to globally update user profile

    const handleUpgrade = async () => {
        if (!profile) {
            Alert.alert('Login Required', 'Please login to upgrade your plan.');
            return;
        }

        // Check if already on an active plan
        const hasActivePlan = profile.subscriptions?.some((s: any) => s.status === 'ACTIVE');
        if (hasActivePlan) {
            Alert.alert('Already Subscribed', 'You already have an active Oldful plan. Manage it from the Plans tab.');
            return;
        }

        try {
            setIsBooking(true);

            // Step 1: Fetch plans to get the Homemaker Plan ID + quarterly price
            const plansRes = await planService.getPlans();
            if (!plansRes.success || !plansRes.data?.length) {
                Alert.alert('Error', 'Could not load plan details. Please try again.');
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
                Alert.alert('Upgrade Failed', subRes.message ?? 'Could not initiate plan. Please try again.');
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
            Alert.alert('Error', 'Failed to process upgrade. Please check your connection.');
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <View style={styles.screen}>
            {/* Header extension */}
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Header ─── */}
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Smart Upgrade</Text>
            </View>

            <KeyboardAwareScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false} 
                keyboardShouldPersistTaps="handled"
                enableOnAndroid
            >
                {/* ─── Main Content Box (Gradient) ─── */}
                <LinearGradient
                    colors={['#7BFBCE', '#FFFFFF']} // Reversing to match the mint-top visual
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.gradientCard}
                >
                    {/* Title with Emoji */}
                    <View style={styles.titleGroup}>
                        <Text style={styles.cardTitle}>Smart Upgrade</Text>
                        <Text style={styles.lightningEmoji}>⚡</Text>
                    </View>

                    <Text style={styles.cardSubtitleMain}>Stop Paying Booking Fees.</Text>
                    <Text style={styles.cardSubtitleMain}>Get Total Home Managment.</Text>

                    <Text style={styles.priceIntroText}>
                        Join the oldful Homemaker Plan for Just <Text style={styles.priceBold}>₹3,499/ month</Text>
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
                        {isBooking ? 'Processing...' : 'View Plan Details & Upgrade'}
                        </Text>
                    </TouchableOpacity>

                    {/* ─── Important Disclaimer ─── */}
                    <Text style={styles.disclaimerHeader}>
                        Important Note <Text style={styles.disclaimerSubtitle}>(Disclaimer)</Text>
                    </Text>

                    <View style={styles.disclaimerBox}>
                        <View style={styles.disclaimerItem}>
                           <Text style={styles.disclaimerText}>
                                <Text style={styles.disclaimerBold}>Booking Fee: </Text>
                                This fee covers the admimisistrative cost of finding, verifying, and scheduling the professional.
                            </Text>
                        </View>
                        <View style={styles.divider} />

                        <View style={styles.disclaimerItem}>
                            <Text style={styles.disclaimerText}>
                                <Text style={styles.disclaimerBold}>Vendor Payments: </Text>
                                The actual cost of repair (spare parts, labour charges, materials) or utility bill amounts must be paid directly to the vendor/provider upon completion.
                            </Text>
                        </View>
                        <View style={styles.divider} />

                        <View style={styles.disclaimerItem}>
                            <Text style={styles.disclaimerText}>
                                <Text style={styles.disclaimerBold}>Supervision: </Text>
                                “Pay-Per-Use” Bookings Include remote Coordination.for physical on-site supervision (having an Oldful staff member stand guard while work is done),you must have an active Oldful plan.
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </KeyboardAwareScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FDFDE8', 
    },

    /* ─── Header ─── */
    headerContainer: {
        backgroundColor: '#048357',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 25,
        paddingTop: 15,
    },
    backButton: {
        marginRight: 12,
        padding: 4,
    },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 22,
        color: '#FFFFFF',
        letterSpacing: -0.24,
    },

    scrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 20,
        paddingBottom: 40,
    },

    /* ─── Gradient Card ─── */
    gradientCard: {
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },

    titleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-Bold', android: 'Poppins_700Bold', default: 'System' }),
        fontSize: 26,
        color: '#472323',
    },
    lightningEmoji: {
        fontSize: 24,
        marginLeft: 4,
    },

    cardSubtitleMain: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 18,
        color: '#2F2F2F',
        lineHeight: 26,
        fontWeight: '600',
    },
    priceIntroText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#555555',
        marginTop: 8,
        marginBottom: 20,
    },
    priceBold: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#2F2F2F',
        fontWeight: '600',
    },

    /* ─── Chart ─── */
    chartContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 24,
    },
    chartImage: {
        width: '100%',
        height: 220,
    },

    /* ─── Upgrade Button ─── */
    upgradeButton: {
        backgroundColor: '#048357', // Changed to match Header
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        marginBottom: 32,
    },
    upgradeButtonText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        color: '#FFFFFF',
        fontSize: 16,
    },

    /* ─── Disclaimer Section ─── */
    disclaimerHeader: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 17,
        color: '#2F2F2F',
        marginBottom: 16,
    },
    disclaimerSubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 15,
        color: '#777',
    },
    disclaimerBox: {
        gap: 2,
    },
    disclaimerItem: {
        paddingVertical: 10,
    },
    disclaimerText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12,
        color: '#444',
        lineHeight: 18,
        textAlign: 'center', // Matching the center alignment in screenshot
    },
    disclaimerBold: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        color: '#1E1E1E',
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#EEEEEE',
        marginHorizontal: -10,
    }
});
