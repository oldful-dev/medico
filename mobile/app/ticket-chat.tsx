// Ticket Chat Screen — View messages and reply to a support ticket
// Uses WebSocket for real-time message delivery from admin
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert, Platform, Keyboard, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { supportService, TicketMessage, SupportTicket } from '@/services/api/supportService';
import { initTicketSocket, onTicketMessageAdded, disconnectTicketSocket } from '@/services/socket/ticketSocket';
import { joinUserRoom } from '@/services/socket/socketManager';
import { useUser } from '@/context/UserContext';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';

export default function TicketChatScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { profile } = useUser();
    const { isDarkMode } = useTheme();
    const colors = useThemeColors();
    const styles = makeStyles(colors, isDarkMode);
    const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
    const flatListRef = useRef<FlatList>(null);

    const [ticket, setTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<TicketMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // Track keyboard on Android (iOS uses KeyboardAvoidingView-like approach via padding)
    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => setKeyboardHeight(e.endCoordinates.height)
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardHeight(0)
        );
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    // Cleanup socket on unmount
    useEffect(() => {
        return () => {
            disconnectTicketSocket();
        };
    }, []);

    const fetchTicket = useCallback(async () => {
        if (!ticketId) return;
        try {
            const res = await supportService.getTicketById(ticketId);
            if (res.success && res.data) {
                setTicket(res.data);
                setMessages(res.data.messages || []);
            }
        } catch {
            Alert.alert('Error', 'Failed to load ticket details.');
        } finally {
            setLoading(false);
        }
    }, [ticketId]);

    useEffect(() => {
        fetchTicket();
    }, [fetchTicket]);

    // Initialize WebSocket and listen for real-time messages
    useEffect(() => {
        if (!ticketId || !profile?.id) return;

        let cleanup: (() => void) | undefined;

        (async () => {
            try {
                // Initialize socket connection
                await initTicketSocket(ticketId);

                // Ensure user is in their personal room to receive messages
                await joinUserRoom(profile.id);
                console.log('[TicketChat] ✅ Socket initialized and user room joined');

                // Listen for real-time messages from admin
                cleanup = onTicketMessageAdded((data) => {
                    console.log('[TicketChat] New message for ticket:', data.ticketId);
                    if (data.ticketId === ticketId) {
                        setMessages(prev => [...prev, data.message]);
                        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                    }
                });
            } catch (err) {
                console.error('[TicketChat] Socket setup error:', err);
            }
        })();

        return () => {
            if (cleanup) cleanup();
        };
    }, [ticketId, profile?.id]);

    const handleSend = async () => {
        const text = messageText.trim();
        if (!text || !ticketId) return;

        setSending(true);
        try {
            const res = await supportService.sendMessage(ticketId, text);
            if (res.success && res.data) {
                setMessages(prev => [...prev, res.data!]);
                setMessageText('');
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            } else {
                Alert.alert('Error', res.message || 'Failed to send message.');
            }
        } catch {
            Alert.alert('Error', 'Network error. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const isResolved = ticket?.status === 'resolved' || ticket?.status === 'closed';

    const statusColor: Record<string, string> = {
        open: '#4A90E2',
        in_progress: '#F5A623',
        resolved: '#048357',
        closed: '#9B9B9B',
    };

    const renderMessage = ({ item }: { item: TicketMessage }) => {
        const isUser = item.senderType === 'user';
        return (
            <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.adminBubble]}>
                <View style={styles.senderRow}>
                    <Ionicons
                        name={isUser ? 'person-circle-outline' : 'headset-outline'}
                        size={16}
                        color={isUser ? colors.primary : '#F5A623'}
                    />
                    <Text style={[styles.senderLabel, { color: isUser ? colors.primary : '#F5A623' }]}>
                        {isUser ? 'You' : 'Support Team'}
                    </Text>
                </View>
                <Text style={styles.messageText}>{item.message}</Text>
                <Text style={styles.messageTime}>
                    {new Date(item.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                </Text>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // On Android, we manually add padding for the keyboard.
    // On iOS, the native keyboard avoidance + safe area handles it.
    const bottomPadding = Platform.OS === 'android' ? keyboardHeight : 0;

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <View style={[styles.screen, { paddingBottom: bottomPadding }]}>
                <View style={{ backgroundColor: colors.primary, height: insets.top }} />
                <StatusBar style="light" backgroundColor={colors.primary} />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{ticket?.subject || 'Ticket'}</Text>
                        <Text style={styles.headerSubtitle}>{ticket?.ticketCode}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor[ticket?.status || 'open'] || '#9B9B9B' }]}>
                        <Text style={styles.statusText}>{ticket?.status?.replace('_', ' ') || 'open'}</Text>
                    </View>
                </View>

                {/* Messages — FlatList with description as header */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messagesList}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    keyboardShouldPersistTaps="handled"
                    ListHeaderComponent={
                        <View style={styles.descriptionCard}>
                            <Text style={styles.descLabel}>Description</Text>
                            <Text style={styles.descText}>{ticket?.description || 'No description provided.'}</Text>
                            <Text style={styles.descMeta}>
                                {ticket?.category} · Created {new Date(ticket?.createdAt || '').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Text>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
                            <Text style={styles.emptyText}>No messages yet. Start the conversation below.</Text>
                        </View>
                    }
                />

                {/* Input bar */}
                {isResolved ? (
                    <View style={[styles.inputBar, { justifyContent: 'center', paddingBottom: (keyboardHeight === 0 ? (insets.bottom || Spacing.md) : Spacing.sm) }]}>
                        <Text style={styles.closedText}>This ticket has been {ticket?.status}.</Text>
                    </View>
                ) : (
                    <View style={[styles.inputBar, { paddingBottom: (keyboardHeight === 0 ? (insets.bottom || Spacing.md) : Spacing.sm) }]}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Type your message..."
                            placeholderTextColor={colors.textMuted}
                            value={messageText}
                            onChangeText={setMessageText}
                            multiline
                            maxLength={2000}
                            editable={!sending}
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, (!messageText.trim() || sending) && styles.sendBtnDisabled]}
                            onPress={handleSend}
                            disabled={!messageText.trim() || sending}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Ionicons name="send" size={20} color="#fff" />
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const makeStyles = (colors: ThemeColors, isDarkMode: boolean) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bgScreen },

    header: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, paddingTop: Spacing.sm,
    },
    backButton: { padding: Spacing.xs },
    headerCenter: { flex: 1, marginHorizontal: Spacing.sm },
    headerTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.body, color: colors.textWhite },
    headerSubtitle: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
    statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
    statusText: { fontFamily: Fonts.semiBold, fontSize: 10, color: '#fff', textTransform: 'capitalize' },

    descriptionCard: {
        backgroundColor: colors.bgCard, marginBottom: Spacing.md,
        borderRadius: Radius.md, padding: Spacing.md,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    descLabel: { fontFamily: Fonts.semiBold, fontSize: FontSize.bodySmall, color: colors.textMuted, marginBottom: 4 },
    descText: { fontFamily: Fonts.regular, fontSize: FontSize.body, color: colors.textDark, lineHeight: 22 },
    descMeta: { fontFamily: Fonts.regular, fontSize: FontSize.caption, color: colors.textMuted, marginTop: Spacing.sm, textTransform: 'capitalize' },

    messagesList: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm },

    messageBubble: {
        borderRadius: Radius.md, padding: Spacing.md,
        marginBottom: Spacing.sm, maxWidth: '85%',
    },
    userBubble: {
        backgroundColor: isDarkMode ? 'rgba(52, 199, 89, 0.15)' : '#E8F5E9', alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    adminBubble: {
        backgroundColor: colors.bgCard, alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    senderRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    senderLabel: { fontFamily: Fonts.semiBold, fontSize: FontSize.caption },
    messageText: { fontFamily: Fonts.regular, fontSize: FontSize.body, color: colors.textDark, lineHeight: 21 },
    messageTime: { fontFamily: Fonts.regular, fontSize: 10, color: colors.textMuted, marginTop: 4, textAlign: 'right' },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xl * 2 },
    emptyText: { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: colors.textMuted, marginTop: Spacing.md, textAlign: 'center' },

    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end',
        paddingHorizontal: Spacing.md, paddingTop: Spacing.sm,
        backgroundColor: colors.bgCard, borderTopWidth: 1, borderTopColor: colors.borderLight,
    },
    textInput: {
        flex: 1, backgroundColor: colors.bgCardMuted, borderRadius: Radius.md,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        fontFamily: Fonts.regular, fontSize: FontSize.body, color: colors.textDark,
        maxHeight: 100, marginRight: Spacing.sm,
        borderWidth: 1, borderColor: colors.borderLight,
    },
    sendBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: colors.primary,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 2,
    },
    sendBtnDisabled: { opacity: 0.5 },

    closedText: { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: colors.textMuted, textAlign: 'center' },
});
