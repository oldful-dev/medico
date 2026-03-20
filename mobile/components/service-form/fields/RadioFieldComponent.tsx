import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RadioField, FieldOption } from '@/types/serviceForm';
import { getIcon } from '@/components/sdui/SDUIRenderer';
import { Colors, Fonts, FontSize, Radius } from '@/constants/theme';

interface Props {
  field: RadioField;
  value: string;
  onChange: (value: string) => void;
}

export default function RadioFieldComponent({ field, value, onChange }: Props) {
  const options = [...field.options]
    .filter(o => o.visible !== false)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (field.display === 'row') return <RowRadio options={options} value={value} onChange={onChange} />;
  if (field.display === 'card') return <CardRadio options={options} value={value} onChange={onChange} />;
  return <StackedRadio options={options} value={value} onChange={onChange} />;
}

// ─── Stacked (vertical list with radio buttons) ───
function StackedRadio({ options, value, onChange }: { options: FieldOption[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.stackedContainer}>
      {options.map(opt => {
        const selected = value === opt.id;
        return (
          <TouchableOpacity key={opt.id} style={styles.stackedRow} onPress={() => onChange(opt.id)}>
            <Ionicons
              name={selected ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={selected ? Colors.primary : Colors.textLight}
            />
            <View style={styles.stackedTextCol}>
              <Text style={styles.stackedLabel}>{opt.label}</Text>
              {opt.sub_label ? <Text style={styles.stackedSub}>{opt.sub_label}</Text> : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Row (horizontal pill-like buttons) ───
function RowRadio({ options, value, onChange }: { options: FieldOption[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.rowContainer}>
      {options.map(opt => {
        const selected = value === opt.id;
        const iconSource = opt.icon_key ? getIcon(opt.icon_key) : null;
        return (
          <TouchableOpacity
            key={opt.id}
            style={[styles.rowButton, selected && styles.rowButtonActive]}
            onPress={() => onChange(opt.id)}
          >
            {selected && <Ionicons name="checkbox" size={16} color={Colors.primary} style={{ marginRight: 4 }} />}
            {!selected && iconSource && <Image source={iconSource} style={styles.rowIcon} resizeMode="contain" />}
            <Text style={styles.rowButtonText}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Card (large cards with image/icon, title, subtitle) ───
function CardRadio({ options, value, onChange }: { options: FieldOption[]; value: string; onChange: (v: string) => void }) {
  return (
    <View>
      {options.map(opt => {
        const selected = value === opt.id;
        const iconSource = opt.icon_key ? getIcon(opt.icon_key) : null;
        const imageUri = opt.image_url;
        return (
          <TouchableOpacity
            key={opt.id}
            style={[
              styles.cardContainer,
              selected && styles.cardContainerActive,
              opt.bg_color ? { backgroundColor: opt.bg_color } : null,
              opt.border_color ? { borderColor: opt.border_color } : null,
            ]}
            activeOpacity={0.8}
            onPress={() => onChange(opt.id)}
          >
            {(iconSource || imageUri) && (
              <View style={styles.cardAvatarContainer}>
                <Image
                  source={imageUri ? { uri: imageUri } : iconSource}
                  style={styles.cardAvatar}
                  resizeMode="contain"
                />
              </View>
            )}
            <View style={styles.cardInfo}>
              <Text style={[styles.cardTitle, selected && styles.cardTitleActive]}>{opt.label}</Text>
              {opt.sub_label ? (
                <Text style={[styles.cardSubtitle, selected && styles.cardSubtitleActive]}>{opt.sub_label}</Text>
              ) : null}
              {opt.description ? (
                <Text style={[styles.cardDesc, selected && styles.cardSubtitleActive]}>{opt.description}</Text>
              ) : null}
            </View>
            {opt.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{opt.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // ─── Stacked ───
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
  stackedTextCol: { marginLeft: 12, flexShrink: 1, flex: 1 },
  stackedLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.body,
    color: Colors.textBody,
  },
  stackedSub: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: Colors.textBody,
    marginTop: 2,
  },

  // ─── Row ───
  rowContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  rowButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 33,
    borderRadius: 7,
    marginHorizontal: 4,
  },
  rowButtonActive: {
    backgroundColor: 'rgba(115,219,171,0.29)',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  rowIcon: { width: 14, height: 14, marginRight: 4 },
  rowButtonText: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: Colors.textBody,
    letterSpacing: -0.24,
  },

  // ─── Card ───
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.textLight,
    borderRadius: 9,
    height: 90,
    paddingHorizontal: 16,
    marginBottom: 12,
    position: 'relative',
  },
  cardContainerActive: {
    backgroundColor: 'rgba(4,131,87,0.43)',
    borderWidth: 1.5,
    borderColor: '#0E9757',
  },
  cardAvatarContainer: { marginRight: 12 },
  cardAvatar: { width: 60, height: 80 },
  cardInfo: { flex: 1, justifyContent: 'center' },
  cardTitle: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    color: '#555555',
    marginBottom: 4,
    letterSpacing: -0.24,
    flexShrink: 1,
  },
  cardTitleActive: { color: '#FFFFFF' },
  cardSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 10,
    color: '#555555',
    lineHeight: 12,
    letterSpacing: -0.24,
    flexShrink: 1,
  },
  cardSubtitleActive: { color: '#FFFFFF' },
  cardDesc: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: '#777777',
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(15, 185, 46, 0.7)',
    borderColor: Colors.primary,
    borderWidth: 1,
    borderRadius: 23,
    paddingHorizontal: 12,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: Fonts.regular,
    color: '#FFFFFF',
    fontSize: 11,
  },
});
