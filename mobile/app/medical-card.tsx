import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, Alert, Share, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { useUser } from '@/context/UserContext';
import { userService } from '@/services/api/userService';
import { generateMedicalCardHTML } from '@/utils/medicalCardPDF';

const PRIMARY_GREEN = '#02743F';
const CARD_BORDER = '#E5E7EB';
const TEXT_DARK = '#2F2F2F';
const TEXT_MUTED = '#888888';

export default function MedicalCardScreen() {
    const router = useRouter();
    const { profile } = useUser();
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    useFocusEffect(
        useCallback(() => {
            if (!profile?.id) {
                (async () => {
                    try {
                        const res = await userService.getProfile();
                        // Profile will be updated in context
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

    const cardData = {
        name: profile?.name || 'N/A',
        phone: profile?.phone || 'N/A',
        email: profile?.email || '',
        dateOfBirth: profile?.dateOfBirth || '',
        gender: profile?.gender || '',
        uniqueUserId: profile?.uniqueUserId || 'N/A',
        bloodGroup: medicalCard?.bloodGroup || '',
        allergies: medicalCard?.allergies || [],
        chronicConditions: medicalCard?.chronicConditions || [],
        currentMedications: medicalCard?.currentMedications || [],
        emergencyContacts: emergencyContacts,
        addresses: addresses,
        insuranceInfo: '', // Could be extended
        primaryDoctor: '', // Could be extended
    };

    const handleDownloadPDF = async () => {
        setGenerating(true);
        try {
            const html = generateMedicalCardHTML(cardData);
            const { uri } = await Print.printToFileAsync({ html });

            // Share file or save to device
            if (Platform.OS === 'ios') {
                await Share.share({
                    url: uri,
                    title: `${profile?.name}-MedicalCard.pdf`,
                    message: 'My AYUXA Medical Card',
                });
            } else {
                // On Android, show file saved location
                Alert.alert('Success', `Medical card saved to:\n${uri}`, [
                    { text: 'OK' },
                    {
                        text: 'Share',
                        onPress: () => {
                            Share.share({
                                url: uri,
                                title: `${profile?.name}-MedicalCard.pdf`,
                                message: 'My AYUXA Medical Card',
                            });
                        },
                    },
                ]);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to generate PDF. Please try again.');
            console.error('PDF generation error:', error);
        } finally {
            setGenerating(false);
        }
    };

    const handleShareWhatsApp = async () => {
        try {
            const html = generateMedicalCardHTML(cardData);
            const message = `Hey! Check out my AYUXA Medical Card:\n\n${profile?.name}\nAYUXA ID: ${profile?.uniqueUserId}\nBlood Group: ${medicalCard?.bloodGroup || 'Not set'}\n\nFor complete details, ask me to share the PDF.`;

            await Share.share({
                message: message,
                title: 'My Medical Card',
                url: 'https://ayuxa.com', // App URL
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to share via WhatsApp.');
        }
    };

    const handlePrint = async () => {
        setGenerating(true);
        try {
            const html = generateMedicalCardHTML(cardData);
            await Print.printAsync({ html });
        } catch (error) {
            Alert.alert('Error', 'Failed to print. Please try again.');
            console.error('Print error:', error);
        } finally {
            setGenerating(false);
        }
    };

    const handleEdit = () => {
        router.push('/edit-medical-card' as any);
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
                <ActivityIndicator size="large" color={PRIMARY_GREEN} />
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <StatusBar backgroundColor="#FFFFFF" />
            <SafeAreaView style={styles.headerSafe} edges={['top']}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Medical Card</Text>
                    <TouchableOpacity onPress={handleEdit}>
                        <Ionicons name="create-outline" size={24} color={PRIMARY_GREEN} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header Card */}
                <View style={styles.headerCard}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.userName}>{profile?.name || 'User'}</Text>
                            <Text style={styles.userId}>AYUXA ID: {profile?.uniqueUserId}</Text>
                        </View>
                        {medicalCard?.bloodGroup && (
                            <View style={styles.bloodGroupBadge}>
                                <Text style={styles.bloodGroupText}>{medicalCard.bloodGroup}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.downloadBtn]}
                        onPress={handleDownloadPDF}
                        disabled={generating}
                    >
                        {generating ? (
                            <ActivityIndicator size="small" color={PRIMARY_GREEN} />
                        ) : (
                            <>
                                <Ionicons name="download-outline" size={18} color={PRIMARY_GREEN} />
                                <Text style={styles.actionBtnText}>Download PDF</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.whatsappBtn]}
                        onPress={handleShareWhatsApp}
                        disabled={generating}
                    >
                        <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                        <Text style={[styles.actionBtnText, { color: '#25D366' }]}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.printBtn]}
                        onPress={handlePrint}
                        disabled={generating}
                    >
                        <Ionicons name="print-outline" size={18} color="#7C3AED" />
                        <Text style={[styles.actionBtnText, { color: '#7C3AED' }]}>Print</Text>
                    </TouchableOpacity>
                </View>

                {/* Personal Information */}
                <SectionCard title="Personal Information">
                    <FieldRow label="Full Name" value={profile?.name} />
                    <FieldRow label="Phone" value={profile?.phone} />
                    <FieldRow label="Email" value={profile?.email} />
                    <FieldRow label="Date of Birth" value={profile?.dateOfBirth} />
                    <FieldRow label="Gender" value={profile?.gender} />
                </SectionCard>

                {/* Blood Group & Emergency */}
                <SectionCard title="Blood Group & Emergency">
                    <View style={styles.bloodGroupContainer}>
                        <Text style={styles.bloodGroupLabel}>Blood Group</Text>
                        <Text style={styles.bloodGroupValue}>{medicalCard?.bloodGroup || 'Not recorded'}</Text>
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
                                    <Ionicons name="person-circle-outline" size={20} color={PRIMARY_GREEN} />
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

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#FFFFFF' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerSafe: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: CARD_BORDER },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: TEXT_DARK, flex: 1, textAlign: 'center' },
    scrollView: { flex: 1, backgroundColor: '#FFFFFF' },
    scrollContent: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 40 },

    headerCard: {
        backgroundColor: PRIMARY_GREEN,
        borderRadius: 14,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
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

    actionButtonsContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5 },
    downloadBtn: { backgroundColor: 'rgba(2, 116, 63, 0.08)', borderColor: PRIMARY_GREEN },
    whatsappBtn: { backgroundColor: 'rgba(37, 211, 102, 0.08)', borderColor: '#D1FAE5' },
    printBtn: { backgroundColor: 'rgba(124, 58, 237, 0.08)', borderColor: '#E9D5FF' },
    actionBtnText: { fontSize: 12, fontWeight: '600', color: PRIMARY_GREEN },

    sectionCard: { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: CARD_BORDER },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: PRIMARY_GREEN, marginBottom: 12 },

    fieldRow: { marginBottom: 12 },
    fieldLabel: { fontSize: 11, fontWeight: '600', color: TEXT_MUTED, textTransform: 'uppercase', marginBottom: 3 },
    fieldValue: { fontSize: 14, fontWeight: '500', color: TEXT_DARK },

    subsection: { marginBottom: 14 },
    subsectionLabel: { fontSize: 12, fontWeight: '600', color: TEXT_MUTED, marginBottom: 8 },

    tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { backgroundColor: PRIMARY_GREEN, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    tagText: { fontSize: 12, fontWeight: '500', color: '#FFFFFF' },
    emptyText: { fontSize: 12, color: TEXT_MUTED, fontStyle: 'italic' },

    medicationItem: { marginBottom: 6 },
    medicationText: { fontSize: 13, color: TEXT_DARK, lineHeight: 18 },

    contactItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: CARD_BORDER },
    contactIcon: { marginTop: 2 },
    contactInfo: { flex: 1 },
    contactName: { fontSize: 13, fontWeight: '600', color: TEXT_DARK },
    contactDetails: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },

    addressText: { fontSize: 13, color: TEXT_DARK, lineHeight: 20 },

    bloodGroupContainer: { alignItems: 'center', paddingVertical: 10 },
    bloodGroupLabel: { fontSize: 11, fontWeight: '600', color: TEXT_MUTED, textTransform: 'uppercase', marginBottom: 6 },
    bloodGroupValue: { fontSize: 28, fontWeight: '700', color: '#DC2626' },

    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: PRIMARY_GREEN,
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 20,
    },
    editButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
    spacer: { height: 20 },
});
