import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCart } from '@/context/CartContext';

const PRIMARY_GREEN = '#02743F';
const CARD_BORDER = '#E5E7EB';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';

export default function CartScreen() {
    const router = useRouter();
    const { groupedItems, removeItem, itemCount, getCategoryTotal, getGrandTotal } = useCart();

    const handleCheckoutCategory = (category: string) => {
        router.push({ pathname: '/cart/schedule', params: { category } } as any);
    };

    if (itemCount === 0) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <StatusBar style="dark" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Your Cart</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.emptyContainer}>
                    <Ionicons name="cart-outline" size={64} color="#E5E7EB" />
                    <Text style={styles.emptyTitle}>Your cart is empty</Text>
                    <Text style={styles.emptySubtitle}>Add some services or products to get started.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="dark" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Your Cart</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                {Object.entries(groupedItems).map(([category, items]) => {
                    if (items.length === 0) return null;
                    const categoryTotal = getCategoryTotal(category);

                    return (
                        <View key={category} style={styles.categoryCard}>
                            <View style={styles.categoryHeader}>
                                <Text style={styles.categoryTitle}>{category}</Text>
                                <Text style={styles.itemCount}>{items.length} {items.length === 1 ? 'Item' : 'Items'}</Text>
                            </View>

                            {items.map(item => (
                                <View key={item.id} style={styles.itemRow}>
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemName} numberOfLines={2}>{item.title}</Text>
                                        <Text style={styles.itemPrice}>₹{item.price}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(item.id)}>
                                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            <View style={styles.categoryFooter}>
                                <Text style={styles.categorySubtotal}>Subtotal: ₹{categoryTotal}</Text>
                                <TouchableOpacity 
                                    style={styles.checkoutBtn}
                                    onPress={() => handleCheckoutCategory(category)}
                                >
                                    <Text style={styles.checkoutBtnText}>Checkout {category}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}

                <View style={styles.grandTotalContainer}>
                    <Text style={styles.grandTotalText}>Grand Total: ₹{getGrandTotal()}</Text>
                    <TouchableOpacity 
                        style={styles.checkoutAllBtnDisabled}
                        activeOpacity={1}
                        onPress={() => Alert.alert('Coming Soon', 'Unified mixed-category checkout is coming soon. Please checkout each category separately for now.')}
                    >
                        <Text style={styles.checkoutAllText}>Checkout All (Coming Soon)</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: CARD_BORDER,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: TEXT_DARK,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: TEXT_DARK,
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: TEXT_MUTED,
        textAlign: 'center',
    },
    categoryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    categoryTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: TEXT_DARK,
    },
    itemCount: {
        fontSize: 12,
        color: TEXT_MUTED,
        fontWeight: '500',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    itemInfo: {
        flex: 1,
        paddingRight: 16,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '500',
        color: TEXT_DARK,
        marginBottom: 4,
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: PRIMARY_GREEN,
    },
    removeBtn: {
        padding: 8,
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
    },
    categoryFooter: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    categorySubtotal: {
        fontSize: 14,
        fontWeight: '600',
        color: TEXT_DARK,
        marginBottom: 12,
    },
    checkoutBtn: {
        backgroundColor: PRIMARY_GREEN,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    checkoutBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    grandTotalContainer: {
        marginTop: 8,
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: CARD_BORDER,
    },
    grandTotalText: {
        fontSize: 16,
        fontWeight: '700',
        color: TEXT_DARK,
        textAlign: 'center',
        marginBottom: 16,
    },
    checkoutAllBtnDisabled: {
        backgroundColor: '#E5E7EB',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    checkoutAllText: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '600',
    },
});
