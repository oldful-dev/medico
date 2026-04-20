import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PaymentsWalletScreen() {
    const router = useRouter();

    const PAYMENT_METHODS = [
        { id: '1', type: 'upi', name: 'UPI — shankar@okaxis', icon: 'wallet-outline' as const },
        { id: '2', type: 'card', name: '•••• •••• •••• 4532', icon: 'card-outline' as const },
    ];

    const TRANSACTIONS = [
        { id: 't1', title: 'Nurse Care Booking', amount: '-₹249', date: '02 Mar 2026', status: 'Paid' },
        { id: 't2', title: 'Wallet Top-up', amount: '+₹1,000', date: '28 Feb 2026', status: 'Credited' },
        { id: 't3', title: 'Medicine Order', amount: '-₹149', date: '25 Feb 2026', status: 'Paid' },
    ];

    return (
        <View style={styles.screen}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.headerSafe} edges={['top']}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Payments & Wallet</Text>
                </View>
            </SafeAreaView>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ─── Wallet Balance ─── */}
                <View style={styles.walletCard}>
                    <View style={styles.walletTop}>
                        <View>
                            <Text style={styles.walletLabel}>Wallet Balance</Text>
                            <Text style={styles.walletBalance}>₹1,000</Text>
                        </View>
                        <View style={styles.walletIconCircle}>
                            <Ionicons name="wallet" size={28} color="#048357" />
                        </View>
                    </View>
                    <TouchableOpacity style={styles.addMoneyBtn} activeOpacity={0.7}>
                        <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.addMoneyText}>Add Money</Text>
                    </TouchableOpacity>
                </View>

                {/* ─── Saved Payment Methods ─── */}
                <Text style={styles.sectionTitle}>Saved Payment Methods</Text>
                {PAYMENT_METHODS.map(method => (
                    <View key={method.id} style={styles.methodCard}>
                        <Ionicons name={method.icon} size={22} color="#048357" />
                        <Text style={styles.methodText}>{method.name}</Text>
                        <Ionicons name="chevron-forward" size={18} color="#AAAEAC" />
                    </View>
                ))}
                <TouchableOpacity style={styles.addMethodBtn} activeOpacity={0.7}>
                    <Ionicons name="add-circle-outline" size={20} color="#048357" />
                    <Text style={styles.addMethodText}>Add Payment Method</Text>
                </TouchableOpacity>

                {/* ─── Transaction History ─── */}
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Transaction History</Text>
                {TRANSACTIONS.map(tx => (
                    <View key={tx.id} style={styles.txCard}>
                        <View style={styles.txLeft}>
                            <Ionicons
                                name={tx.amount.startsWith('+') ? 'arrow-down-circle' : 'arrow-up-circle'}
                                size={24}
                                color={tx.amount.startsWith('+') ? '#34C759' : '#FF3B30'}
                            />
                            <View>
                                <Text style={styles.txTitle}>{tx.title}</Text>
                                <Text style={styles.txDate}>{tx.date}</Text>
                            </View>
                        </View>
                        <View style={styles.txRight}>
                            <Text style={[styles.txAmount, { color: tx.amount.startsWith('+') ? '#34C759' : '#2F2F2F' }]}>
                                {tx.amount}
                            </Text>
                            <Text style={styles.txStatus}>{tx.status}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#048357' },
    headerSafe: { backgroundColor: '#048357' },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { padding: 4, marginRight: 8 },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20, color: '#FFFFFF',
        flex: 1,
    },
    scrollView: { flex: 1, backgroundColor: '#FFFFE3', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    scrollContent: { padding: 20, paddingBottom: 50 },

    walletCard: {
        backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 24,
        borderWidth: 1.5, borderColor: '#048357',
        shadowColor: '#02743F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 15, elevation: 4,
    },
    walletTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    walletLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13, color: '#898989',
    },
    walletBalance: {
        fontFamily: Platform.select({ ios: 'Poppins-Bold', android: 'Poppins_700Bold', default: 'System' }),
        fontSize: 28, color: '#2F2F2F', marginTop: 2,
    },
    walletIconCircle: {
        width: 50, height: 50, borderRadius: 25, backgroundColor: '#E8F5E9',
        justifyContent: 'center', alignItems: 'center',
    },
    addMoneyBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#048357',
        paddingVertical: 10, borderRadius: 10, gap: 6,
    },
    addMoneyText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14, color: '#FFFFFF',
    },

    sectionTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 17, color: '#2F2F2F', marginBottom: 12,
    },
    methodCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12,
        padding: 14, marginBottom: 10, gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    methodText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14, color: '#2F2F2F', flex: 1,
    },
    addMethodBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#048357', borderStyle: 'dashed',
        backgroundColor: '#F0FFF4', marginTop: 4,
    },
    addMethodText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14, color: '#048357',
    },

    txCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    txLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    txTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 14, color: '#2F2F2F',
    },
    txDate: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12, color: '#898989', marginTop: 2,
    },
    txRight: { alignItems: 'flex-end' },
    txAmount: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15, color: '#2F2F2F',
    },
    txStatus: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 11, color: '#898989', marginTop: 2,
    },
});
