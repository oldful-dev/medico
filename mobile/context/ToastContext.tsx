import React, { createContext, useContext, useState, useRef } from 'react';
import { StyleSheet, Text, Animated, Platform } from 'react-native';
import { Fonts, FontSize, Radius, Shadow } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';

interface ToastContextType {
    showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [message, setMessage] = useState('');
    const [visible, setVisible] = useState(false);
    
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;
    const colors = useThemeColors();

    const showToast = (msg: string) => {
        setMessage(msg);
        setVisible(true);

        // Reset anim values
        fadeAnim.setValue(0);
        translateY.setValue(20);

        Animated.sequence([
            // Fade-in & Slide-up
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]),
            // Visible delay
            Animated.delay(1800),
            // Fade-out & Slide-down
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 10,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]),
        ]).start(({ finished }) => {
            if (finished) {
                setVisible(false);
            }
        });
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {visible && (
                <Animated.View
                    style={[
                        styles.toastContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY }],
                            backgroundColor: colors.textDark === '#1E1E1E' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(20, 20, 20, 0.92)',
                        },
                    ]}
                >
                    <Text style={styles.toastText}>{message}</Text>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

const styles = StyleSheet.create({
    toastContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 120 : 100,
        left: 24,
        right: 24,
        borderRadius: Radius.md,
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadow.card,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        zIndex: 99999,
        elevation: 6,
    },
    toastText: {
        color: '#FFFFFF',
        fontFamily: Fonts.medium,
        fontSize: FontSize.bodySmall + 1, // ~13px
        textAlign: 'center',
        letterSpacing: 0.1,
    },
});
