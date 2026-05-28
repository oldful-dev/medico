// SOS Countdown Overlay - Full screen countdown before triggering emergency
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Fonts } from '@/constants/theme';

interface SOSCountdownProps {
    seconds?: number;
    onComplete?: () => void;
    onCancel?: () => void;
}

export default function SOSCountdown({ seconds = 3, onComplete, onCancel }: SOSCountdownProps) {
    const { t } = useTranslation();
    const [count, setCount] = useState(seconds);

    useEffect(() => {
        if (count > 0) {
            const timer = setTimeout(() => setCount(count - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            onComplete?.();
        }
    }, [count, onComplete]);

    return (
        <Modal transparent={true} visible={true} animationType="fade">
            <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
                <View style={styles.content}>
                    <Text style={styles.warningText}>{t('sos.countdown.emergency_alert')}</Text>
                    <Text style={styles.subText}>{t('sos.countdown.subtext')}</Text>
                    
                    <View style={styles.countCircle}>
                        <Text style={styles.countText}>{count}</Text>
                    </View>

                    <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                        <Text style={styles.cancelText}>{t('sos.countdown.cancel')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        padding: 40,
    },
    warningText: {
        fontFamily: Fonts.bold,
        fontSize: 32,
        color: '#FF4B4B',
        marginBottom: 10,
    },
    subText: {
        fontFamily: Fonts.medium,
        fontSize: 18,
        color: '#FFFFFF',
        opacity: 0.8,
        marginBottom: 40,
        textAlign: 'center',
    },
    countCircle: {
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 8,
        borderColor: '#FF4B4B',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 60,
    },
    countText: {
        fontFamily: Fonts.bold,
        fontSize: 80,
        color: '#FFFFFF',
    },
    cancelBtn: {
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    cancelText: {
        fontFamily: Fonts.bold,
        fontSize: 18,
        color: '#FFFFFF',
    },
});
