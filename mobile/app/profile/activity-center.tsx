import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList,
    ActivityIndicator, Linking, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, Fonts } from '@/constants/theme';
import { activityService, ActivityUpdate } from '@/services/api/activityService';
import { useUser } from '@/context/UserContext';
import { initSocket, joinUserRoom, onSocket } from '@/services/socket/socketManager';

// ─── Event config ─────────────────────────────────────────

const EVENT_CONFIG: Record<string, {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    iconBg: string;
    accentColor: string;
    accentBg: string;
}> = {
    doctor_assigned:       { label: 'Doctor Assigned',       icon: 'medical-outline',          iconColor: '#2563EB', iconBg: '#DBEAFE', accentColor: '#1D4ED8', accentBg: '#EFF6FF' },
    caregiver_assigned:    { label: 'Caregiver Assigned',    icon: 'heart-outline',             iconColor: '#DB2777', iconBg: '#FCE7F3', accentColor: '#BE185D', accentBg: '#FDF2F8' },
    nurse_assigned:        { label: 'Nurse Assigned',        icon: 'bandage-outline',           iconColor: '#7C3AED', iconBg: '#EDE9FE', accentColor: '#6D28D9', accentBg: '#F5F3FF' },
    appointment_confirmed: { label: 'Appointment Confirmed', icon: 'checkmark-circle-outline',  iconColor: '#059669', iconBg: '#D1FAE5', accentColor: '#047857', accentBg: '#ECFDF5' },
    sample_collected:      { label: 'Lab Sample Collected',  icon: 'flask-outline',             iconColor: '#7C3AED', iconBg: '#EDE9FE', accentColor: '#6D28D9', accentBg: '#F5F3FF' },
    out_for_delivery:      { label: 'Order Out for Delivery',icon: 'bicycle-outline',           iconColor: '#D97706', iconBg: '#FEF3C7', accentColor: '#B45309', accentBg: '#FFFBEB' },
    medicine_delivered:    { label: 'Medicine Delivered',    icon: 'bag-check-outline',         iconColor: '#048357', iconBg: '#D1FAE5', accentColor: '#065F46', accentBg: '#ECFDF5' },
    service_rescheduled:   { label: 'Service Rescheduled',   icon: 'calendar-outline',          iconColor: '#EA580C', iconBg: '#FFEDD5', accentColor: '#C2410C', accentBg: '#FFF7ED' },
    payment_confirmed:     { label: 'Payment Confirmed',     icon: 'card-outline',              iconColor: '#0284C7', iconBg: '#E0F2FE', accentColor: '#0369A1', accentBg: '#F0F9FF' },
};


// ─── Helpers ──────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
    try {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    } catch { return ''; }
}

// ─── Card ─────────────────────────────────────────────────

function UpdateCard({ item }: { item: ActivityUpdate }) {
    const cfg = EVENT_CONFIG[item.eventType];

    return (
        <View style={styles.card}>
            {/* Accent left border */}
            <View style={[styles.cardAccent, { backgroundColor: cfg.iconColor }]} />

            <View style={styles.cardInner}>

                {/* ── Row 1: event badge + timestamp ── */}
                <View style={styles.row1}>
                    <View style={[styles.eventBadge, { backgroundColor: cfg.accentBg }]}>
                        <Ionicons name={cfg.icon} size={12} color={cfg.accentColor} />
                        <Text style={[styles.eventLabel, { color: cfg.accentColor }]}>{cfg.label}</Text>
                    </View>
                    <Text style={styles.timestamp}>{formatRelativeTime(item.createdAt)}</Text>
                </View>

                {/* ── Row 2: service type ── */}
                <Text style={styles.serviceType}>{item.serviceType}</Text>

                {/* ── Row 3: staff block ── */}
                <View style={[styles.staffBlock, { borderColor: cfg.iconBg }]}>
                    {/* Photo */}
                    {item.staffPhotoUrl ? (
                        <Image source={{ uri: item.staffPhotoUrl }} style={styles.staffPhoto} />
                    ) : (
                        <View style={[styles.staffPhotoFallback, { backgroundColor: cfg.iconBg }]}>
                            <Ionicons name="person" size={20} color={cfg.iconColor} />
                        </View>
                    )}

                    {/* Info */}
                    <View style={styles.staffInfo}>
                        <Text style={styles.staffName}>{item.staffName}</Text>
                        <Text style={styles.staffMeta}>
                            <Text style={styles.staffIdLabel}>ID  </Text>
                            <Text style={styles.staffIdValue}>{item.staffId}</Text>
                        </Text>
                        <Text style={styles.staffPhone}>{item.staffPhone}</Text>
                    </View>

                    {/* Call button */}
                    <TouchableOpacity
                        style={[styles.callBtn, { backgroundColor: cfg.iconColor }]}
                        onPress={() => Linking.openURL(`tel:${item.staffPhone}`)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="call" size={16} color="#fff" />
                        <Text style={styles.callBtnText}>Call</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Row 4: ETA + status detail ── */}
                <View style={styles.row4}>
                    {item.eta ? (
                        <View style={styles.etaBadge}>
                            <Ionicons name="navigate-circle-outline" size={13} color="#059669" />
                            <Text style={styles.etaText}>ETA  {item.eta}</Text>
                        </View>
                    ) : null}
                    {item.statusDetail ? (
                        <Text style={styles.statusDetail} numberOfLines={1}>{item.statusDetail}</Text>
                    ) : null}
                </View>

            </View>
        </View>
    );
}

