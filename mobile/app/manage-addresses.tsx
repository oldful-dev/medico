import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    Alert, Platform, ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { userService, Address } from '@/services/api/userService';


const LABEL_OPTIONS = ['Home', 'Office', 'Parents Home', 'Other'];

export default function ManageAddressesScreen() {
    const router = useRouter();
    const { profile, setProfile } = useUser();
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [newLabel, setNewLabel] = useState('');
    const [newLine1, setNewLine1] = useState('');
    const [newLine2, setNewLine2] = useState('');
    const [newCity, setNewCity] = useState('');
    const [newState, setNewState] = useState('');
    const [newPincode, setNewPincode] = useState('');
    const [newLandmark, setNewLandmark] = useState('');

    const addresses: Address[] = profile?.addresses || [];

    // Refetch profile on focus to pick up changes
    useFocusEffect(
        useCallback(() => {
            const refetch = async () => {
                try {
                    const res = await userService.getProfile();
                    if (res.success && res.data) setProfile(res.data);
                } catch { }
            };
            refetch();
        }, [setProfile])
    );

    const resetForm = () => {
        setNewLabel('');
        setNewLine1('');
        setNewLine2('');
        setNewCity('');
        setNewState('');
        setNewPincode('');
        setNewLandmark('');
        setShowAddForm(false);
        setEditingId(null);
    };

    const startEdit = (address: Address) => {
        setEditingId(address.id);
        setNewLabel(address.label || '');
        setNewLine1(address.line1);
        setNewLine2(address.line2 || '');
        setNewCity(address.cityName);
        setNewState(address.state);
        setNewPincode(address.pincode);
        setNewLandmark(address.landmark || '');
        setShowAddForm(true);
    };

    const saveAddress = async () => {
        if (!newLabel.trim() || !newLine1.trim() || !newCity.trim() || !newState.trim() || !newPincode.trim()) {
            Alert.alert('Missing Info', 'Please fill Label, Address Line 1, City, State, and Pincode.');
            return;
        }
        if (!profile?.id) return;
        setSaving(true);
        try {
            const addressData = {
                label: newLabel.trim(),
                line1: newLine1.trim(),
                line2: newLine2.trim() || undefined,
                cityName: newCity.trim(),
                state: newState.trim(),
                pincode: newPincode.trim(),
                landmark: newLandmark.trim() || undefined,
                isDefault: addresses.length === 0,
            };

            let res;
            if (editingId) {
                res = await userService.updateAddress(profile.id, editingId, addressData);
            } else {
                res = await userService.addAddress(profile.id, addressData);
            }

            if (res.success) {
                const profileRes = await userService.getProfile();
                if (profileRes.success && profileRes.data) setProfile(profileRes.data);
                resetForm();
                Alert.alert('Success', editingId ? 'Address updated.' : 'Address added.');
            } else {
                Alert.alert('Error', res.message || 'Failed to save address.');
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Something went wrong.');
        } finally {
            setSaving(false);
        }
    };

    const deleteAddress = async (address: Address) => {
        if (!profile?.id || !address.id) return;
        Alert.alert(
            'Delete Address',
            'Are you sure you want to delete this address?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await userService.deleteAddress(profile.id, address.id);
                            const profileRes = await userService.getProfile();
                            if (profileRes.success && profileRes.data) setProfile(profileRes.data);
                            Alert.alert('Success', 'Address deleted.');
                        } catch (err: any) {
                            Alert.alert('Error', err.message || 'Failed to delete address.');
                        }
                    },
                },
            ]
        );
    };

    const setDefault = async (address: Address) => {
        if (!profile?.id || !address.id) return;
        try {
            await userService.updateAddress(profile.id, address.id, { isDefault: true });
            const profileRes = await userService.getProfile();
            if (profileRes.success && profileRes.data) setProfile(profileRes.data);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to update.');
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
                    <Text style={styles.headerTitle}>Manage Addresses</Text>
                </View>
            </SafeAreaView>

            <KeyboardAwareScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled">

                {addresses.length === 0 && !showAddForm && (
                    <View style={styles.emptyState}>
                        <Ionicons name="location-outline" size={56} color="#AAAEAC" />
                        <Text style={styles.emptyTitle}>No Addresses Yet</Text>
                        <Text style={styles.emptyDesc}>Add your first address below.</Text>
                    </View>
                )}

                {addresses.map((item) => (
                    <View key={item.id} style={[styles.card, item.isDefault && styles.cardDefault]}>
                        <View style={styles.cardHeader}>
                            <View style={styles.labelBadge}>
                                <Ionicons
                                    name={
                                        item.label === 'Home' ? 'home-outline' :
                                        item.label === 'Office' ? 'briefcase-outline' :
                                        item.label === 'Parents Home' ? 'people-outline' :
                                        'location-outline'
                                    }
                                    size={16} color="#048357"
                                />
                                <Text style={styles.labelText}>{item.label}</Text>
                            </View>
                            {item.isDefault && (
                                <View style={styles.defaultBadge}>
                                    <Text style={styles.defaultBadgeText}>Default</Text>
                                </View>
                            )}
                        </View>

                        <Text style={styles.addressText}>
                            {[item.line1, item.line2, item.landmark].filter(Boolean).join(', ')}
                        </Text>
                        <Text style={styles.phoneText}>{item.cityName}, {item.state} — {item.pincode}</Text>

                        <View style={styles.cardActions}>
                            {!item.isDefault && (
                                <TouchableOpacity style={styles.actionBtn} onPress={() => setDefault(item)}>
                                    <Ionicons name="checkmark-circle-outline" size={16} color="#048357" />
                                    <Text style={styles.actionBtnText}>Set Default</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.actionBtn} onPress={() => startEdit(item)}>
                                <Ionicons name="pencil-outline" size={16} color="#048357" />
                                <Text style={styles.actionBtnText}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => deleteAddress(item)}>
                                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}

                {showAddForm && (
                    <View style={styles.addForm}>
                        <Text style={styles.formTitle}>Add New Address</Text>
                        <TextInput style={styles.input} placeholder="Label (e.g. Home, Office)" placeholderTextColor="#898989" value={newLabel} onChangeText={setNewLabel} />
                        <TextInput style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]} placeholder="Address Line 1 *" placeholderTextColor="#898989" multiline value={newLine1} onChangeText={setNewLine1} />
                        <TextInput style={styles.input} placeholder="Address Line 2 (optional)" placeholderTextColor="#898989" value={newLine2} onChangeText={setNewLine2} />
                        <TextInput style={styles.input} placeholder="City *" placeholderTextColor="#898989" value={newCity} onChangeText={setNewCity} />
                        <TextInput style={styles.input} placeholder="State *" placeholderTextColor="#898989" value={newState} onChangeText={setNewState} />
                        <TextInput style={styles.input} placeholder="Pincode *" placeholderTextColor="#898989" keyboardType="numeric" value={newPincode} onChangeText={setNewPincode} />
                        <TextInput style={styles.input} placeholder="Landmark (optional)" placeholderTextColor="#898989" value={newLandmark} onChangeText={setNewLandmark} />
                        <View style={styles.formActions}>
                            <TouchableOpacity style={styles.cancelFormBtn} onPress={resetForm}>
                                <Text style={styles.cancelFormText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveFormBtn} onPress={saveAddress} disabled={saving}>
                                {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveFormText}>Save Address</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <TouchableOpacity style={styles.addButton} onPress={() => setShowAddForm(!showAddForm)} activeOpacity={0.7}>
                    <Ionicons name="add-circle-outline" size={22} color="#048357" />
                    <Text style={styles.addButtonText}>Add New Address</Text>
                </TouchableOpacity>
            </KeyboardAwareScrollView>
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

    emptyState: { alignItems: 'center', marginTop: 50, marginBottom: 30 },
    emptyTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 18, color: '#2F2F2F', marginTop: 14,
    },
    emptyDesc: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14, color: '#898989', marginTop: 4,
    },

    card: {
        backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    },
    cardDefault: { borderWidth: 1.5, borderColor: '#048357' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    labelBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 6 },
    labelText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 13, color: '#048357',
    },
    defaultBadge: { backgroundColor: '#048357', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
    defaultBadgeText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 11, color: '#FFFFFF',
    },
    addressText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14, color: '#555555', lineHeight: 20, marginBottom: 4,
    },
    phoneText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13, color: '#898989', marginBottom: 10,
    },
    cardActions: { flexDirection: 'row', gap: 12 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: '#E5E5E5' },
    actionBtnText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 12, color: '#048357',
    },

    addForm: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#048357' },
    formTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 16, color: '#2F2F2F', marginBottom: 12,
    },
    input: {
        backgroundColor: '#F9F9F9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14, color: '#2F2F2F', borderWidth: 1, borderColor: '#E5E5E5', marginBottom: 10,
    },
    formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
    cancelFormBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E5' },
    cancelFormText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14, color: '#555555',
    },
    saveFormBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#048357' },
    saveFormText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14, color: '#FFFFFF',
    },

    addButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#048357',
        backgroundColor: '#F0FFF4', marginTop: 4,
    },
    addButtonText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15, color: '#048357',
    },
});
