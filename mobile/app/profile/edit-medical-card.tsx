import React, { useState } from 'react';
import {
    View, Text, TextInput, StyleSheet, TouchableOpacity,
    Alert, ActivityIndicator, Switch, Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Fonts, FontSize, Spacing, Radius } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { userService } from '@/services/api/userService';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function EditMedicalCardScreen() {
    const router = useRouter();
    const { profile, setProfile } = useUser();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors, isDarkMode);
    const [saving, setSaving] = useState(false);

    const existing = profile?.medicalCards?.[0];

    const [bloodGroup, setBloodGroup] = useState(existing?.bloodGroup || '');
    const [isDiabetic, setIsDiabetic] = useState(
        existing?.chronicConditions?.some((c: string) => c.toLowerCase().includes('diabet')) || false
    );
    const [isHypertension, setIsHypertension] = useState(
        existing?.chronicConditions?.some((c: string) => c.toLowerCase().includes('hypertens')) || false
    );
    const [allergies, setAllergies] = useState(existing?.allergies?.join(', ') || '');
    const [otherConditions, setOtherConditions] = useState(
        existing?.chronicConditions?.filter((c: string) =>
            !c.toLowerCase().includes('diabet') && !c.toLowerCase().includes('hypertens')
        ).join(', ') || ''
    );
    const [medications, setMedications] = useState(existing?.currentMedications?.join(', ') || '');

    const parseList = (str: string): string[] => str.split(',').map(s => s.trim()).filter(Boolean);

    const handleSave = async () => {
        if (!profile?.id) {
            Alert.alert('Error', 'Profile not loaded yet.');
            return;
        }
        setSaving(true);
        try {
            // Build chronicConditions array from toggles + other
            const conditions: string[] = [];
            if (isDiabetic) conditions.push('Diabetes');
            if (isHypertension) conditions.push('Hypertension');
            conditions.push(...parseList(otherConditions));

            const res = await userService.upsertMedicalCard(profile.id, {
                bloodGroup: bloodGroup || undefined,
                allergies: parseList(allergies),
                chronicConditions: conditions,
                currentMedications: parseList(medications),
            });

            if (res.success) {
                const profileRes = await userService.getProfile();
                if (profileRes.success && profileRes.data) {
                    setProfile(profileRes.data);
                }
                Alert.alert('Success', 'Medical card updated.', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
            } else {
                Alert.alert('Error', res.message || 'Failed to update medical card.');
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Something went wrong.');
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
                    <Text style={styles.headerTitle}>My Medical Card</Text>
                </View>
            </SafeAreaView>

            <KeyboardAwareScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled">

                    {/* Blood Group */}
                    <Text style={styles.label}>Blood Group</Text>
                    <View style={styles.chipRow}>
                        {BLOOD_GROUPS.map(bg => (
                            <TouchableOpacity key={bg} style={[styles.chip, bloodGroup === bg && styles.chipActive]} onPress={() => setBloodGroup(bg)}>
                                <Text style={[styles.chipText, bloodGroup === bg && styles.chipTextActive]}>{bg}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Diabetic Toggle */}
                    <View style={styles.toggleCard}>
                        <View style={styles.toggleLeft}>
                            <Ionicons name="water-outline" size={20} color={colors.primary} />
                            <Text style={styles.toggleLabel}>Diabetic</Text>
                        </View>
                        <View style={styles.toggleRight}>
                            <Text style={styles.toggleValue}>{isDiabetic ? 'Yes' : 'No'}</Text>
                            <Switch
                                trackColor={{ false: colors.textMuted, true: colors.primary }}
                                thumbColor="#FFFFFF"
                                ios_backgroundColor={colors.textMuted}
                                onValueChange={setIsDiabetic}
                                value={isDiabetic}
                            />
                        </View>
                    </View>

                    {/* Hypertension Toggle */}
                    <View style={styles.toggleCard}>
                        <View style={styles.toggleLeft}>
                            <Ionicons name="heart-outline" size={20} color={colors.primary} />
                            <Text style={styles.toggleLabel}>Hypertension</Text>
                        </View>
                        <View style={styles.toggleRight}>
                            <Text style={styles.toggleValue}>{isHypertension ? 'Yes' : 'No'}</Text>
                            <Switch
                                trackColor={{ false: colors.textMuted, true: colors.primary }}
                                thumbColor="#FFFFFF"
                                ios_backgroundColor={colors.textMuted}
                                onValueChange={setIsHypertension}
                                value={isHypertension}
                            />
                        </View>
                    </View>

                    {/* Allergies */}
                    <Text style={styles.label}>Allergies (comma separated)</Text>
                    <TextInput style={styles.input} value={allergies} onChangeText={setAllergies} placeholder="e.g. Peanuts, Penicillin" placeholderTextColor={colors.textMuted} />

                    {/* Other Chronic Conditions */}
                    <Text style={styles.label}>Other Chronic Conditions (comma separated)</Text>
                    <TextInput style={styles.input} value={otherConditions} onChangeText={setOtherConditions} placeholder="e.g. Arthritis, Thyroid" placeholderTextColor={colors.textMuted} />

                    {/* Current Medications */}
                    <Text style={styles.label}>Current Medications (comma separated)</Text>
                    <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} value={medications} onChangeText={setMedications} placeholder="e.g. Metformin 500mg, Aspirin" placeholderTextColor={colors.textMuted} multiline />

                    {/* Emergency Info */}
                    <View style={styles.emergencyNote}>
                        <Ionicons name="information-circle" size={18} color={colors.primary} />
                        <Text style={styles.emergencyNoteText}>In an emergency, your app will show this card instantly to medical professionals.</Text>
                    </View>

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.7}>
                        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Medical Card</Text>}
                    </TouchableOpacity>
            </KeyboardAwareScrollView>
        </View>
    );
}

const makeStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.primary },
    headerSafe: { backgroundColor: colors.primary },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { padding: 4, marginRight: 8 },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading2, color: '#FFFFFF', flex: 1 },
    scrollView: { flex: 1, backgroundColor: colors.bgScreen, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    scrollContent: { padding: 20, paddingBottom: 60 },
    label: { fontFamily: Fonts.medium, fontSize: FontSize.bodySmall, color: colors.textDark, marginBottom: 8, marginTop: 18 },
    input: {
        backgroundColor: colors.bgCard, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
        fontFamily: Fonts.regular, fontSize: FontSize.body, color: colors.textDark,
        borderWidth: 1, borderColor: colors.borderLight,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.bgCardMuted },
    chipActive: { borderColor: colors.primary, backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : 'rgba(4, 131, 87, 0.10)' },
    chipText: { fontFamily: Fonts.medium, fontSize: FontSize.bodySmall, color: colors.textMuted },
    chipTextActive: { color: colors.primary },

    toggleCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: colors.bgCard, borderRadius: 12, padding: 16, marginTop: 14,
        borderWidth: 1, borderColor: colors.borderLight,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    toggleLabel: { fontFamily: Fonts.medium, fontSize: FontSize.body, color: colors.textDark },
    toggleRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    toggleValue: { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: colors.textMuted },

    emergencyNote: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: isDarkMode ? 'rgba(52,199,89,0.05)' : '#E8F5E9', borderRadius: 10, padding: 14, marginTop: 20,
    },
    emergencyNoteText: { flex: 1, fontFamily: Fonts.regular, fontSize: FontSize.caption, color: colors.textDark, lineHeight: 18 },

    saveBtn: { marginTop: 24, backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: '#FFFFFF' },
});
