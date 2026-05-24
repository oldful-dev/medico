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
    autoFocus?: boolean;
    onComplete?: (otp: string) => void;
    onChange?: (otp: string) => void;
    otpRef?: React.RefObject<OTPInputRef | null>;
}

export default function OTPInput({
    length = 4,
    disabled = false,
    autoFocus = true,
    onComplete,
    onChange,
    otpRef
}: OTPInputProps) {
    const [otp, setOtp] = useState('');
    const inputRef = useRef<TextInput>(null);

    useImperativeHandle(otpRef, () => ({
        clear: () => { setOtp(''); },
        focus: () => { inputRef.current?.focus(); },
    }), []);

    // Focus the hidden input on mount so keyboard appears and SMS auto-fill triggers
    useEffect(() => {
        if (autoFocus && !disabled) {
            const t = setTimeout(() => inputRef.current?.focus(), 100);
            return () => clearTimeout(t);
        }
    }, [autoFocus, disabled]);

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

    const handlePress = () => { inputRef.current?.focus(); };

    return (
        <View style={styles.container}>
            {/*
             * Off-screen TextInput — not opacity:0/size:1 which breaks Android auto-fill
             * suggestion bar. Positioned absolutely off the left edge so it exists in the
             * layout but is visually hidden. textContentType + autoComplete wire iOS/Android
             * native OTP auto-fill (SMS Retriever on Android, QuickType on iOS).
             */}
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
                autoFocus={autoFocus && !disabled}
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
        left: -9999,
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
