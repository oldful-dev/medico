import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    Alert, Platform, ActivityIndicator, Switch,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { userService } from '@/services/api/userService';
import { useTranslation } from 'react-i18next';

interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    relationship: string;
}

const RELATIONSHIPS = ['Son', 'Daughter', 'Spouse', 'Neighbour', 'Sibling', 'Friend', 'Other'];

export default function EmergencyContactsScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { profile, setProfile } = useUser();
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Form
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newRelationship, setNewRelationship] = useState('');
    const [notifyEnabled, setNotifyEnabled] = useState(true);

    const contacts: EmergencyContact[] = profile?.emergencyContacts || [];

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
        setNewName(''); setNewPhone(''); setNewRelationship('');
        setShowAddForm(false);
    };

    const addContact = async () => {
        if (!newName.trim() || !newPhone.trim() || !newRelationship) {
            Alert.alert('Missing Info', 'Please fill name, phone, and relationship.');
            return;
        }
        if (!profile?.id) return;
        setSaving(true);
        try {
            const res = await userService.addEmergencyContact(profile.id, {
                name: newName.trim(),
                phone: newPhone.trim(),
                relationship: newRelationship,
            });
            if (res.success) {
                const profileRes = await userService.getProfile();
                if (profileRes.success && profileRes.data) setProfile(profileRes.data);
                resetForm();
                Alert.alert('Success', 'Emergency contact added.');
            } else {
                Alert.alert('Error', res.message || 'Failed to add.');
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Something went wrong.');
        } finally {
            setSaving(false);
        }
    };

    const deleteContact = (contactId: string) => {
        if (!profile?.id) return;
        Alert.alert('Remove Contact', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive', onPress: async () => {
                    setDeletingId(contactId);
                    try {
                        const res = await userService.removeEmergencyContact(profile.id, contactId);
                        if (res.success) {
                            const profileRes = await userService.getProfile();
                            if (profileRes.success && profileRes.data) setProfile(profileRes.data);
                        } else {
                            Alert.alert('Error', res.message || 'Failed to remove.');
                        }
                    } catch (err: any) {
                        Alert.alert('Error', err.message || 'Something went wrong.');
                    } finally {
                        setDeletingId(null);
                    }
                }
            },
        ]);
    };

    const getRelIcon = (rel: string): keyof typeof Ionicons.glyphMap => {
        if (rel === 'Son' || rel === 'Daughter') return 'people-outline';
        if (rel === 'Spouse') return 'heart-outline';
        if (rel === 'Neighbour') return 'home-outline';
        return 'person-outline';
    };

    return (
        <View style={styles.screen}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.headerSafe} edges={['top']}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Emergency Contacts</Text>
                    <View style={{ width: 24 }} />
                </View>
            </SafeAreaView>

            <KeyboardAwareScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled">

                    {contacts.length === 0 && !showAddForm && (
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={56} color="#AAAEAC" />
                            <Text style={styles.emptyTitle}>No Emergency Contacts</Text>
                            <Text style={styles.emptyDesc}>Add your son, daughter, or neighbour as an emergency contact.</Text>
                        </View>
                    )}

                    {contacts.map((contact) => (
                        <View key={contact.id} style={styles.card}>
                            <View style={styles.cardTop}>
                                <View style={styles.contactInfo}>
                                    <View style={styles.relIconCircle}>
                                        <Ionicons name={getRelIcon(contact.relationship)} size={20} color="#048357" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.contactName}>{contact.name}</Text>
                                        <Text style={styles.contactRel}>{contact.relationship}</Text>
                                    </View>
                                </View>
                                <Text style={styles.contactPhone}>{contact.phone}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.removeBtn}
                                onPress={() => deleteContact(contact.id)}
                                disabled={deletingId === contact.id}
                            >
                                {deletingId === contact.id ? (
                                    <ActivityIndicator size="small" color="#FF3B30" />
                                ) : (
                                    <>
                                        <Ionicons name="trash-outline" size={14} color="#FF3B30" />
                                        <Text style={styles.removeBtnText}>Remove</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    ))}

                    {/* Notify Toggle */}
                    {contacts.length > 0 && (
                        <View style={styles.notifyCard}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.notifyTitle}>Notify them for every booking?</Text>
                                <Text style={styles.notifyDesc}>Emergency contacts will receive a notification for each service booking.</Text>
                            </View>
                            <Switch
                                trackColor={{ false: '#AAAEAC', true: '#048357' }}
                                thumbColor="#FFFFFF"
                                ios_backgroundColor="#AAAEAC"
                                onValueChange={setNotifyEnabled}
                                value={notifyEnabled}
                            />
                        </View>
                    )}

                    {showAddForm && (
                        <View style={styles.addForm}>
                            <Text style={styles.formTitle}>Add Emergency Contact</Text>
                            <TextInput style={styles.input} placeholder="Full Name *" placeholderTextColor="#898989" value={newName} onChangeText={setNewName} />
                            <TextInput style={styles.input} placeholder="Phone Number *" placeholderTextColor="#898989" keyboardType="phone-pad" value={newPhone} onChangeText={setNewPhone} />

                            <Text style={styles.relLabel}>Relationship *</Text>
                            <View style={styles.relRow}>
                                {RELATIONSHIPS.map(rel => (
                                    <TouchableOpacity key={rel} style={[styles.relChip, newRelationship === rel && styles.relChipActive]} onPress={() => setNewRelationship(rel)}>
                                        <Text style={[styles.relChipText, newRelationship === rel && styles.relChipTextActive]}>{rel}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.formActions}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.saveBtn} onPress={addContact} disabled={saving}>
                                    {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Save Contact</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <TouchableOpacity style={styles.addButton} onPress={() => setShowAddForm(!showAddForm)} activeOpacity={0.7}>
                        <Ionicons name="add-circle-outline" size={22} color="#048357" />
                        <Text style={styles.addButtonText}>Add Emergency Contact</Text>
                    </TouchableOpacity>
            </KeyboardAwareScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#048357' },
    headerSafe: { backgroundColor: '#048357' },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { padding: 4 },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20, color: '#FFFFFF',
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
        fontSize: 14, color: '#898989', marginTop: 4, textAlign: 'center',
    },

    card: {
        backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    contactInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    relIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
    contactName: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 14, color: '#2F2F2F',
    },
    contactRel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12, color: '#898989', marginTop: 1,
    },
    contactPhone: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13, color: '#048357',
    },
    removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: '#FFCDD2' },
    removeBtnText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 12, color: '#FF3B30',
    },

    notifyCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(4, 131, 87, 0.05)',
        borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E8F5E9',
    },
    notifyTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 14, color: '#2F2F2F', marginBottom: 4,
    },
    notifyDesc: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12, color: '#898989',
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
    relLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13, color: '#2F2F2F', marginBottom: 8,
    },
    relRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    relChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E5E5', backgroundColor: '#FFF' },
    relChipActive: { borderColor: '#048357', backgroundColor: 'rgba(4, 131, 87, 0.08)' },
    relChipText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13, color: '#898989',
    },
    relChipTextActive: { color: '#048357' },
    formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
    cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E5' },
    cancelBtnText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14, color: '#555555',
    },
    saveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#048357' },
    saveBtnText: {
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
