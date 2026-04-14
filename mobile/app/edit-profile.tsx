import React, { useState } from 'react';
import {
    View, Text, TextInput, StyleSheet, TouchableOpacity,
    Alert, ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Shadow } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { userService } from '@/services/api/userService';

const GENDER_OPTIONS = ['MALE', 'FEMALE', 'OTHER'];

export default function EditProfileScreen() {
    const router = useRouter();
    const { profile, setProfile } = useUser();
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState(profile?.name || '');
    const [email, setEmail] = useState(profile?.email || '');
    const [gender, setGender] = useState(profile?.gender || '');
    const [dateOfBirth, setDateOfBirth] = useState(profile?.dateOfBirth?.split('T')[0] || '');
    const [preferredLanguage, setPreferredLanguage] = useState(profile?.preferredLanguage || 'en');

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Required', 'Name cannot be empty.');
            return;
        }
        setSaving(true);
        try {
            const res = await userService.updateProfile({
                name: name.trim(),
                email: email.trim() || undefined,
                gender: gender || undefined,
                dateOfBirth: dateOfBirth || undefined,
                preferredLanguage,
            } as any);

            if (res.success) {
                // Refetch full profile to update context
                const profileRes = await userService.getProfile();
                if (profileRes.success && profileRes.data) {
                    setProfile(profileRes.data);
                }
                Alert.alert('Success', 'Profile updated successfully.', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
            } else {
                Alert.alert('Error', res.message || 'Failed to update profile.');
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
                    <Text style={styles.headerTitle}>Edit Profile</Text>
                    <View style={{ width: 24 }} />
                </View>
            </SafeAreaView>

            <KeyboardAwareScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled">

                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter your name" placeholderTextColor="#898989" />

                    <Text style={styles.label}>Email</Text>
                    <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Enter your email" placeholderTextColor="#898989" keyboardType="email-address" autoCapitalize="none" />

                    <Text style={styles.label}>Phone (Read Only)</Text>
                    <TextInput style={[styles.input, styles.inputDisabled]} value={profile?.phone || ''} editable={false} />

                    <Text style={styles.label}>Gender</Text>
                    <View style={styles.genderRow}>
                        {GENDER_OPTIONS.map(g => (
                            <TouchableOpacity key={g} style={[styles.genderBtn, gender === g && styles.genderBtnActive]} onPress={() => setGender(g)}>
                                <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>{g}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
                    <TextInput style={styles.input} value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="e.g. 1960-05-15" placeholderTextColor="#898989" />

                    <Text style={styles.label}>Preferred Language</Text>
                    <TextInput style={styles.input} value={preferredLanguage} onChangeText={setPreferredLanguage} placeholder="en, kn, hi, ta, te" placeholderTextColor="#898989" />

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.7}>
                        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                    </TouchableOpacity>
            </KeyboardAwareScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.primary },
    headerSafe: { backgroundColor: Colors.primary },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { padding: 4 },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.heading2, color: Colors.textWhite },
    scrollView: { flex: 1, backgroundColor: '#FFFFE3', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    scrollContent: { padding: 20, paddingBottom: 60 },
    label: { fontFamily: Fonts.medium, fontSize: FontSize.bodySmall, color: Colors.textDark, marginBottom: 6, marginTop: 16 },
    input: {
        backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
        fontFamily: Fonts.regular, fontSize: FontSize.body, color: Colors.textDark,
        borderWidth: 1, borderColor: '#E5E5E5', ...Shadow.card,
    },
    inputDisabled: { backgroundColor: '#F3F3F3', color: Colors.textMuted },
    genderRow: { flexDirection: 'row', gap: 10 },
    genderBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E5E5', backgroundColor: '#FFF', alignItems: 'center' },
    genderBtnActive: { borderColor: Colors.primary, backgroundColor: 'rgba(4, 131, 87, 0.08)' },
    genderText: { fontFamily: Fonts.medium, fontSize: FontSize.bodySmall, color: Colors.textMuted },
    genderTextActive: { color: Colors.primary },
    saveBtn: { marginTop: 30, backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: '#FFFFFF' },
});
