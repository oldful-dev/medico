import React from 'react';
import HomeEssentialsBookingScreen from '@/components/services/HomeEssentialsBookingScreen';

export default function PlumbingElectricalScreen() {
  // Real DB slug is "plumbing" — this screen previously used
  // "plumbing-electrical", which had no matching Service row, so
  // getServiceBySlug() always returned undefined and every booking
  // attempt failed with "Service initialization incomplete."
  return <HomeEssentialsBookingScreen slug="plumbing" />;
}
