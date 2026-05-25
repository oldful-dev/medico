import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCart } from '@/context/CartContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';

const PRIMARY_GREEN = '#02743F';
const CARD_BORDER = '#E5E7EB';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';

export default function CartScreen() {
    const router = useRouter();
    const { groupedItems, removeItem, itemCount, getCategoryTotal, getGrandTotal } = useCart();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();

    const handleCheckoutCategory = (category: string) => {
        router.push({ pathname: '/cart/schedule', params: { category } } as any);
    };

    const dynamicStyles = makeStyles(isDarkMode);

    if (itemCount === 0) {
        return (
            <SafeAreaView style={[dynamicStyles.container]} edges={['top']}>
                <StatusBar style={isDarkMode ? "light" : "dark"} />
                <View style={dynamicStyles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#E8E8E8' : TEXT_DARK} />
                    </TouchableOpacity>
                    <Text style={dynamicStyles.headerTitle}>Your Cart</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={dynamicStyles.emptyContainer}>
                    <Ionicons name="cart-outline" size={64} color={isDarkMode ? '#505050' : '#E5E7EB'} />
                    <Text style={dynamicStyles.emptyTitle}>Your cart is empty</Text>
                    <Text style={dynamicStyles.emptySubtitle}>Add some services or products to get started.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[dynamicStyles.container]} edges={['top']}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />
            <View style={dynamicStyles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#E8E8E8' : TEXT_DARK} />
                </TouchableOpacity>
                <Text style={dynamicStyles.headerTitle}>Your Cart</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={dynamicStyles.content} contentContainerStyle={dynamicStyles.contentContainer} showsVerticalScrollIndicator={false}>
                {Object.entries(groupedItems).map(([category, items]) => {
                    if (items.length === 0) return null;
                    const categoryTotal = getCategoryTotal(category);

                    return (
                        <View key={category} style={dynamicStyles.categoryCard}>
                            <View style={dynamicStyles.categoryHeader}>
                                <Text style={dynamicStyles.categoryTitle}>{category}</Text>
                                <Text style={dynamicStyles.itemCount}>{items.length} {items.length === 1 ? 'Item' : 'Items'}</Text>
                            </View>

                            {items.map(item => (
                                <View key={item.id} style={dynamicStyles.itemRow}>
                                    <View style={dynamicStyles.itemInfo}>
                                        <Text style={dynamicStyles.itemName} numberOfLines={2}>{item.title}</Text>
                                        <Text style={dynamicStyles.itemPrice}>₹{item.price}</Text>
                                    </View>
                                    <TouchableOpacity style={dynamicStyles.removeBtn} onPress={() => removeItem(item.id)}>
                                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}

                            <View style={dynamicStyles.categoryFooter}>
                                <Text style={dynamicStyles.categorySubtotal}>Subtotal: ₹{categoryTotal}</Text>
                                <TouchableOpacity
                                    style={dynamicStyles.checkoutBtn}
                                    onPress={() => handleCheckoutCategory(category)}
                                >
                                    <Text style={dynamicStyles.checkoutBtnText}>Checkout {category}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}

                <View style={dynamicStyles.grandTotalContainer}>
                    <Text style={dynamicStyles.grandTotalText}>Grand Total: ₹{getGrandTotal()}</Text>
                    <TouchableOpacity
                        style={dynamicStyles.checkoutAllBtnDisabled}
                        activeOpacity={1}
                        onPress={() => Alert.alert('Coming Soon', 'Unified mixed-category checkout is coming soon. Please checkout each category separately for now.')}
                    >
                        <Text style={dynamicStyles.checkoutAllText}>Checkout All (Coming Soon)</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const makeStyles = (isDarkMode: boolean) => {
    const bgLight = isDarkMode ? '#1A1A1A' : '#FAFAFA';
    const bgCard = isDarkMode ? '#252525' : '#FFFFFF';
    const bgCardSecondary = isDarkMode ? '#2D2D2D' : '#F9FAFB';
    const borderColor = isDarkMode ? '#3A3A3A' : '#E5E7EB';
    const borderColorLight = isDarkMode ? '#404040' : '#F3F4F6';
    const textPrimary = isDarkMode ? '#E8E8E8' : '#2F2F2F';
    const textSecondary = isDarkMode ? '#A0A0A0' : '#888888';
    const badgeBg = isDarkMode ? '#3A3A3A' : '#F3F4F6';
    const removeBtn = isDarkMode ? '#5A1C1C' : '#FEF2F2';
    const disabledBg = isDarkMode ? '#3A3A3A' : '#E5E7EB';
    const disabledText = isDarkMode ? '#6B6B6B' : '#9CA3AF';
    const emptyIconColor = isDarkMode ? '#505050' : '#E5E7EB';

    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: bgLight,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: bgCard,
            borderBottomWidth: 1,
            borderBottomColor: borderColor,
        },
        headerTitle: {
            fontSize: 16,
            fontWeight: '600',
            color: textPrimary,
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
            color: textPrimary,
            marginTop: 16,
            marginBottom: 8,
        },
        emptySubtitle: {
            fontSize: 14,
            color: textSecondary,
            textAlign: 'center',
        },
        categoryCard: {
            backgroundColor: bgCard,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: borderColor,
            elevation: 1,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDarkMode ? 0.2 : 0.05,
            shadowRadius: 2,
        },
        categoryHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: borderColorLight,
        },
        categoryTitle: {
            fontSize: 16,
            fontWeight: '700',
            color: textPrimary,
        },
        itemCount: {
            fontSize: 12,
            color: textSecondary,
            fontWeight: '500',
            backgroundColor: badgeBg,
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
            color: textPrimary,
            marginBottom: 4,
        },
        itemPrice: {
            fontSize: 14,
            fontWeight: '600',
            color: PRIMARY_GREEN,
        },
        removeBtn: {
            padding: 8,
            backgroundColor: removeBtn,
            borderRadius: 8,
        },
        categoryFooter: {
            marginTop: 8,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: borderColorLight,
        },
        categorySubtotal: {
            fontSize: 14,
            fontWeight: '600',
            color: textPrimary,
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
            backgroundColor: bgCard,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: borderColor,
        },
        grandTotalText: {
            fontSize: 16,
            fontWeight: '700',
            color: textPrimary,
            textAlign: 'center',
            marginBottom: 16,
        },
        checkoutAllBtnDisabled: {
            backgroundColor: disabledBg,
            paddingVertical: 14,
            borderRadius: 8,
            alignItems: 'center',
        },
        checkoutAllText: {
            color: disabledText,
            fontSize: 14,
            fontWeight: '600',
        },
    });
};

const styles = makeStyles(false);
