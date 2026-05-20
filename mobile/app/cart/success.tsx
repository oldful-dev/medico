import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

const PRIMARY_GREEN = '#02743F';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';

export default function CartSuccessScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ bookingId?: string; amount?: string; category?: string }>();

    useEffect(() => {
        // Prevent back button from going back to payment
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            router.replace('/(tabs)/home');
            return true;
        });
        return () => backHandler.remove();
    }, [router]);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar backgroundColor="#FFFFFF" />
            
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="checkmark-circle" size={80} color={PRIMARY_GREEN} />
                </View>
                
                <Text style={styles.title}>Payment Successful!</Text>
                <Text style={styles.subtitle}>
                    Your {params.category} booking has been confirmed.
                </Text>

                <View style={styles.detailsCard}>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Booking ID</Text>
                        <Text style={styles.detailValue}>#{params.bookingId?.slice(-8) || 'CONFIRMED'}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Amount Paid</Text>
                        <Text style={styles.detailAmount}>₹{params.amount}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity 
                    style={styles.primaryBtn}
                    onPress={() => router.replace('/profile/bookings')}
                >
                    <Text style={styles.primaryBtnText}>View My Bookings</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.secondaryBtn}
                    onPress={() => router.replace('/(tabs)/home')}
                >
                    <Text style={styles.secondaryBtnText}>Back to Home</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    iconContainer: { marginBottom: 24, backgroundColor: '#ECFDF5', padding: 20, borderRadius: 60 },
    title: { fontSize: 24, fontWeight: '700', color: TEXT_DARK, marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', marginBottom: 32, lineHeight: 20 },
    detailsCard: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
    detailLabel: { fontSize: 14, color: TEXT_MUTED, fontWeight: '500' },
    detailValue: { fontSize: 14, color: TEXT_DARK, fontWeight: '600' },
    detailAmount: { fontSize: 16, color: PRIMARY_GREEN, fontWeight: '700' },
    footer: { padding: 24, paddingBottom: 40 },
    primaryBtn: { backgroundColor: PRIMARY_GREEN, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
    primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
    secondaryBtn: { backgroundColor: '#F3F4F6', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
    secondaryBtnText: { color: TEXT_DARK, fontSize: 15, fontWeight: '600' },
});