// ─── Screen ───────────────────────────────────────────────

export default function ActivityCenterScreen() {
    const router = useRouter();
    const { profile } = useUser();
    const [updates, setUpdates] = useState<ActivityUpdate[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchUpdates = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const res = await activityService.getMyUpdates();
            const data: ActivityUpdate[] = (res as any)?.data || [];
            setUpdates(data);
        } catch { }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // ─── Socket.io Setup ──────────────────────────────────────
    useEffect(() => {
        const setupSocket = async () => {
            try {
                // Initialize socket with auth token
                await initSocket();

                // Join user room to receive personal updates
                if (profile?.id) {
                    await joinUserRoom(profile.id);
                }

                // Listen for new activity updates
                const unsubscribeCreate = onSocket('activity_update_created', (update: ActivityUpdate) => {
                    console.log('[ActivityCenter] New activity:', update.eventType);
                    setUpdates(prev => [update, ...prev]);
                });

                // Listen for edited activities
                const unsubscribeEdit = onSocket('activity_update_edited', (update: ActivityUpdate) => {
                    console.log('[ActivityCenter] Updated activity:', update.id);
                    setUpdates(prev => prev.map(u => u.id === update.id ? update : u));
                });

                // Listen for deleted activities
                const unsubscribeDelete = onSocket('activity_update_deleted', (updateId: string) => {
                    console.log('[ActivityCenter] Deleted activity:', updateId);
                    setUpdates(prev => prev.filter(u => u.id !== updateId));
                });

                // Cleanup on unmount
                return () => {
                    unsubscribeCreate();
                    unsubscribeEdit();
                    unsubscribeDelete();
                };
            } catch (err) {
                console.error('[ActivityCenter] Socket setup error:', err);
            }
        };

        setupSocket();
    }, [profile?.id]);

    useFocusEffect(useCallback(() => { fetchUpdates(); }, [fetchUpdates]));

    return (
        <View style={styles.screen}>
            <StatusBar style="light" />

            <SafeAreaView style={styles.headerSafe} edges={['top']}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Live Updates</Text>
                        <Text style={styles.headerSub}>Activity Center</Text>
                    </View>
                    <View style={styles.livePill}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveLabel}>LIVE</Text>
                    </View>
                </View>
            </SafeAreaView>

            <View style={styles.body}>
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.loadingText}>Fetching updates…</Text>
                    </View>
                ) : (
                    <FlatList
                        data={updates}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => <UpdateCard item={item} />}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => fetchUpdates(true)}
                                colors={[Colors.primary]}
                                tintColor={Colors.primary}
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyWrap}>
                                <View style={styles.emptyIconCircle}>
                                    <Ionicons name="pulse-outline" size={40} color="#048357" />
                                </View>
                                <Text style={styles.emptyTitle}>No active updates</Text>
                                <Text style={styles.emptySub}>Doctor assignments, sample collections, deliveries and payments will appear here in real time.</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#048357' },
    headerSafe: { backgroundColor: '#048357' },
    headerRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: 18, color: '#fff' },
    headerSub: { fontFamily: Fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
    livePill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
    liveLabel: { fontFamily: Fonts.semiBold, fontSize: 10, color: '#fff', letterSpacing: 1 },

    body: {
        flex: 1, backgroundColor: '#F2F4F3',
        borderTopLeftRadius: 26, borderTopRightRadius: 26,
        overflow: 'hidden',
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textMuted },
    listContent: { padding: 16, paddingBottom: 50, flexGrow: 1 },

    // ── Card ──
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 14,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
    },
    cardAccent: { width: 4, borderRadius: 0 },
    cardInner: { flex: 1, padding: 14 },

    row1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    eventBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
    eventLabel: { fontFamily: Fonts.semiBold, fontSize: 11 },
    timestamp: { fontFamily: Fonts.regular, fontSize: 11, color: '#AAAAAA' },

    serviceType: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.textMuted, marginBottom: 10 },

    // Staff block
    staffBlock: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        borderWidth: 1, borderRadius: 12,
        padding: 10, marginBottom: 10,
    },
    staffPhoto: { width: 46, height: 46, borderRadius: 23 },
    staffPhotoFallback: {
        width: 46, height: 46, borderRadius: 23,
        justifyContent: 'center', alignItems: 'center',
    },
    staffInfo: { flex: 1 },
    staffName: { fontFamily: Fonts.semiBold, fontSize: 13, color: '#1A1A1A', marginBottom: 2 },
    staffMeta: { marginBottom: 1 },
    staffIdLabel: { fontFamily: Fonts.regular, fontSize: 11, color: '#AAAAAA' },
    staffIdValue: { fontFamily: Fonts.medium, fontSize: 11, color: Colors.textMuted },
    staffPhone: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted },
    callBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 9,
        borderRadius: 10,
    },
    callBtnText: { fontFamily: Fonts.semiBold, fontSize: 12, color: '#fff' },

    row4: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    etaBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    },
    etaText: { fontFamily: Fonts.semiBold, fontSize: 11, color: '#059669' },
    statusDetail: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textMuted, flex: 1 },

    // Empty
    emptyWrap: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 36 },
    emptyIconCircle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    emptyTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: '#1A1A1A', marginBottom: 8 },
    emptySub: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
