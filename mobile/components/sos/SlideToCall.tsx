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
import SOSCountdown from './SOSCountdown';
import { Fonts } from '@/constants/theme';
import { sosService } from '@/services/device/sosService';
import { AnalyticsEvents } from '@/services/firebase/analyticsEvents';

const TRACK_WIDTH = 303;
const TRACK_HEIGHT = 69;
const THUMB_SIZE = 56;
const THUMB_WIDTH = 59;
const PADDING = 6;
const SLIDE_THRESHOLD = TRACK_WIDTH - THUMB_WIDTH - PADDING * 2 - 20;

const HOTLINE_NUMBER = 'tel:+919480198108'; // Oldful emergency hotline

interface SlideToCallProps {
    onSlideComplete?: () => void;
}

export default function SlideToCall({ onSlideComplete }: SlideToCallProps) {
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
                sosService.triggerSOS('default').then((result) => {
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
            {/* Gradient text label — centered in track */}
            <View style={styles.labelContainer}>
                <Text style={styles.label}>Slide to Call for Help</Text>
            </View>

            {/* Draggable thumb */}
            <Animated.View
                style={[styles.thumb, { transform: [{ translateX }] }]}
                {...panResponder.panHandlers}
            >
                <View style={styles.thumbInner}>
                    <Ionicons name="call" size={18} color="#FFFFFF" />
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
    /* Slide track — Figma: 303×69, border 1.5 #02743F, radius 34.5, shadow */
    track: {
        width: TRACK_WIDTH,
        height: TRACK_HEIGHT,
        borderRadius: 34.5,
        borderWidth: 1.5,
        borderColor: '#02743F',
        backgroundColor: 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: PADDING,
        // Figma shadow: 0px 4px 20px rgba(0,0,0,0.41)
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.41,
        shadowRadius: 20,
        // elevation: 8,
        // overflow: 'hidden', // Disabled to allow SOSCountdown full-screen overlay if needed, 
        // but better to handle overlay at a higher level.
        // However, absoluteFill in SOSCountdown will cover the nearest relative parent.
    },

    /* Text label — Figma: Inter Bold 15px */
    labelContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    label: {
        fontFamily: Fonts.bold,
        fontSize: 15,
        color: '#FF9468',
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
        backgroundColor: '#FF9468',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2.5,
        borderColor: '#FFFFFF',
        // Thumb shadow
        shadowColor: '#FF7E7B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
});
