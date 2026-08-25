// Splash Screen — Pixel-matched to Figma frame "Splashify" (140:392)
// Layout: Cream background, centered Ayuxa Care logo, ISO badge below, mandala bottom-left
// No business logic — pure presentation
import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { uiConfigService } from '@/services/api/uiConfigService';
import { Fonts } from '@/constants/theme';
// Figma-exported assets
const logoImage = require('@/assets/images/nameandlogo.png');
const mandalaImage = require('@/assets/images/0b96a399f500dd9db46b7a473a511a23fa2abc2b.png');

interface IsoCertification {
    label: string;
    certNumber?: string;
}

const FALLBACK_ISO_CERTIFICATIONS: IsoCertification[] = [{ label: 'ISO 9001-2015 Certified' }];

 export default function SplashScreen() {
      const router = useRouter();
      const { isAuthenticated, isLoading } = useAuth();
     const [fadeAnim] = useState(new Animated.Value(0));
     // Same admin-managed source as the website footer (company_global_config
     // via /ui-config/published) — starts null so we never flash the fallback
     // text before the real value has had a chance to load.
     const [isoCertifications, setIsoCertifications] = useState<IsoCertification[] | null>(null);
     const [isoLoadFailed, setIsoLoadFailed] = useState(false);

     useEffect(() => {
         (async () => {
             try {
                 const res = await uiConfigService.getPublishedConfigs();
                 const found = res.success && res.data ? res.data.find(c => c.key === 'company_global_config') : null;
                 if (found?.configJson) {
                     let parsed: any = found.configJson;
                     if (typeof parsed === 'string') {
                         try { parsed = JSON.parse(parsed); } catch { /* ignore */ }
                     }
                     const certs = Array.isArray(parsed?.iso_certifications) ? parsed.iso_certifications : [];
                     setIsoCertifications(certs.length > 0 ? certs : FALLBACK_ISO_CERTIFICATIONS);
                     return;
                 }
                 setIsoLoadFailed(true);
             } catch {
                 setIsoLoadFailed(true);
             }
         })();
     }, []);

     const displayIsoCertifications = isoCertifications || (isoLoadFailed ? FALLBACK_ISO_CERTIFICATIONS : null);

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

                {/* ISO certification — admin-managed via company_global_config,
                    same source as the website footer. Renders nothing until
                    loaded (or definitively failed) to avoid a stale flash. */}
                {displayIsoCertifications && (
                    <View style={styles.badgeContainer}>
                        {displayIsoCertifications.map((cert, i) => (
                            <View key={i} style={styles.isoBlock}>
                                <View style={styles.isoRow}>
                                    <View style={styles.isoIconCircle}>
                                        <Ionicons name="checkmark" size={14} color="#5C7268" />
                                    </View>
                                    <Text style={styles.isoText} numberOfLines={1} adjustsFontSizeToFit>
                                        {cert.label}
                                    </Text>
                                </View>
                                {cert.certNumber ? (
                                    <Text style={styles.isoCertNumber} numberOfLines={1} adjustsFontSizeToFit>
                                        {cert.certNumber}
                                    </Text>
                                ) : null}
                            </View>
                        ))}
                        <View style={styles.isoDivider} />
                    </View>
                )}

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
        paddingHorizontal: 24,
        width: '100%',
    },
    isoBlock: {
        alignItems: 'center',
        marginBottom: 2,
    },
    isoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    isoIconCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: '#8FA396',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    isoText: {
        fontFamily: Fonts.semiBold,
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.3,
        color: '#7D9285',
        textAlign: 'center',
    },
    isoCertNumber: {
        fontFamily: Fonts.semiBold,
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0,
        color: '#A8B7A9',
        textAlign: 'center',
        marginTop: 3,
    },
    isoDivider: {
        marginTop: 20,
        width: '88%',
        height: 1,
        backgroundColor: '#C9D6CC',
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
