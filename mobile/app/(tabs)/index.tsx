// Home Screen — Server-Driven UI via Firebase Remote Config

import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow } from '@/constants/theme';
import { useThemeColors, ThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';
import { locationService } from '@/services/device/locationService';
import { useUser } from '@/context/UserContext';
import { useAppConfig } from '@/context/AppConfigContext';
import { sduiService, HomeConfig, HomeSection } from '@/services/firebase/sduiService';
import { getAssetUrl } from '@/utils/getAssetUrl';
import { LinearGradient } from 'expo-linear-gradient';
import { BannerSlider } from '@/components/BannerSlider';
import { bannerService, Banner } from '@/services/api/bannerService';
import { meetupService } from '@/services/api/meetupService';

const logoSmall = require('@/assets/images/onlylogo.png');

const resolveRoute = (route?: string) => {
  if (!route) return '/';
  let clean = route.toLowerCase().trim();
  if (clean.includes('home-essentials') || clean.includes('home essentials')) return '/all-home-essentials';
  if (clean.includes('all-ayuxa') || clean.includes('all-ayuxacare') || clean.includes('all-oldful')) return '/all-ayuxa-services';
  return route.replace(/oldful/gi, 'ayuxa').replace(/ayuxacare/gi, 'ayuxa');
};

// ─── Sub-components receive colors prop ──────────────────────────────────────

interface QuickServicesProps {
  section: HomeSection;
  itemWidth: number;
  cardHeight: number;
  colors: ThemeColors;
}

function QuickServicesStrip({ section, colors }: QuickServicesProps) {
  const router = useRouter();
  const s = makeStyles(colors);
  return (
    <View style={s.quickServiceCard}>
      {section.services.map((item, index) => {
        const [line1, line2] = item.label.split('\n');
        return (
          <TouchableOpacity
            key={item.id}
            style={[s.quickServiceBox, index === 0 && { backgroundColor: 'transparent' }]}
            onPress={() => router.push(resolveRoute(item.route) as any)}
          >
            <Image source={{ uri: getAssetUrl(item.icon) }} style={s.quickServiceIcon} resizeMode="contain" />
            <Text style={s.quickServiceLabel}>{line1}</Text>
            {line2 ? <Text style={s.quickServiceLabel}>{line2}</Text> : null}
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
  colors: ThemeColors;
}

function ServiceGrid({ section, itemWidth, imageHeight, cardHeight, colors }: ServiceGridProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const s = makeStyles(colors);
  const items = section.max_items ? section.services.slice(0, section.max_items) : section.services;

  return (
    <View style={s.servicesCard}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{section.title}</Text>
        {section.view_all_route && (
          <TouchableOpacity onPress={() => router.push(resolveRoute(section.view_all_route) as any)}>
            <Text style={s.viewAllText}>{t('common.view_all')}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={s.serviceGrid}>
        {items.map(item => {
          const [line1, line2] = item.label.split('\n');
          return (
            <TouchableOpacity
              key={item.id}
              style={[s.serviceGridItem, { width: itemWidth, height: cardHeight }]}
              onPress={() => router.push(resolveRoute(item.route) as any)}
            >
              <Image
                source={{ uri: getAssetUrl(item.icon) }}
                style={[s.serviceGridImage, { width: itemWidth, height: imageHeight }]}
                resizeMode="cover"
              />
              <View style={s.serviceGridLabelContainer}>
                <Text style={s.serviceGridLabel}>{line1}</Text>
                {line2 ? <Text style={s.serviceGridLabel}>{line2}</Text> : null}
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
  colors: ThemeColors;
}

function EssentialsGrid({ section, itemWidth, cardHeight, colors }: EssentialsGridProps) {
  const router = useRouter();
  const s = makeStyles(colors);
  const items = section.max_items ? section.services.slice(0, section.max_items) : section.services;

  const rows: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += 4) {
    rows.push(items.slice(i, i + 4));
  }

  return (
    <View style={s.essentialsCard}>
      <View style={s.sectionHeader}>
        <Text style={s.essentialsTitle}>{section.title}</Text>
        {section.view_all_route && (
          <TouchableOpacity onPress={() => router.push(resolveRoute(section.view_all_route) as any)}>
            <Text style={s.viewAllSmall}>View All</Text>
          </TouchableOpacity>
        )}
      </View>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={s.essentialsRow}>
          {row.map(item => {
            const [line1, line2] = item.label.split('\n');
            return (
              <TouchableOpacity
                key={item.id}
                style={[s.essentialItem, { width: itemWidth, height: cardHeight }]}
                onPress={() => router.push(resolveRoute(item.route) as any)}
              >
                <View style={s.essentialIconCircle}>
                  <Image source={{ uri: getAssetUrl(item.icon) }} style={s.essentialIcon} resizeMode="contain" />
                </View>
                <Text style={s.essentialLabel}>{line1}</Text>
                {line2 ? <Text style={s.essentialLabel}>{line2}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { profile, selectedCity, setSelectedCity } = useUser();
  const { cities } = useAppConfig();
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();

  const [homeConfig, setHomeConfig] = useState<HomeConfig | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentLocationStr, setCurrentLocationStr] = useState('Loading...');
  const [isCitySupported, setIsCitySupported] = useState(true);
  const [featuredMeetup, setFeaturedMeetup] = useState<any>(null);
  const [userPinCode, setUserPinCode] = useState<string | null>(null);

  const fetchFeaturedMeetup = useCallback(async () => {
    try {
      const coords = await locationService.getCurrentLocation();
      const pinCode = await locationService.getPincodeFromAddress(coords);
      if (pinCode) {
        const res = await meetupService.getMeetups({ pinCode });
        if (res.success && res.data?.length > 0) {
          const featured = res.data.find((m: any) => m.isFeatured);
          setFeaturedMeetup(featured ?? null);
        } else {
          setFeaturedMeetup(null);
        }
      }
    } catch {
      // Silently fail if GPS/meetup fetch fails
    }
  }, []);

  const refetchAllHomeData = useCallback(async () => {
    // Re-init SDUI config
    await sduiService.init();
    setHomeConfig(sduiService.getHomeConfig());

    // Refetch banners
    try {
      const homeBanners = await bannerService.getHomeBanners();
      setBanners(homeBanners);
    } catch {
      // Silently fail on banner fetch
    }

    // Refetch location and featured meetup
    let detectedPinCode: string | null = null;
    try {
      const coords = await locationService.getCurrentLocation();
      const address = await locationService.getAddressFromCoordinates(coords);
      const locality = address.split(',')[0] || 'Unknown Location';
      setCurrentLocationStr(locality);

      // Detect pincode
      const pinCode = await locationService.getPincodeFromAddress(coords, address);
      detectedPinCode = pinCode ?? null;
      setUserPinCode(detectedPinCode);

      const CITY_SYNONYMS: Record<string, string[]> = {
        'Bangalore': ['bengaluru', 'bangalore urban', 'bangalore rural'],
        'Gurgaon': ['gurugram'],
        'Delhi NCR': ['new delhi', 'delhi', 'noida', 'gurgaon', 'gurugram', 'faridabad', 'ghaziabad'],
        'Mumbai': ['bombay', 'navi mumbai', 'thane'],
      };

      const isMatch = (cityName: string, addressStr: string) => {
        const addr = addressStr.toLowerCase();
        const primary = cityName.toLowerCase();
        if (addr.includes(primary)) return true;
        const synonyms = CITY_SYNONYMS[cityName] || [];
        return synonyms.some(s => addr.includes(s));
      };

      const detectedCityMatch = cities.find((c: any) => isMatch(c.name, address));
      if (detectedCityMatch) {
        setSelectedCity(detectedCityMatch.name);
        setIsCitySupported(true);
      } else {
        setIsCitySupported(false);
      }
    } catch {
      setCurrentLocationStr('Location Unavailable');
      setUserPinCode(null);
      setFeaturedMeetup(null);
      return;
    }

    // Refetch featured meetup only if pincode is detected
    if (detectedPinCode) {
      try {
        const res = await meetupService.getMeetups({ pinCode: detectedPinCode });
        if (res.success && res.data?.length > 0) {
          const featured = res.data.find((m: any) => m.isFeatured);
          // Only show if meetup's pincode matches user's pincode
          if (featured && featured.pinCode === detectedPinCode) {
            setFeaturedMeetup(featured);
          } else {
            setFeaturedMeetup(null);
          }
        } else {
          setFeaturedMeetup(null);
        }
      } catch {
        setFeaturedMeetup(null);
      }
    } else {
      setFeaturedMeetup(null);
    }
  }, [cities, setSelectedCity]);

  useEffect(() => {
    refetchAllHomeData();
  }, [refetchAllHomeData]);

  // Strict refetch ALL data when home screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetchAllHomeData();
    }, [refetchAllHomeData])
  );

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          if (selectedCity) {
            setCurrentLocationStr(selectedCity);
            const cityData = cities.find((c: any) => c.name.toLowerCase() === selectedCity.toLowerCase());
            setIsCitySupported(!!cityData && cityData.available);
            return;
          }

          setCurrentLocationStr('Loading...');

          const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

          if (status !== 'granted') {
            if (!canAskAgain) {
              // Permanently denied — user must enable in Settings
              setCurrentLocationStr('Enable in Settings');
              Alert.alert(
                'Location Permission Required',
                'Location access was denied. Please enable it in App Settings to auto-detect your city.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open Settings', onPress: () => Linking.openSettings() },
                ],
              );
            } else {
              setCurrentLocationStr('Location Required');
            }
            return;
          }

          try {
            const coords = await locationService.getCurrentLocation();
            const address = await locationService.getAddressFromCoordinates(coords);
            const locality = address.split(',')[0] || 'Unknown Location';
            setCurrentLocationStr(locality);

            const CITY_SYNONYMS: Record<string, string[]> = {
              'Bangalore': ['bengaluru', 'bangalore urban', 'bangalore rural'],
              'Gurgaon': ['gurugram'],
              'Delhi NCR': ['new delhi', 'delhi', 'noida', 'gurgaon', 'gurugram', 'faridabad', 'ghaziabad'],
              'Mumbai': ['bombay', 'navi mumbai', 'thane'],
            };

            const isMatch = (cityName: string, addressStr: string) => {
              const addr = addressStr.toLowerCase();
              const primary = cityName.toLowerCase();
              if (addr.includes(primary)) return true;
              const synonyms = CITY_SYNONYMS[cityName] || [];
              return synonyms.some(s => addr.includes(s));
            };

            const detectedCityMatch = cities.find((c: any) => isMatch(c.name, address));
            if (detectedCityMatch) {
              setSelectedCity(detectedCityMatch.name);
              setIsCitySupported(true);
            } else {
              setIsCitySupported(false);
            }
          } catch (e) {
            setCurrentLocationStr('Location Unavailable');
          }
        } catch (e) {
          setCurrentLocationStr('Location Unavailable');
        }
      })();
    }, [selectedCity, cities, setSelectedCity])
  );

  const availableWidth = width - 60;
  const exactAyuxaItemWidth = Math.floor(availableWidth * 0.315);
  const exactAyuxaImageHeight = exactAyuxaItemWidth * 0.85;
  const exactAyuxaCardHeight = exactAyuxaImageHeight + 56;
  const exactEssentialItemWidth = Math.floor(availableWidth * 0.23);
  const exactEssentialCardHeight = exactEssentialItemWidth * 1.35;

  const userName = profile?.name?.split(' ')[0] || 'User';
  const currentHour = new Date().getHours();
  const greeting = currentHour >= 16 ? 'Good Evening' : currentHour >= 12 ? 'Good Afternoon' : 'Good Morning';

  const s = makeStyles(colors);

  if (!homeConfig) {
    return (
      <View style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const { sections, trust_badges, sos_banner } = homeConfig;

  return (
    <View style={s.screen}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <SafeAreaView edges={['top']} style={s.headerSafe}>
        <View style={s.header}>
          <Image source={logoSmall} style={s.logoSmall} resizeMode="contain" />
          <TouchableOpacity style={s.locationPill} onPress={() => router.push('/(auth)/city-selection')}>
            <Ionicons name="location-sharp" size={16} color={colors.primary} />
            <Text style={s.locationText} numberOfLines={1}>{currentLocationStr}</Text>
          </TouchableOpacity>
          <View style={s.headerRight}>
            <TouchableOpacity onPress={() => router.push('/sos-emergency')}>
              <LinearGradient colors={['#FF4B2B', '#FF416C']} style={s.sosCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={s.sosCircleText}>SOS</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {!isCitySupported && (
          <View style={s.comingSoonBanner}>
            <View style={s.comingSoonContent}>
              <Ionicons name="notifications-circle" size={40} color={colors.primary} />
              <View style={s.comingSoonTextRow}>
                <Text style={s.comingSoonTitle}>We&apos;re coming soon to {currentLocationStr}!</Text>
                <Text style={s.comingSoonDesc}>Notify me when you launch in my city.</Text>
              </View>
            </View>
            <TouchableOpacity
              style={s.notifyMeButton}
              onPress={() => Alert.alert('Success', "We'll notify you as soon as we start operations in " + currentLocationStr)}
            >
              <Text style={s.notifyMeText}>Notify Me</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.newGreetingBanner}>
          <View style={s.greetingContent}>
            <View style={s.greetingTextContainer}>
              <Text style={s.newGreetingTitle}>{greeting}, {userName}!</Text>
              <Text style={s.newGreetingSubtitle}>We see you. We hear you. We care you.</Text>
              <TouchableOpacity onPress={() => router.push('/my-bookings')} style={s.bookingStatusBtn}>
                <Ionicons name="calendar" size={14} color="#02743F" />
                <Text style={s.bookingStatusBtnText}>Booking Status</Text>
              </TouchableOpacity>
            </View>
            <View style={s.greetingAvatarContainer}>
              {profile?.profileImageUrl ? (
                <Image source={{ uri: profile.profileImageUrl }} style={s.greetingAvatar} />
              ) : (
                <View style={s.greetingAvatarPlaceholder}>
                  <Ionicons name="person" size={48} color="#02743F" />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Featured Meetup Card */}
        {featuredMeetup && (() => {
          const { date } = (() => {
            const d = new Date(featuredMeetup.eventDate);
            return {
              date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            };
          })();
          return (
            <TouchableOpacity
              style={s.featuredMeetupCard}
              onPress={() => router.push({ pathname: '/meetup/details', params: { id: featuredMeetup.id } } as any)}
              activeOpacity={0.85}
            >
              {featuredMeetup.imageUrl && (
                <Image
                  source={{ uri: featuredMeetup.imageUrl }}
                  style={s.featuredMeetupImage}
                  resizeMode="cover"
                />
              )}
              <View style={s.featuredMeetupOverlay}>
                <View style={s.featuredMeetupHeader}>
                  <Text style={s.featuredMeetupBadge}>Featured Event</Text>
                </View>
                <Text style={s.featuredMeetupTitle} numberOfLines={2}>{featuredMeetup.title}</Text>
                <View style={s.featuredMeetupMeta}>
                  <View style={s.featuredMeetupMetaItem}>
                    <Ionicons name="calendar-outline" size={13} color="#fff" />
                    <Text style={s.featuredMeetupMetaText}>{date}</Text>
                  </View>
                  <View style={s.featuredMeetupMetaItem}>
                    <Ionicons name="time-outline" size={13} color="#fff" />
                    <Text style={s.featuredMeetupMetaText}>{featuredMeetup.startTime}</Text>
                  </View>
                  <View style={s.featuredMeetupMetaItem}>
                    <Ionicons name="location-outline" size={13} color="#fff" />
                    <Text style={s.featuredMeetupMetaText}>{featuredMeetup.venue}</Text>
                  </View>
                </View>
                <View style={s.featuredMeetupFooter}>
                  <Text style={s.featuredMeetupPrice}>₹{featuredMeetup.serviceCharge}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
          );
        })()}

        {/* Banner Slider — Option 1: After Greeting (Admin-Managed) */}
        {banners.length > 0 && (
          <BannerSlider banners={banners} colors={colors} />
        )}

        {sections.map(section => {
          if (section.type === 'quick_services') {
            return (
              <QuickServicesStrip
                key={section.id}
                section={section}
                itemWidth={exactEssentialItemWidth}
                cardHeight={exactEssentialCardHeight}
                colors={colors}
              />
            );
          }
          if (section.type === 'service_grid') {
            return (
              <ServiceGrid
                key={section.id}
                section={section}
                itemWidth={exactAyuxaItemWidth}
                imageHeight={exactAyuxaImageHeight}
                cardHeight={exactAyuxaCardHeight}
                colors={colors}
              />
            );
          }
          if (section.type === 'essentials_grid') {
            return (
              <React.Fragment key={section.id}>
                {trust_badges.length > 0 && (
                  <View style={s.trustCard}>
                    {trust_badges.map((badge, i) => (
                      <React.Fragment key={badge.id}>
                        <View style={s.trustItem}>
                          <View style={s.trustIconCircle}>
                            <Image source={{ uri: getAssetUrl(badge.icon) }} style={s.trustIcon} resizeMode="contain" />
                          </View>
                          <Text style={s.trustLabel}>{badge.label}</Text>
                        </View>
                        {i < trust_badges.length - 1 && <View style={s.trustDivider} />}
                      </React.Fragment>
                    ))}
                  </View>
                )}
                <EssentialsGrid
                  section={section}
                  itemWidth={exactEssentialItemWidth}
                  cardHeight={exactEssentialCardHeight}
                  colors={colors}
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

// ─── Styles factory ───────────────────────────────────────────────────────────

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bgScreen },

    headerSafe: {
      backgroundColor: c.bgHeader,
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
    logoSmall: { width: 42, height: 32 },
    locationPill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: c.bgCardMuted,
      borderRadius: Radius.xl,
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      marginHorizontal: Spacing.sm,
      flex: 1,
      gap: 4,
    },
    locationText: { fontFamily: Fonts.medium, fontSize: FontSize.bodySmall, color: c.textBody, flex: 1 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    sosCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', ...Shadow.card },
    sosCircleText: { fontFamily: Fonts.bold, fontSize: 10, color: c.textWhite },

    scrollView: { flex: 1 },
    scrollContent: { paddingTop: 20, paddingBottom: 120 },

    newGreetingBanner: {
      marginHorizontal: Spacing.cardMargin,
      marginTop: Spacing.md,
      marginBottom: Spacing.md,
      backgroundColor: '#02743F',
      borderRadius: Radius.xl,
      paddingVertical: 18,
      paddingHorizontal: Spacing.lg,
      ...Shadow.card,
    },
    greetingContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    greetingTextContainer: { flex: 1, marginRight: Spacing.lg },
    newGreetingTitle: { fontFamily: Fonts.bold, fontSize: 16, color: '#FFFFFF', marginBottom: 4 },
    newGreetingSubtitle: { fontFamily: Fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 10, lineHeight: 16 },
    bookingStatusBtn: {
      backgroundColor: '#FFFFFF',
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: Radius.full,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
    },
    bookingStatusBtnText: { fontFamily: Fonts.semiBold, fontSize: 11, color: '#02743F' },
    greetingAvatarContainer: { width: 90, height: 90, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    greetingAvatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFFFFF' },
    greetingAvatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },

    featuredMeetupCard: {
      marginHorizontal: Spacing.cardMargin,
      marginTop: Spacing.md,
      marginBottom: Spacing.md,
      borderRadius: Radius.lg,
      overflow: 'hidden',
      height: 220,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
    featuredMeetupImage: {
      position: 'absolute',
      width: '100%',
      height: '100%',
    },
    featuredMeetupOverlay: {
      flex: 1,
      backgroundColor: 'rgba(2, 116, 63, 0.85)',
      padding: 14,
      justifyContent: 'space-between',
    },
    featuredMeetupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    featuredMeetupBadge: { fontFamily: Fonts.semiBold, fontSize: 10, color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    featuredMeetupTitle: { fontFamily: Fonts.semiBold, fontSize: 14, color: '#FFFFFF', marginTop: 6, lineHeight: 18 },
    featuredMeetupMeta: { gap: 8 },
    featuredMeetupMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    featuredMeetupMetaText: { fontFamily: Fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.85)' },
    featuredMeetupFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
    featuredMeetupPrice: { fontFamily: Fonts.bold, fontSize: 16, color: '#FFFFFF' },

    quickServiceCard: {
      marginHorizontal: Spacing.cardMargin,
      marginTop: Spacing.sectionGap,
      backgroundColor: c.bgCard,
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
      backgroundColor: c.bgCardMuted,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.sm,
      marginHorizontal: Spacing.xs,
    },
    quickServiceIcon: { width: 44, height: 44, marginBottom: Spacing.xs },
    quickServiceLabel: { fontFamily: Fonts.medium, fontSize: FontSize.caption, color: c.primaryText, textAlign: 'center', lineHeight: 12 },

    servicesCard: {
      marginHorizontal: Spacing.cardMargin,
      marginTop: Spacing.sectionGap,
      backgroundColor: c.bgCard,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      ...Shadow.card,
    },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
    sectionTitle: { fontFamily: Fonts.bold, fontSize: FontSize.heading2, color: c.primaryDeep },
    viewAllText: { fontFamily: Fonts.semiBold, fontSize: FontSize.bodySmall, color: c.textLight },
    serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    serviceGridItem: { marginBottom: Spacing.md, borderRadius: Radius.md, backgroundColor: c.bgCardMuted, overflow: 'hidden', alignItems: 'center' },
    serviceGridImage: { borderTopLeftRadius: Radius.md, borderTopRightRadius: Radius.md },
    serviceGridLabelContainer: { flex: 1, width: '100%', paddingHorizontal: Spacing.xs, alignItems: 'center', justifyContent: 'center' },
    serviceGridLabel: { fontFamily: Fonts.medium, fontSize: FontSize.bodySmall, color: c.primaryText, textAlign: 'center', lineHeight: 14 },

    trustCard: {
      marginHorizontal: Spacing.cardMargin,
      marginTop: Spacing.sectionGap,
      backgroundColor: c.bgCard,
      borderRadius: Radius.lg,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.lg,
      ...Shadow.card,
    },
    trustItem: { flex: 1, alignItems: 'center' },
    trustIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: c.bgCardMuted, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
    trustIcon: { width: 38, height: 38 },
    trustLabel: { fontFamily: Fonts.bold, fontSize: 10, color: c.primaryDeep, textAlign: 'center', paddingHorizontal: 4 },
    trustDivider: { width: 1, height: '70%' as any, backgroundColor: c.textLight, opacity: 0.3 },

    essentialsCard: {
      marginHorizontal: Spacing.cardMargin,
      marginTop: Spacing.sectionGap,
      backgroundColor: c.bgCard,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      ...Shadow.card,
    },
    essentialsTitle: { fontFamily: Fonts.bold, fontSize: FontSize.heading3, color: c.primaryDeep },
    viewAllSmall: { fontFamily: Fonts.medium, fontSize: FontSize.bodySmall, color: c.textLight },
    essentialsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
    essentialItem: { borderWidth: 1, borderColor: c.accent, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
    essentialIconCircle: { width: '60%', aspectRatio: 1, borderRadius: Radius.full, backgroundColor: c.bgCardMuted, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
    essentialIcon: { width: '80%', height: '80%' },
    essentialLabel: { fontFamily: Fonts.medium, fontSize: FontSize.caption, color: c.textMuted, textAlign: 'center', lineHeight: 12 },

    comingSoonBanner: {
      backgroundColor: c.bgCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1.5,
      borderColor: c.primary,
      shadowColor: c.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
    },
    comingSoonContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    comingSoonTextRow: { marginLeft: 12, flex: 1 },
    comingSoonTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: c.textDark, marginBottom: 2 },
    comingSoonDesc: { fontFamily: Fonts.regular, fontSize: 12, color: c.textMuted },
    notifyMeButton: { backgroundColor: c.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
    notifyMeText: { fontFamily: Fonts.medium, fontSize: 14, color: '#FFFFFF' },

    // unused legacy styles kept to avoid TS errors in case referenced elsewhere
    sosBanner: {} as any,
    sosContent: {} as any,
    sosIcon: {} as any,
    sosTextGroup: {} as any,
    sosTitle: {} as any,
    sosButton: {} as any,
    sosButtonText: {} as any,
    sosIllustration: {} as any,
  });
}
