// BackgroundGlow — Warm golden blur behind the SOS rings
// Figma: Ellipse 18 — blurred linear gradient #FFD600 → transparent red
import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function BackgroundGlow() {
    return (
        <View style={styles.container}>
            <View style={styles.glow} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    glow: {
        width: 320,
        height: 320,
        borderRadius: 160,
        backgroundColor: 'rgba(255, 214, 0, 0.12)',
        shadowColor: '#FFD600',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 140,
        elevation: 0,
    },
});
