import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { Fonts, FontSize, Spacing, Radius } from '@/constants/theme';
import { apiClient } from '@/services/api/apiClient';

interface Responder {
    id: string;
    name: string;
    phone: string;
    specialization?: string;
    profileImageUrl?: string;
}

interface SOSAlert {
    id: string;
    status: 'ACTIVE' | 'RESPONDING' | 'RESOLVED';
    addressSnapshot?: string;
    resolvedAt?: string;
    resolvedNotes?: string;
    callLogNotes?: string;
    adminNotified: boolean;
    familyNotified: boolean;
    createdAt: string;
    responder?: Responder | null;
}

const STATUS_CONFIG = {
    ACTIVE:     { color: '#EF4444', bg: '#FEE2E2', icon: 'alert-circle' as const },
    RESPONDING: { color: '#F59E0B', bg: '#FEF3C7', icon: 'person-circle' as const },
    RESOLVED:   { color: '#10B981', bg: '#D1FAE5', icon: 'checkmark-circle' as const },
};

export default function MySOSAlertsScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors, isDarkMode);

    const [alerts, setAlerts] = useState<SOSAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                setLoading(true);
                setError(null);
                try {
                    const res = await apiClient.get<SOSAlert[]>('/sos/my-alerts');
                    setAlerts(res.data ?? []);
                } catch (err: any) {
                    setError(t('my_sos_alerts.load_failed'));
                } finally {
                    setLoading(false);
                }
            })();
        }, [])
    );

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
            ' at ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const renderItem = ({ item }: { item: SOSAlert }) => {
        const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.ACTIVE;

        // Translate the status label
        const statusLabel = item.status === 'ACTIVE'
            ? t('sos.status_active', 'Active')
            : item.status === 'RESPONDING'
                ? t('sos.status_responding', 'Responding')
                : t('sos.status_resolved', 'Resolved');

        const steps: Array<{ key: string; label: string; done: boolean }> = [
            { key: 'triggered',  label: t('my_sos_alerts.step_triggered'),         done: true },
            { key: 'notified',   label: t('my_sos_alerts.step_team_notified'),     done: item.adminNotified },
            { key: 'responding', label: t('my_sos_alerts.step_responder_assigned'), done: !!item.responder },
            { key: 'resolved',   label: t('my_sos_alerts.step_resolved'),           done: item.status === 'RESOLVED' },
        ];

        return (
            <View style={styles.card}>
                {/* Header */}
                <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                        <Ionicons name={cfg.icon} size={14} color={cfg.color} />
                        <Text style={[styles.statusText, { color: cfg.color }]}>{statusLabel}</Text>
                    </View>
                    <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                </View>

                {/* Address */}
                {item.addressSnapshot ? (
                    <View style={styles.row}>
                        <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.addressText} numberOfLines={2}>{item.addressSnapshot}</Text>
                    </View>
                ) : null}

                {/* Status Timeline */}
                <View style={styles.timeline}>
                    {steps.map((step, i) => (
                        <View key={step.key} style={styles.timelineStep}>
                            <View style={styles.timelineLeft}>
                                <View style={[styles.timelineDot, { backgroundColor: step.done ? cfg.color : colors.borderLight }]}>
                                    {step.done && <Ionicons name="checkmark" size={10} color="#fff" />}
                                </View>
                                {i < steps.length - 1 && (
                                    <View style={[styles.timelineLine, { backgroundColor: steps[i + 1].done ? cfg.color : colors.borderLight }]} />
                                )}
                            </View>
                            <Text style={[styles.timelineLabel, { color: step.done ? colors.textDark : colors.textMuted }]}>
                                {step.label}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Assigned Responder */}
                {item.responder ? (
                    <View style={styles.staffBox}>
                        <View style={styles.staffAvatar}>
                            <Ionicons name="person" size={18} color="#02743F" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.staffName}>{item.responder.name}</Text>
                            <Text style={styles.staffMeta}>
                                {item.responder.specialization ?? t('my_sos_alerts.responder')} · {item.responder.phone}
                            </Text>
                        </View>
                        <Ionicons name="shield-checkmark" size={16} color="#02743F" />
                    </View>
                ) : (
                    <View style={styles.noStaffBox}>
                        <Ionicons name="person-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.noStaffText}>{t('my_sos_alerts.no_responder')}</Text>
                    </View>
                )}

                {/* Resolved timestamp */}
                {item.resolvedAt ? (
                    <View style={styles.row}>
                        <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                        <Text style={styles.metaText}>{t('my_sos_alerts.resolved_at', { date: formatDate(item.resolvedAt) })}</Text>
                    </View>
                ) : null}

                {/* Notes */}
                {item.resolvedNotes ? (
                    <View style={styles.notesBox}>
                        <Text style={styles.notesLabel}>{t('my_sos_alerts.resolution_notes')}</Text>
                        <Text style={styles.notesText}>{item.resolvedNotes}</Text>
                    </View>
                ) : null}

                {item.callLogNotes ? (
                    <View style={styles.notesBox}>
                        <Text style={styles.notesLabel}>{t('my_sos_alerts.call_notes')}</Text>
                        <Text style={styles.notesText}>{item.callLogNotes}</Text>
                    </View>
                ) : null}
            </View>
        );
    };

    return (
        <View style={styles.screen}>
            <StatusBar style="light" backgroundColor="#02743F" />
            <SafeAreaView style={styles.headerSafe} edges={['top']}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('my_sos_alerts.header')}</Text>
                    <View style={{ width: 36 }} />
                </View>
            </SafeAreaView>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#02743F" />
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
                    <Text style={styles.emptyText}>{error}</Text>
                </View>
            ) : alerts.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="shield-checkmark-outline" size={56} color="#10B981" />
                    <Text style={styles.emptyTitle}>{t('my_sos_alerts.empty_title')}</Text>
                    <Text style={styles.emptySubtitle}>{t('my_sos_alerts.empty_subtitle')}</Text>
                </View>
            ) : (
                <FlatList
                    data={alerts}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <Text style={styles.countLabel}>
                            {t(alerts.length === 1 ? 'my_sos_alerts.alert_count_one' : 'my_sos_alerts.alert_count_other', { count: alerts.length })}
                        </Text>
                    }
                />
            )}
        </View>
    );
}

