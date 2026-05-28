import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { apiClient } from '@/services/api/apiClient';
import { useUser } from '@/context/UserContext';
import { planService, Plan } from '@/services/api/planService';

export default function AdjustmentScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colors = useThemeColors();
    const styles = makeStyles(colors);
    const { profile } = useUser();

    const { newPlanId, newBillingCycle, currentSubId } = useLocalSearchParams<{
        newPlanId: string;
        newBillingCycle: string;
        currentSubId: string;
    }>();

    const [isLoading, setIsLoading] = useState(true);
    const [adjustmentData, setAdjustmentData] = useState<any>(null);
    const [targetPlan, setTargetPlan] = useState<Plan | null>(null);
    const [step, setStep] = useState<1 | 2>(1); // 1: Compare, 2: Math
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDowngradeBlocked, setIsDowngradeBlocked] = useState(false);
    const [blockMessage, setBlockMessage] = useState('');

    useEffect(() => {
        const fetchAdjustmentData = async () => {
            try {
                // Fetch Target Plan Details for comparison
                const planRes = await planService.getPlanById(newPlanId);
                if (planRes.success && planRes.data) {
                    setTargetPlan(planRes.data);
                }

                // Fetch Math
                const mathRes = await apiClient.post(`/subscriptions/${currentSubId}/calculate-adjustment`, {
                    newPlanId,
                    newBillingCycle
                }) as any;
                
                if (!mathRes.success) {
                    if (mathRes.downgradeBlocked) {
                        setIsDowngradeBlocked(true);
                        setBlockMessage(mathRes.message || 'Downgrade not available because remaining credit exceeds selected plan value.');
                        setAdjustmentData({
                            newPlanPrice: mathRes.newPlanPrice,
                            proRataCredit: mathRes.proRataCredit,
                            amountToPay: 0
                        });
                        setStep(2); // Skip straight to math to show the blocked state
                    } else {
                        throw new Error(mathRes.message || 'Failed to calculate adjustment');
                    }
                } else {
                    setAdjustmentData(mathRes.data);
                }
            } catch (err: any) {
                Alert.alert('Error', err.message || 'Failed to load adjustment data');
                router.back();
            } finally {
                setIsLoading(false);
            }
        };
        fetchAdjustmentData();
    }, [currentSubId, newPlanId, newBillingCycle]);

    const handleConfirmAdjustment = () => {
        setIsProcessing(true);
        router.push({
            pathname: '/payment/checkout',
            params: {
                subscriptionId: 'TRANSITION_' + currentSubId, 
                upgradeNewPlanId: newPlanId,
                upgradeBillingCycle: newBillingCycle,
                amount: String(adjustmentData.amountToPay),
                label: `Change to ${targetPlan?.name || 'New Plan'}`,
                userName: profile?.name ?? '',
                phone: profile?.phone ?? '',
                email: profile?.email ?? '',
                refreshProfileOnSuccess: '1',
            },
        });
        setIsProcessing(false);
    };

    if (isLoading) {
        return (
            <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={colors.primary} />

            <View style={styles.headerContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => step === 2 && !isDowngradeBlocked ? setStep(1) : router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Change Plan</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}>
                {step === 1 && !isDowngradeBlocked ? (
                    <View>
                        <Text style={styles.title}>Your New Plan</Text>
                        <Text style={styles.subtitle}>See what you get when you switch to the {targetPlan?.name}</Text>
                        
                        <View style={styles.compareCard}>
                            <View style={styles.compareHeader}>
                                <Text style={styles.compareTitle}>{targetPlan?.name} Features</Text>
                            </View>
                            {targetPlan?.benefits?.split(',').map((benefit, idx) => (
                                <View key={idx} style={styles.featureRow}>
                                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                    <Text style={styles.featureText}>{benefit.trim()}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : (
                    <View>
                        <Text style={styles.title}>Review Your Change</Text>
                        
                        <View style={styles.card}>
                            <View style={styles.row}>
                                <Text style={styles.label}>New Plan Price:</Text>
                                <Text style={styles.value}>₹{adjustmentData?.newPlanPrice?.toLocaleString()}</Text>
                            </View>
                            
                            <View style={styles.divider} />
                            
                            <View style={styles.row}>
                                <Text style={styles.label}>Unused Days Credit:</Text>
                                <Text style={[styles.value, { color: '#0EDD94' }]}>
                                    - ₹{adjustmentData?.proRataCredit?.toLocaleString()}
                                </Text>
                            </View>

                            <View style={styles.divider} />

                            {isDowngradeBlocked ? (
                                <View style={styles.errorBox}>
                                    <Ionicons name="warning" size={24} color="#EF4444" />
                                    <Text style={styles.errorText}>
                                        {blockMessage}
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.row}>
                                    <Text style={styles.totalLabel}>Amount to Pay:</Text>
                                    <Text style={styles.totalValue}>₹{adjustmentData?.amountToPay?.toLocaleString()}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </ScrollView>

            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                {step === 1 && !isDowngradeBlocked ? (
                    <TouchableOpacity style={styles.payButton} onPress={() => setStep(2)}>
                        <Text style={styles.payButtonText}>Continue</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity 
                        style={[styles.payButton, isDowngradeBlocked && styles.payButtonDisabled]} 
                        onPress={handleConfirmAdjustment}
                        disabled={isProcessing || isDowngradeBlocked}
                    >
                        {isProcessing ? (
                            <ActivityIndicator size="small" color={colors.textWhite} />
                        ) : (
                            <Text style={styles.payButtonText}>
                                {isDowngradeBlocked ? 'Downgrade Unavailable' : `Proceed to Pay ₹${adjustmentData?.amountToPay?.toLocaleString()}`}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgScreen },
    headerContainer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.primary, paddingHorizontal: Spacing.lg, paddingBottom: 20, paddingTop: 10,
    },
    backButton: { position: 'absolute', left: 20, zIndex: 10 },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading2, color: colors.textWhite },
    
    title: { fontFamily: Fonts.bold, fontSize: 24, color: colors.textDark, marginBottom: 8 },
    subtitle: { fontFamily: Fonts.regular, fontSize: FontSize.body, color: colors.textMuted, marginBottom: Spacing.xl },
    
    compareCard: {
        backgroundColor: colors.bgCard, borderRadius: Radius.xl, padding: Spacing.lg,
        ...Shadow.card, borderWidth: 1, borderColor: colors.primary,
    },
    compareHeader: { borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingBottom: 12, marginBottom: 12 },
    compareTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading3, color: colors.primary },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
    featureText: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: colors.textDark, flex: 1, lineHeight: 22 },

    card: {
        backgroundColor: colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg,
        ...Shadow.card, borderWidth: 1, borderColor: colors.borderLight, marginBottom: Spacing.xl
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
    label: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: colors.textMuted },
    value: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: colors.textDark },
    divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 12 },
    totalLabel: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading2, color: colors.textDark },
    totalValue: { fontFamily: Fonts.bold, fontSize: 28, color: colors.primary },

    errorBox: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: Radius.md,
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 8,
    },
    errorText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.body,
        color: '#EF4444',
        flex: 1,
    },

    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: colors.bgCard, paddingTop: Spacing.md, paddingHorizontal: Spacing.lg,
        borderTopWidth: 1, borderColor: colors.borderLight, elevation: 8,
    },
    payButton: {
        backgroundColor: colors.primary, borderRadius: Radius.md, paddingVertical: 16,
        alignItems: 'center', justifyContent: 'center',
    },
    payButtonDisabled: {
        backgroundColor: colors.textMuted,
    },
    payButtonText: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: colors.textWhite },
});
