// OTP Input — 4-digit input boxes
// Figma: 4 rounded rectangles 52×49 each, gap 17px, with center bottom line 24px
// Border-radius 10, stroke #C4C4C4, background white, shadow subtle
import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';

interface OTPInputProps {
    length?: number;
    onComplete?: (otp: string) => void;
}

export default function OTPInput({ length = 4, onComplete }: OTPInputProps) {
    const [otpValues, setOtpValues] = useState<string[]>(Array(length).fill(''));
    const inputRefs = useRef<(TextInput | null)[]>([]);

    const handleChange = (text: string, index: number) => {
        const newValues = [...otpValues];
        newValues[index] = text;
        setOtpValues(newValues);

        if (text.length === 1 && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // If all boxes are filled, trigger onComplete
        if (text.length === 1 && newValues.every(val => val.length === 1)) {
            if (onComplete) {
                onComplete(newValues.join(''));
            }
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && index > 0 && otpValues[index] === '') {
            inputRefs.current[index - 1]?.focus();
        }
    };

    return (
        <View style={styles.container}>
            {Array.from({ length }).map((_, index) => (
                <View key={index} style={styles.box}>
                    <TextInput
                        ref={(ref) => { inputRefs.current[index] = ref; }}
                        style={styles.input}
                        maxLength={1}
                        keyboardType="number-pad"
                        value={otpValues[index]}
                        onChangeText={(text) => handleChange(text, index)}
                        onKeyPress={(e) => handleKeyPress(e, index)}
                        selectTextOnFocus
                    />
                    <View style={styles.underline} />
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: 17,
    },
    /* Figma: 52×49, rounded-rectangle, border-radius ~10 */
    box: {
        width: 52,
        height: 49,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#C4C4C4',
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    input: {
        width: '100%',
        height: '100%',
        textAlign: 'center',
        fontSize: 22,
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        color: '#2F2F2F',
    },
    /* Figma: Line inside box, 24px wide, centered at bottom */
    underline: {
        position: 'absolute',
        bottom: 10,
        width: 24,
        height: 1,
        backgroundColor: '#C4C4C4',
    },
});
