// SOS Countdown Overlay - Full screen countdown before triggering emergency
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SOSCountdownProps {
    seconds?: number;
    onComplete?: () => void;
    onCancel?: () => void;
}

export default function SOSCountdown({ seconds = 3, onComplete, onCancel }: SOSCountdownProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>SOS Countdown: {seconds}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FF0000',
    },
});
