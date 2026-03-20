import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import type { TextInputField } from '@/types/serviceForm';
import { Colors, Fonts, FontSize, Radius } from '@/constants/theme';

interface Props {
  field: TextInputField;
  value: string;
  onChange: (value: string) => void;
}

const KEYBOARD_MAP: Record<string, any> = {
  numeric: 'numeric',
  email: 'email-address',
  phone: 'phone-pad',
  default: 'default',
};

export default function TextInputFieldComponent({ field, value, onChange }: Props) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={field.placeholder || ''}
        placeholderTextColor="#898989"
        value={value || ''}
        onChangeText={onChange}
        keyboardType={KEYBOARD_MAP[field.keyboard_type || 'default'] || 'default'}
        maxLength={field.max_length}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    height: 40,
    justifyContent: 'center',
  },
  input: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.body,
    color: Colors.textDark,
  },
});
