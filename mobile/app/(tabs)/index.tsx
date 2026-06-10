// Home Screen — Server-Driven UI via Firebase Remote Config

import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions, Alert, Linking } from 'react-native';
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

const acRepairIcon = require("@/assets/images/fa6360cf6179cebaed29a6c808bafae2d31ad753.png");
const plumbingIcon = require("@/assets/images/8ce612b04a3a83f1e834c7b71a6dd2c0174cb918.png");
const cleaningIcon = require("@/assets/images/ad6b9b061bc7b1487a0e73c2557f711136d2a4d9.png");
const driverIcon = require("@/assets/images/60d4d0afa5801aeaa9e593bc049e3b017ef5624c.png");
const billsIcon = require("@/assets/images/056ecb9c01dd2283b1c0db1e84c1eb94c6d8a45a.png");
const bankWorkIcon = require("@/assets/images/33ede0e57be708b9775957c3ecec7013b0a56c6d.png");
const groceryIcon = require("@/assets/images/8888c71f466119aa294bd00136ff887f616d4737.png");
const anythingElseIcon = require("@/assets/images/6c8ed456023258e8b4095af93909c6cbc6c4b909.png");

const ICON_MAPPING: Record<string, any> = {
  "appliance-repair": acRepairIcon,
  "plumbing-electrical": plumbingIcon,
  "deep-cleaning": cleaningIcon,
  "driving-cab": driverIcon,
  "bill-payment": billsIcon,
  "bank-paperwork": bankWorkIcon,
  "grocery-run": groceryIcon,
  "anything-else": anythingElseIcon,
  "paper-legal": bankWorkIcon,
  "sanitisation": cleaningIcon,
  "tech-helper": acRepairIcon,
};

const resolveRoute = (route?: string, id?: string) => {
  if (!route) return '/';
  let clean = route.toLowerCase().trim();
  const cleanId = id ? id.toLowerCase().trim() : '';

  if (cleanId === 'physio_quick' || cleanId === 'physio') return '/physio';
  if (cleanId === 'fitness') return '/fitness';
  if (cleanId === 'scan_ecg') return '/scan-ecg';

  if (clean.includes('home-essentials') || clean.includes('home essentials')) return '/all-home-essentials';
  if (clean.includes('all-ayuxa') || clean.includes('all-ayuxacare') || clean.includes('all-oldful')) return '/all-ayuxa-services';
  if (clean.includes('account/medical-logs') || clean.includes('account/medical_logs')) return '/profile/medical-logs';
  
  // Dynamic check for Home Essentials services
  const STATIC_ESSENTIALS = [
    '/appliance-repair',
    '/plumbing-electrical',
    '/deep-cleaning',
    '/driving-cab',
    '/bill-payment',
    '/bank-paperwork',
    '/grocery-run',
    '/anything-else',
    '/paper-legal',
    '/sanitisation',
    '/tech-helper'
  ];
  
  if (cleanId && !STATIC_ESSENTIALS.includes(clean)) {
    const OTHER_STATIC = [
      '/doctor-visit',
      '/doctor-home-visit',
      '/hospital-trip',
      '/nurse-care',
      '/insurance',
      '/blood-test',
      '/order-medicines',
      '/physio-fitness',
      '/medical-equipment',
      '/meal-service',
      '/tech-helper',
      '/club-events'
    ];
    if (!OTHER_STATIC.includes(clean)) {
      return `/home-essentials-dynamic/${cleanId}`;
    }
  }

  return route.replace(/oldful/gi, 'ayuxa').replace(/ayuxacare/gi, 'ayuxa');
};

