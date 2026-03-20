import React from 'react';
import { View } from 'react-native';
import ImageUploadBox from '@/components/common/ImageUploadBox';
import type { ImageUploadField } from '@/types/serviceForm';

interface Props {
  field: ImageUploadField;
  value: string[];
  onChange: (value: string[]) => void;
}

export default function ImageUploadFieldComponent({ field, value, onChange }: Props) {
  return (
    <View>
      <ImageUploadBox
        title={field.title || 'Upload Photos'}
        subtitle={field.subtitle || 'JPG, PNG or PDF'}
        onImagesChange={onChange}
        maxImages={field.max_images || 5}
      />
    </View>
  );
}
