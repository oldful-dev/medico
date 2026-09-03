import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCart } from '@/context/CartContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';

const PRIMARY_GREEN = '#02743F';
const CARD_BORDER = '#E5E7EB';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';

export default function CartScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { 
        groupedItems, removeItem, itemCount, getCategoryTotal, getGrandTotal, items,
        selectedItemIds, toggleItemSelection, selectItemsOfCategory, isItemSelected,
        updateQuantity
    } = useCart();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();

    const handleCheckoutCategory = (category: string) => {
        const categorySelectedItems = groupedItems[category]?.filter(i => selectedItemIds.includes(i.id)) || [];
        router.push({ 
            pathname: '/cart/schedule', 
            params: { 
                category, 
                selectedItemIds: categorySelectedItems.map(i => i.id).join(',') 
            } 
        } as any);
    };

    const handleCheckoutAll = () => {
        const selectedItems = items.filter(i => selectedItemIds.includes(i.id));
        const selectedTotal = selectedItems.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);

        router.push({
            pathname: '/payment/checkout',
            params: {
                category: 'all',
                amount: String(selectedTotal),
                label: 'Combined Purchase',
                itemCount: selectedItems.length,
                selectedItemIds: selectedItems.map(i => i.id).join(','),
                skipUpsell: '1',
            },
        } as any);
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
                    <Text style={dynamicStyles.headerTitle}>{t('cart.header_title')}</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={dynamicStyles.emptyContainer}>
                    <Ionicons name="cart-outline" size={64} color={isDarkMode ? '#505050' : '#E5E7EB'} />
                    <Text style={dynamicStyles.emptyTitle}>{t('cart.empty_title')}</Text>
                    <Text style={dynamicStyles.emptySubtitle}>{t('cart.empty_subtitle')}</Text>
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
                    const categorySelectedItems = items.filter(item => selectedItemIds.includes(item.id));
                    const categoryTotal = categorySelectedItems.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);

                    return (
                        <View key={category} style={dynamicStyles.categoryCard}>
                            <View style={dynamicStyles.categoryHeader}>
                                <TouchableOpacity 
                                    onPress={() => {
                                        const isAll = items.every(i => selectedItemIds.includes(i.id));
                                        selectItemsOfCategory(category, !isAll);
                                    }}
                                    style={{ marginRight: 8, justifyContent: 'center' }}
                                >
                                    <Ionicons 
                                        name={items.every(i => selectedItemIds.includes(i.id)) ? "checkmark-circle" : "ellipse-outline"} 
                                        size={20} 
                                        color={items.every(i => selectedItemIds.includes(i.id)) ? PRIMARY_GREEN : colors.textMuted} 
                                    />
                                </TouchableOpacity>
                                <Text style={dynamicStyles.categoryTitle}>{category}</Text>
                                <Text style={dynamicStyles.itemCount}>{items.length} {items.length === 1 ? t('cart.item') : t('cart.items')}</Text>
                            </View>

                            {items.map(item => (
                                <View key={item.id} style={dynamicStyles.itemRow}>
                                    <TouchableOpacity 
                                        onPress={() => toggleItemSelection(item.id)}
                                        style={{ marginRight: 8, justifyContent: 'center' }}
                                    >
                                        <Ionicons 
                                            name={selectedItemIds.includes(item.id) ? "checkmark-circle" : "ellipse-outline"} 
                                            size={18} 
                                            color={selectedItemIds.includes(item.id) ? PRIMARY_GREEN : colors.textMuted} 
                                        />
                                    </TouchableOpacity>
                                    <View style={dynamicStyles.itemInfo}>
                                        <Text style={dynamicStyles.itemName} numberOfLines={2}>{item.title}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                                            <Text style={dynamicStyles.itemPrice}>₹{item.price}</Text>
                                            {item.serviceType === 'product' && (
                                                <View style={dynamicStyles.qtyContainer}>
                                                    <TouchableOpacity 
                                                        style={dynamicStyles.qtyBtn} 
                                                        onPress={() => {
                                                            if (item.quantity > 1) {
                                                                updateQuantity(item.id, item.quantity - 1);
                                                            } else {
                                                                removeItem(item.id);
                                                            }
                                                        }}
                                                    >
                                                        <Ionicons name="remove" size={14} color={isDarkMode ? '#E8E8E8' : TEXT_DARK} />
                                                    </TouchableOpacity>
                                                    <Text style={dynamicStyles.qtyText}>{item.quantity || 1}</Text>
                                                    <TouchableOpacity 
                                                        style={dynamicStyles.qtyBtn} 
                                                        onPress={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                                                    >
                                                        <Ionicons name="add" size={14} color={isDarkMode ? '#E8E8E8' : TEXT_DARK} />
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <TouchableOpacity 
                                            style={dynamicStyles.sepCheckoutBtn} 
                                            onPress={() => {
                                                router.push({
                                                    pathname: '/cart/schedule',
                                                    params: {
                                                        category: item.serviceType,
                                                        selectedItemIds: item.id,
                                                    }
                                                } as any);
                                            }}
                                        >
                                            <Text style={dynamicStyles.sepCheckoutBtnText}>{t('cart.checkout')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={dynamicStyles.removeBtn} onPress={() => removeItem(item.id)}>
                                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}

                            <View style={dynamicStyles.categoryFooter}>
                                <Text style={dynamicStyles.categorySubtotal}>{t('cart.subtotal', { amount: categoryTotal })}</Text>
                                <TouchableOpacity
                                    style={[
                                        dynamicStyles.checkoutBtn,
                                        categorySelectedItems.length === 0 && { backgroundColor: colors.borderLight, opacity: 0.5 }
                                    ]}
                                    onPress={() => handleCheckoutCategory(category)}
                                    disabled={categorySelectedItems.length === 0}
                                >
                                    <Text style={[dynamicStyles.checkoutBtnText, categorySelectedItems.length === 0 && { color: colors.textMuted }]}>{t('cart.checkout_category', { category })}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}

                <View style={dynamicStyles.grandTotalContainer}>
                    <Text style={dynamicStyles.grandTotalText}>{t('cart.grand_total', { amount: items.filter(i => selectedItemIds.includes(i.id)).reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0) })}</Text>
                    <TouchableOpacity
                        style={items.filter(i => selectedItemIds.includes(i.id)).length > 0 ? dynamicStyles.checkoutAllBtn : dynamicStyles.checkoutAllBtnDisabled}
                        disabled={items.filter(i => selectedItemIds.includes(i.id)).length === 0}
                        onPress={handleCheckoutAll}
                    >
                        <Text style={items.filter(i => selectedItemIds.includes(i.id)).length > 0 ? dynamicStyles.checkoutAllTextEnabled : dynamicStyles.checkoutAllText}>{t('cart.checkout_all')}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const makeStyles = (isDarkMode: boolean) => {
    const bgLight = isDarkMode ? '#1A1A1A' : '#F5F0E1';
    const bgCard = isDarkMode ? '#252525' : '#FAF7ED';
    const bgCardSecondary = isDarkMode ? '#2D2D2D' : '#F5F0E1';
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
        qtyContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDarkMode ? '#2D2D2D' : '#F3F4F6',
            borderRadius: 6,
            borderWidth: 1,
            borderColor: borderColor,
        },
        qtyBtn: {
            paddingHorizontal: 8,
            paddingVertical: 4,
            justifyContent: 'center',
            alignItems: 'center',
        },
        qtyText: {
            fontSize: 13,
            fontWeight: '600',
            color: textPrimary,
            minWidth: 16,
            textAlign: 'center',
        },
        removeBtn: {
            padding: 8,
            backgroundColor: removeBtn,
            borderRadius: 8,
        },
        sepCheckoutBtn: {
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 6,
            backgroundColor: PRIMARY_GREEN,
            justifyContent: 'center',
            alignItems: 'center',
        },
        sepCheckoutBtnText: {
            color: '#FAF7ED',
            fontSize: 12,
            fontWeight: '600',
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
            color: '#FAF7ED',
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
        checkoutAllBtn: {
            backgroundColor: PRIMARY_GREEN,
            paddingVertical: 14,
            borderRadius: 8,
            alignItems: 'center',
        },
        checkoutAllBtnDisabled: {
            backgroundColor: disabledBg,
            paddingVertical: 14,
            borderRadius: 8,
            alignItems: 'center',
        },
        checkoutAllTextEnabled: {
            color: '#FAF7ED',
            fontSize: 14,
            fontWeight: '600',
        },
        checkoutAllText: {
            color: disabledText,
            fontSize: 14,
            fontWeight: '600',
        },
    });
};

const styles = makeStyles(false);
