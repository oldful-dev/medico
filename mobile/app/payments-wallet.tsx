import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { paymentService, SavedCard, AddCardPayload } from '@/services/api/paymentService';

const CARD_BRAND_ICON: Record<string, { name: any; color: string }> = {
    Visa:       { name: 'card-outline',   color: '#1A1F71' },
    Mastercard: { name: 'card-outline',   color: '#EB001B' },
    Rupay:      { name: 'card-outline',   color: '#097B45' },
    Amex:       { name: 'card-outline',   color: '#007BC1' },
    UPI:        { name: 'wallet-outline', color: '#5F259F' },
    default:    { name: 'card-outline',   color: Colors.primary },
};

const CARD_BRANDS = ['Visa', 'Mastercard', 'Rupay', 'Amex'];

function cardIcon(card: SavedCard) {
    return CARD_BRAND_ICON[card.cardBrand] ?? CARD_BRAND_ICON.default;
}

export default function PaymentsWalletScreen() {
    const router = useRouter();
    const [cards, setCards] = useState<SavedCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addType, setAddType] = useState<'CARD' | 'UPI'>('CARD');
    const [saving, setSaving] = useState(false);

    // Card form
    const [cardLast4, setCardLast4] = useState('');
    const [cardBrand, setCardBrand] = useState('Visa');
    const [cardholderName, setCardholderName] = useState('');
    const [expiryMonth, setExpiryMonth] = useState('');
    const [expiryYear, setExpiryYear] = useState('');
    // UPI form
    const [upiId, setUpiId] = useState('');

    const loadCards = useCallback(async () => {
        try {
            setLoading(true);
            const res = await paymentService.getSavedCards();
            if (res.success && res.data) setCards(res.data);
        } catch {
            // network error — keep empty state
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { loadCards(); }, [loadCards]));

    const handleDelete = (card: SavedCard) => {
        Alert.alert(
            'Remove Card',
            `Remove ${card.cardType === 'UPI' ? card.upiId : `•••• ${card.cardLast4}`}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove', style: 'destructive', onPress: async () => {
                        try {
                            await paymentService.deleteSavedCard(card.id);
                            setCards(prev => prev.filter(c => c.id !== card.id));
                        } catch {
                            Alert.alert('Error', 'Could not remove card. Please try again.');
                        }
                    }
                },
            ]
        );
    };

    const handleSetDefault = async (card: SavedCard) => {
        if (card.isDefault) return;
        try {
            await paymentService.setDefaultCard(card.id);
            setCards(prev => prev.map(c => ({ ...c, isDefault: c.id === card.id })));
        } catch {
            Alert.alert('Error', 'Could not update default. Please try again.');
        }
    };

    const resetForm = () => {
        setCardLast4(''); setCardBrand('Visa'); setCardholderName('');
        setExpiryMonth(''); setExpiryYear(''); setUpiId('');
        setAddType('CARD');
    };

    const handleAdd = async () => {
        if (addType === 'CARD') {
            if (cardLast4.length !== 4 || !/^\d{4}$/.test(cardLast4))
                return Alert.alert('Invalid', 'Enter last 4 digits of your card number.');
            if (!expiryMonth || !expiryYear)
                return Alert.alert('Invalid', 'Enter card expiry.');
        } else {
            if (!upiId.includes('@'))
                return Alert.alert('Invalid', 'Enter a valid UPI ID (e.g. name@upi).');
        }

        const payload: AddCardPayload = addType === 'CARD'
            ? { cardType: 'CARD', cardLast4, cardBrand, cardholderName, expiryMonth, expiryYear, setDefault: cards.length === 0 }
            : { cardType: 'UPI', upiId, cardBrand: 'UPI', cardLast4: '0000', setDefault: cards.length === 0 };

        try {
            setSaving(true);
            const res = await paymentService.addSavedCard(payload);
            if (res.success && res.data) {
                setCards(prev =>
                    payload.setDefault
                        ? [...prev.map(c => ({ ...c, isDefault: false })), res.data!]
                        : [...prev, res.data!]
                );
                setShowAddModal(false);
                resetForm();
            } else {
                Alert.alert('Error', res.message || 'Failed to save card.');
            }
        } catch {
            Alert.alert('Error', 'Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

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

                {/* ─── Section Title ─── */}
                <Text style={styles.sectionTitle}>Saved Cards & UPI</Text>
                <Text style={styles.sectionSubtitle}>Saved methods are used for faster, one-tap checkout</Text>

                {/* ─── Card List ─── */}
                {loading ? (
                    <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
                ) : cards.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="card-outline" size={48} color={Colors.textLight} />
                        <Text style={styles.emptyText}>No saved methods yet</Text>
                        <Text style={styles.emptySubtext}>Add a card or UPI for quick checkout</Text>
                    </View>
                ) : (
                    cards.map(card => {
                        const icon = cardIcon(card);
                        return (
                            <View key={card.id} style={[styles.cardRow, card.isDefault && styles.cardRowDefault]}>
                                <View style={[styles.cardIconBox, { backgroundColor: icon.color + '18' }]}>
                                    <Ionicons name={icon.name} size={22} color={icon.color} />
                                </View>
                                <View style={styles.cardInfo}>
                                    {card.cardType === 'UPI' ? (
                                        <Text style={styles.cardTitle}>{card.upiId}</Text>
                                    ) : (
                                        <Text style={styles.cardTitle}>{card.cardBrand} •••• {card.cardLast4}</Text>
                                    )}
                                    {card.expiryMonth && card.expiryYear && (
                                        <Text style={styles.cardSub}>Expires {card.expiryMonth}/{card.expiryYear}</Text>
                                    )}
                                    {card.cardholderName ? (
                                        <Text style={styles.cardSub}>{card.cardholderName}</Text>
                                    ) : null}
                                </View>
                                <View style={styles.cardActions}>
                                    {card.isDefault ? (
                                        <View style={styles.defaultBadge}>
                                            <Text style={styles.defaultBadgeText}>Default</Text>
                                        </View>
                                    ) : (
                                        <TouchableOpacity onPress={() => handleSetDefault(card)} style={styles.setDefaultBtn}>
                                            <Text style={styles.setDefaultText}>Set default</Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity onPress={() => handleDelete(card)} style={styles.deleteBtn}>
                                        <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })
                )}

                {/* ─── Add Method Button ─── */}
                <TouchableOpacity style={styles.addMethodBtn} activeOpacity={0.7} onPress={() => setShowAddModal(true)}>
                    <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                    <Text style={styles.addMethodText}>Add Card or UPI</Text>
                </TouchableOpacity>

                <View style={{ height: 60 }} />
            </ScrollView>

            {/* ─── Add Card Modal ─── */}
            <Modal visible={showAddModal} transparent animationType="slide">
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalSheet}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>Add Payment Method</Text>

                            {/* Type Toggle */}
                            <View style={styles.typeToggle}>
                                <TouchableOpacity
                                    style={[styles.typeBtn, addType === 'CARD' && styles.typeBtnActive]}
                                    onPress={() => setAddType('CARD')}
                                >
                                    <Ionicons name="card-outline" size={16} color={addType === 'CARD' ? '#fff' : Colors.textMuted} />
                                    <Text style={[styles.typeBtnText, addType === 'CARD' && styles.typeBtnTextActive]}>Debit / Credit Card</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.typeBtn, addType === 'UPI' && styles.typeBtnActive]}
                                    onPress={() => setAddType('UPI')}
                                >
                                    <Ionicons name="wallet-outline" size={16} color={addType === 'UPI' ? '#fff' : Colors.textMuted} />
                                    <Text style={[styles.typeBtnText, addType === 'UPI' && styles.typeBtnTextActive]}>UPI</Text>
                                </TouchableOpacity>
                            </View>

                            {addType === 'CARD' ? (
                                <>
                                    {/* Brand Selector */}
                                    <Text style={styles.fieldLabel}>Card Network</Text>
                                    <View style={styles.brandRow}>
                                        {CARD_BRANDS.map(b => (
                                            <TouchableOpacity
                                                key={b}
                                                style={[styles.brandChip, cardBrand === b && styles.brandChipActive]}
                                                onPress={() => setCardBrand(b)}
                                            >
                                                <Text style={[styles.brandChipText, cardBrand === b && styles.brandChipTextActive]}>{b}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <Text style={styles.fieldLabel}>Last 4 Digits</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. 4532"
                                        placeholderTextColor={Colors.textLight}
                                        keyboardType="number-pad"
                                        maxLength={4}
                                        value={cardLast4}
                                        onChangeText={setCardLast4}
                                    />

                                    <Text style={styles.fieldLabel}>Cardholder Name (optional)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Name on card"
                                        placeholderTextColor={Colors.textLight}
                                        autoCapitalize="words"
                                        value={cardholderName}
                                        onChangeText={setCardholderName}
                                    />

                                    <View style={styles.expiryRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.fieldLabel}>Expiry Month</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="MM"
                                                placeholderTextColor={Colors.textLight}
                                                keyboardType="number-pad"
                                                maxLength={2}
                                                value={expiryMonth}
                                                onChangeText={setExpiryMonth}
                                            />
                                        </View>
                                        <View style={{ width: 12 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.fieldLabel}>Expiry Year</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="YYYY"
                                                placeholderTextColor={Colors.textLight}
                                                keyboardType="number-pad"
                                                maxLength={4}
                                                value={expiryYear}
                                                onChangeText={setExpiryYear}
                                            />
                                        </View>
                                    </View>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.fieldLabel}>UPI ID</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="yourname@upi"
                                        placeholderTextColor={Colors.textLight}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={upiId}
                                        onChangeText={setUpiId}
                                    />
                                </>
                            )}

                            <View style={styles.modalBtns}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowAddModal(false); resetForm(); }}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={saving}>
                                    {saving ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={styles.saveBtnText}>Save</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.primary },
    headerSafe: { backgroundColor: Colors.primary },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { padding: 4, marginRight: 8 },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading2, color: '#FFFFFF', flex: 1 },

    scrollView: { flex: 1, backgroundColor: Colors.bgScreen, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xl },

    sectionTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading3, color: Colors.textDark, marginBottom: 4 },
    sectionSubtitle: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: Colors.textMuted, marginBottom: 20 },

    emptyState: { alignItems: 'center', paddingVertical: 48 },
    emptyText: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: Colors.textMuted, marginTop: 12 },
    emptySubtext: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: Colors.textLight, marginTop: 4 },

    cardRow: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard,
        borderRadius: Radius.md, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: Colors.borderLight,
        ...Shadow.card,
    },
    cardRowDefault: { borderColor: Colors.primary, borderWidth: 1.5 },
    cardIconBox: { width: 42, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    cardInfo: { flex: 1 },
    cardTitle: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: Colors.textDark },
    cardSub: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: Colors.textMuted, marginTop: 2 },
    cardActions: { alignItems: 'flex-end', gap: 6 },
    defaultBadge: { backgroundColor: Colors.primary + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    defaultBadgeText: { fontFamily: Fonts.medium, fontSize: 10, color: Colors.primary },
    setDefaultBtn: { paddingHorizontal: 6, paddingVertical: 3 },
    setDefaultText: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textMuted },
    deleteBtn: { padding: 4 },

    addMethodBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 14, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.primary,
        borderStyle: 'dashed', backgroundColor: Colors.primary + '08', marginTop: 8,
    },
    addMethodText: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: Colors.primary },

    // Modal
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
    modalSheet: {
        backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: Spacing.lg, paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    },
    modalHandle: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    modalTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading3, color: Colors.textDark, marginBottom: 20 },

    typeToggle: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    typeBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 10, borderRadius: Radius.sm, borderWidth: 1.5, borderColor: Colors.borderLight,
    },
    typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    typeBtnText: { fontFamily: Fonts.medium, fontSize: FontSize.bodySmall, color: Colors.textMuted },
    typeBtnTextActive: { color: '#FFF' },

    fieldLabel: { fontFamily: Fonts.medium, fontSize: FontSize.bodySmall, color: Colors.textBody, marginBottom: 6, marginTop: 12 },
    input: {
        borderWidth: 1, borderColor: Colors.borderLight ?? '#E0E0E0', borderRadius: Radius.sm,
        paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10,
        fontFamily: Fonts.regular, fontSize: FontSize.body, color: Colors.textDark,
    },
    brandRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    brandChip: {
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
        borderWidth: 1.5, borderColor: Colors.borderLight ?? '#E0E0E0',
    },
    brandChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '12' },
    brandChipText: { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: Colors.textMuted },
    brandChipTextActive: { color: Colors.primary, fontFamily: Fonts.medium },
    expiryRow: { flexDirection: 'row' },

    modalBtns: { flexDirection: 'row', gap: 12, marginTop: 24 },
    cancelBtn: {
        flex: 1, paddingVertical: 13, borderRadius: Radius.sm,
        borderWidth: 1, borderColor: Colors.borderLight ?? '#E0E0E0', alignItems: 'center',
    },
    cancelBtnText: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: Colors.textMuted },
    saveBtn: { flex: 1, paddingVertical: 13, borderRadius: Radius.sm, backgroundColor: Colors.primary, alignItems: 'center' },
    saveBtnText: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: '#FFF' },
});
