// BackgroundGlow — Warm golden/peach blur behind the SOS rings
// Figma: Ellipse 18 — large warm glow matching the peach background
import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function BackgroundGlow() {
    return (
        <View style={styles.container}>
            <View style={styles.glowOuter} />
            <View style={styles.glowInner} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Large outer warm glow — matches the soft golden ambient light in Figma
    glowOuter: {
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: 200,
        backgroundColor: 'rgba(255, 180, 100, 0.10)',
        shadowColor: '#FFAD59',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 160,
        elevation: 0,
    },
    // Inner concentrated warm glow directly behind the button
    glowInner: {
        position: 'absolute',
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: 'rgba(255, 154, 108, 0.12)',
    },
});
