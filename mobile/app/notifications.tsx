// Notifications Screen - Push notification history and management
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiClient } from '@/services/api/apiClient';

// ─── Types ───────────────────────────────────────────────
type NotificationChannel = 'PUSH' | 'SMS' | 'EMAIL' | 'WHATSAPP' | string;

interface RawNotification {
    id: string;
    channel: NotificationChannel;
    subject?: string | null;
    body?: string | null;
    templateId?: string | null;
    isSent: boolean;
    createdAt: string;
}

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    createdAt: Date;
}

// ─── Helpers ─────────────────────────────────────────────

function channelToIcon(channel: NotificationChannel, templateId?: string | null): { icon: keyof typeof Ionicons.glyphMap; color: string } {
    if (templateId?.includes('booking') || templateId?.includes('confirm')) return { icon: 'checkmark-circle', color: '#048357' };
    if (templateId?.includes('reminder') || templateId?.includes('appointment')) return { icon: 'alarm', color: '#E8A317' };
    if (templateId?.includes('payment') || templateId?.includes('invoice')) return { icon: 'wallet', color: '#02743F' };
    if (templateId?.includes('promo') || templateId?.includes('offer')) return { icon: 'gift', color: '#E05E5E' };
    if (templateId?.includes('update') || templateId?.includes('status')) return { icon: 'car', color: '#3B82F6' };
    switch (channel) {
        case 'PUSH': return { icon: 'notifications-outline', color: '#048357' };
        case 'SMS': return { icon: 'chatbubble-outline', color: '#E8A317' };
        case 'EMAIL': return { icon: 'mail-outline', color: '#3B82F6' };
        case 'WHATSAPP': return { icon: 'logo-whatsapp', color: '#25D366' };
        default: return { icon: 'person-circle', color: '#777777' };
    }
}

function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function mapRaw(raw: RawNotification): NotificationItem {
    const { icon, color } = channelToIcon(raw.channel, raw.templateId);
    const createdAt = new Date(raw.createdAt);
    return {
        id: raw.id,
        title: raw.subject ?? raw.templateId ?? 'Notification',
        message: raw.body ?? '',
        time: formatRelativeTime(createdAt),
        read: raw.isSent,
        icon,
        iconColor: color,
        createdAt,
    };
}

function isToday(date: Date): boolean {
    const now = new Date();
    return date.toDateString() === now.toDateString();
}

// ─── Component ───────────────────────────────────────────

export default function NotificationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await apiClient.get<RawNotification[]>('/notifications/my?limit=50');
                if (!cancelled && res.success && res.data) {
                    setNotifications(res.data.map(mapRaw));
                }
            } catch {
                // silently degrade — show empty state
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const handleMarkAllRead = useCallback(() => {
        setReadIds(new Set(notifications.map(n => n.id)));
    }, [notifications]);

    const todayItems = notifications.filter(n => isToday(n.createdAt));
    const earlierItems = notifications.filter(n => !isToday(n.createdAt));

    const renderCard = (item: NotificationItem) => {
        const isRead = item.read || readIds.has(item.id);
        return (
            <View
                key={item.id}
                style={[styles.notificationCard, !isRead && styles.notificationCardUnread]}
            >
                <View style={[styles.iconCircle, { backgroundColor: `${item.iconColor}15` }]}>
                    <Ionicons name={item.icon} size={22} color={item.iconColor} />
                </View>
                <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                        <Text style={styles.notificationTitle}>{item.title}</Text>
                        {!isRead && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.notificationMessage} numberOfLines={2}>
                        {item.message}
                    </Text>
                    <Text style={styles.notificationTime}>{item.time}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: '#048357', height: insets.top }} />
            <StatusBar style="light" backgroundColor="#048357" />

            {/* ─── Header ─── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <TouchableOpacity style={styles.headerAction} onPress={handleMarkAllRead}>
                    <Ionicons name="checkmark-done" size={22} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {/* ─── Content ─── */}
            <View style={styles.contentCard}>
                {loading ? (
                    <View style={styles.centerState}>
                        <ActivityIndicator size="large" color="#048357" />
                    </View>
                ) : notifications.length === 0 ? (
                    <View style={styles.centerState}>
                        <Ionicons name="notifications-off-outline" size={48} color="#CCCCCC" />
                        <Text style={styles.emptyTitle}>No notifications yet</Text>
                        <Text style={styles.emptySubtitle}>You'll see booking updates, reminders, and offers here.</Text>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {todayItems.length > 0 && (
                            <>
                                <Text style={styles.sectionLabel}>Today</Text>
                                {todayItems.map(renderCard)}
                            </>
                        )}
                        {earlierItems.length > 0 && (
                            <>
                                <Text style={styles.sectionLabel}>Earlier</Text>
                                {earlierItems.map(renderCard)}
                            </>
                        )}
                    </ScrollView>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#048357',
    },

    /* ─── Header ─── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#048357',
        paddingHorizontal: 16,
        paddingBottom: 20,
        paddingTop: 10,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20,
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: -0.24,
    },
    headerAction: {
        padding: 5,
    },

    /* ─── Content Card ─── */
    contentCard: {
        flex: 1,
        backgroundColor: '#FDFDE8',
        borderTopLeftRadius: 45,
        borderTopRightRadius: 45,
        overflow: 'hidden',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 28,
        paddingBottom: 40,
    },

    /* ─── Section Label ─── */
    sectionLabel: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 14,
        color: '#02743F',
        marginBottom: 12,
        marginTop: 8,
        letterSpacing: -0.24,
    },

    /* ─── Notification Card ─── */
    notificationCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    notificationCardUnread: {
        borderLeftWidth: 3,
        borderLeftColor: '#048357',
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    notificationContent: {
        flex: 1,
    },
    notificationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    notificationTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 13,
        color: '#2F2F2F',
        flex: 1,
        letterSpacing: -0.24,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#048357',
        marginLeft: 8,
    },
    notificationMessage: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11,
        color: '#777777',
        lineHeight: 16,
        marginBottom: 6,
    },
    notificationTime: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 10,
        color: '#AAAEAC',
        letterSpacing: -0.24,
    },

    /* ─── States ─── */
    centerState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        gap: 12,
        marginTop: 60,
    },
    emptyTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 16,
        color: '#2F2F2F',
        textAlign: 'center',
    },
    emptySubtitle: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13,
        color: '#AAAEAC',
        textAlign: 'center',
        lineHeight: 20,
    },
});
