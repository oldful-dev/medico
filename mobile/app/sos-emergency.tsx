// SOS Emergency Screen — Figma frame id: 200:413
// Design: Warm cream background, centered title, concentric ring button, slide-to-call
// NO close button per Figma design

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { SOSButton, SlideToCall, BackgroundGlow } from '@/components/sos';
import SOSCountdown from '@/components/sos/SOSCountdown';
import { sosService } from '@/services/device/sosService';
import { Fonts, Colors, FontSize, Radius } from '@/constants/theme';
import { useTranslation } from 'react-i18next';
import { CustomAlertModal } from '@/components/common/CustomAlertModal';

export default function SOSEmergencyScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const [showCountdown, setShowCountdown] = useState(false);
    const [isTriggering, setIsTriggering] = useState(false);
    const [prefetchedLocation, setPrefetchedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    // Native Alert.alert is globally muted app-wide (see app/_layout.tsx) — every
    // dialog on this screen must use a visible custom modal instead.
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string }>({
        visible: false, title: '', message: '',
    });
    const [limitExceededVisible, setLimitExceededVisible] = useState(false);
    const [limitExceededMsg, setLimitExceededMsg] = useState('');

    // ─── Pre-fetch Location on Mount ───
    useEffect(() => {
        (async () => {
            try {
                const hasPermission = await sosService.requestLocationPermission();
                if (hasPermission) {
                    const loc = await sosService.getCurrentLocation();
                    if (loc) setPrefetchedLocation(loc);
                }
            } catch (e) {
                console.log('Location pre-fetch failed', e);
            }
        })();
    }, []);

    // ─── SOS Trigger Flow ────────────────────
    const handleSOSPress = useCallback(() => {
        setShowCountdown(true);
    }, []);

    const handleCountdownComplete = useCallback(async () => {
        setShowCountdown(false);
        setIsTriggering(true);

        try {
            const result = await sosService.triggerSOS(prefetchedLocation);
            if (result.success) {
                await sosService.callEmergencyHotline('+919480198108');
            } else {
                await sosService.callEmergencyHotline('+919480198108');
                setAlertConfig({
                    visible: true,
                    title: t('sos.partial_alert_title'),
                    message: t('sos.partial_alert_msg'),
                });
            }
        } catch (err: any) {
            if (err?.status === 403 || err?.statusCode === 403 || err?.message?.includes('limit exceeded')) {
                const code = err?.details?.code;
                const message = code === 'PLAN_LIMIT_EXCEEDED'
                    ? (err.message || 'Your plan\'s SOS quota for this period has been used up.')
                    : (err.message || 'Universal limit exceeded. Unsubscribed accounts are strictly limited to 1 emergency SOS dispatch per month.');
                setLimitExceededMsg(message);
                setLimitExceededVisible(true);
            } else {
                try {
                    await sosService.callEmergencyHotline('112');
                } catch {
                    setAlertConfig({
                        visible: true,
                        title: t('sos.emergency_title'),
                        message: t('sos.emergency_fallback_msg'),
                    });
                }
            }
        } finally {
            setIsTriggering(false);
        }
    }, [prefetchedLocation, router, t]);

    const handleCountdownCancel = useCallback(() => {
        setShowCountdown(false);
    }, []);

    return (
        <LinearGradient
            // Figma: warm cream-peach background gradient
            colors={['#FFF8EE', '#FFF3E0', '#FFECD5']}
            style={styles.gradient}
        >
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <StatusBar style="dark" />
                <View style={styles.container}>

                    {/* ─── Header — centered title & subtitle (Figma: Group 483545) ─── */}
                    <View style={styles.headerGroup}>
                        <Text style={styles.titleText}>
                            {isTriggering ? t('sos.contacting_services_title') : t('sos.calling_emergency_title')}
                        </Text>
                        <Text style={styles.subtitleText}>
                            {isTriggering
                                ? t('sos.contacting_services_desc')
                                : t('sos.press_button')}
                        </Text>
                    </View>

                    {/* ─── Center: Concentric Rings + SOS Button (Figma: Group 483543) ─── */}
                    <View style={styles.centerSection}>
                        <BackgroundGlow />
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={handleSOSPress}
                            disabled={isTriggering}
                            style={isTriggering ? { opacity: 0.6 } : undefined}
                        >
                            <SOSButton />
                        </TouchableOpacity>
                    </View>

                    {/* ─── Bottom: Slide to Call + Notifying Text (Figma: Group 483553) ─── */}
                    <View style={styles.bottomSection}>
                        <SlideToCall />
                        <Text style={styles.notifyingText}>
                            {isTriggering
                                ? t('sos.contacts_notified_text')
                                : t('sos.notifying_contacts_text')}
                        </Text>
                    </View>

                </View>

                {/* ─── Countdown Overlay ─── */}
                {showCountdown && (
                    <SOSCountdown
                        seconds={3}
                        onComplete={handleCountdownComplete}
                        onCancel={handleCountdownCancel}
                    />
                )}
            </SafeAreaView>

            <CustomAlertModal
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                iconName="warning-outline"
                buttonText="OK"
                onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            />

            {/* SOS quota-exceeded — 2 real actions (View Plans / Cancel), so it
                needs its own modal since native Alert.alert is globally muted. */}
            <Modal
                visible={limitExceededVisible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setLimitExceededVisible(false)}
            >
                <View style={styles.limitOverlay}>
                    <View style={styles.limitDialog}>
                        <Text style={styles.limitTitle}>SOS Limit Exceeded</Text>
                        <Text style={styles.limitMessage}>{limitExceededMsg}</Text>
                        <TouchableOpacity
                            style={styles.limitPrimaryBtn}
                            activeOpacity={0.85}
                            onPress={() => {
                                setLimitExceededVisible(false);
                                router.push('/plans');
                            }}
                        >
                            <Text style={styles.limitPrimaryBtnText}>View Subscription Plans</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.limitCancelBtn}
                            activeOpacity={0.7}
                            onPress={() => setLimitExceededVisible(false)}
                        >
                            <Text style={styles.limitCancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    /* Root gradient container — Figma warm cream-peach */
    gradient: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 40,
    },

    /* ─── Header ─── */
    // Figma: text centered, no back arrow
    headerGroup: {
        alignItems: 'center',
        paddingTop: 20,
        paddingHorizontal: 40,
        gap: 8,
        width: '100%',
    },
    // Figma id 200:438 "Calling Emergency..." — Bold, ~24px, dark blue-grey
    titleText: {
        fontFamily: Fonts.bold,
        fontSize: 24,
        lineHeight: 32,
        color: '#313A51',
        textAlign: 'center',
    },
    // Figma id 208:444 "To start a call,simply press the button"
    subtitleText: {
        fontFamily: Fonts.regular,
        fontSize: 16,
        lineHeight: 24,
        color: '#6B7280',
        textAlign: 'center',
    },

    /* ─── Center SOS Ring Area ─── */
    centerSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },

    /* ─── Bottom section ─── */
    bottomSection: {
        alignItems: 'center',
        gap: 20,
        paddingHorizontal: 44,
    },

    /* Figma id 215:508 "Notifying Emergency Contacts" */
    notifyingText: {
        fontFamily: Fonts.medium,
        fontSize: 14,
        lineHeight: 17,
        color: '#9CA3AF',
        textAlign: 'center',
    },

    /* ─── SOS Limit Exceeded modal ─── */
    limitOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    limitDialog: {
        backgroundColor: Colors.bgScreen || '#FFFFFF',
        borderRadius: Radius.xl || 16,
        padding: 24,
        width: '100%',
        alignItems: 'center',
    },
    limitTitle: {
        fontFamily: Fonts.bold,
        fontSize: FontSize.heading1 || 20,
        color: Colors.textDark || '#333333',
        marginBottom: 8,
        textAlign: 'center',
    },
    limitMessage: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall || 14,
        color: Colors.textMuted || '#666666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    limitPrimaryBtn: {
        backgroundColor: Colors.primary || '#02743F',
        borderRadius: Radius.lg || 12,
        paddingVertical: 14,
        width: '100%',
        alignItems: 'center',
        marginBottom: 10,
    },
    limitPrimaryBtnText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.button || 16,
        color: '#FFFFFF',
    },
    limitCancelBtn: {
        paddingVertical: 10,
        width: '100%',
        alignItems: 'center',
    },
    limitCancelBtnText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.bodySmall || 14,
        color: Colors.textMuted || '#666666',
    },
});
