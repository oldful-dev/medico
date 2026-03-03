// SlideToCall — "Slide to Call for Help" swipeable action bar
// Figma: 303×69 rounded-rectangle, border #02743F 1.5px, border-radius 34.5,
//        shadow 0 4 20 rgba(0,0,0,0.41)
//        Orange gradient thumb (59×56) with white phone icon
//        Gradient text "Slide to Call for Help" — radial #FFAD59 → #FF7E7B
import React, { useRef } from 'react';
import {
    View,
    Text,
    Animated,
    PanResponder,
    StyleSheet,
    Platform,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TRACK_WIDTH = 303;
const TRACK_HEIGHT = 69;
const THUMB_SIZE = 56;
const THUMB_WIDTH = 59;
const PADDING = 6;
const SLIDE_THRESHOLD = TRACK_WIDTH - THUMB_WIDTH - PADDING * 2 - 20;

interface SlideToCallProps {
    onSlideComplete?: () => void;
}

export default function SlideToCall({ onSlideComplete }: SlideToCallProps) {
    const translateX = useRef(new Animated.Value(0)).current;

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
        overflow: 'hidden',
    },

    /* Text label — Figma: Inter Bold 15px, radial gradient #FFAD59 → #FF7E7B */
    /* RN doesn't support gradient text natively; using the mid-tone of the gradient */
    labelContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    label: {
        fontFamily: Platform.select({ ios: 'Poppins-Bold', android: 'Poppins_700Bold', default: 'System' }),
        fontWeight: '700',
        fontSize: 15,
        color: '#FF9468', // Mid-tone of radial gradient (#FFAD59 → #FF7E7B)
        textAlign: 'center',
    },

    /* Draggable thumb — Figma: 59×56 ellipse, radial gradient #FFAD59 → #FF7E7B, white stroke 5 */
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
