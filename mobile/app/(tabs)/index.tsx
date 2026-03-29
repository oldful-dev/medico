// Home Screen — Server-Driven UI via Firebase Remote Config
//
// Layout is 100% driven by sduiService.getHomeConfig():
//   • Banners, sections, services, trust badges, SOS banner
//   • All images served from Cloudflare CDN via getAssetUrl()
//   • Admin toggles services ON/OFF, swaps banners, updates labels in Firebase
//     Console → Remote Config → home_config → Publish (no app update needed)
//
// Service screen routing uses Expo Router push() — screens are static,
// only the listing/visibility is dynamic.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { locationService } from '@/services/device/locationService';
import { useUser } from '@/context/UserContext';
import { sduiService, HomeConfig, HomeSection, HomeBanner } from '@/services/firebase/sduiService';
import { getAssetUrl } from '@/utils/getAssetUrl';

// ─── Logo (only static asset — not content-driven) ───────────────────────────
const logoSmall = require('@/assets/images/9d3e74b5e16af4e10bcec4b72af07a9d93ea14b8.png');

// ─── Section Renderers ────────────────────────────────────────────────────────

interface QuickServicesProps {
  section: HomeSection;
  itemWidth: number;
  cardHeight: number;
}

function QuickServicesStrip({ section }: QuickServicesProps) {
  const router = useRouter();
  return (
    <View style={styles.quickServiceCard}>
      {section.services.map(item => {
        const [line1, line2] = item.label.split('\n');
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.quickServiceBox}
            onPress={() => router.push(item.route as any)}
          >
            <Image
              source={{ uri: getAssetUrl(item.icon) }}
              style={styles.quickServiceIcon}
              resizeMode="contain"
            />
            <Text style={styles.quickServiceLabel}>{line1}</Text>
            {line2 ? <Text style={styles.quickServiceLabel}>{line2}</Text> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

interface ServiceGridProps {
  section: HomeSection;
  itemWidth: number;
  imageHeight: number;
  cardHeight: number;
}

function ServiceGrid({ section, itemWidth, imageHeight, cardHeight }: ServiceGridProps) {
  const router = useRouter();
  const items = section.max_items ? section.services.slice(0, section.max_items) : section.services;

  return (
    <View style={styles.servicesCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        {section.view_all_route && (
          <TouchableOpacity onPress={() => router.push(section.view_all_route as any)}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.serviceGrid}>
        {items.map(item => {
          const [line1, line2] = item.label.split('\n');
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.serviceGridItem, { width: itemWidth, height: cardHeight }]}
              onPress={() => router.push(item.route as any)}
            >
              <Image
                source={{ uri: getAssetUrl(item.icon) }}
                style={[styles.serviceGridImage, { width: itemWidth, height: imageHeight }]}
                resizeMode="cover"
              />
              <View style={styles.serviceGridLabelContainer}>
                <Text style={styles.serviceGridLabel}>{line1}</Text>
                {line2 ? <Text style={styles.serviceGridLabel}>{line2}</Text> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

interface EssentialsGridProps {
  section: HomeSection;
  itemWidth: number;
  cardHeight: number;
}

function EssentialsGrid({ section, itemWidth, cardHeight }: EssentialsGridProps) {
  const router = useRouter();
  const items = section.max_items ? section.services.slice(0, section.max_items) : section.services;

  // Split into rows of 4
  const rows: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += 4) {
    rows.push(items.slice(i, i + 4));
  }

  return (
    <View style={styles.essentialsCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.essentialsTitle}>{section.title}</Text>
        {section.view_all_route && (
          <TouchableOpacity onPress={() => router.push(section.view_all_route as any)}>
            <Text style={styles.viewAllSmall}>View All</Text>
          </TouchableOpacity>
        )}
      </View>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.essentialsRow}>
          {row.map(item => {
            const [line1, line2] = item.label.split('\n');
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.essentialItem, { width: itemWidth, height: cardHeight }]}
                onPress={() => router.push(item.route as any)}
              >
                <View style={styles.essentialIconCircle}>
                  <Image
                    source={{ uri: getAssetUrl(item.icon) }}
                    style={styles.essentialIcon}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.essentialLabel}>{line1}</Text>
                {line2 ? <Text style={styles.essentialLabel}>{line2}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { profile } = useUser();
  const [currentLocationStr, setCurrentLocationStr] = useState('Loading...');
  const [homeConfig, setHomeConfig] = useState<HomeConfig | null>(null);

  // ── Load Remote Config ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      await sduiService.init();
      setHomeConfig(sduiService.getHomeConfig());
    })();
  }, []);

  // ── Location ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (profile?.city?.name) {
      setCurrentLocationStr(profile.city.name);
      return;
    }
    (async () => {
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

  // ── Pixel math (prevents sub-pixel wrapping) ────────────────────────────
  const availableWidth = width - 60;
  const exactOldfulItemWidth = Math.floor(availableWidth * 0.315);
  const exactOldfulImageHeight = exactOldfulItemWidth * 0.85;
  const exactOldfulCardHeight = exactOldfulImageHeight + 56;
  const exactEssentialItemWidth = Math.floor(availableWidth * 0.23);
  const exactEssentialCardHeight = exactEssentialItemWidth * 1.35;

  // ── Dynamic greeting ────────────────────────────────────────────────────
  const userName = profile?.name?.split(' ')[0] || 'User';
  const currentHour = new Date().getHours();
  const greeting =
    currentHour >= 16 ? 'Good Evening' : currentHour >= 12 ? 'Good Afternoon' : 'Good Morning';

  // ── Loading state ───────────────────────────────────────────────────────
  if (!homeConfig) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const { banners, sections, trust_badges, sos_banner } = homeConfig;

  const activeBanner = banners[0]; // Show first enabled banner as hero

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      {/* ═══ FIXED HEADER ═══ */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Image source={logoSmall} style={styles.logoSmall} resizeMode="contain" />
          <TouchableOpacity style={styles.locationPill}>
            <Ionicons name="location-outline" size={14} color="#2F2F2F" />
            <Text style={styles.locationText} numberOfLines={1}>{currentLocationStr}</Text>
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.sosTag} onPress={() => router.push('/sos-emergency')}>
              <Text style={styles.sosTagText}>SOS</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={22} color="#2F2F2F" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* ═══ SCROLLABLE CONTENT ═══ */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Banner (Firebase-driven) ─── */}
        {activeBanner && (
          <TouchableOpacity
            activeOpacity={activeBanner.cta_route ? 0.85 : 1}
            onPress={() => activeBanner.cta_route && router.push(activeBanner.cta_route as any)}
            style={styles.greetingBannerWrapper}
          >
            <Image
              source={{ uri: getAssetUrl(activeBanner.image) }}
              style={styles.greetingBanner}
              resizeMode="cover"
            />
            <View style={styles.greetingOverlay}>
              <Text style={styles.greetingTitle}>{greeting}, {userName}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ─── Dynamic Sections ─── */}
        {sections.map(section => {
          if (section.type === 'quick_services') {
            return (
              <QuickServicesStrip
                key={section.id}
                section={section}
                itemWidth={exactEssentialItemWidth}
                cardHeight={exactEssentialCardHeight}
              />
            );
          }
          if (section.type === 'service_grid') {
            return (
              <ServiceGrid
                key={section.id}
                section={section}
                itemWidth={exactOldfulItemWidth}
                imageHeight={exactOldfulImageHeight}
                cardHeight={exactOldfulCardHeight}
              />
            );
          }
          if (section.type === 'essentials_grid') {
            return (
              <React.Fragment key={section.id}>
                {/* Trust Badges + SOS always render just before essentials */}
                {trust_badges.length > 0 && (
                  <View style={styles.trustCard}>
                    {trust_badges.map((badge, i) => (
                      <React.Fragment key={badge.id}>
                        <View style={styles.trustItem}>
                          <Image
                            source={{ uri: getAssetUrl(badge.icon) }}
                            style={styles.trustIcon}
                            resizeMode="contain"
                          />
                          <Text style={styles.trustLabel}>{badge.label}</Text>
                        </View>
                        {i < trust_badges.length - 1 && <View style={styles.trustDivider} />}
                      </React.Fragment>
                    ))}
                  </View>
                )}
                {sos_banner.enabled && (
                  <View style={styles.sosBanner}>
                    <View style={styles.sosContent}>
                      <Image
                        source={{ uri: getAssetUrl(sos_banner.icon) }}
                        style={styles.sosIcon}
                        resizeMode="contain"
                      />
                      <View style={styles.sosTextGroup}>
                        <Text style={styles.sosTitle}>{sos_banner.title_line1}</Text>
                        <Text style={styles.sosTitle}>{sos_banner.title_line2}</Text>
                        <TouchableOpacity
                          style={styles.sosButton}
                          onPress={() => router.push(sos_banner.cta_route as any)}
                        >
                          <Text style={styles.sosButtonText}>{sos_banner.cta_text}</Text>
                          <Ionicons name="arrow-forward" size={10} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Image
                      source={{ uri: getAssetUrl(sos_banner.illustration) }}
                      style={styles.sosIllustration}
                      resizeMode="contain"
                    />
                  </View>
                )}
                <EssentialsGrid
                  section={section}
                  itemWidth={exactEssentialItemWidth}
                  cardHeight={exactEssentialCardHeight}
                />
              </React.Fragment>
            );
          }
          return null;
        })}

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bgScreen,
  },

  /* Header */
  headerSafe: {
    backgroundColor: Colors.bgHeader,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
    ...Shadow.header,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.md,
  },
  logoSmall: {
    width: 42,
    height: 32,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.sm,
    flex: 1,
    gap: 6,
  },
  locationText: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.bodySmall,
    color: Colors.textBody,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sosTag: {
    backgroundColor: Colors.sosRed,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  sosTagText: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.caption,
    color: Colors.textWhite,
  },

  /* Scroll */
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  /* Hero Banner */
  greetingBannerWrapper: {
    height: 117,
    width: '100%',
  },
  greetingBanner: {
    height: 117,
    width: '100%',
  },
  greetingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 117,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  greetingTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.heading2,
    color: Colors.textWhite,
  },

  /* Quick Service Strip */
  quickServiceCard: {
    marginHorizontal: Spacing.cardMargin,
    marginTop: Spacing.sectionGap,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    ...Shadow.card,
  },
  quickServiceBox: {
    flex: 1,
    minHeight: 85,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgCardMuted,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.xs,
  },
  quickServiceIcon: {
    width: 44,
    height: 44,
    marginBottom: Spacing.xs,
  },
  quickServiceLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: Colors.primaryText,
    textAlign: 'center',
    lineHeight: 12,
  },

  /* Oldful Services Grid */
  servicesCard: {
    marginHorizontal: Spacing.cardMargin,
    marginTop: Spacing.sectionGap,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.heading2,
    color: Colors.primaryDeep,
  },
  viewAllText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSize.bodySmall,
    color: Colors.textLight,
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceGridItem: {
    marginBottom: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgCardMuted,
    overflow: 'hidden',
    alignItems: 'center',
  },
  serviceGridImage: {
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
  },
  serviceGridLabelContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceGridLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.bodySmall,
    color: Colors.primaryText,
    textAlign: 'center',
    lineHeight: 14,
  },

  /* Trust Badges */
  trustCard: {
    marginHorizontal: Spacing.cardMargin,
    marginTop: Spacing.sectionGap,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    ...Shadow.card,
  },
  trustItem: {
    flex: 1,
    alignItems: 'center',
  },
  trustIcon: {
    width: 44,
    height: 44,
    marginBottom: Spacing.sm,
  },
  trustLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: Colors.primaryText,
    textAlign: 'center',
  },
  trustDivider: {
    width: 1,
    height: '70%',
    backgroundColor: Colors.textLight,
    opacity: 0.3,
  },

  /* SOS Banner */
  sosBanner: {
    marginHorizontal: Spacing.cardMargin,
    marginTop: Spacing.sectionGap,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.primaryDark,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  sosContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  sosIcon: {
    width: 44,
    height: 44,
  },
  sosTextGroup: {
    gap: 2,
  },
  sosTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSize.bodySmall,
    color: Colors.textDark,
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    gap: Spacing.xs,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  sosButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSize.caption,
    color: Colors.textWhite,
  },
  sosIllustration: {
    width: 60,
    height: 60,
  },

  /* Home Essentials */
  essentialsCard: {
    marginHorizontal: Spacing.cardMargin,
    marginTop: Spacing.sectionGap,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.card,
  },
  essentialsTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.heading3,
    color: Colors.primaryDeep,
  },
  viewAllSmall: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.bodySmall,
    color: Colors.textLight,
  },
  essentialsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  essentialItem: {
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  essentialIconCircle: {
    width: '60%',
    aspectRatio: 1,
    borderRadius: Radius.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  essentialIcon: {
    width: '80%',
    height: '80%',
  },
  essentialLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 12,
  },
});
