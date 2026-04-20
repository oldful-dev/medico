// SOSRings — Concentric dashed ring layers with neumorphic SOS button in center
// Reuses exported Figma ring PNGs + SVG-based center button
import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';

// Exported ring images from Figma (dashed concentric circles)
const ringOuterImg = require('@/assets/images/45eeda0fdf448c5e9fba0b3e88a43e7d01433a80.png');
const ringThirdImg = require('@/assets/images/b80c4c1ba6d24bda41dfd3542f19e84d431acce8.png');
const ringSecondImg = require('@/assets/images/4ba5d3e861b882471ce1c114d1910688e7d39afe.png');
const ringInnerImg = require('@/assets/images/6426813f7d645f381f72a7867f3211021f97bb25.png');

export default function SOSButton() {
    return (
        <View style={styles.wrapper}>
            {/* Concentric ring layers — stacked via absolute positioning (unavoidable for layered rings) */}
            <Image source={ringOuterImg} style={[styles.ring, styles.ringOuter]} resizeMode="contain" />
            <Image source={ringThirdImg} style={[styles.ring, styles.ringThird]} resizeMode="contain" />
            <Image source={ringSecondImg} style={[styles.ring, styles.ringSecond]} resizeMode="contain" />
            <Image source={ringInnerImg} style={[styles.ring, styles.ringInner]} resizeMode="contain" />

            {/* Neumorphic SOS Button (center) — matching Figma gradient #FFAD59 → #FF7E7B */}
            <View style={styles.neuOuterRing}>
                <View style={styles.neuInnerCircle}>
                    <Text style={styles.sosText}>SOS</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: 376,
        height: 368,
        justifyContent: 'center',
        alignItems: 'center',
    },

    /* Ring layers — absolute positioning required for concentric stacking */
    ring: {
        position: 'absolute',
    },
    ringOuter: {
        width: 376,
        height: 368,
    },
    ringThird: {
        width: 329,
        height: 322,
    },
    ringSecond: {
        width: 288,
        height: 282,
    },
    ringInner: {
        width: 246,
        height: 240,
    },

    /* Neumorphic outer ring — Figma: #F5F5FA ellipse, soft shadow */
    neuOuterRing: {
        width: 193,
        height: 189,
        borderRadius: 96.5,
        backgroundColor: '#F0EFF4',
        justifyContent: 'center',
        alignItems: 'center',
        // Figma: soft neumorphic shadow
        shadowColor: '#C4B8C9',
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 8,
    },

    /* Inner circle — Figma: salmon-orange gradient #FFAD59 → #FF7E7B */
    neuInnerCircle: {
        width: 145,
        height: 142,
        borderRadius: 72.5,
        justifyContent: 'center',
        alignItems: 'center',
        // Approximate the Figma gradient with a mid-point color
        backgroundColor: '#FF9A6C',
        // Warm orange-salmon glow matching Figma
        shadowColor: '#FF7E7B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },

    /* "SOS" label — Figma: Bold ~40px white */
    sosText: {
        fontFamily: Platform.select({ ios: 'Poppins-Bold', android: 'Poppins_700Bold', default: 'System' }),
        fontWeight: '700',
        fontSize: 40,
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: 2,
    },
});
