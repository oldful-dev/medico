import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/constants/theme';

export default function EmailSupportScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendEmail = async () => {
        if (!subject.trim()) {
            Alert.alert('Required', 'Please enter a subject');
            return;
        }
        if (!message.trim()) {
            Alert.alert('Required', 'Please enter your message');
            return;
        }

        setLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            Alert.alert('Success', 'Your email has been sent. Our team will respond within 24 hours.');
            setSubject('');
            setMessage('');
        } catch (error) {
            Alert.alert('Error', 'Failed to send email. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={{ backgroundColor: Colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={Colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Email Support</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Info Card */}
                <View style={styles.infoCard}>
                    <Ionicons name="mail-outline" size={32} color={Colors.primary} />
                    <Text style={styles.infoTitle}>Send us an Email</Text>
                    <Text style={styles.infoText}>
                        Our support team will respond to your email within 24 hours
                    </Text>
                    <Text style={styles.emailAddress}>support@ayuxacare.com</Text>
                </View>

                {/* Form */}
                <View style={styles.formContainer}>
                    {/* Subject */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Subject</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Brief subject of your inquiry"
                            placeholderTextColor={Colors.textMuted}
                            value={subject}
                            onChangeText={setSubject}
                            editable={!loading}
                        />
                    </View>

                    {/* Category */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Category</Text>
                        <View style={styles.categoryOptions}>
                            {['Billing', 'Technical', 'General', 'Other'].map((cat) => (
                                <TouchableOpacity key={cat} style={styles.categoryChip} activeOpacity={0.7}>
                                    <Text style={styles.categoryText}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Message */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Message</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Describe your issue in detail..."
                            placeholderTextColor={Colors.textMuted}
                            value={message}
                            onChangeText={setMessage}
                            multiline
                            numberOfLines={6}
                            textAlignVertical="top"
                            editable={!loading}
                        />
                    </View>

                    {/* Attachment Info */}
                    <View style={styles.attachmentInfo}>
                        <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
                        <Text style={styles.attachmentText}>
                            Screenshots or documents can be added later via email
                        </Text>
                    </View>

                    {/* Send Button */}
                    <TouchableOpacity
                        style={[styles.sendButton, loading && styles.sendButtonDisabled]}
                        onPress={handleSendEmail}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <>
                                <ActivityIndicator size="small" color="#FFFFFF" />
                                <Text style={styles.sendButtonText}>Sending...</Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                                <Text style={styles.sendButtonText}>Send Email</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Alternative Support */}
                <View style={styles.alternativeSection}>
                    <Text style={styles.alternativeTitle}>Need Immediate Help?</Text>
                    <TouchableOpacity style={styles.altOption}>
                        <Ionicons name="call-outline" size={18} color={Colors.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.altLabel}>Call Support</Text>
                            <Text style={styles.altSub}>+91-800-1234-567</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Colors.bgScreen,
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
    infoCard: {
        alignItems: 'center',
        backgroundColor: `${Colors.primary}10`,
        borderRadius: Radius.lg,
        padding: Spacing.xl,
        marginBottom: Spacing.xl,
    },
    infoTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.heading3,
        color: Colors.textDark,
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
    },
    infoText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textMuted,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    emailAddress: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.primary,
    },
    formContainer: {
        marginBottom: Spacing.xl,
    },
    formGroup: {
        marginBottom: Spacing.lg,
    },
    label: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
        marginBottom: Spacing.sm,
    },
    input: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.body,
        color: Colors.textDark,
        backgroundColor: Colors.bgCard,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
    },
    textArea: {
        paddingVertical: Spacing.md,
        minHeight: 120,
    },
    categoryOptions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        flexWrap: 'wrap',
    },
    categoryChip: {
        backgroundColor: Colors.bgCard,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
    },
    categoryText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.bodySmall,
        color: Colors.textDark,
    },
    attachmentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: `${Colors.primary}10`,
        borderRadius: Radius.sm,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    attachmentText: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
        flex: 1,
    },
    sendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.lg,
        borderRadius: Radius.md,
        marginBottom: Spacing.lg,
    },
    sendButtonDisabled: {
        opacity: 0.7,
    },
    sendButtonText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textWhite,
    },
    alternativeSection: {
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
        paddingTop: Spacing.lg,
    },
    alternativeTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
        marginBottom: Spacing.md,
    },
    altOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.bgCard,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        borderRadius: Radius.md,
        padding: Spacing.md,
        gap: Spacing.md,
    },
    altLabel: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.body,
        color: Colors.textDark,
    },
    altSub: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall,
        color: Colors.textMuted,
        marginTop: 2,
    },
});
