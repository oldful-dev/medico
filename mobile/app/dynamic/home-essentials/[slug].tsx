import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import HomeEssentialsBookingScreen from '@/components/services/HomeEssentialsBookingScreen';

export default function DynamicBookingScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <HomeEssentialsBookingScreen slug={slug || ""} />;
}
