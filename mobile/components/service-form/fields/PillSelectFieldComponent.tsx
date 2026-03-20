import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { PillSelectField } from '@/types/serviceForm';
import { Colors, Fonts } from '@/constants/theme';

interface Props {
  field: PillSelectField;
  value: string | string[];
  onChange: (value: string | string[]) => void;
}

export default function PillSelectFieldComponent({ field, value, onChange }: Props) {
  const options = [...field.options]
    .filter(o => o.visible !== false)
    .sort((a, b) => a.sort_order - b.sort_order);

  const selectedArr = Array.isArray(value) ? value : value ? [value] : [];

  const toggle = (id: string) => {
    if (field.multi_select) {
      const next = selectedArr.includes(id)
        ? selectedArr.filter(v => v !== id)
        : [...selectedArr, id];
      onChange(next);
    } else {
      onChange(id);
    }
  };

  return (
    <View style={styles.grid}>
      {options.map(opt => {
        const selected = selectedArr.includes(opt.id);
        return (
          <TouchableOpacity
            key={opt.id}
            style={[styles.pill, selected && styles.pillSelected]}
            onPress={() => toggle(opt.id)}
          >
            <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    height: 35,
    flex: 1,
    minWidth: '28%',
    borderRadius: 23,
    borderWidth: 1,
    borderColor: Colors.textLight,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  pillSelected: {
    backgroundColor: 'rgba(4, 131, 87, 0.74)',
    borderColor: Colors.primary,
  },
  pillText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: '#555555',
  },
  pillTextSelected: {
    color: '#FFFFFF',
  },
});
