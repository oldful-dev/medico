// Home Screen — Server-Driven UI
// All service grids, sections, labels and feature flags come from AppConfigContext.
// The screen owns layout/styling; the SDUI config owns content/visibility/order.
import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { locationService } from '@/services/device/locationService';
import { useUser } from '@/context/UserContext';
import { useAppConfig } from '@/context/AppConfigContext';
import { SectionRenderer } from '@/components/sdui/SDUIRenderer';
import { sduiService } from '@/services/firebase/sduiService';

// ─── Static Assets (layout-level, not SDUI-controlled) ───────────────────────
const logoSmall    = require('@/assets/images/9d3e74b5e16af4e10bcec4b72af07a9d93ea14b8.png');
const greetingBanner = { uri: 'https://storage.googleapis.com/oldful-assets/mobile/assets/images/welcome_banner.png' };

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { profile } = useUser();
  const { homeSections, flags } = useAppConfig();

  const [currentLocationStr, setCurrentLocationStr] = React.useState('Loading...');

  // Init Firebase Remote Config + location on mount
  React.useEffect(() => {
    (async () => {
      await sduiService.init();

      try {
        const hasPermission = await locationService.requestPermission();
        if (hasPermission) {
          const coords = await locationService.getCurrentLocation();
          const results = await require('expo-location').reverseGeocodeAsync({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
          if (results.length > 0) {
            const place = results[0];
            setCurrentLocationStr(place.city || place.subregion || place.region || 'Unknown');
          } else {
            setCurrentLocationStr('Unknown');
          }
        } else {
          setCurrentLocationStr('Location Required');
        }
      } catch {
        setCurrentLocationStr('Location Required');
      }
    })();
  }, []);

  // ── Pre-calculated pixel dimensions (prevents sub-pixel wrapping on iOS) ──
  const availableWidth = width - 60;
  const itemWidth        = Math.floor(availableWidth * 0.315);
  const imageHeight      = Math.floor(itemWidth * 0.85);
  const itemHeight       = imageHeight + 56;
  const essentialItemWidth  = Math.floor(availableWidth * 0.23);
  const essentialItemHeight = Math.floor(essentialItemWidth * 1.35);

  // ── Greeting ──────────────────────────────────────────────────────────────
  const userName    = profile?.name?.split(' ')[0] ?? 'there';
  const currentHour = new Date().getHours();
  const greeting    = currentHour >= 16 ? 'Good Evening' : currentHour >= 12 ? 'Good Afternoon' : 'Good Morning';

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      {/* ══ Fixed Header ══ */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Image source={logoSmall} style={styles.logoSmall} resizeMode="contain" />
          <TouchableOpacity style={styles.locationPill}>
            <Ionicons name="location-outline" size={14} color="#2F2F2F" />
            <Text style={styles.locationText} numberOfLines={1}>{currentLocationStr}</Text>
          </TouchableOpacity>
          <View style={styles.headerRight}>
            {flags.sos_enabled && (
              <TouchableOpacity style={styles.sosTag} onPress={() => router.push('/sos-emergency')}>
                <Text style={styles.sosTagText}>SOS</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => router.push('/search')}>
              <Ionicons name="search-outline" size={22} color="#2F2F2F" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={22} color="#2F2F2F" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* ══ Scrollable Content ══ */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting Banner */}
        <ImageBackground source={greetingBanner} style={styles.greetingBanner} resizeMode="cover">
          <Text style={styles.greetingTitle}>{greeting}, {userName}</Text>
        </ImageBackground>

        {/* SDUI Sections — render in sort_order, skip hidden sections */}
        {homeSections.map(section => (
          <SectionRenderer
            key={section.id}
            section={section}
            itemWidth={itemWidth}
            itemHeight={itemHeight}
            imageHeight={imageHeight}
            essentialItemWidth={essentialItemWidth}
            essentialItemHeight={essentialItemHeight}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bgScreen },

  headerSafe: {
    backgroundColor: Colors.bgHeader,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
    ...Shadow.header,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, paddingTop: Spacing.md,
  },
  logoSmall:   { width: 42, height: 32 },
  locationPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.sm, flex: 1, gap: 6,
  },
  locationText: { fontFamily: Fonts.regular, fontSize: FontSize.bodySmall, color: Colors.textBody, textAlign: 'center' },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sosTag: {
    backgroundColor: Colors.sosRed, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm,
  },
  sosTagText: { fontFamily: Fonts.bold, fontSize: FontSize.caption, color: Colors.textWhite },

  scrollView:    { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  greetingBanner: { height: 117, width: 'auto', justifyContent: 'center', paddingHorizontal: Spacing.lg },
  greetingTitle:  { fontFamily: Fonts.bold, fontSize: FontSize.heading2, color: Colors.textWhite },
});
