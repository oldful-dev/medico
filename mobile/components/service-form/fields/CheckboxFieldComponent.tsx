import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CheckboxField } from '@/types/serviceForm';
import { Colors, Fonts, FontSize, Radius, Shadow } from '@/constants/theme';

interface Props {
  field: CheckboxField;
  value: string[];
  onChange: (value: string[]) => void;
}

export default function CheckboxFieldComponent({ field, value = [], onChange }: Props) {
  const options = [...field.options]
    .filter(o => o.visible !== false)
    .sort((a, b) => a.sort_order - b.sort_order);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
  };

  if (field.display === 'card') {
    return (
      <View>
        {options.map(opt => {
          const selected = value.includes(opt.id);
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.card, selected && styles.cardSelected]}
              activeOpacity={0.7}
              onPress={() => toggle(opt.id)}
            >
              <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                {selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <View style={styles.textGroup}>
                <Text style={[styles.title, selected && styles.titleSelected]}>{opt.label}</Text>
                {opt.sub_label ? <Text style={styles.subtitle}>{opt.sub_label}</Text> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // Stacked (default)
  return (
    <View style={styles.stackedContainer}>
      {options.map(opt => {
        const selected = value.includes(opt.id);
        return (
          <TouchableOpacity
            key={opt.id}
            style={styles.stackedRow}
            activeOpacity={0.7}
            onPress={() => toggle(opt.id)}
          >
            <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
              {selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.stackedLabel}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Card display
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.card,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(4, 131, 87, 0.05)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.textLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  textGroup: { flex: 1 },
  title: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.body,
    color: Colors.textDark,
  },
  titleSelected: { color: Colors.primary },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.bodySmall,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Stacked display
  stackedContainer: { gap: 12 },
  stackedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.textLight,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  stackedLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.body,
    color: Colors.textBody,
    marginLeft: 12,
  },
});
