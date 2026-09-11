import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, ActivityIndicator, Switch, Linking, KeyboardAvoidingView } from 'react-native';
import { CustomAlertModal } from '@/components/common/CustomAlertModal';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { userService } from '@/services/api/userService';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';

interface EmergencyContact {
    id?: string;
    name: string;
    phone: string;
    relationship: string;
}

const RELATIONSHIPS = ['Son', 'Daughter', 'Spouse', 'Neighbour', 'Sibling', 'Friend', 'Other'];

export default function EmergencyContactsScreen() {
    const router = useRouter();
    const { profile, setProfile } = useUser();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const { t } = useTranslation();
    const styles = makeStyles(colors, isDarkMode);

    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Form
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newRelationship, setNewRelationship] = useState('');
    const [notifyEnabled, setNotifyEnabled] = useState(true);

    const contacts: EmergencyContact[] = profile?.emergencyContacts || [];

    // Native Alert.alert is globally muted app-wide (see app/_layout.tsx)
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; iconName: string }>({
        visible: false,
        title: '',
        message: '',
        iconName: 'warning-outline',
    });
    const triggerAlert = (title: string, message: string, iconName = 'warning-outline') => {
        setAlertConfig({ visible: true, title, message, iconName });
    };

    // Delete confirmation (needs 2 real actions, so it's separate from alertConfig)
    const [deleteConfirm, setDeleteConfirm] = useState<{ visible: boolean; contactId: string | null }>({ visible: false, contactId: null });

    const getTranslatedRelationship = (rel: string) => {
        if (!rel) return '';
        const key = `emergency_contacts.relationships.${rel.toLowerCase().replace(/\s+/g, '_')}`;
        return t(key, { defaultValue: rel });
    };

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
            triggerAlert(t('emergency_contacts.alerts.missing_info_title'), t('emergency_contacts.alerts.missing_info_msg'));
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
                triggerAlert(t('emergency_contacts.alerts.success_title'), t('emergency_contacts.alerts.contact_added'), 'checkmark-circle-outline');
            } else {
                triggerAlert(t('emergency_contacts.alerts.error_title'), res.message || t('emergency_contacts.alerts.failed_add'));
            }
        } catch (err: any) {
            triggerAlert(t('emergency_contacts.alerts.error_title'), err.message || t('emergency_contacts.alerts.something_went_wrong'));
        } finally {
            setSaving(false);
        }
    };

    const deleteContact = (contactId: string) => {
        if (!profile?.id) return;
        setDeleteConfirm({ visible: true, contactId });
    };

    const confirmDeleteContact = async () => {
        const contactId = deleteConfirm.contactId;
        setDeleteConfirm({ visible: false, contactId: null });
        if (!profile?.id || !contactId) return;
        setDeletingId(contactId);
        try {
            const res = await userService.removeEmergencyContact(profile.id, contactId);
            if (res.success) {
                const profileRes = await userService.getProfile();
                if (profileRes.success && profileRes.data) setProfile(profileRes.data);
            } else {
                triggerAlert(t('emergency_contacts.alerts.error_title'), res.message || t('emergency_contacts.alerts.failed_remove'));
            }
        } catch (err: any) {
            triggerAlert(t('emergency_contacts.alerts.error_title'), err.message || t('emergency_contacts.alerts.something_went_wrong'));
        } finally {
            setDeletingId(null);
        }
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
                    <Text style={styles.headerTitle}>{t('emergency_contacts.header_title')}</Text>
                </View>
            </SafeAreaView>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <KeyboardAwareScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled">

                {contacts.length === 0 && !showAddForm && (
                    <View style={styles.emptyState}>
                        <Ionicons name="people-outline" size={56} color={colors.textMuted} />
                        <Text style={styles.emptyTitle}>{t('emergency_contacts.no_contacts')}</Text>
                        <Text style={styles.emptyDesc}>{t('emergency_contacts.add_desc')}</Text>
                    </View>
                )}

                {contacts.map((contact) => (
                    <View key={contact.id} style={styles.card}>
                        <View style={styles.cardTop}>
                            <View style={styles.contactInfo}>
                                <View style={styles.relIconCircle}>
                                    <Ionicons name={getRelIcon(contact.relationship)} size={20} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.contactName}>{contact.name}</Text>
                                    <Text style={styles.contactRel}>{getTranslatedRelationship(contact.relationship)}</Text>
                                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.contactActions}>
                            <TouchableOpacity
                                style={styles.callBtn}
                                onPress={() => Linking.openURL(`tel:${contact.phone}`)}
                            >
                                <Ionicons name="call" size={18} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.waBtn}
                                onPress={() => {
                                    const digits = contact.phone.replace(/\D/g, '');
                                    const normalized = digits.startsWith('91') && digits.length > 10 ? digits : `91${digits.slice(-10)}`;
                                    Linking.openURL(`whatsapp://send?phone=${normalized}`);
                                }}
                            >
                                <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.removeBtn}
                                onPress={() => contact.id && deleteContact(contact.id)}
                                disabled={deletingId === contact.id}
                            >
                                {deletingId === contact.id ? (
                                    <ActivityIndicator size="small" color="#FF3B30" />
                                ) : (
                                    <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}

                {/* Notify Toggle */}
                {contacts.length > 0 && (
                    <View style={styles.notifyCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.notifyTitle}>{t('emergency_contacts.notify_toggle_title')}</Text>
                            <Text style={styles.notifyDesc}>{t('emergency_contacts.notify_toggle_desc')}</Text>
                        </View>
                        <Switch
                            trackColor={{ false: colors.textMuted, true: colors.primary }}
                            thumbColor="#FFFFFF"
                            ios_backgroundColor={colors.textMuted}
                            onValueChange={setNotifyEnabled}
                            value={notifyEnabled}
                        />
                    </View>
                )}

                {showAddForm && (
                    <View style={styles.addForm}>
                        <Text style={styles.formTitle}>{t('emergency_contacts.add_title')}</Text>
                        <TextInput style={styles.input} placeholder={t('emergency_contacts.full_name_placeholder')} placeholderTextColor={colors.textMuted} value={newName} onChangeText={setNewName} />
                        <TextInput style={styles.input} placeholder={t('emergency_contacts.phone_placeholder')} placeholderTextColor={colors.textMuted} keyboardType="phone-pad" value={newPhone} onChangeText={setNewPhone} />

                        <Text style={styles.relLabel}>{t('emergency_contacts.relationship_label')}</Text>
                        <View style={styles.relRow}>
                            {RELATIONSHIPS.map(rel => (
                                <TouchableOpacity key={rel} style={[styles.relChip, newRelationship === rel && styles.relChipActive]} onPress={() => setNewRelationship(rel)}>
                                    <Text style={[styles.relChipText, newRelationship === rel && styles.relChipTextActive]}>{getTranslatedRelationship(rel)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.formActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                                <Text style={styles.cancelBtnText}>{t('emergency_contacts.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={addContact} disabled={saving}>
                                {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>{t('emergency_contacts.save_contact')}</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <TouchableOpacity style={styles.addButton} onPress={() => setShowAddForm(!showAddForm)} activeOpacity={0.7}>
                    <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                    <Text style={styles.addButtonText}>{t('emergency_contacts.add_button')}</Text>
                </TouchableOpacity>
            </KeyboardAwareScrollView>
        </KeyboardAvoidingView>

            <CustomAlertModal
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                iconName={alertConfig.iconName as any}
                buttonText={t('common.ok', 'OK')}
                onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            />

            <CustomAlertModal
                visible={deleteConfirm.visible}
                title={t('emergency_contacts.alerts.remove_contact_title')}
                message={t('emergency_contacts.alerts.remove_contact_msg')}
                iconName="trash-outline"
                buttonText={t('emergency_contacts.cancel')}
                onClose={() => setDeleteConfirm({ visible: false, contactId: null })}
                secondaryButtonText={t('emergency_contacts.remove')}
                onSecondaryPress={confirmDeleteContact}
                secondaryDestructive={true}
            />
        </View>
    );
}

const makeStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.primary },
    headerSafe: { backgroundColor: colors.primary },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { padding: 4, marginRight: 8 },
    headerTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 20, color: '#FAF7ED',
        flex: 1,
    },
    scrollView: { flex: 1, backgroundColor: colors.bgScreen, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    scrollContent: { padding: 20, paddingBottom: 50 },

    emptyState: { alignItems: 'center', marginTop: 50, marginBottom: 30 },
    emptyTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 18, color: colors.textDark, marginTop: 14,
    },
    emptyDesc: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14, color: colors.textMuted, marginTop: 4, textAlign: 'center',
    },

    card: {
        backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, marginBottom: 12,
        shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    contactInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    relIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
    contactName: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 14, color: colors.textDark,
    },
    contactRel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12, color: colors.textMuted, marginTop: 1,
    },
    contactPhone: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13, color: colors.primary,
    },
    contactActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 10 },
    callBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    waBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
    removeBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: isDarkMode ? '#EF4444' : '#FFCDD2', alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },

    notifyCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? 'rgba(52,199,89,0.05)' : 'rgba(4, 131, 87, 0.05)',
        borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.borderLight,
    },
    notifyTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 14, color: colors.textDark, marginBottom: 4,
    },
    notifyDesc: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12, color: colors.textMuted,
    },

    addForm: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.primary },
    formTitle: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 16, color: colors.textDark, marginBottom: 12,
    },
    input: {
        backgroundColor: colors.bgCardMuted, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14, color: colors.textDark, borderWidth: 1, borderColor: colors.borderLight, marginBottom: 10,
    },
    relLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13, color: colors.textDark, marginBottom: 8,
    },
    relRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    relChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.bgCardMuted },
    relChipActive: { borderColor: colors.primary, backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : 'rgba(4, 131, 87, 0.08)' },
    relChipText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13, color: colors.textMuted,
    },
    relChipTextActive: { color: colors.primary },
    formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
    cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight },
    cancelBtnText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14, color: colors.textDark,
    },
    saveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.primary },
    saveBtnText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14, color: '#FAF7ED',
    },
    addButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary,
        backgroundColor: isDarkMode ? 'rgba(52,199,89,0.05)' : '#F0FFF4', marginTop: 4,
    },
    addButtonText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15, color: colors.primary,
    },
});
