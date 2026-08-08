import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';

const PRIMARY_GREEN = '#02743F';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';

export default function CartSuccessScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ bookingId?: string; amount?: string; category?: string; isCod?: string; isCash?: string }>();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const isCod = params.isCod === 'true' || params.isCash === 'true';

    useEffect(() => {
        // Prevent back button from going back to payment
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            router.replace('/(tabs)');
            return true;
        });
        return () => backHandler.remove();
    }, [router]);

    const dynamicStyles = makeStyles(isDarkMode);

    return (
        <SafeAreaView style={dynamicStyles.container} edges={['top', 'bottom']}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} backgroundColor={isDarkMode ? '#252525' : '#FAF7ED'} />
            
            <View style={dynamicStyles.content}>
                <View style={dynamicStyles.iconContainer}>
                    <Ionicons name="checkmark-circle" size={80} color={PRIMARY_GREEN} />
                </View>
                
                <Text style={dynamicStyles.title}>{isCod ? 'Order Confirmed!' : 'Payment Successful!'}</Text>
                <Text style={dynamicStyles.subtitle}>
                    {isCod 
                        ? `Your ${params.category || 'order'} has been placed via Cash on Delivery.`
                        : `Your ${params.category || 'booking'} has been confirmed.`
                    }
                </Text>

                <View style={dynamicStyles.detailsCard}>
                    <View style={dynamicStyles.detailRow}>
                        <Text style={dynamicStyles.detailLabel}>Booking ID</Text>
                        <Text style={dynamicStyles.detailValue}>#{params.bookingId?.slice(-8) || 'CONFIRMED'}</Text>
                    </View>
                    <View style={dynamicStyles.divider} />
                    <View style={dynamicStyles.detailRow}>
                        <Text style={dynamicStyles.detailLabel}>{isCod ? 'Payable on Delivery (COD)' : 'Amount Paid'}</Text>
                        <Text style={dynamicStyles.detailAmount}>₹{params.amount}</Text>
                    </View>
                </View>
            </View>

            <View style={dynamicStyles.footer}>
                <TouchableOpacity
                    style={dynamicStyles.primaryBtn}
                    onPress={() => router.replace('/my-bookings')}
                >
                    <Text style={dynamicStyles.primaryBtnText}>View My Bookings</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={dynamicStyles.secondaryBtn}
                    onPress={() => router.replace('/(tabs)')}
                >
                    <Text style={dynamicStyles.secondaryBtnText}>Back to Home</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const makeStyles = (isDarkMode: boolean) => {
    const bgCard = isDarkMode ? '#252525' : '#FAF7ED';
    const bgCardSecondary = isDarkMode ? '#2D2D2D' : '#F5F0E1';
    const borderColor = isDarkMode ? '#3A3A3A' : '#E5E7EB';
    const textPrimary = isDarkMode ? '#E8E8E8' : TEXT_DARK;
    const textSecondary = isDarkMode ? '#A0A0A0' : TEXT_MUTED;
    const iconBgDark = isDarkMode ? '#1A4A32' : '#ECFDF5';
    const secondaryBg = isDarkMode ? '#303030' : '#F3F4F6';

    return StyleSheet.create({
        container: { flex: 1, backgroundColor: bgCard },
        content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
        iconContainer: { marginBottom: 24, backgroundColor: iconBgDark, padding: 20, borderRadius: 60 },
        title: { fontSize: 24, fontWeight: '700', color: textPrimary, marginBottom: 8, textAlign: 'center' },
        subtitle: { fontSize: 14, color: textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 20 },
        detailsCard: { width: '100%', backgroundColor: bgCardSecondary, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: borderColor },
        detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
        divider: { height: 1, backgroundColor: borderColor, marginVertical: 4 },
        detailLabel: { fontSize: 14, color: textSecondary, fontWeight: '500' },
        detailValue: { fontSize: 14, color: textPrimary, fontWeight: '600' },
        detailAmount: { fontSize: 16, color: PRIMARY_GREEN, fontWeight: '700' },
        footer: { padding: 24, paddingBottom: 40 },
        primaryBtn: { backgroundColor: PRIMARY_GREEN, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
        primaryBtnText: { color: '#FAF7ED', fontSize: 15, fontWeight: '600' },
        secondaryBtn: { backgroundColor: secondaryBg, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
        secondaryBtnText: { color: textPrimary, fontSize: 15, fontWeight: '600' },
    });
};

const styles = makeStyles(false);
