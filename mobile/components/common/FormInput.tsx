// FormInput — Reusable green-bordered input field
// Figma: border 1px #02743F, border-radius 10, shadow 0 4 10 rgba(0,0,0,0.25), height 55
// Placeholder: Lexend Deca SemiBold 14px, #02743F at 49% opacity
import React from 'react';
import { View, TextInput, Text, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FormInputProps {
    placeholder: string;
    prefix?: string;
    suffix?: React.ReactNode;
    showChevron?: boolean;
    style?: StyleProp<ViewStyle>;
    editable?: boolean;
    keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'numeric';
    fontSize?: number;
    value?: string;
    onChangeText?: (text: string) => void;
    multiline?: boolean;
    maxLength?: number;
    autoFocus?: boolean;
    isDarkMode?: boolean;
}

export default function FormInput({
    placeholder,
    prefix,
    suffix,
    showChevron = false,
    style,
    editable = true,
    keyboardType = 'default',
    fontSize = 14,
    value,
    onChangeText,
    multiline = false,
    maxLength,
    autoFocus = false,
    isDarkMode = false,
}: FormInputProps) {
    const themedStyles = makeStyles(isDarkMode);
    return (
        <View style={[themedStyles.container, style]}>
            {prefix ? (
                <Text style={themedStyles.prefix}>{prefix}</Text>
            ) : null}
            <TextInput
                style={[themedStyles.input, { fontSize }, multiline && { textAlignVertical: 'top', paddingTop: 10 }]}
                placeholder={placeholder}
                placeholderTextColor={isDarkMode ? 'rgba(148, 163, 184, 0.7)' : 'rgba(2, 116, 63, 0.49)'}
                editable={editable}
                keyboardType={keyboardType}
                value={value}
                onChangeText={onChangeText}
                multiline={multiline}
                maxLength={maxLength}
                autoFocus={autoFocus}
            />
            {showChevron ? (
                <Ionicons name="chevron-down" size={14} color={isDarkMode ? '#94A3B8' : 'rgba(2, 116, 63, 0.49)'} style={themedStyles.chevron} />
            ) : null}
            {suffix}
        </View>
    );
}

const makeStyles = (isDarkMode: boolean) => StyleSheet.create({
    container: {
        minHeight: 55,
        borderWidth: 1,
        borderColor: '#02743F',
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        // A transparent background with the Figma-spec shadow rendered as a
        // dark halo/double-box around the field on the app's cream/off-white
        // screens (only real usage today: medical-tourism/index.tsx) — a
        // solid surface plus a much softer shadow reads as normal elevation.
        backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDarkMode ? 0 : 0.08,
        shadowRadius: 4,
        elevation: isDarkMode ? 0 : 2,
    },
    prefix: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontWeight: '600',
        fontSize: 12,
        color: isDarkMode ? '#94A3B8' : '#555555',
        marginRight: 6,
    },
    input: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontWeight: '600',
        color: isDarkMode ? '#F1F5F9' : '#02743F',
        height: '100%',
    },
    chevron: {
        marginLeft: 4,
    },
});
