import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    Animated,
    PanResponder,
    StyleSheet,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SOSCountdown from './SOSCountdown';
import { Fonts } from '@/constants/theme';
import { useTranslation } from 'react-i18next';
import { sosService } from '@/services/device/sosService';
import { AnalyticsEvents } from '@/services/firebase/analyticsEvents';

const TRACK_WIDTH = 303;
const TRACK_HEIGHT = 69;
const THUMB_SIZE = 56;
const THUMB_WIDTH = 59;
const PADDING = 6;
const SLIDE_THRESHOLD = TRACK_WIDTH - THUMB_WIDTH - PADDING * 2 - 20;

const HOTLINE_NUMBER = 'tel:+918062180429'; // ayuxacare emergency hotline

interface SlideToCallProps {
    onSlideComplete?: () => void;
}

export default function SlideToCall({ onSlideComplete }: SlideToCallProps) {
    const { t } = useTranslation();
    const translateX = useRef(new Animated.Value(0)).current;
    const [showCountdown, setShowCountdown] = useState(false);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gesture) => {
                const maxSlide = TRACK_WIDTH - THUMB_WIDTH - PADDING * 2;
                const clampedX = Math.max(0, Math.min(gesture.dx, maxSlide));
                translateX.setValue(clampedX);
            },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dx >= SLIDE_THRESHOLD) {
                    // Slide completed
                    Animated.spring(translateX, {
                        toValue: TRACK_WIDTH - THUMB_WIDTH - PADDING * 2,
                        useNativeDriver: true,
                    }).start(() => {
                        setShowCountdown(true);
                        onSlideComplete?.();
                    });
                } else {
                    // Snap back
                    Animated.spring(translateX, {
                        toValue: 0,
                        useNativeDriver: true,
                        friction: 6,
                    }).start();
                }
            },
        })
    ).current;

    const handleSOSComplete = async () => {
        try {
            AnalyticsEvents.trackSOSTriggered();
            // Fire BOTH actions simultaneously as per PDF requirement:
            // 1. Foreground: Open native phone dialer (tel: deep link)
            // 2. Background: Fetch GPS + alert admin/family via API
            await Promise.allSettled([
                Linking.openURL(HOTLINE_NUMBER),
                sosService.triggerSOS(null).then((result) => {
                    if (!result.success) {
                        console.warn('SOS Backend Alert Failed:', result.message);
                    }
                }),
            ]);
        } catch (error) {
            console.error('SOS Trigger Error:', error);
        } finally {
            setShowCountdown(false);
            // Reset thumb
            translateX.setValue(0);
        }
    };

    const handleCancel = () => {
        AnalyticsEvents.trackSOSCancelled();
        setShowCountdown(false);
        // Snap thumb back
        Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 6,
        }).start();
    };

    return (
        <View style={styles.track}>
            {/* Text label — centered in track */}
            <View style={styles.labelContainer}>
                <Text style={styles.label}>{t('sos.slide_to_call')}</Text>
            </View>

            {/* Draggable thumb with phone icon */}
            <Animated.View
                style={[styles.thumb, { transform: [{ translateX }] }]}
                {...panResponder.panHandlers}
            >
                <View style={styles.thumbInner}>
                    {/* Figma: phone handset with radiating arcs = "phone-in-talk" */}
                    <MaterialCommunityIcons name="phone-in-talk" size={26} color="#FFFFFF" />
                </View>
            </Animated.View>

            {showCountdown && (
                <SOSCountdown
                    onComplete={handleSOSComplete}
                    onCancel={handleCancel}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    /* Slide track — Figma: 303×69, border 1.5 #02743F, radius 34.5 */
    track: {
        width: TRACK_WIDTH,
        height: TRACK_HEIGHT,
        borderRadius: 34.5,
        borderWidth: 1.5,
        borderColor: '#FF9A6C',   // Salmon border matching Figma ellipse color
        backgroundColor: 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: PADDING,
        // Figma shadow: subtle warm glow
        shadowColor: '#FF9A6C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },

    /* Text label — Figma: Poppins Bold, salmon color */
    labelContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    label: {
        fontFamily: Fonts.bold,
        fontSize: 15,
        color: '#FF9A6C',
        textAlign: 'center',
    },

    /* Draggable thumb */
    thumb: {
        width: THUMB_WIDTH,
        height: THUMB_SIZE,
        borderRadius: 28,
        zIndex: 2,
    },
    thumbInner: {
        width: THUMB_WIDTH,
        height: THUMB_SIZE,
        borderRadius: 28,
        backgroundColor: '#FF9A6C',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2.5,
        borderColor: '#FFFFFF',
        // Figma: warm salmon thumb glow
        shadowColor: '#FF7E7B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 6,
    },
});
