// Splash Screen — Pixel-matched to Figma frame "Splashify" (140:392)
// Layout: Cream background, centered Oldful logo, ISO badge below, mandala bottom-left
// No business logic — pure presentation
import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useAuth } from '@/context/AuthContext';
// Figma-exported assets
const logoImage = require('@/assets/images/2549b5ede370bbb67a088920cac9a8719fec5968.png');
const isoBadgeImage = require('@/assets/images/727280010474dfd5bcb5f19d227968488ebee634.png');
const mandalaImage = require('@/assets/images/0b96a399f500dd9db46b7a473a511a23fa2abc2b.png');

 export default function SplashScreen() {
      const router = useRouter();
      const { isAuthenticated, isLoading } = useAuth();
     const [fadeAnim] = useState(new Animated.Value(0));
 
     useEffect(() => {
         // Simple fade-in animation
         Animated.timing(fadeAnim, {
             toValue: 1,
             duration: 800,
             useNativeDriver: true,
         }).start();
 
         // Hide native splash once custom splash is mounted
         ExpoSplashScreen.hideAsync().catch(() => {});
 
         // Simulate minimum splash display time and wait for auth state
         const timer = setTimeout(() => {
             if (!isLoading) {
                 if (isAuthenticated) {
                     router.replace('/(tabs)');
                 } else {
                     router.replace('/(auth)/login');
                 }
             }
         }, 2000); // 2 seconds delay
 
         return () => clearTimeout(timer);
     }, [isLoading, isAuthenticated, router, fadeAnim]);
 
     // Also trigger redirect if loading finishes AFTER the 2s timer
     useEffect(() => {
         if (!isLoading) {
             const checkAuth = setTimeout(() => {
                 if (isAuthenticated) {
                     router.replace('/(tabs)');
                 } else {
                     router.replace('/(auth)/login');
                 }
             }, 2000); // ensure we still wait at least 2s total
             return () => clearTimeout(checkAuth);
         }
     }, [isLoading, isAuthenticated, router]);

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <Animated.View style={{ opacity: fadeAnim, flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>

                {/* Centered logo — Figma: 258×108 at y=346, horizontally centered */}
                <View style={styles.logoContainer}>
                    <Image
                        source={logoImage}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

                {/* ISO certified badge — Figma: 338×74 at y=577, horizontally centered */}
                <View style={styles.badgeContainer}>
                    <Image
                        source={isoBadgeImage}
                        style={styles.badge}
                        resizeMode="contain"
                    />
                </View>

                {/* Bottom-left mandala decoration — Figma: at bottom-left, rotated -6.79°, clipped */}
                <View style={styles.mandalaContainer}>
                    <Image
                        source={mandalaImage}
                        style={styles.mandala}
                        resizeMode="contain"
                    />
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    /* Root — Figma: #FFFFF0, overflow clip */
    container: {
        flex: 1,
        backgroundColor: '#FFFFF0',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },

    /* Logo — Figma: 258×108, centered horizontally, y=346 on 844 screen */
    /* In flex layout: centered in the middle of the screen */
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 258,
        height: 108,
    },

    /* ISO Badge — Figma: 338×74, y=577 → roughly 231px below logo top */
    /* In flex layout: positioned below logo with spacing */
    badgeContainer: {
        position: 'absolute',
        bottom: 190,
        alignItems: 'center',
    },
    badge: {
        width: 338,
        height: 74,
    },

    /* Mandala — Figma: left=-36.87, top=639.64 (bottom-left corner), rotated -6.79° */
    /* Positioned absolutely at bottom-left, partially offscreen */
    mandalaContainer: {
        position: 'absolute',
        left: -37,
        bottom: -73,
    },
    mandala: {
        width: 232,
        height: 253,
        transform: [{ rotate: '-6.79deg' }],
    },
});
