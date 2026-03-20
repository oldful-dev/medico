import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import type { TextAreaField } from '@/types/serviceForm';
import { Colors, Fonts, FontSize, Radius } from '@/constants/theme';

interface Props {
  field: TextAreaField;
  value: string;
  onChange: (value: string) => void;
}

export default function TextAreaFieldComponent({ field, value, onChange }: Props) {
  return (
    <View style={[styles.container, field.min_height ? { minHeight: field.min_height } : null]}>
      <TextInput
        style={styles.input}
        placeholder={field.placeholder || 'Describe your issue...'}
        placeholderTextColor="#898989"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        value={value || ''}
        onChangeText={onChange}
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
    padding: 10,
    minHeight: 100,
  },
  input: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.body,
    color: Colors.textDark,
    flex: 1,
  },
});
