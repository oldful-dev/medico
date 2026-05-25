import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    Alert, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { familyMemberService, FamilyMember } from '@/services/api/familyMemberService';
import { useUser } from '@/context/UserContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { Fonts, FontSize, Spacing, Radius } from '@/constants/theme';

const RELATIONS = ['Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Sibling', 'Dependent', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'];
const GENDERS = ['Male', 'Female', 'Other'];

const RELATION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    Father: 'person-outline',
    Mother: 'person-outline',
    Spouse: 'heart-outline',
    Son: 'people-outline',
    Daughter: 'people-outline',
    Sibling: 'people-outline',
    Dependent: 'person-add-outline',
    Other: 'person-outline',
};

export default function FamilyMembersScreen() {
    const router = useRouter();
    const { profile } = useUser();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors, isDarkMode);

    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dobDate, setDobDate] = useState<Date | null>(null);

    const [form, setForm] = useState({
        name: '', relation: '', gender: '', dateOfBirth: '',
        bloodGroup: '', allergies: '', chronicConditions: '', emergencyNotes: '',
    });

    const userId = profile?.id || '';

    // Fetch family members on focus
    useFocusEffect(
        useCallback(() => {
            if (userId) {
                fetchMembers();
            }
        }, [userId])
    );

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const res = await familyMemberService.getFamilyMembers(userId);
            if (res.success && res.data) {
                setMembers(res.data);
            }
        } catch (error) {
            console.error('Fetch family members error:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm({ name: '', relation: '', gender: '', dateOfBirth: '', bloodGroup: '', allergies: '', chronicConditions: '', emergencyNotes: '' });
        setDobDate(null);
        setShowForm(false);
        setEditingId(null);
    };

    const startEdit = (member: FamilyMember) => {
        setEditingId(member.id);
        setForm({
            name: member.name,
            relation: member.relation,
            gender: member.gender || '',
            dateOfBirth: member.dateOfBirth || '',
            bloodGroup: member.bloodGroup || '',
            allergies: member.allergies || '',
            chronicConditions: member.chronicConditions || '',
            emergencyNotes: member.emergencyNotes || '',
        });
        if (member.dateOfBirth) {
            setDobDate(new Date(member.dateOfBirth));
        }
        setShowForm(true);
    };

    const handleDateChange = (_: any, date: Date | undefined) => {
        setShowDatePicker(false);
        if (date) {
            setDobDate(date);
            const formattedDate = date.toISOString().split('T')[0];
            setForm(f => ({ ...f, dateOfBirth: formattedDate }));
        }
    };

    const saveMember = async () => {
        if (!form.name.trim() || !form.relation) {
            Alert.alert('Missing Info', 'Please enter name and relationship.');
            return;
        }
        setSaving(true);
        try {
            let res;
            if (editingId) {
                res = await familyMemberService.updateFamilyMember(userId, editingId, form);
            } else {
                res = await familyMemberService.addFamilyMember(userId, form);
            }

            if (res.success) {
                await fetchMembers();
                resetForm();
                Alert.alert('Success', editingId ? 'Family member updated.' : 'Family member added.');
            } else {
                Alert.alert('Error', res.message || 'Failed to save family member.');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Something went wrong.');
        } finally {
            setSaving(false);
        }
    };

    const deleteMember = (member: FamilyMember) => {
        Alert.alert('Remove Member', `Remove ${member.name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await familyMemberService.deleteFamilyMember(userId, member.id);
                        if (res.success) {
                            setMembers(prev => prev.filter(m => m.id !== member.id));
                            Alert.alert('Success', 'Family member removed.');
                        } else {
                            Alert.alert('Error', res.message || 'Failed to remove family member.');
                        }
                    } catch (error: any) {
                        Alert.alert('Error', error.message || 'Failed to remove family member.');
                    }
                }
            },
        ]);
    };

    return (
        <View style={styles.screen}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.headerSafe} edges={['top']}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Family Members</Text>
                </View>
            </SafeAreaView>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : members.length === 0 && !showForm ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="people-outline" size={56} color={colors.textMuted} />
                        <Text style={styles.emptyTitle}>No Family Members</Text>
                        <Text style={styles.emptyDesc}>Add family members to manage their health profiles and share bookings.</Text>
                    </View>
                ) : null}

                {members.map(member => (
                    <View key={member.id} style={styles.card}>
                        <TouchableOpacity
                            style={styles.cardTop}
                            onPress={() => setExpandedId(expandedId === member.id ? null : member.id)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.memberInfo}>
                                <View style={styles.relIconCircle}>
                                    <Ionicons name={RELATION_ICONS[member.relation] || 'person-outline'} size={20} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.memberName}>{member.name}</Text>
                                    <Text style={styles.memberRel}>{member.relation}{member.gender ? ` • ${member.gender}` : ''}</Text>
                                </View>
                            </View>
                            <View style={styles.cardTopRight}>
                                {member.bloodGroup ? (
                                    <View style={styles.bloodGroupBadge}>
                                        <Text style={styles.bloodGroupText}>{member.bloodGroup}</Text>
                                    </View>
                                ) : null}
                                <Ionicons name={expandedId === member.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                            </View>
                        </TouchableOpacity>

                        {expandedId === member.id && (
                            <View style={styles.cardDetails}>
                                {member.dateOfBirth ? (
                                    <View style={styles.detailRow}>
                                        <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                                        <Text style={styles.detailText}>DOB: {member.dateOfBirth}</Text>
                                    </View>
                                ) : null}
                                {member.allergies ? (
                                    <View style={styles.detailRow}>
                                        <Ionicons name="warning-outline" size={14} color="#F59E0B" />
                                        <Text style={styles.detailText}>Allergies: {member.allergies}</Text>
                                    </View>
                                ) : null}
                                {member.chronicConditions ? (
                                    <View style={styles.detailRow}>
                                        <Ionicons name="medkit-outline" size={14} color="#EF4444" />
                                        <Text style={styles.detailText}>Conditions: {member.chronicConditions}</Text>
                                    </View>
                                ) : null}
                                {member.emergencyNotes ? (
                                    <View style={styles.detailRow}>
                                        <Ionicons name="document-text-outline" size={14} color={colors.textMuted} />
                                        <Text style={styles.detailText}>{member.emergencyNotes}</Text>
                                    </View>
                                ) : null}
                                <View style={styles.cardActions}>
                                    <TouchableOpacity style={styles.editBtn} onPress={() => startEdit(member)}>
                                        <Ionicons name="pencil-outline" size={14} color={colors.primary} />
                                        <Text style={styles.editBtnText}>Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => deleteMember(member)}>
                                        <Ionicons name="trash-outline" size={14} color="#FF3B30" />
                                        <Text style={styles.removeBtnText}>Remove</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                ))}

                {showForm && (
                    <View style={styles.addForm}>
                        <Text style={styles.formTitle}>{editingId ? 'Edit Family Member' : 'Add Family Member'}</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Full Name *"
                            placeholderTextColor={colors.textMuted}
                            value={form.name}
                            onChangeText={v => setForm(f => ({ ...f, name: v }))}
                        />
                        <TouchableOpacity
                            style={[styles.input, { justifyContent: 'center' }]}
                            onPress={() => setShowDatePicker(true)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.dateInputContent}>
                                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                                <Text style={[styles.dateInputText, !form.dateOfBirth && { color: colors.textMuted }]}>
                                    {form.dateOfBirth ? new Date(form.dateOfBirth).toLocaleDateString('en-GB') : 'Date of Birth (optional)'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <Text style={styles.chipLabel}>Relationship *</Text>
                        <View style={styles.chipRow}>
                            {RELATIONS.map(r => (
                                <TouchableOpacity
                                    key={r}
                                    style={[styles.chip, form.relation === r && styles.chipActive]}
                                    onPress={() => setForm(f => ({ ...f, relation: r }))}
                                >
                                    <Text style={[styles.chipText, form.relation === r && styles.chipTextActive]}>{r}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.chipLabel}>Gender</Text>
                        <View style={styles.chipRow}>
                            {GENDERS.map(g => (
                                <TouchableOpacity
                                    key={g}
                                    style={[styles.chip, form.gender === g && styles.chipActive]}
                                    onPress={() => setForm(f => ({ ...f, gender: g }))}
                                >
                                    <Text style={[styles.chipText, form.gender === g && styles.chipTextActive]}>{g}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.chipLabel}>Blood Group</Text>
                        <View style={styles.chipRow}>
                            {BLOOD_GROUPS.map(bg => (
                                <TouchableOpacity
                                    key={bg}
                                    style={[styles.chip, form.bloodGroup === bg && styles.chipActive]}
                                    onPress={() => setForm(f => ({ ...f, bloodGroup: bg }))}
                                >
                                    <Text style={[styles.chipText, form.bloodGroup === bg && styles.chipTextActive]}>{bg}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="Allergies (if any)"
                            placeholderTextColor={colors.textMuted}
                            value={form.allergies}
                            onChangeText={v => setForm(f => ({ ...f, allergies: v }))}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Chronic Conditions (if any)"
                            placeholderTextColor={colors.textMuted}
                            value={form.chronicConditions}
                            onChangeText={v => setForm(f => ({ ...f, chronicConditions: v }))}
                        />
                        <TextInput
                            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                            placeholder="Emergency Notes (optional)"
                            placeholderTextColor={colors.textMuted}
                            multiline
                            value={form.emergencyNotes}
                            onChangeText={v => setForm(f => ({ ...f, emergencyNotes: v }))}
                        />

                        <View style={styles.formActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={saveMember} disabled={saving}>
                                {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>{editingId ? 'Update Member' : 'Save Member'}</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(!showForm)} activeOpacity={0.7}>
                    <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                    <Text style={styles.addButtonText}>Add Family Member</Text>
                </TouchableOpacity>

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                    <Text style={styles.infoText}>Family member health profiles help our care team provide personalised service recommendations.</Text>
                </View>
            </ScrollView>

            {showDatePicker && (
                <DateTimePicker
                    value={dobDate || new Date(2000, 0, 1)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    minimumDate={new Date(1920, 0, 1)}
                    onChange={handleDateChange}
                />
            )}
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
        fontSize: 20, color: '#FFFFFF', flex: 1,
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
        backgroundColor: colors.bgCard, borderRadius: 14, marginBottom: 12,
        shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
    memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    relIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
    memberName: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 14, color: colors.textDark,
    },
    memberRel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12, color: colors.textMuted, marginTop: 1,
    },
    cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    bloodGroupBadge: { backgroundColor: isDarkMode ? 'rgba(251,191,36,0.15)' : '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    bloodGroupText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 11, color: isDarkMode ? '#F59E0B' : '#B45309', fontWeight: '700',
    },
    cardDetails: { borderTopWidth: 1, borderTopColor: colors.borderLight, padding: 14, gap: 8 },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    detailText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13, color: colors.textDark, flex: 1, lineHeight: 18,
    },
    cardActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
    editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: isDarkMode ? 'rgba(52,199,89,0.05)' : 'rgba(4, 131, 87, 0.05)' },
    editBtnText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 12, color: colors.primary,
    },
    removeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: isDarkMode ? '#EF4444' : '#FFCDD2' },
    removeBtnText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 12, color: '#FF3B30',
    },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 50 },

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
    dateInputContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dateInputText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 14, color: colors.textDark,
    },
    chipLabel: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 13, color: colors.textDark, marginBottom: 8,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.bgCardMuted },
    chipActive: { borderColor: colors.primary, backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : 'rgba(4, 131, 87, 0.08)' },
    chipText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 13, color: colors.textMuted,
    },
    chipTextActive: { color: colors.primary },
    formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
    cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight },
    cancelBtnText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14, color: colors.textDark,
    },
    saveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.primary },
    saveBtnText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontSize: 14, color: '#FFFFFF',
    },
    addButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary,
        backgroundColor: isDarkMode ? 'rgba(52,199,89,0.05)' : '#F0FFF4', marginTop: 4, marginBottom: 16,
    },
    addButtonText: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontSize: 15, color: colors.primary,
    },
    infoBox: {
        flexDirection: 'row', gap: 8, alignItems: 'flex-start',
        backgroundColor: isDarkMode ? 'rgba(52,199,89,0.05)' : 'rgba(4, 131, 87, 0.05)', borderRadius: 10, padding: 12,
        borderWidth: 1, borderColor: colors.borderLight,
    },
    infoText: {
        fontFamily: Platform.select({ ios: 'LexendDeca-Regular', android: 'LexendDeca_400Regular', default: 'System' }),
        fontSize: 12, color: colors.textDark, flex: 1, lineHeight: 18,
    },
});
