import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { FormSection, FormField, FormState, VisibilityRule } from '@/types/serviceForm';
import FieldRenderer from './FieldRenderer';
import { Colors, Fonts, FontSize, Radius, Shadow } from '@/constants/theme';

interface Props {
  sections: FormSection[];
  formState: FormState;
  onFieldChange: (fieldId: string, value: any) => void;
}

function evaluateVisibility(rule: VisibilityRule | undefined, formState: FormState): boolean {
  if (!rule) return true;

  const fieldValue = formState[rule.field_id];

  switch (rule.operator) {
    case 'eq':
      return fieldValue === rule.value;
    case 'neq':
      return fieldValue !== rule.value;
    case 'in':
      return Array.isArray(rule.value) && rule.value.includes(fieldValue);
    case 'not_in':
      return Array.isArray(rule.value) && !rule.value.includes(fieldValue);
    case 'gt':
      return typeof fieldValue === 'number' && fieldValue > (rule.value as number);
    case 'lt':
      return typeof fieldValue === 'number' && fieldValue < (rule.value as number);
    case 'contains':
      if (Array.isArray(fieldValue)) return fieldValue.includes(rule.value);
      if (typeof fieldValue === 'string') return fieldValue.includes(String(rule.value));
      return false;
    default:
      return true;
  }
}

const CARD_STYLES: Record<string, object> = {
  default: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: 18,
    paddingVertical: 20,
    marginBottom: 15,
    ...Shadow.card,
  },
  muted: {
    backgroundColor: 'rgba(237,237,237,0.57)',
    borderRadius: 9,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  tinted: {
    backgroundColor: 'rgba(255, 253, 253, 0.26)',
    borderWidth: 1,
    borderColor: '#EDEDED',
    borderRadius: 9,
    padding: 16,
    marginBottom: 20,
  },
  none: {
    marginBottom: 16,
  },
};

export default function DynamicFormRenderer({ sections, formState, onFieldChange }: Props) {
  const sortedSections = [...sections].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <View>
      {sortedSections.map(section => {
        if (!evaluateVisibility(section.visible_when, formState)) return null;

        const visibleFields = section.fields.filter(
          (f: FormField) => evaluateVisibility(f.visible_when, formState)
        );

        if (visibleFields.length === 0) return null;

        const cardStyle = CARD_STYLES[section.card_style || 'none'] || CARD_STYLES.none;

        return (
          <View key={section.id} style={cardStyle}>
            {section.title ? (
              <Text style={styles.sectionTitle}>{section.title}</Text>
            ) : null}
            {section.description ? (
              <Text style={styles.sectionDesc}>{section.description}</Text>
            ) : null}
            {visibleFields.map((field: FormField) => (
              <FieldRenderer
                key={field.id}
                field={field}
                formState={formState}
                onFieldChange={onFieldChange}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSize.heading3,
    color: Colors.textDark,
    marginBottom: 12,
    letterSpacing: -0.24,
  },
  sectionDesc: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.bodySmall,
    color: Colors.textMuted,
    marginBottom: 12,
  },
});