const translateServiceLabel = (id: string, fallbackLabel: string, t: any) => {
  const keyMap: Record<string, string> = {
    'doctor': 'services.doctor_visit',
    'nursing': 'services.nurse_care',
    'caregiver': 'services.caregiver_support',
    'emergency': 'services.emergency_assist',
    'doctor_visit': 'services.doctor_visit',
    'homing_nursing': 'services.nurse_care',
    'blood_test': 'services.blood_work',
    'fitness': 'services.fitness_quick',
    'equipment': 'services.equipment_quick',
    'medicines': 'services.medicine',
    'meal': 'services.meal_service',
    'physio': 'services.physio_fitness',
    'hospital_trip': 'services.hospital_trip',
    'insurance': 'services.insurance_quick',
    'ac_repair': 'services.appliance_repair',
    'plumbing': 'services.plumbing_electrical',
    'cleaning': 'services.deep_cleaning',
    'driver': 'services.driving_cab',
    'bills': 'services.bill_payment',
    'bank': 'services.bank_paperwork',
    'grocery': 'services.grocery_run',
    'anything': 'services.anything_else',
    'paper_legal': 'services.paper_legal',
    'trip_travel': 'services.trip_travels',
    'tech_helper': 'services.tech_helper',
    'smart_upgrade': 'services.smart_upgrade',
    'doctor_quick': 'services.doctor_visit_quick',
    'nurse_quick': 'services.nurse_care_quick',
    'hospital_quick': 'services.hospital_trip_quick',
    'physio_quick': 'services.physio_quick',
    'scan_ecg': 'services.scan_ecg',
  };

  const key = keyMap[id.toLowerCase()];
  if (key && t(key) !== key) {
    return t(key);
  }
  return fallbackLabel;
};

const translateSectionTitle = (id: string, fallbackTitle: string, t: any) => {
  const keyMap: Record<string, string> = {
    'quick_services': 'home.section_quick_services',
    'ayuxa_services': 'home.section_ayuxa_services',
    'essentials': 'home.section_essentials',
  };

  const key = keyMap[id.toLowerCase()];
  if (key && t(key) !== key) {
    return t(key);
  }
  return fallbackTitle;
};

const translateTrustBadgeLabel = (id: string, fallbackLabel: string, t: any) => {
  const keyMap: Record<string, string> = {
    'support': 'home.trust_support',
    'caregivers': 'home.trust_caregivers',
    'family': 'home.trust_family',
  };

  const key = keyMap[id.toLowerCase()];
  if (key && t(key) !== key) {
    return t(key);
  }
  return fallbackLabel;
};

// ─── Sub-components receive colors prop ──────────────────────────────────────

interface QuickServicesProps {
  section: HomeSection;
  itemWidth: number;
  cardHeight: number;
  colors: ThemeColors;
}

