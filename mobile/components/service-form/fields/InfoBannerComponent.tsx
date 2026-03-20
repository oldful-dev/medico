import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import type { InfoBannerField } from '@/types/serviceForm';
import { getIcon } from '@/components/sdui/SDUIRenderer';
import { Fonts } from '@/constants/theme';

interface Props {
  field: InfoBannerField;
}

export default function InfoBannerComponent({ field }: Props) {
  const iconSource = field.icon_key ? getIcon(field.icon_key) : null;
  const imageUri = field.image_url;

  return (
    <View style={[styles.banner, field.bg_color ? { backgroundColor: field.bg_color } : null]}>
      {(iconSource || imageUri) && (
        <Image
          source={imageUri ? { uri: imageUri } : iconSource}
          style={styles.icon}
          resizeMode="contain"
        />
      )}
      <View style={styles.textGroup}>
        <Text style={[styles.title, field.text_color ? { color: field.text_color } : null]}>
          {field.title}
        </Text>
        {field.subtitle ? (
          <Text style={styles.subtitle}>{field.subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(243,223,255,0.41)',
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
  },
  icon: {
    width: 32,
    height: 38,
    marginRight: 10,
  },
  textGroup: { flex: 1 },
  title: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: '#555555',
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: 'rgba(98,15,126,0.75)',
  },
});
