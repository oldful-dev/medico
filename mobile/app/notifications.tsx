// Notifications Screen - Push notification history and management
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// ─── Dummy notification data (static, no state/logic) ───
const NOTIFICATIONS = [
    {
        id: '1',
        type: 'booking',
        title: 'Booking Confirmed',
        message: 'Your doctor home visit has been confirmed for today at 3:00 PM.',
        time: '2 min ago',
        read: false,
        icon: 'checkmark-circle' as const,
        iconColor: '#048357',
    },
    {
        id: '2',
        type: 'reminder',
        title: 'Upcoming Appointment',
        message: 'Reminder: Your blood test appointment is scheduled for tomorrow at 10:00 AM.',
        time: '1 hour ago',
        read: false,
        icon: 'alarm' as const,
        iconColor: '#E8A317',
    },
    {
        id: '3',
        type: 'payment',
        title: 'Payment Successful',
        message: '₹499 paid for AC & Appliance Repair service. Invoice sent to your email.',
        time: '3 hours ago',
        read: true,
        icon: 'wallet' as const,
        iconColor: '#02743F',
    },
    {
        id: '4',
        type: 'update',
        title: 'Service Update',
        message: 'Your nursing care staff is on the way. Estimated arrival: 20 minutes.',
        time: '5 hours ago',
        read: true,
        icon: 'car' as const,
        iconColor: '#3B82F6',
    },
    {
        id: '5',
        type: 'promo',
        title: 'Special Offer 🎉',
        message: 'Get 20% off on your next doctor home visit. Use code MEDICO20.',
        time: 'Yesterday',
        read: true,
        icon: 'gift' as const,
        iconColor: '#E05E5E',
    },
    {
        id: '6',
        type: 'system',
        title: 'Profile Updated',
        message: 'Your address has been successfully updated to 123 Baker St, London.',
        time: '2 days ago',
        read: true,
        icon: 'person-circle' as const,
        iconColor: '#777777',
    },
];

export default function NotificationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

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
                <TouchableOpacity style={styles.headerAction}>
                    <Ionicons name="checkmark-done" size={22} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {/* ─── Content ─── */}
            <View style={styles.contentCard}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Today Section */}
                    <Text style={styles.sectionLabel}>Today</Text>
                    {NOTIFICATIONS.filter((_, i) => i < 2).map((item) => (
                        <View
                            key={item.id}
                            style={[
                                styles.notificationCard,
                                !item.read && styles.notificationCardUnread,
                            ]}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: `${item.iconColor}15` }]}>
                                <Ionicons name={item.icon} size={22} color={item.iconColor} />
                            </View>
                            <View style={styles.notificationContent}>
                                <View style={styles.notificationHeader}>
                                    <Text style={styles.notificationTitle}>{item.title}</Text>
                                    {!item.read && <View style={styles.unreadDot} />}
                                </View>
                                <Text style={styles.notificationMessage} numberOfLines={2}>
                                    {item.message}
                                </Text>
                                <Text style={styles.notificationTime}>{item.time}</Text>
                            </View>
                        </View>
                    ))}

                    {/* Earlier Section */}
                    <Text style={styles.sectionLabel}>Earlier</Text>
                    {NOTIFICATIONS.filter((_, i) => i >= 2).map((item) => (
                        <View
                            key={item.id}
                            style={[
                                styles.notificationCard,
                                !item.read && styles.notificationCardUnread,
                            ]}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: `${item.iconColor}15` }]}>
                                <Ionicons name={item.icon} size={22} color={item.iconColor} />
                            </View>
                            <View style={styles.notificationContent}>
                                <View style={styles.notificationHeader}>
                                    <Text style={styles.notificationTitle}>{item.title}</Text>
                                    {!item.read && <View style={styles.unreadDot} />}
                                </View>
                                <Text style={styles.notificationMessage} numberOfLines={2}>
                                    {item.message}
                                </Text>
                                <Text style={styles.notificationTime}>{item.time}</Text>
                            </View>
                        </View>
                    ))}
                </ScrollView>
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
});
