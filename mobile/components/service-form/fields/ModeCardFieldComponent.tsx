import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ModeCardField } from '@/types/serviceForm';
import { Colors, Fonts, FontSize, Radius } from '@/constants/theme';

interface Props {
  field: ModeCardField;
  value: string;
  onChange: (value: string) => void;
}

export default function ModeCardFieldComponent({ field, value, onChange }: Props) {
  const options = [...field.options]
    .filter(o => o.visible !== false)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <View>
      {options.map(opt => {
        const selected = value === opt.id;
        return (
          <TouchableOpacity
            key={opt.id}
            style={[styles.card, selected && styles.cardSelected]}
            activeOpacity={0.7}
            onPress={() => onChange(opt.id)}
          >
            <View style={[styles.radioCircle, selected && styles.radioCircleSelected]} />
            <View style={styles.textGroup}>
              <Text style={styles.title}>{opt.label}</Text>
              {opt.sub_label ? <Text style={styles.subtitle}>{opt.sub_label}</Text> : null}
            </View>
            {opt.price ? <Text style={styles.price}>{opt.price}</Text> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(4, 131, 87, 0.05)',
    borderWidth: 1.5,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.textLight,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: Colors.primary,
    borderWidth: 6,
  },
  textGroup: { flex: 1 },
  title: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.body,
    color: Colors.textDark,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.bodySmall,
    color: Colors.textMuted,
    marginTop: 2,
  },
  price: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSize.heading2,
    color: Colors.primary,
  },
});
