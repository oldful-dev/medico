import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';

export default function ConsentFormsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [expandedForm, setExpandedForm] = useState<string | null>(null);

    const forms = [
        {
            id: 'medical_consent',
            title: 'Medical Treatment Consent',
            description: 'Authorize medical examination and treatment',
            date: 'Never signed',
            status: 'pending',
        },
        {
            id: 'data_privacy',
            title: 'Data Privacy Consent',
            description: 'Consent for collection and processing of personal data',
            date: 'Never signed',
            status: 'pending',
        },
        {
            id: 'emergency_contact',
            title: 'Emergency Contact Consent',
            description: 'Authorize contact in case of medical emergencies',
            date: 'Never signed',
            status: 'pending',
        },
    ];

    const handleSignForm = (formId: string) => {
        Alert.alert(
            'Sign Consent Form',
            'This feature is coming soon. You will be able to electronically sign and store consent forms here.',
            [{ text: 'OK' }]
        );
    };

    return (
        <View style={styles.screen}>
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Consent Forms</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.description}>
                    Manage and sign digital consent forms for medical treatment, data privacy, and emergency authorizations.
                </Text>

                {forms.map((form) => (
                    <View key={form.id} style={styles.formCard}>
                        <TouchableOpacity
                            style={styles.formHeader}
                            onPress={() => setExpandedForm(expandedForm === form.id ? null : form.id)}
                            activeOpacity={0.7}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={styles.formTitle}>{form.title}</Text>
                                <Text style={styles.formDescription}>{form.description}</Text>
                            </View>
                            <Ionicons
                                name={expandedForm === form.id ? "chevron-up" : "chevron-down"}
                                size={20}
                                color={Colors.textMuted}
                            />
                        </TouchableOpacity>

                        {expandedForm === form.id && (
                            <View style={styles.formContent}>
                                <View style={styles.statusRow}>
                                    <Text style={styles.label}>Status:</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
                                        <Text style={[styles.statusText, { color: '#D32F2F' }]}>
                                            {form.status.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.statusRow}>
                                    <Text style={styles.label}>Last Signed:</Text>
                                    <Text style={styles.value}>{form.date}</Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.signButton}
                                    onPress={() => handleSignForm(form.id)}
                                >
                                    <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                                    <Text style={styles.signButtonText}>Sign Form</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.viewButton}>
                                    <Ionicons name="eye-outline" size={16} color={Colors.primary} />
                                    <Text style={styles.viewButtonText}>View Full Form</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ))}

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.infoTitle}>About Consent Forms</Text>
                        <Text style={styles.infoText}>
                            Signed consent forms are securely stored and can be accessed anytime. Digital signatures are legally binding.
                        </Text>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.bgPrimary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.md,
    },
    backButton: {
        padding: Spacing.sm,
    },
    headerTitle: {
        flex: 1,
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading2,
        color: Colors.textWhite,
    },
    scrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
    },
    description: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textMuted,
        marginBottom: Spacing.lg,
        lineHeight: 20,
    },
    formCard: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        marginBottom: Spacing.md,
        overflow: 'hidden',
    },
    formHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.md,
    },
    formTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
        marginBottom: Spacing.sm,
    },
    formDescription: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
    },
    formContent: {
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
        padding: Spacing.md,
        backgroundColor: '#FAFAFA',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    label: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
    },
    value: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    statusBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: Radius.sm,
    },
    statusText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.caption,
    },
    signButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.md,
        borderRadius: Radius.sm,
        marginBottom: Spacing.sm,
    },
    signButtonText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textWhite,
    },
    viewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.primary,
        paddingVertical: Spacing.md,
        borderRadius: Radius.sm,
    },
    viewButtonText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.primary,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: `${Colors.primary}10`,
        borderLeftWidth: 4,
        borderLeftColor: Colors.primary,
        padding: Spacing.md,
        borderRadius: Radius.sm,
        marginTop: Spacing.lg,
    },
    infoTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.primary,
        marginBottom: 4,
    },
    infoText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
        lineHeight: 18,
    },
});
