import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Image, Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Radius, Shadow } from '@/constants/theme';
import { useCart } from '@/context/CartContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

/**
 * PREMIUM CART PAGE
 * Theme: Health-focused, Premium, Trustworthy
 */
export default function CartScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { items, removeItem, totalAmount, isInitialized } = useCart();

    const subtotal = totalAmount;
    const taxes = Math.round(subtotal * 0.18);
    const platformFee = items.length > 0 ? 50 : 0;
    const grandTotal = subtotal + taxes + platformFee;

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <LinearGradient
                colors={['#FFFFFF', '#F0F9FF']}
                style={styles.emptyIconCircle}
            >
                <MaterialCommunityIcons name="cart-off" size={60} color={Colors.primary} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>Your cart is lonely</Text>
            <Text style={styles.emptySubtitle}>
                Add health services and home care essentials to get started with Oldful.
            </Text>
            <TouchableOpacity 
                activeOpacity={0.8}
                style={styles.exploreBtn} 
                onPress={() => router.push('/')}
            >
                <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    style={styles.exploreBtnGradient}
                >
                    <Text style={styles.exploreBtnText}>Browse Services</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.screen}>
            <StatusBar style="light" />
            
            {/* ─── Premium Header ─── */}
            <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 10 }]}
            >
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.headerSubtitle}>REVIEW YOUR</Text>
                        <Text style={styles.headerTitle}>Selection</Text>
                    </View>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{items.length} SERVICES</Text>
                    </View>
                </View>
                
                {/* Step Indicator */}
                <View style={styles.stepContainer}>
                    <View style={styles.stepItem}>
                        <View style={[styles.stepDot, styles.stepActive]} />
                        <Text style={[styles.stepLabel, styles.stepLabelActive]}>Cart</Text>
                    </View>
                    <View style={styles.stepLine} />
                    <View style={styles.stepItem}>
                        <View style={styles.stepDot} />
                        <Text style={styles.stepLabel}>Details</Text>
                    </View>
                    <View style={styles.stepLine} />
                    <View style={styles.stepItem}>
                        <View style={styles.stepDot} />
                        <Text style={styles.stepLabel}>Payment</Text>
                    </View>
                </View>
            </LinearGradient>

            {items.length === 0 ? renderEmptyState() : (
                <>
                    <ScrollView 
                        style={styles.container}
                        contentContainerStyle={{ paddingBottom: 160 }}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.listSection}>
                            {items.map((item, index) => (
                                <View key={item.id} style={styles.cartCard}>
                                    <View style={styles.cardHeader}>
                                        <View style={styles.iconContainer}>
                                            <LinearGradient
                                                colors={['#E8F5E9', '#C8E6C9']}
                                                style={styles.iconGradient}
                                            >
                                                <MaterialCommunityIcons name="medical-bag" size={24} color={Colors.primary} />
                                            </LinearGradient>
                                        </View>
                                        <View style={styles.itemMainInfo}>
                                            <Text style={styles.itemName}>{item.title}</Text>
                                            <View style={styles.qualityBadge}>
                                                <Ionicons name="shield-checkmark" size={10} color={Colors.primary} />
                                                <Text style={styles.qualityText}>VERIFIED SERVICE</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity 
                                            onPress={() => removeItem(item.id)}
                                            style={styles.removeCircle}
                                        >
                                            <Ionicons name="close" size={18} color="#FF6B6B" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.detailsGrid}>
                                        <View style={styles.detailBox}>
                                            <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                                            <Text style={styles.detailValue} numberOfLines={1}>
                                                {item.details?.when || 'ASAP'}
                                            </Text>
                                        </View>
                                        <View style={styles.detailBox}>
                                            <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                                            <Text style={styles.detailValue} numberOfLines={1}>
                                                {item.details?.address || 'Current Location'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.cardFooter}>
                                        <Text style={styles.itemPriceLabel}>Service Price</Text>
                                        <Text style={styles.itemPriceValue}>₹{item.price}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* ─── Premium Bill Card ─── */}
                        <View style={styles.billContainer}>
                            <View style={styles.billHeader}>
                                <Text style={styles.billTitle}>Bill Summary</Text>
                                <Ionicons name="receipt-outline" size={18} color={Colors.primary} />
                            </View>
                            
                            <View style={styles.billItems}>
                                <View style={styles.billRow}>
                                    <Text style={styles.billLabel}>Base Amount</Text>
                                    <Text style={styles.billValue}>₹{totalAmount}</Text>
                                </View>
                                <View style={styles.billRow}>
                                    <View style={styles.rowWithInfo}>
                                        <Text style={styles.billLabel}>GST & Service Tax</Text>
                                        <Ionicons name="information-circle-outline" size={12} color={Colors.textMuted} />
                                    </View>
                                    <Text style={styles.billValue}>₹{taxes}</Text>
                                </View>
                                <View style={styles.billRow}>
                                    <Text style={styles.billLabel}>Platform Fee</Text>
                                    <Text style={styles.billValue}>₹{platformFee}</Text>
                                </View>
                            </View>

                            <View style={styles.totalBlock}>
                                <View style={styles.totalInfo}>
                                    <Text style={styles.totalLabel}>Total Payable</Text>
                                    <Text style={styles.totalSub}>Secure & Encrypted</Text>
                                </View>
                                <Text style={styles.totalAmount}>₹{grandTotal}</Text>
                            </View>
                        </View>

                        {/* Trust Badges */}
                        <View style={styles.trustRow}>
                            <View style={styles.trustItem}>
                                <Ionicons name="lock-closed" size={16} color={Colors.textMuted} />
                                <Text style={styles.trustText}>Safe Payment</Text>
                            </View>
                            <View style={styles.trustItem}>
                                <Ionicons name="people" size={16} color={Colors.textMuted} />
                                <Text style={styles.trustText}>Top Providers</Text>
                            </View>
                            <View style={styles.trustItem}>
                                <Ionicons name="flash" size={16} color={Colors.textMuted} />
                                <Text style={styles.trustText}>Instant Setup</Text>
                            </View>
                        </View>
                    </ScrollView>

                    {/* ─── Premium Sticky Footer ─── */}
                    <BlurView intensity={80} style={styles.footerBlur} tint="light">
                        <View style={styles.footerContent}>
                            <View style={styles.footerPrice}>
                                <Text style={styles.footerPriceLabel}>GRAND TOTAL</Text>
                                <Text style={styles.footerPriceValue}>₹{grandTotal}</Text>
                            </View>
                            <TouchableOpacity 
                                activeOpacity={0.9}
                                style={styles.mainCheckoutBtn}
                                onPress={() => router.push({ 
                                    pathname: '/payment/checkout', 
                                    params: { amount: String(grandTotal), label: 'Service Booking' } 
                                })}
                            >
                                <LinearGradient
                                    colors={[Colors.primary, Colors.primaryDark]}
                                    style={styles.checkoutGradient}
                                >
                                    <Text style={styles.checkoutBtnText}>Proceed to Pay</Text>
                                    <Ionicons name="chevron-forward" size={20} color="#FFF" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </BlurView>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#FBFCFE' },
    
    /* Header */
    header: { 
        paddingHorizontal: 25, paddingBottom: 30, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, 
        ...Shadow.header 
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerSubtitle: { fontFamily: Fonts.bold, fontSize: 10, color: '#FFFFFF', opacity: 0.8, letterSpacing: 2 },
    headerTitle: { fontFamily: Fonts.bold, fontSize: 32, color: '#FFFFFF', letterSpacing: -1 },
    badge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    badgeText: { color: '#FFF', fontSize: 10, fontFamily: Fonts.bold },

    stepContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 25, paddingHorizontal: 5 },
    stepItem: { alignItems: 'center', gap: 6 },
    stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.3)' },
    stepActive: { backgroundColor: '#FFF', transform: [{ scale: 1.2 }] },
    stepLabel: { fontSize: 10, fontFamily: Fonts.medium, color: 'rgba(255,255,255,0.5)' },
    stepLabelActive: { color: '#FFF', fontFamily: Fonts.bold },
    stepLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 10, marginTop: -15 },

    container: { flex: 1 },
    listSection: { padding: 20 },

    /* Service Card */
    cartCard: { 
        backgroundColor: '#FFF', borderRadius: 28, padding: 20, marginBottom: 18,
        ...Shadow.card, borderWidth: 1, borderColor: '#F5F7FA'
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    iconContainer: { width: 56, height: 56, borderRadius: 20, overflow: 'hidden' },
    iconGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    itemMainInfo: { flex: 1 },
    itemName: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.textDark, letterSpacing: -0.5 },
    qualityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    qualityText: { fontSize: 9, fontFamily: Fonts.bold, color: Colors.primary, letterSpacing: 0.5 },
    removeCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF0F0', justifyContent: 'center', alignItems: 'center' },

    detailsGrid: { flexDirection: 'row', gap: 10, marginTop: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F0F3F7' },
    detailBox: { 
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, 
        backgroundColor: '#F8FAFC', padding: 12, borderRadius: 15 
    },
    detailValue: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.textDark, flex: 1 },

    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 15 },
    itemPriceLabel: { fontFamily: Fonts.medium, fontSize: 12, color: Colors.textMuted },
    itemPriceValue: { fontFamily: Fonts.bold, fontSize: 20, color: Colors.textDark },

    /* Bill Container */
    billContainer: { backgroundColor: '#FFF', marginHorizontal: 20, borderRadius: 30, padding: 25, ...Shadow.card, borderWidth: 1, borderColor: '#F0F3F7' },
    billHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    billTitle: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.textDark },
    billItems: { gap: 14, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F5F7FA' },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowWithInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    billLabel: { fontFamily: Fonts.medium, fontSize: 14, color: Colors.textLight },
    billValue: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.textDark },

    totalBlock: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
    totalInfo: { gap: 2 },
    totalLabel: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.textDark },
    totalSub: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.primary },
    totalAmount: { fontFamily: Fonts.bold, fontSize: 28, color: Colors.primaryDark, letterSpacing: -1 },

    /* Trust indicators */
    trustRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 30 },
    trustItem: { alignItems: 'center', gap: 6 },
    trustText: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.textMuted, textTransform: 'uppercase' },

    /* Footer */
    footerBlur: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: Platform.OS === 'ios' ? 30 : 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
    footerContent: { flexDirection: 'row', padding: 25, alignItems: 'center', gap: 20 },
    footerPrice: { flex: 1 },
    footerPriceLabel: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.textMuted, letterSpacing: 1 },
    footerPriceValue: { fontSize: 24, fontFamily: Fonts.bold, color: Colors.textDark },
    mainCheckoutBtn: { flex: 2, height: 60, borderRadius: 20, overflow: 'hidden', ...Shadow.card },
    checkoutGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    checkoutBtnText: { color: '#FFF', fontFamily: Fonts.bold, fontSize: 17 },

    /* Empty State */
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    emptyIconCircle: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center', marginBottom: 30, ...Shadow.card },
    emptyTitle: { fontFamily: Fonts.bold, fontSize: 26, color: Colors.textDark, marginBottom: 12, letterSpacing: -1 },
    emptySubtitle: { fontFamily: Fonts.medium, fontSize: 15, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 40 },
    exploreBtn: { width: '100%', height: 64, borderRadius: 22, overflow: 'hidden', ...Shadow.card },
    exploreBtnGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    exploreBtnText: { color: '#FFF', fontFamily: Fonts.bold, fontSize: 17 },
});
