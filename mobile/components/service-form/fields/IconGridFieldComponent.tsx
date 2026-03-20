import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import type { IconGridField } from '@/types/serviceForm';
import { getIcon } from '@/components/sdui/SDUIRenderer';
import { Colors, Fonts } from '@/constants/theme';

interface Props {
  field: IconGridField;
  value: string;
  onChange: (value: string) => void;
}

export default function IconGridFieldComponent({ field, value, onChange }: Props) {
  const options = [...field.options]
    .filter(o => o.visible !== false)
    .sort((a, b) => a.sort_order - b.sort_order);
  const columns = field.columns || 4;

  // Pad to fill last row
  const padded = [...options];
  while (padded.length % columns !== 0) {
    padded.push({ id: `_pad_${padded.length}`, label: '', sort_order: 999 });
  }

  const rows: typeof padded[] = [];
  for (let i = 0; i < padded.length; i += columns) {
    rows.push(padded.slice(i, i + columns));
  }

  return (
    <View>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map(opt => {
            if (opt.id.startsWith('_pad_')) {
              return <View key={opt.id} style={styles.cell} />;
            }
            const selected = value === opt.id;
            const iconSource = opt.icon_key ? getIcon(opt.icon_key) : null;
            const imageUri = opt.image_url;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.cell, styles.cellTouchable, selected && styles.cellSelected]}
                onPress={() => onChange(opt.id)}
                activeOpacity={0.7}
              >
                {(iconSource || imageUri) && (
                  <Image
                    source={imageUri ? { uri: imageUri } : iconSource}
                    style={styles.icon}
                    resizeMode="contain"
                  />
                )}
                <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={2}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cellTouchable: {
    backgroundColor: 'rgba(222,222,222,0.43)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cellSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(4, 131, 87, 0.1)',
  },
  icon: {
    width: '100%',
    height: 60,
    marginBottom: 6,
  },
  label: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: '#555555',
    textAlign: 'center',
    letterSpacing: -0.24,
  },
  labelSelected: {
    color: Colors.primary,
    fontFamily: Fonts.medium,
  },
});
