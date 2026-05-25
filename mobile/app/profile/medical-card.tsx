import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, Share, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { userService } from '@/services/api/userService';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import * as Print from 'expo-print';

const formatDate = (iso?: string) => {
    if (!iso) return 'N/A';
    try {
        return new Date(iso).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return iso;
    }
};

export default function MedicalCardScreen() {
    const router = useRouter();
    const { profile } = useUser();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors, isDarkMode);
    const [loading, setLoading] = useState(false);

    useFocusEffect(
        useCallback(() => {
            if (!profile?.id) {
                (async () => {
                    try {
                        await userService.getProfile();
                    } catch (err) {
                        console.error('Failed to fetch profile:', err);
                    }
                })();
            }
        }, [profile?.id])
    );

    const medicalCard = profile?.medicalCards?.[0];
    const emergencyContacts = profile?.emergencyContacts || [];
    const addresses = profile?.addresses || [];

    const generateCardText = () => {
        const allergies = (medicalCard?.allergies || []).join(', ') || 'None';
        const conditions = (medicalCard?.chronicConditions || []).join(', ') || 'None';
        const medications = (medicalCard?.currentMedications || []).join(', ') || 'None';

        return `AYUXA MEDICAL CARD

═══════════════════════════════════════
FULL CLIENT DETAILS
═══════════════════════════════════════

Name: ${profile?.name || 'N/A'}
AYUXA Client ID: ${profile?.uniqueUserId || 'N/A'}
Phone: ${profile?.phone || 'N/A'}
Email: ${profile?.email || 'N/A'}
Date of Birth: ${formatDate(profile?.dateOfBirth)}
Gender: ${profile?.gender || 'N/A'}

═══════════════════════════════════════
BLOOD GROUP & EMERGENCY
═══════════════════════════════════════

Blood Group: ${medicalCard?.bloodGroup || 'Not recorded'}
Primary Doctor: ${(medicalCard as any)?.primaryDoctor || 'Not assigned'}

═══════════════════════════════════════
MEDICAL HISTORY
═══════════════════════════════════════

Allergies: ${allergies}
Existing Conditions: ${conditions}
Current Medications: ${medications}

═══════════════════════════════════════
EMERGENCY CONTACTS
═══════════════════════════════════════

${(emergencyContacts || []).map(c => `${c.name} (${c.relationship}): ${c.phone}`).join('\n') || 'None'}

═══════════════════════════════════════
ADDRESS
═══════════════════════════════════════

${addresses[0] ? `${addresses[0].line1}\n${addresses[0].cityName}, ${addresses[0].state} ${addresses[0].pincode}` : 'Not recorded'}

═══════════════════════════════════════
INSURANCE INFORMATION
═══════════════════════════════════════

${(medicalCard as any)?.insuranceInfo || 'Not recorded'}

═══════════════════════════════════════
Generated on ${new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })}
═══════════════════════════════════════`;
    };

    const handleDownloadPDF = async () => {
        try {
            const cardText = generateCardText();
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                        h1 { color: #02743F; text-align: center; }
                        .section { margin: 20px 0; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
                        .section h2 { color: #02743F; font-size: 14px; margin-top: 15px; }
                        .field { margin: 8px 0; }
                        .label { font-weight: bold; color: #666; }
                        .value { color: #2F2F2F; }
                    </style>
                </head>
                <body>
                    <pre>${cardText}</pre>
                </body>
                </html>
            `;

            const result = await Print.printToFileAsync({
                html: htmlContent,
                base64: false,
            });

            await Share.share({
                url: result.uri,
                title: `${profile?.name}-MedicalCard.pdf`,
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to generate PDF.');
        }
    };

    const handleShareWhatsApp = async () => {
        try {
            const cardText = generateCardText();
            const message = encodeURIComponent(`📋 My AYUXA Medical Card:\n\n${cardText}`);

            const whatsappUrl = Platform.OS === 'ios'
                ? `whatsapp://send?text=${message}`
                : `https://wa.me/?text=${message}`;

            const canOpen = await Linking.canOpenURL(whatsappUrl);
            if (canOpen) {
                await Linking.openURL(whatsappUrl);
            } else {
                Alert.alert('WhatsApp not installed', 'Please install WhatsApp to share.');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to open WhatsApp.');
        }
    };

    const handleShareEmail = async () => {
        try {
            const cardText = generateCardText();
            const subject = encodeURIComponent(`${profile?.name} - AYUXA Medical Card`);
            const body = encodeURIComponent(cardText);

            const mailtoLink = `mailto:?subject=${subject}&body=${body}`;

            const canOpen = await Linking.canOpenURL(mailtoLink);
            if (canOpen) {
                await Linking.openURL(mailtoLink);
            } else {
                Alert.alert('Error', 'No email client available.');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to open email.');
        }
    };

    const handlePrint = async () => {
        try {
            const cardText = generateCardText();
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                        h1 { color: #02743F; text-align: center; }
                        .section { margin: 20px 0; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
                        .section h2 { color: #02743F; font-size: 14px; margin-top: 15px; }
                        .field { margin: 8px 0; }
                        .label { font-weight: bold; color: #666; }
                        .value { color: #2F2F2F; }
                    </style>
                </head>
                <body>
                    <pre>${cardText}</pre>
                </body>
                </html>
            `;

            await Print.printAsync({
                html: htmlContent,
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to open print dialog.');
        }
    };

    const handleEdit = () => {
        router.push('/profile/edit-medical-card' as any);
    };

    const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
        <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );

    const FieldRow = ({ label, value }: { label: string; value: string }) => (
        <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <Text style={styles.fieldValue}>{value || 'N/A'}</Text>
        </View>
    );

    const TagList = ({ items }: { items: string[] }) => (
        <View style={styles.tagContainer}>
            {items.length > 0 ? (
                items.map((item, idx) => (
                    <View key={idx} style={styles.tag}>
                        <Text style={styles.tagText}>{item}</Text>
                    </View>
                ))
            ) : (
                <Text style={styles.emptyText}>None recorded</Text>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <StatusBar style={isDarkMode ? "light" : "dark"} />
            <SafeAreaView style={styles.headerSafe} edges={['top']}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.textDark} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Medical Card</Text>
                    <TouchableOpacity onPress={handleEdit} style={styles.editHeaderBtn}>
                        <Ionicons name="create-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header Card */}
                <View style={styles.headerCard}>
                    <View style={styles.headerTop}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.userName} numberOfLines={1}>{profile?.name || 'User'}</Text>
                            <Text style={styles.userId}>AYUXA ID: {profile?.uniqueUserId}</Text>
                        </View>
                        {medicalCard?.bloodGroup && (
                            <View style={styles.bloodGroupBadge}>
                                <Text style={styles.bloodGroupText}>{medicalCard.bloodGroup}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Action Buttons - Row 1 */}
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.downloadBtn]}
                        onPress={handleDownloadPDF}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="download-outline" size={16} color={colors.primary} />
                        <Text style={[styles.actionBtnText, { color: colors.primary }]}>Download</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.whatsappBtn]}
                        onPress={handleShareWhatsApp}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                        <Text style={[styles.actionBtnText, { color: '#25D366' }]}>WhatsApp</Text>
                    </TouchableOpacity>
                </View>

                {/* Action Buttons - Row 2 */}
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.emailBtn]}
                        onPress={handleShareEmail}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="mail-outline" size={16} color="#EA580C" />
                        <Text style={[styles.actionBtnText, { color: '#EA580C' }]}>Email</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.printBtn]}
                        onPress={handlePrint}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="print-outline" size={16} color="#7C3AED" />
                        <Text style={[styles.actionBtnText, { color: '#7C3AED' }]}>Print</Text>
                    </TouchableOpacity>
                </View>

                {/* Personal Information */}
                <SectionCard title="Personal Information">
                    <FieldRow label="Full Name" value={profile?.name || ''} />
                    <FieldRow label="Phone" value={profile?.phone || ''} />
                    <FieldRow label="Email" value={profile?.email || ''} />
                    <FieldRow label="Date of Birth" value={formatDate(profile?.dateOfBirth)} />
                    <FieldRow label="Gender" value={profile?.gender || ''} />
                </SectionCard>

                {/* Blood Group & Emergency */}
                <SectionCard title="Blood Group & Emergency">
                    <View style={styles.bloodGroupContainer}>
                        <Text style={styles.bloodGroupLabel}>Blood Group</Text>
                        <Text style={styles.bloodGroupValue}>{medicalCard?.bloodGroup || 'Not recorded'}</Text>
                    </View>
                    <View style={styles.fieldRow}>
                        <Text style={styles.fieldLabel}>Primary Doctor</Text>
                        <Text style={styles.fieldValue}>{(medicalCard as any)?.primaryDoctor || 'Not assigned'}</Text>
                    </View>
                </SectionCard>

                {/* Medical History */}
                <SectionCard title="Medical History">
                    <View style={styles.subsection}>
                        <Text style={styles.subsectionLabel}>Allergies</Text>
                        <TagList items={medicalCard?.allergies || []} />
                    </View>
                    <View style={styles.subsection}>
                        <Text style={styles.subsectionLabel}>Existing Conditions</Text>
                        <TagList items={medicalCard?.chronicConditions || []} />
                    </View>
                    <View style={styles.subsection}>
                        <Text style={styles.subsectionLabel}>Current Medications</Text>
                        {(medicalCard?.currentMedications || []).length > 0 ? (
                            (medicalCard?.currentMedications || []).map((med, idx) => (
                                <View key={idx} style={styles.medicationItem}>
                                    <Text style={styles.medicationText}>• {med}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>None recorded</Text>
                        )}
                    </View>
                </SectionCard>

                {/* Emergency Contacts */}
                {emergencyContacts.length > 0 && (
                    <SectionCard title="Emergency Contacts">
                        {emergencyContacts.map((contact, idx) => (
                            <View key={idx} style={styles.contactItem}>
                                <View style={styles.contactIcon}>
                                    <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
                                </View>
                                <View style={styles.contactInfo}>
                                    <Text style={styles.contactName}>{contact.name}</Text>
                                    <Text style={styles.contactDetails}>{contact.relationship} • {contact.phone}</Text>
                                </View>
                            </View>
                        ))}
                    </SectionCard>
                )}

                {/* Address */}
                {addresses.length > 0 && (
                    <SectionCard title="Address">
                        <Text style={styles.addressText}>
                            {addresses[0].line1}, {addresses[0].cityName}, {addresses[0].state} {addresses[0].pincode}
                        </Text>
                    </SectionCard>
                )}

                {/* Insurance Information */}
                {(medicalCard as any)?.insuranceInfo && (
                    <SectionCard title="Insurance Information">
                        <Text style={styles.addressText}>{(medicalCard as any).insuranceInfo}</Text>
                    </SectionCard>
                )}

                {/* Edit Button */}
                <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                    <Ionicons name="pencil-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.editButtonText}>Edit Medical Card</Text>
                </TouchableOpacity>

                <View style={styles.spacer} />
            </ScrollView>
        </View>
    );
}

const makeStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgScreen },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgScreen },
    headerSafe: { backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { padding: 4 },
    editHeaderBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: colors.textDark, flex: 1, textAlign: 'center' },
    scrollView: { flex: 1, backgroundColor: colors.bgScreen },
    scrollContent: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 40 },

    headerCard: {
        backgroundColor: colors.primary,
        borderRadius: 14,
        padding: 20,
        marginBottom: 20,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    userName: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
    userId: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace' },
    bloodGroupBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 2, borderColor: '#FFFFFF' },
    bloodGroupText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },

    actionButtonsContainer: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, backgroundColor: colors.bgCard, borderColor: colors.borderLight },
    downloadBtn: { backgroundColor: isDarkMode ? 'rgba(52,199,89,0.1)' : 'rgba(2, 116, 63, 0.08)', borderColor: colors.primary },
    whatsappBtn: { backgroundColor: isDarkMode ? 'rgba(37, 211, 102, 0.1)' : 'rgba(37, 211, 102, 0.08)', borderColor: '#25D366' },
    emailBtn: { backgroundColor: isDarkMode ? 'rgba(234, 88, 12, 0.1)' : 'rgba(234, 88, 12, 0.08)', borderColor: '#EA580C' },
    printBtn: { backgroundColor: isDarkMode ? 'rgba(124, 58, 237, 0.1)' : 'rgba(124, 58, 237, 0.08)', borderColor: '#7C3AED' },
    actionBtnText: { fontSize: 11, fontWeight: '600' },

    sectionCard: { backgroundColor: colors.bgCard, borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.borderLight },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 12 },

    fieldRow: { marginBottom: 12 },
    fieldLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 3 },
    fieldValue: { fontSize: 14, fontWeight: '500', color: colors.textDark },

    subsection: { marginBottom: 14 },
    subsectionLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 8 },

    tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    tagText: { fontSize: 12, fontWeight: '500', color: '#FFFFFF' },
    emptyText: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },

    medicationItem: { marginBottom: 6 },
    medicationText: { fontSize: 13, color: colors.textDark, lineHeight: 18 },

    contactItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    contactIcon: { marginTop: 2 },
    contactInfo: { flex: 1 },
    contactName: { fontSize: 13, fontWeight: '600', color: colors.textDark },
    contactDetails: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

    addressText: { fontSize: 13, color: colors.textDark, lineHeight: 20 },

    bloodGroupContainer: { alignItems: 'center', paddingVertical: 10 },
    bloodGroupLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 },
    bloodGroupValue: { fontSize: 28, fontWeight: '700', color: '#DC2626' },

    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.primary,
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 20,
    },
    editButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
    spacer: { height: 20 },
});