function makeStyles(colors: ThemeColors, isDarkMode: boolean) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.bgScreen },
        headerSafe: { backgroundColor: '#02743F' },
        headerRow: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: Spacing.md, paddingVertical: 12,
        },
        backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
        headerTitle: { color: '#FAF7ED', fontSize: FontSize.heading2, fontFamily: Fonts.semiBold },
        center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
        emptyTitle: { fontSize: FontSize.heading2, fontFamily: Fonts.semiBold, color: colors.textDark, marginTop: 16 },
        emptySubtitle: { fontSize: FontSize.bodySmall, color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
        emptyText: { fontSize: FontSize.bodySmall, color: colors.textMuted, marginTop: 12, textAlign: 'center' },
        list: { padding: Spacing.md, gap: 12 },
        countLabel: { fontSize: FontSize.bodySmall, color: colors.textMuted, marginBottom: 4 },

        // Card
        card: {
            backgroundColor: colors.bgCard,
            borderRadius: Radius.lg,
            padding: Spacing.md,
            borderWidth: 1,
            borderColor: colors.borderLight,
            gap: 8,
        },
        cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        statusBadge: {
            flexDirection: 'row', alignItems: 'center', gap: 4,
            paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
        },
        statusText: { fontSize: 12, fontFamily: Fonts.semiBold },
        dateText: { fontSize: 12, color: colors.textMuted, fontFamily: Fonts.regular },
        row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
        addressText: { flex: 1, fontSize: FontSize.bodySmall, color: colors.textMuted, lineHeight: 18 },
        metaText: { fontSize: FontSize.bodySmall, color: colors.textMuted },

        // Timeline
        timeline: {
            flexDirection: 'column',
            paddingVertical: 4,
            paddingHorizontal: 2,
        },
        timelineStep: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
            minHeight: 32,
        },
        timelineLeft: {
            alignItems: 'center',
            width: 18,
        },
        timelineDot: {
            width: 18,
            height: 18,
            borderRadius: 9,
            justifyContent: 'center',
            alignItems: 'center',
        },
        timelineLine: {
            width: 2,
            flex: 1,
            minHeight: 12,
            marginTop: 2,
        },
        timelineLabel: {
            flex: 1,
            fontSize: FontSize.bodySmall,
            fontFamily: Fonts.medium,
            paddingTop: 1,
            lineHeight: 18,
        },

        // Responder Staff Box
        staffBox: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: isDarkMode ? 'rgba(2,116,63,0.12)' : 'rgba(2,116,63,0.07)',
            borderRadius: Radius.md,
            borderWidth: 1,
            borderColor: isDarkMode ? 'rgba(2,116,63,0.25)' : 'rgba(2,116,63,0.2)',
            padding: 10,
        },
        staffAvatar: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: isDarkMode ? 'rgba(2,116,63,0.2)' : 'rgba(2,116,63,0.1)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        staffName: {
            fontFamily: Fonts.semiBold,
            fontSize: FontSize.bodySmall,
            color: colors.textDark,
        },
        staffMeta: {
            fontFamily: Fonts.regular,
            fontSize: FontSize.caption,
            color: colors.textMuted,
            marginTop: 1,
        },
        noStaffBox: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 6,
            paddingHorizontal: 2,
        },
        noStaffText: {
            fontSize: FontSize.bodySmall,
            color: colors.textMuted,
            fontFamily: Fonts.regular,
            fontStyle: 'italic',
        },

        // Notes
        notesBox: {
            backgroundColor: colors.bgScreen,
            borderRadius: Radius.sm,
            padding: 10,
            gap: 2,
        },
        notesLabel: { fontSize: 11, fontFamily: Fonts.semiBold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
        notesText: { fontSize: FontSize.bodySmall, color: colors.textDark, lineHeight: 18 },
    });
}
