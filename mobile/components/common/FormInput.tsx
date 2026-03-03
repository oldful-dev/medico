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
}: FormInputProps) {
    return (
        <View style={[styles.container, style]}>
            {prefix ? (
                <Text style={styles.prefix}>{prefix}</Text>
            ) : null}
            <TextInput
                style={[styles.input, { fontSize }]}
                placeholder={placeholder}
                placeholderTextColor="rgba(2, 116, 63, 0.49)"
                editable={editable}
                keyboardType={keyboardType}
                value={value}
                onChangeText={onChangeText}
            />
            {showChevron ? (
                <Ionicons name="chevron-down" size={14} color="rgba(2, 116, 63, 0.49)" style={styles.chevron} />
            ) : null}
            {suffix}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 55,
        borderWidth: 1,
        borderColor: '#02743F',
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        backgroundColor: 'transparent',
        // Figma shadow: 0px 4px 10px rgba(0,0,0,0.25)
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 4,
    },
    prefix: {
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontWeight: '600',
        fontSize: 12,
        color: '#555555',
        marginRight: 6,
    },
    input: {
        flex: 1,
        fontFamily: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
        fontWeight: '600',
        color: '#02743F',
        height: '100%',
    },
    chevron: {
        marginLeft: 4,
    },
});
