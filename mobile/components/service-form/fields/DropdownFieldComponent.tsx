import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DropdownField, FieldOption } from '@/types/serviceForm';
import { Colors, Fonts, FontSize, Radius } from '@/constants/theme';

interface Props {
  field: DropdownField;
  value: string;
  onChange: (value: string) => void;
}

export default function DropdownFieldComponent({ field, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const options = [...field.options]
    .filter(o => o.visible !== false)
    .sort((a, b) => a.sort_order - b.sort_order);

  const selectedOption = options.find(o => o.id === value);
  const displayLabel = selectedOption?.label || field.placeholder || 'Select...';

  const handleSelect = (opt: FieldOption) => {
    onChange(opt.id);
    setOpen(false);
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.input} activeOpacity={0.7} onPress={() => setOpen(true)}>
        <Text style={[styles.value, !selectedOption && styles.placeholder]}>{displayLabel}</Text>
        <Ionicons name="chevron-down" size={16} color={Colors.textLight} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.dropdown}>
            <Text style={styles.dropdownTitle}>{field.label || 'Select'}</Text>
            <FlatList
              data={options}
              keyExtractor={o => o.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, item.id === value && styles.optionSelected]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={[styles.optionText, item.id === value && styles.optionTextSelected]}>
                    {item.label}
                  </Text>
                  {item.sub_label ? <Text style={styles.optionSub}>{item.sub_label}</Text> : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  input: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.textLight,
    borderRadius: Radius.sm,
    height: 40,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  value: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.body,
    color: Colors.textDark,
  },
  placeholder: {
    color: Colors.textLight,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    maxHeight: 350,
    padding: 16,
  },
  dropdownTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSize.heading3,
    color: Colors.textDark,
    marginBottom: 12,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  optionSelected: {
    backgroundColor: 'rgba(4, 131, 87, 0.08)',
  },
  optionText: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.body,
    color: Colors.textDark,
  },
  optionTextSelected: {
    color: Colors.primary,
  },
  optionSub: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.bodySmall,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
