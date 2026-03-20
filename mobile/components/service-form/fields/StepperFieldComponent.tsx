import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StepperField } from '@/types/serviceForm';
import { Fonts, FontSize } from '@/constants/theme';

interface Props {
  field: StepperField;
  value: number;
  onChange: (value: number) => void;
}

export default function StepperFieldComponent({ field, value, onChange }: Props) {
  const min = field.min ?? 1;
  const max = field.max ?? 99;
  const step = field.step ?? 1;
  const current = value ?? field.default_value ?? min;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => onChange(Math.max(min, current - step))}
      >
        <Ionicons name="remove" size={20} color="#555555" />
      </TouchableOpacity>
      <Text style={styles.value}>{current}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => onChange(Math.min(max, current + step))}
      >
        <Ionicons name="add" size={20} color="#555555" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  button: {
    padding: 5,
    backgroundColor: 'rgba(217, 217, 217, 0.3)',
    borderRadius: 8,
  },
  value: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.button,
    color: '#2F2F2F',
    marginHorizontal: 20,
  },
});
