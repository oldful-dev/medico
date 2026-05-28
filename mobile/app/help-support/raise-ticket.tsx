import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { supportService, SupportTicket, TicketCategory } from '@/services/api/supportService';
import { useAppConfig } from '@/context/AppConfigContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { getText } from '@/i18n/utils/getText';

export default function RaiseTicketScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { helpSupportConfig } = useAppConfig();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors, isDarkMode);
    const { t } = useTranslation();

    const categories = [...helpSupportConfig.ticket_categories].sort((a, b) => a.sort_order - b.sort_order);

    const [myTickets,      setMyTickets]      = React.useState<SupportTicket[]>([]);
    const [loadingTickets, setLoadingTickets] = React.useState(false);

    // Ticket form state
    const [subject,      setSubject]      = React.useState('');
    const [description,  setDescription]  = React.useState('');
    const [category,     setCategory]     = React.useState<TicketCategory>(categories[0]?.id as TicketCategory ?? 'service');
    const [submitting,   setSubmitting]   = React.useState(false);

    // Load user's tickets on mount
    React.useEffect(() => {
        (async () => {
            setLoadingTickets(true);
            try {
                const res = await supportService.getMyTickets();
                if (res.success && res.data) setMyTickets(res.data);
            } catch {
                // silently ignore — not critical
            } finally {
                setLoadingTickets(false);
            }
        })();
    }, []);

    const handleSubmitTicket = async () => {
        if (!subject.trim())      return Alert.alert(t('common.required'), t('help_support.required_subject'));
        if (!description.trim())  return Alert.alert(t('common.required'), t('help_support.required_description'));

        setSubmitting(true);
        try {
            const res = await supportService.createTicket({ subject, description, category });
            if (res.success && res.data) {
                setMyTickets(prev => [res.data!, ...prev]);
                setSubject('');
                setDescription('');
                setCategory('service');
                Alert.alert(
                    t('help_support.ticket_raised'),
                    t('help_support.ticket_raised_message', { code: res.data.ticketCode })
                );
            } else {
                Alert.alert(t('common.error'), res.message || t('help_support.failed_ticket'));
            }
        } catch (err) {
            Alert.alert(t('common.error'), t('errors.network'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={{ backgroundColor: colors.primary, height: insets.top }} />
            <StatusBar style="light" backgroundColor={colors.primary} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('help_support.raise_ticket')}</Text>
            </View>

            <View style={styles.contentCard}>
                <KeyboardAwareScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    enableOnAndroid={true}
                    extraScrollHeight={20}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Raise Ticket Form */}
                    <Text style={styles.sectionTitle}>{t('help_support.raise_ticket_modal_title')}</Text>
                    <View style={styles.formCard}>
                        <Text style={styles.fieldLabel}>{t('help_support.subject')}</Text>
                        <TextInput
                            style={styles.fieldInput}
                            placeholder={t('help_support.subject_placeholder')}
                            placeholderTextColor={colors.textMuted}
                            value={subject}
                            onChangeText={setSubject}
                            maxLength={100}
                        />

                        <Text style={styles.fieldLabel}>{t('help_support.ticket_categories')}</Text>
                        <View style={styles.categoryRow}>
                            {categories.map(c => (
                                <TouchableOpacity
                                    key={c.id}
                                    style={[styles.categoryChip, category === c.id && styles.categoryChipActive]}
                                    onPress={() => setCategory(c.id as TicketCategory)}
                                >
                                    <Text style={[styles.categoryChipText, category === c.id && styles.categoryChipTextActive]}>
                                        {t('email_support.cat_' + c.id, { defaultValue: c.label })}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.fieldLabel}>{t('help_support.description')}</Text>
                        <TextInput
                            style={[styles.fieldInput, styles.fieldInputMulti]}
                            placeholder={t('help_support.description_placeholder')}
                            placeholderTextColor={colors.textMuted}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={5}
                            textAlignVertical="top"
                        />

                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                            onPress={handleSubmitTicket}
                            disabled={submitting}
                            activeOpacity={0.8}
                        >
                            {submitting
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.submitBtnText}>{t('help_support.submit_ticket')}</Text>
                            }
                        </TouchableOpacity>
                    </View>

                    {/* My Tickets List */}
                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{t('help_support.my_tickets')}</Text>
                    {loadingTickets ? (
                        <ActivityIndicator color={colors.primary} style={{ marginVertical: Spacing.xl }} />
                    ) : myTickets.length === 0 ? (
                        <View style={styles.infoCard}>
                            <Text style={styles.noResults}>{t('help_support.no_tickets')}</Text>
                        </View>
                    ) : (
                        myTickets.map(ticket => {
                            const msgCount = ticket._count?.messages ?? 0;
                            const msgLabel = msgCount === 1 ? t('help_support.messages') : t('help_support.messages_plural');
                            return (
                                <TouchableOpacity
                                    key={ticket.id}
                                    style={styles.ticketCard}
                                    activeOpacity={0.7}
                                    onPress={() => router.push({ pathname: '/ticket-chat', params: { ticketId: ticket.id } } as any)}
                                >
                                    <View style={styles.ticketRow}>
                                        <Text style={styles.ticketCode}>{ticket.ticketCode}</Text>
                                        <View style={[styles.statusBadge, { backgroundColor: helpSupportConfig.ticket_status_colors[ticket.status] || '#9B9B9B' }]}>
                                            <Text style={styles.statusText}>{t('ticket_chat.status_' + ticket.status, { defaultValue: ticket.status.replace('_', ' ') })}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                                    <View style={styles.ticketBottom}>
                                        <Text style={styles.ticketMeta}>
                                            {t('email_support.cat_' + ticket.category.toLowerCase(), { defaultValue: ticket.category })} · {msgCount} {msgLabel}
                                        </Text>
                                        <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}

                    <View style={styles.bottomSpacer} />
                </KeyboardAwareScrollView>
            </View>
        </KeyboardAvoidingView>
    );
}

const makeStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.primary },
    header: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl, paddingTop: Spacing.sm,
    },
    backButton:  { padding: Spacing.xs },
    headerTitle: {
        flex: 1, fontFamily: Fonts.semiBold, fontSize: FontSize.heading2,
        color: colors.textWhite, textAlign: "left", marginLeft: 12, letterSpacing: -0.24,
    },
    contentCard: {
        flex: 1, backgroundColor: colors.bgScreen,
        borderTopLeftRadius: Radius.xl * 2, borderTopRightRadius: Radius.xl * 2, overflow: 'hidden',
    },
    scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.xl },
    sectionTitle: {
        fontFamily: Fonts.semiBold, fontSize: FontSize.heading3, color: colors.textDark,
        marginBottom: Spacing.md, marginTop: Spacing.sm,
    },
    formCard: {
        backgroundColor: colors.bgCard,
        borderRadius: Radius.md,
        padding: Spacing.lg,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    fieldLabel:   { fontFamily: Fonts.semiBold, fontSize: FontSize.bodySmall, color: colors.textDark, marginBottom: Spacing.xs },
    fieldInput:   { backgroundColor: colors.bgCard, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontFamily: Fonts.regular, fontSize: FontSize.body, color: colors.textDark, marginBottom: Spacing.lg, borderWidth: 1, borderColor: colors.borderLight },
    fieldInputMulti: { height: 120, paddingTop: Spacing.sm },
    categoryRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
    categoryChip: { borderRadius: 20, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.bgCard },
    categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    categoryChipText:   { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: colors.textBody },
    categoryChipTextActive: { color: '#fff', fontFamily: Fonts.semiBold },
    submitBtn:    { backgroundColor: colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
    submitBtnText:{ fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: '#fff' },

    // Tickets styling
    ticketCard: {
        backgroundColor: colors.bgCard, borderRadius: Radius.md, padding: Spacing.md,
        marginBottom: Spacing.md,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    ticketRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    ticketCode:   { fontFamily: Fonts.semiBold, fontSize: FontSize.bodySmall, color: colors.textMuted },
    ticketSubject:{ fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: colors.textDark, marginBottom: 4 },
    ticketMeta:   { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: colors.textMuted, textTransform: 'capitalize', flex: 1 },
    ticketBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statusBadge:  { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
    statusText:   { fontFamily: Fonts.semiBold, fontSize: 10, color: '#fff', textTransform: 'capitalize' },
    infoCard: {
        backgroundColor: colors.bgCard, borderRadius: Radius.md, padding: Spacing.lg,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    noResults:  { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: colors.textMuted, textAlign: 'center' },
    bottomSpacer: { height: 60 },
});