function QuickServicesStrip({ section, colors }: QuickServicesProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const s = makeStyles(colors);
  return (
    <View style={s.quickServiceCard}>
      {section.services.map((item, index) => {
        const translatedLabel = translateServiceLabel(item.id, item.label, t);
        const [line1, line2] = translatedLabel.split('\n');
        return (
          <TouchableOpacity
            key={item.id}
            style={[s.quickServiceBox, index === 0 && { backgroundColor: 'transparent' }]}
            onPress={() => router.push(resolveRoute(item.route, item.id) as any)}
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
  const [expanded, setExpanded] = useState(false);

  const primaryItems = section.services.slice(0, 6);
  const remainingItems = section.services.slice(6);
  const visibleItems = expanded ? section.services : primaryItems;

  return (
    <View style={s.servicesCard}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{translateSectionTitle(section.id, section.title, t)}</Text>
      </View> 
      <View style={s.serviceGrid}>
        {visibleItems.map(item => {
          const translatedLabel = translateServiceLabel(item.id, item.label, t);
          const [line1, line2] = translatedLabel.split('\n');
          return (
            <TouchableOpacity
              key={item.id}
              style={[s.serviceGridItem, { width: itemWidth, height: cardHeight }]}
              onPress={() => router.push(resolveRoute(item.route, item.id) as any)}
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
      {remainingItems.length > 0 && (
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          style={s.viewMoreButton}
          activeOpacity={0.7}
        >
          <Text style={s.viewMoreText}>
            {expanded ? t('common.view_less') : t('common.view_more')}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.primary}
          />
        </TouchableOpacity>
      )}
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
  const { t } = useTranslation();
  const router = useRouter();
  const s = makeStyles(colors);
  const { services } = useUser();

  // Filter and sort active Home Essentials services from database
  const dbServices = services
    .filter(
      sv =>
        sv.serviceType === "HOME_ESSENTIALS" &&
        sv.slug !== "home-essentials" &&
        sv.slug !== "smart-upgrade" &&
        sv.slug !== "trip-travels" &&
        sv.slug !== "bank-paperwork"
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Map to matching layout structure
  const items = dbServices.slice(0, section.max_items || 8).map(dbS => {
    return {
      id: dbS.slug,
      slug: dbS.slug,
      label: dbS.headline || dbS.name,
      route: dbS.route || `/${dbS.slug}`,
      iconAsset: ICON_MAPPING[dbS.slug] || anythingElseIcon,
    };
  });

  const rows: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += 4) {
    rows.push(items.slice(i, i + 4));
  }

  return (
    <View style={s.essentialsCard}>
      <View style={s.sectionHeader}>
        <Text style={s.essentialsTitle}>{translateSectionTitle(section.id, section.title, t)}</Text>
        {section.view_all_route && (
          <TouchableOpacity onPress={() => router.push(resolveRoute(section.view_all_route) as any)}>
            <Text style={s.viewAllSmall}>{t('common.view_all')}</Text>
          </TouchableOpacity>
        )}
      </View>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={s.essentialsRow}>
          {row.map(item => {
            const key = item.slug ? item.slug.replace(/-/g, "_") : "";
            const displayLabel = key ? t(`services.${key}`, item.label) : item.label;
            const [line1, line2] = displayLabel.split('\n');
            return (
              <TouchableOpacity
                key={item.id}
                style={[s.essentialItem, { width: itemWidth, height: cardHeight }]}
                onPress={() => router.push(resolveRoute(item.route, item.id) as any)}
              >
                <View style={s.essentialIconCircle}>
                  <Image source={item.iconAsset} style={s.essentialIcon} resizeMode="contain" />
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

interface TrustBadgesProps {
  badges: any[];
  colors: ThemeColors;
}

function TrustBadges({ badges, colors }: TrustBadgesProps) {
  const { t } = useTranslation();
  const s = makeStyles(colors);
  return (
    <View style={s.trustCard}>
      {badges.map((badge, i) => (
        <React.Fragment key={badge.id}>
          <View style={s.trustItem}>
            <View style={s.trustIconCircle}>
              <Image source={{ uri: getAssetUrl(badge.icon) }} style={s.trustIcon} resizeMode="contain" />
            </View>
            <Text style={s.trustLabel}>{translateTrustBadgeLabel(badge.id, badge.label, t)}</Text>
          </View>
          {i < badges.length - 1 && <View style={s.trustDivider} />}
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { profile, selectedCity, setSelectedCity } = useUser();
  const { cities } = useAppConfig();
  const colors = useThemeColors();
  const { isDarkMode } = useTheme();

  // Initialize immediately with fallback — screen renders on first paint.
  // Firebase RC will update this in the background.
  const [homeConfig, setHomeConfig] = useState<HomeConfig>(() => sduiService.getHomeConfig());
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentLocationStr, setCurrentLocationStr] = useState('Loading...');
  const [isCitySupported, setIsCitySupported] = useState(true);
  const [featuredMeetup, setFeaturedMeetup] = useState<any>(null);
  const [userPinCode, setUserPinCode] = useState<string | null>(null);

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

  const refetchAllHomeData = useCallback(() => {
    // ── 1. Firebase RC — update SDUI config in background ─────────────────────
    sduiService.init()
      .then(() => setHomeConfig(sduiService.getHomeConfig()))
      .catch(() => {});

    // ── 2. Banners — parallel, background ─────────────────────────────────────
    bannerService.getHomeBanners()
      .then(setBanners)
      .catch(() => {});

    // ── 3. Location + city detection + meetup — all background, non-blocking ──
    (async () => {
      let detectedPinCode: string | null = null;
      try {
        const coords = await locationService.getCurrentLocation();
        const address = await locationService.getAddressFromCoordinates(coords);
        const locality = address.split(',')[0] || 'Unknown Location';
        setCurrentLocationStr(locality);

        const pinCode = await locationService.getPincodeFromAddress(coords, address);
        detectedPinCode = pinCode ?? null;
        setUserPinCode(detectedPinCode);

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
      }

      // ── 4. Featured meetup ─────────────────────────────────────────────────
      try {
        let res = null;
        if (detectedPinCode) {
          res = await meetupService.getMeetups({ pinCode: detectedPinCode });
        }
        if (!res || !res.success || !res.data || res.data.length === 0) {
          res = await meetupService.getMeetups();
        }
        if (res.success && res.data && res.data.length > 0) {
          setFeaturedMeetup(res.data.find((m: any) => m.isFeatured) ?? null);
        } else {
          setFeaturedMeetup(null);
        }
      } catch {
        setFeaturedMeetup(null);
      }
    })();
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
                t('home.location_perm_required_title'),
                t('home.location_perm_required_msg'),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('home.open_settings'), onPress: () => Linking.openSettings() },
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

  const { sections, trust_badges, sos_banner } = homeConfig;

  const quickServicesSection = sections.find(sec => sec.id === 'quick_services' || sec.type === 'quick_services');
  const serviceGridSection = sections.find(sec => sec.id === 'ayuxa_services' || sec.type === 'service_grid');
  const essentialsSection = sections.find(sec => sec.id === 'essentials' || sec.type === 'essentials_grid');

  return (
    <View style={s.screen}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <SafeAreaView edges={['top']} style={s.headerSafe}>
        <View style={s.header}>
          <Image source={logoSmall} style={s.logoSmall} resizeMode="contain" />
          <TouchableOpacity style={s.locationPill} onPress={() => router.push('/(auth)/city-selection')}>
            <Ionicons name="location-sharp" size={16} color={colors.primary} />
            <Text style={s.locationText} numberOfLines={1}>
              {currentLocationStr === 'Loading...' ? t('home.location_loading') :
               currentLocationStr === 'Location Unavailable' ? t('home.location_unavailable') :
               currentLocationStr === 'Enable in Settings' ? t('home.enable_in_settings') :
               currentLocationStr === 'Location Required' ? t('home.location_required') :
               currentLocationStr}
            </Text>
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
                <Text style={s.comingSoonTitle}>
                  {t('home.coming_soon_title', { city: currentLocationStr === 'Loading...' ? t('home.location_loading') : currentLocationStr })}
                </Text>
                <Text style={s.comingSoonDesc}>{t('home.coming_soon_desc')}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={s.notifyMeButton}
              onPress={() => Alert.alert(t('home.notify_success_title'), t('home.notify_success_desc', { city: currentLocationStr === 'Loading...' ? t('home.location_loading') : currentLocationStr }))}
            >
              <Text style={s.notifyMeText}>{t('home.notify_me')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.newGreetingBanner}>
          <View style={s.greetingContent}>
            <View style={s.greetingTextContainer}>
              <Text style={s.newGreetingTitle}>
                {t(currentHour >= 16 ? 'home.greeting_evening' : currentHour >= 12 ? 'home.greeting_afternoon' : 'home.greeting_morning')}, {userName}!
              </Text>
              <Text style={s.newGreetingSubtitle}>{t('home.greeting_subtitle')}</Text>
              <TouchableOpacity onPress={() => router.push('/my-bookings')} style={s.bookingStatusBtn}>
                <Ionicons name="calendar" size={14} color="#02743F" />
                <Text style={s.bookingStatusBtnText}>{t('home.booking_status')}</Text>
              </TouchableOpacity>
            </View>
            <View style={s.greetingAvatarContainer}>
              {profile?.profileImageUrl ? (
                <Image source={{ uri: profile.profileImageUrl }} style={s.greetingAvatar} />
              ) : (
                <View style={s.greetingAvatarPlaceholder}>
                  <Ionicons name="person-circle-outline" size={90} color="#02743F" />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Quick Services (Strip) */}
        {quickServicesSection && (
          <QuickServicesStrip
            section={quickServicesSection}
            itemWidth={exactEssentialItemWidth}
            cardHeight={exactEssentialCardHeight}
            colors={colors}
          />
        )}

        {/* Ayuxa Services (Grid) */}
        {serviceGridSection && (
          <ServiceGrid
            section={serviceGridSection}
            itemWidth={exactAyuxaItemWidth}
            imageHeight={exactAyuxaImageHeight}
            cardHeight={exactAyuxaCardHeight}
            colors={colors}
          />
        )}

        {/* Banner Slider — Option 1: After Greeting (Admin-Managed) */}
        {banners.length > 0 && (
          <BannerSlider banners={banners} colors={colors} />
        )}

        {/* Trust Badges */}
        {trust_badges.length > 0 && (
          <TrustBadges
            badges={trust_badges}
            colors={colors}
          />
        )}

        {/* Home Essentials Services (Grid) */}
        {essentialsSection && (
          <EssentialsGrid
            section={essentialsSection}
            itemWidth={exactEssentialItemWidth}
            cardHeight={exactEssentialCardHeight}
            colors={colors}
          />
        )}

        {/* Featured Meetup Card (bottom) */}
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
                  <Text style={s.featuredMeetupBadge}>{t('home.featured_event')}</Text>
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
    viewMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      marginTop: 5,
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
      gap: 6,
    },
    viewMoreText: {
      fontFamily: Fonts.medium,
      fontSize: FontSize.bodySmall,
      color: c.primary,
    },

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
