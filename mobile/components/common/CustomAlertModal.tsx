import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSize, Radius, Shadow } from '@/constants/theme';

interface CustomAlertModalProps {
    visible: boolean;
    title: string;
    message: string;
    iconName?: keyof typeof Ionicons.prototype.props.name;
    buttonText?: string;
    onClose: () => void;
    /** Optional secondary button (e.g. Cancel / Destructive action) */
    secondaryButtonText?: string;
    onSecondaryPress?: () => void;
    /** If true, secondary button is styled as a destructive/danger action */
    secondaryDestructive?: boolean;
}

export function CustomAlertModal({
    visible,
    title,
    message,
    iconName = 'lock-closed',
    buttonText = 'OK',
    onClose,
    secondaryButtonText,
    onSecondaryPress,
    secondaryDestructive = false,
}: CustomAlertModalProps) {
    console.log('[CustomAlertModal] Rendering. visible:', visible, 'title:', title, 'message:', message);
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            statusBarTranslucent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.dialog}>
                    <View style={styles.iconContainer}>
                        <Ionicons name={iconName as any} size={32} color={Colors.primary} />
                    </View>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    {secondaryButtonText ? (
                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={[styles.buttonHalf, secondaryDestructive ? styles.destructiveButton : styles.outlineButton]}
                                onPress={onSecondaryPress}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.buttonHalfText, secondaryDestructive ? styles.destructiveButtonText : styles.outlineButtonText]}>
                                    {secondaryButtonText}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.buttonHalf, styles.primaryButton]}
                                onPress={onClose}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.buttonHalfText, styles.primaryButtonText]}>
                                    {buttonText}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.85}>
                            <Text style={styles.buttonText}>{buttonText}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    dialog: {
        backgroundColor: Colors.bgScreen || '#FFFFFF',
        borderRadius: Radius.xl || 16,
        padding: 28,
        width: '100%',
        alignItems: 'center',
        ...Shadow.card,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#E8F5EC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontFamily: Fonts.bold,
        fontSize: FontSize.heading1 || 20,
        color: Colors.textDark || '#333333',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.bodySmall || 14,
        color: Colors.textMuted || '#666666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    button: {
        backgroundColor: Colors.primary || '#02743F',
        borderRadius: Radius.lg || 12,
        paddingVertical: 14,
        paddingHorizontal: 40,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.button || 16,
        color: '#FFFFFF',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
    },
    buttonHalf: {
        flex: 1,
        borderRadius: Radius.lg || 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    buttonHalfText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.button || 16,
    },
    primaryButton: {
        backgroundColor: Colors.primary || '#02743F',
    },
    primaryButtonText: {
        color: '#FFFFFF',
    },
    outlineButton: {
        borderWidth: 1.5,
        borderColor: Colors.primary || '#02743F',
        backgroundColor: 'transparent',
    },
    outlineButtonText: {
        color: Colors.primary || '#02743F',
    },
    destructiveButton: {
        backgroundColor: '#EF4444',
    },
    destructiveButtonText: {
        color: '#FFFFFF',
    },
});

