import React from 'react';
import { View } from 'react-native';
import DateTimePickerInput from '@/components/common/DateTimePickerInput';
import type { DateTimeField } from '@/types/serviceForm';

interface Props {
  field: DateTimeField;
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
}

export default function DateTimeFieldComponent({ field, value, onChange }: Props) {
  return (
    <View>
      <DateTimePickerInput
        label={field.label || 'Select Date & Time'}
        value={value}
        onDateChange={onChange}
      />
    </View>
  );
}
