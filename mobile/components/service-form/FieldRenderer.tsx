import React from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import type { FormField, FormState, RadioField, DropdownField } from '@/types/serviceForm';
import { Fonts, FontSize, Colors } from '@/constants/theme';

import RadioFieldComponent from './fields/RadioFieldComponent';
import CheckboxFieldComponent from './fields/CheckboxFieldComponent';
import PillSelectFieldComponent from './fields/PillSelectFieldComponent';
import IconGridFieldComponent from './fields/IconGridFieldComponent';
import TextInputFieldComponent from './fields/TextInputFieldComponent';
import TextAreaFieldComponent from './fields/TextAreaFieldComponent';
import DateTimeFieldComponent from './fields/DateTimeFieldComponent';
import ImageUploadFieldComponent from './fields/ImageUploadFieldComponent';
import StepperFieldComponent from './fields/StepperFieldComponent';
import ModeCardFieldComponent from './fields/ModeCardFieldComponent';
import ToggleFieldComponent from './fields/ToggleFieldComponent';
import DropdownFieldComponent from './fields/DropdownFieldComponent';
import InfoBannerComponent from './fields/InfoBannerComponent';

interface Props {
  field: FormField;
  formState: FormState;
  onFieldChange: (fieldId: string, value: any) => void;
}

export default function FieldRenderer({ field, formState, onFieldChange }: Props) {
  const value = formState[field.id];

  const handleChange = (newValue: any) => {
    onFieldChange(field.id, newValue);

    // Handle alert_on_select for radio/dropdown
    if (field.type === 'radio' || field.type === 'dropdown') {
      const alertConfig = (field as RadioField | DropdownField).alert_on_select;
      if (alertConfig) {
        const triggers = alertConfig.trigger_values;
        if (!triggers || triggers.includes(newValue)) {
          Alert.alert(alertConfig.title, alertConfig.message);
        }
      }
    }
  };

  const renderField = () => {
    switch (field.type) {
      case 'radio':
        return <RadioFieldComponent field={field} value={value || ''} onChange={handleChange} />;
      case 'checkbox':
        return <CheckboxFieldComponent field={field} value={value || []} onChange={handleChange} />;
      case 'pill_select':
        return <PillSelectFieldComponent field={field} value={value || (field.multi_select ? [] : '')} onChange={handleChange} />;
      case 'icon_grid':
        return <IconGridFieldComponent field={field} value={value || ''} onChange={handleChange} />;
      case 'text_input':
        return <TextInputFieldComponent field={field} value={value || ''} onChange={handleChange} />;
      case 'textarea':
        return <TextAreaFieldComponent field={field} value={value || ''} onChange={handleChange} />;
      case 'datetime':
        return <DateTimeFieldComponent field={field} value={value} onChange={handleChange} />;
      case 'image_upload':
        return <ImageUploadFieldComponent field={field} value={value || []} onChange={handleChange} />;
      case 'stepper':
        return <StepperFieldComponent field={field} value={value ?? field.default_value ?? field.min ?? 1} onChange={handleChange} />;
      case 'mode_card':
        return <ModeCardFieldComponent field={field} value={value || ''} onChange={handleChange} />;
      case 'toggle':
        return <ToggleFieldComponent field={field} value={!!value} onChange={handleChange} />;
      case 'dropdown':
        return <DropdownFieldComponent field={field} value={value || ''} onChange={handleChange} />;
      case 'info_banner':
        return <InfoBannerComponent field={field} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.fieldContainer}>
      {field.label && field.type !== 'info_banner' && field.type !== 'toggle' && field.type !== 'datetime' && (
        <Text style={styles.fieldLabel}>{field.label}</Text>
      )}
      {renderField()}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.body,
    color: Colors.textDark,
    marginBottom: 10,
    letterSpacing: -0.24,
  },
});
