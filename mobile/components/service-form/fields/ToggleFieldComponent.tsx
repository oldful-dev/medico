import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import type { ToggleField } from '@/types/serviceForm';
import { Colors, Fonts, FontSize } from '@/constants/theme';

interface Props {
  field: ToggleField;
  value: boolean;
  onChange: (value: boolean) => void;
}

export default function ToggleFieldComponent({ field, value, onChange }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.textGroup}>
        {field.label ? <Text style={styles.label}>{field.label}</Text> : null}
        {field.description ? <Text style={styles.description}>{field.description}</Text> : null}
      </View>
      <Switch
        value={!!value}
        onValueChange={onChange}
        trackColor={{ false: '#D9D9D9', true: 'rgba(4, 131, 87, 0.4)' }}
        thumbColor={value ? Colors.primary : '#f4f3f4'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  textGroup: { flex: 1, marginRight: 16 },
  label: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.body,
    color: Colors.textDark,
  },
  description: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.bodySmall,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
