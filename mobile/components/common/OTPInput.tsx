import React, { useRef, useState, useImperativeHandle, useEffect } from 'react';
import { View, TextInput, StyleSheet, Platform, Pressable, Text } from 'react-native';
import { Colors, Fonts, FontSize, Radius } from '@/constants/theme';

export interface OTPInputRef {
    clear: () => void;
    focus: () => void;
}

interface OTPInputProps {
    length?: number;
    disabled?: boolean;
    onComplete?: (otp: string) => void;
    onChange?: (otp: string) => void;
    /**
     * Optional ref-like prop to avoid forwardRef issues in some environments.
     */
    otpRef?: React.RefObject<OTPInputRef | null>;
}

/**
 * OTPInput component with reliable auto-fill support.
 * Uses a single hidden TextInput to manage the string value and native auto-fill.
 */
export default function OTPInput({ 
    length = 4, 
    disabled = false, 
    onComplete, 
    onChange,
    otpRef 
}: OTPInputProps) {
    const [otp, setOtp] = useState('');
    const inputRef = useRef<TextInput>(null);

    // Expose clear and focus methods to parent components via otpRef prop
    useImperativeHandle(otpRef, () => ({
        clear: () => {
            setOtp('');
        },
        focus: () => {
            inputRef.current?.focus();
        }
    }), []);

    const handleChangeText = (text: string) => {
        const cleaned = text.replace(/[^0-9]/g, '');
        if (cleaned.length <= length) {
            setOtp(cleaned);
            onChange?.(cleaned);
            if (cleaned.length === length) {
                onComplete?.(cleaned);
            }
        }
    };

    const handlePress = () => {
        inputRef.current?.focus();
    };

    return (
        <View style={styles.container}>
            {/* Hidden TextInput for native auto-fill and keyboard handling */}
            <TextInput
                ref={inputRef}
                style={styles.hiddenInput}
                value={otp}
                onChangeText={handleChangeText}
                maxLength={length}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                importantForAutofill="yes"
                caretHidden={true}
                editable={!disabled}
            />

            {/* Visual Boxes */}
            <Pressable style={styles.boxesRow} onPress={handlePress}>
                {Array.from({ length }).map((_, index) => {
                    const char = otp[index] || '';
                    const isFocused = !disabled && otp.length === index;
                    const isLastFilled = index === length - 1 && otp.length === length;
                    
                    return (
                        <View 
                            key={index} 
                            style={[
                                styles.box, 
                                (isFocused || (isLastFilled && index === length - 1)) && styles.focusedBox,
                                char !== '' && styles.filledBox
                            ]}
                        >
                            <Text style={styles.boxText}>{char}</Text>
                            <View style={[styles.underline, (isFocused || char !== '') && styles.activeUnderline]} />
                        </View>
                    );
                })}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    hiddenInput: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
    },
    boxesRow: {
        flexDirection: 'row',
        gap: 17,
    },
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
    focusedBox: {
        borderColor: '#02743F',
        borderWidth: 1.5,
    },
    filledBox: {
        borderColor: '#02743F',
    },
    boxText: {
        fontSize: 22,
        fontFamily: Platform.select({ ios: 'LexendDeca-Medium', android: 'LexendDeca_500Medium', default: 'System' }),
        fontWeight: '500',
        color: '#2F2F2F',
    },
    underline: {
        position: 'absolute',
        bottom: 10,
        width: 24,
        height: 1,
        backgroundColor: '#C4C4C4',
    },
    activeUnderline: {
        backgroundColor: '#02743F',
    },
});
