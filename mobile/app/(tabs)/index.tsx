// Home Screen — Server-Driven UI via Firebase Remote Config

import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions, Alert, Linking, ActivityIndicator, Animated } from 'react-native';
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
import Svg, { Path } from 'react-native-svg';
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

const isEmoji = (str?: string) => {
  if (!str) return false;
  const clean = str.trim();
  return clean.length <= 4 && !clean.includes('.') && !clean.includes('/') && !clean.includes(':');
};

const resolveRoute = (route?: string, id?: string) => {
  if (!route) return '/';
  let clean = route.toLowerCase().trim();
  if (clean.includes('/dynamic-service/')) {
    return route;
  }
  const cleanId = id ? id.toLowerCase().trim() : '';

  if (clean.includes('home-essentials') || clean.includes('home essentials')) return '/all-home-essentials';
  if (clean.includes('all-ayuxa') || clean.includes('all-ayuxacare') || clean.includes('all-oldful')) return '/all-ayuxa-services';
  if (clean.includes('account/medical-logs') || clean.includes('account/medical_logs')) return '/profile/medical-logs';
  
  return route.replace(/oldful/gi, 'ayuxa').replace(/ayuxacare/gi, 'ayuxa');
};

const translateServiceLabel = (id: string, fallbackLabel: string, t: any, lang: string = 'en') => {
  if (fallbackLabel) {
    const trimmed = fallbackLabel.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed[lang]) return parsed[lang];
        if (parsed['en']) return parsed['en'];
      } catch (e) {
        // ignore and fallback
      }
    }
  }

  // If the admin changed it from the default, use the fallbackLabel directly
  const defaultEnglishLabels: Record<string, string> = {
    'doctor_quick': 'Home Doctor',
    'nurse_quick': 'Home Nurse',
    'hospital_quick': 'Hospital Visit',
    'physio_quick': 'Physio',
    'physio': 'Home Aide',
    'caregiver_quick': 'Caregiver',
    'blood_test': 'Blood\nWork',
    'scan_ecg': 'Scan &\nECG',
    'medicines': 'Medicine',
    'insurance': 'Insurance',
    'fitness': 'Fitness',
    'equipment': 'Equipment',
    'caregiver': 'Caregiver\nSupport',
    'emergency': 'Emergency\nAssist',
    'meal': 'Meal\nService',
    'ac_repair': 'AC\nRepair',
    'plumbing': 'Plumbing',
    'cleaning': 'Cleaning',
    'driver': 'Driver',
    'bills': 'Bills',
    'bank': 'Bank\nWork',
    'grocery': 'Gro-\ncery',
    'anything': 'Anything\nElse',
    'paper_legal': 'Paper &\nLegal',
    'trip_travel': 'Trip &\nTravel',
    'tech_helper': 'Tech\nHelper',
    'smart_upgrade': 'Smart\nUpgrade',
  };

  const normalizedId = id.toLowerCase();
  const defaultVal = defaultEnglishLabels[normalizedId];

  if (fallbackLabel && defaultVal && fallbackLabel.replace(/\s+/g, '') !== defaultVal.replace(/\s+/g, '')) {
    return fallbackLabel;
  }

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
    'physio': 'services.physio_quick',
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
    'caregiver_quick': 'services.caregiver_quick',
    'scan_ecg': 'services.scan_ecg',
  };

  const key = keyMap[normalizedId];
  if (key && t(key) !== key) {
    return t(key);
  }
  return fallbackLabel;
};

const translateSectionTitle = (id: string, fallbackTitle: string, t: any, lang: string = 'en') => {
  if (fallbackTitle) {
    const trimmed = fallbackTitle.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed[lang]) return parsed[lang];
        if (parsed['en']) return parsed['en'];
      } catch (e) { }
    }
  }

  const defaultTitles: Record<string, string> = {
    'quick_services': 'Quick Services',
    'ayuxa_services': 'Diagnostics & Fitness',
    'essentials': 'Home Essentials Services',
  };

  const normalizedId = id.toLowerCase();
  const defaultVal = defaultTitles[normalizedId];

  if (fallbackTitle && defaultVal && fallbackTitle.replace(/\s+/g, '') !== defaultVal.replace(/\s+/g, '')) {
    return fallbackTitle;
  }

  const keyMap: Record<string, string> = {
    'quick_services': 'home.section_quick_services',
    'ayuxa_services': 'home.section_ayuxa_services',
    'essentials': 'home.section_essentials',
  };

  const key = keyMap[normalizedId];
  if (key && t(key) !== key) {
    return t(key);
  }
  return fallbackTitle;
};

const translateTrustBadgeLabel = (id: string, fallbackLabel: string, t: any, lang: string = 'en') => {
  if (fallbackLabel) {
    const trimmed = fallbackLabel.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed[lang]) return parsed[lang];
        if (parsed['en']) return parsed['en'];
      } catch (e) { }
    }
  }

  const defaultBadges: Record<string, string> = {
    'support': '24/7 Support',
    'caregivers': 'Verified Caregivers',
    'family': 'Family-first Care',
  };

  const normalizedId = id.toLowerCase();
  const defaultVal = defaultBadges[normalizedId];

  if (fallbackLabel && defaultVal && fallbackLabel.replace(/\s+/g, '') !== defaultVal.replace(/\s+/g, '')) {
    return fallbackLabel;
  }

  const keyMap: Record<string, string> = {
    'support': 'home.trust_support',
    'caregivers': 'home.trust_caregivers',
    'family': 'home.trust_family',
  };

  const key = keyMap[normalizedId];
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
  const { preferredLanguage } = useUser();
  return (
    <View style={s.quickServiceCard}>
      {section.services.map((item, index) => {
        const translatedLabel = translateServiceLabel(item.id, item.label, t, preferredLanguage);
        const [line1, line2] = translatedLabel.replace(/\\n/g, '\n').split('\n');
        return (
          <TouchableOpacity
            key={item.id}
            style={s.quickServiceBox}
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
  const { services, preferredLanguage } = useUser();

  // Find all active dynamic Diagnostics & Fitness services from database
  const dbDynamicServices = services
    .filter(
      sv =>
        sv.isDynamic &&
        sv.isEnabled &&
        sv.category === "DIAGNOSTICS_FITNESS"
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(sv => ({
      id: sv.slug,
      label: sv.name,
      icon: sv.icon || '🩺',
      route: sv.route || `/dynamic-service/${sv.slug}`,
      enabled: true
    }));

  const allServices = [...section.services, ...dbDynamicServices];

  const primaryItems = allServices.slice(0, 6);
  const remainingItems = allServices.slice(6);
  const visibleItems = expanded ? allServices : primaryItems;

  return (
    <View style={s.servicesCard}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{translateSectionTitle(section.id, section.title, t, preferredLanguage)}</Text>
      </View> 
      <View style={s.serviceGrid}>
        {visibleItems.map(item => {
          const translatedLabel = translateServiceLabel(item.id, item.label, t, preferredLanguage);
          const [line1, line2] = translatedLabel.replace(/\\n/g, '\n').split('\n');
          return (
            <TouchableOpacity
              key={item.id}
              style={[s.serviceGridItem, { width: itemWidth, height: cardHeight }]}
              onPress={() => router.push(resolveRoute(item.route, item.id) as any)}
            >
              {isEmoji(item.icon) ? (
                <View style={[s.serviceGridImage, { width: itemWidth, height: imageHeight, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCardMuted || '#F8FAFC' }]}>
                  <Text style={{ fontSize: 32 }}>{item.icon}</Text>
                </View>
              ) : (
                <Image
                  source={{ uri: getAssetUrl(item.icon) }}
                  style={[s.serviceGridImage, { width: itemWidth, height: imageHeight }]}
                  resizeMode="cover"
                />
              )}
              <View style={s.serviceGridLabelContainer}>
                <Text style={s.serviceGridLabel}>{line1}</Text>
                {line2 ? <Text style={s.serviceGridLabel}>{line2}</Text> : null}
              </View>
            </TouchableOpacity>
          );
        })}
        {Array.from({ length: (3 - (visibleItems.length % 3)) % 3 }).map((_, idx) => (
          <View key={`dummy-${idx}`} style={{ width: itemWidth, height: 0 }} />
        ))}
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
  const { services, preferredLanguage } = useUser();

  const enabledRoutesOrSlugs = new Set(
    (section.services || []).map(s => {
      const r = (s.route || '').toLowerCase().trim();
      const slug = r.startsWith('/') ? r.slice(1) : r;
      return [r, slug];
    }).flat()
  );

  // Filter active Home Essentials services from database
  const activeDbServices = services.filter(
    sv =>
      sv.serviceType === "HOME_ESSENTIALS" &&
      sv.isEnabled &&
      sv.slug !== "home-essentials" &&
      sv.slug !== "smart-upgrade" &&
      sv.slug !== "trip-travels"
  );

  // Map exactly using the server-defined services layout configuration order (section.services) capped at max_items (8)
  const rawItems = (section.services || []).map(layoutService => {
    // Find matching service in database by matching layout route/id to db slug/route
    const dbS = activeDbServices.find(ds => {
      const layoutRoute = (layoutService.route || '').toLowerCase().trim();
      const layoutSlug = layoutRoute.startsWith('/') ? layoutRoute.slice(1) : layoutRoute;
      return ds.slug.toLowerCase().trim() === layoutService.id.toLowerCase().trim() ||
             ds.slug.toLowerCase().trim() === layoutSlug ||
             (ds.route || '').toLowerCase().trim() === layoutRoute;
    });

    const route = layoutService.route || (dbS ? dbS.route || `/${dbS.slug}` : `/${layoutService.id}`);
    const label = layoutService.label || (dbS ? dbS.headline || dbS.name : layoutService.id);
    const slug = dbS ? dbS.slug : layoutService.id;
    const icon = layoutService.icon || dbS?.icon;

    return {
      id: layoutService.id || slug,
      slug: slug,
      label: label,
      route: route,
      iconAsset: (icon && !isEmoji(icon)) ? { uri: getAssetUrl(icon) } : (ICON_MAPPING[slug] || ICON_MAPPING[layoutService.id] || anythingElseIcon),
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  const items = rawItems.slice(0, section.max_items || 8);

  const rows: any[][] = [];
  for (let i = 0; i < items.length; i += 4) {
    const row = items.slice(i, i + 4);
    while (row.length < 4) {
      row.push({ isDummy: true, id: `dummy-${row.length}` } as any);
    }
    rows.push(row);
  }

  return (
    <View style={s.essentialsCard}>
      <View style={s.sectionHeader}>
        <Text style={s.essentialsTitle}>{translateSectionTitle(section.id, section.title, t, preferredLanguage)}</Text>
        {section.view_all_route && (
          <TouchableOpacity onPress={() => router.push(resolveRoute(section.view_all_route) as any)}>
            <Text style={s.viewAllSmall}>{t('common.view_all')}</Text>
          </TouchableOpacity>
        )}
      </View>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={s.essentialsRow}>
          {row.map(item => {
            if (item.isDummy) {
              return <View key={item.id} style={{ width: itemWidth, height: 0 }} />;
            }
            const displayLabel = translateServiceLabel(item.id, item.label, t, preferredLanguage);
            const [line1, line2] = displayLabel.replace(/\\n/g, '\n').split('\n');
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
  const { preferredLanguage } = useUser();
  return (
    <View style={s.trustCard}>
      {badges.map((badge, i) => (
        <React.Fragment key={badge.id}>
          <View style={s.trustItem}>
            <View style={s.trustIconCircle}>
              <Image source={{ uri: getAssetUrl(badge.icon) }} style={s.trustIcon} resizeMode="contain" />
            </View>
            <Text style={s.trustLabel}>{translateTrustBadgeLabel(badge.id, badge.label, t, preferredLanguage)}</Text>
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
  const { profile, selectedCity, setSelectedCity, services, refreshData } = useUser();
  const { cities } = useAppConfig();
  const colors = useThemeColors();

  // Initialize immediately with fallback — screen renders on first paint.
  // Firebase RC will update this in the background.
  const [homeConfig, setHomeConfig] = useState<HomeConfig>(() => sduiService.getHomeConfig());
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentLocationStr, setCurrentLocationStr] = useState('Loading...');
  const [isCitySupported, setIsCitySupported] = useState(true);
  const [featuredMeetup, setFeaturedMeetup] = useState<any>(null);
  const [userPinCode, setUserPinCode] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [hasConnectionError, setHasConnectionError] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isLoading]);

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
    setIsLoading(true);
    setHasConnectionError(false);

    // ── 1. Firebase RC — update SDUI config from MERN backend ─────────────────────
    sduiService.init(true)
      .then(() => {
        setHomeConfig(sduiService.getHomeConfig());
        setHasConnectionError(false);
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn('[Home] Failed to load layout config from MERN backend:', err);
        setHasConnectionError(true);
        setIsLoading(false);
      });

    // Refresh database services catalog as well
    refreshData().catch(() => {});

    // ── 2. Banners ─────────────────────────────────────────────────────────────
    bannerService.getHomeBanners(true)
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
  }, [cities, setSelectedCity, refreshData]);

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

  const { isDarkMode, toggleDarkMode, isLargeFont, fontScale, toggleFontScale } = useTheme();

  const s = makeStyles(colors, fontScale, isLargeFont);

  const { sections, trust_badges, sos_banner } = homeConfig;

  const quickServicesSection = sections.find(sec => sec.id === 'quick_services' || sec.type === 'quick_services');
  const serviceGridSection = sections.find(sec => sec.id === 'ayuxa_services' || sec.type === 'service_grid');
  const essentialsSection = sections.find(sec => sec.id === 'essentials' || sec.type === 'essentials_grid');

  if (isLoading && (!sections || sections.length === 0)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgScreen, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={{ alignItems: 'center', gap: 16 }}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }], marginBottom: 4 }}>
            <Image 
              source={logoSmall} 
              style={{ width: 85, height: 66, tintColor: '#02743F' }} 
              resizeMode="contain" 
            />
          </Animated.View>
          <ActivityIndicator size="large" color="#02743F" />
        </View>
      </SafeAreaView>
    );
  }

  if (hasConnectionError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgScreen, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={{ 
          backgroundColor: colors.bgCard, 
          borderRadius: 24, 
          padding: 28, 
          width: '100%', 
          alignItems: 'center', 
          borderWidth: 1.5,
          borderColor: colors.borderLight,
          gap: 16
        }}>
          <View style={{ 
            width: 72, 
            height: 72, 
            borderRadius: 36, 
            backgroundColor: '#FEF2F2', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}>
            <Ionicons name="cloud-offline-outline" size={36} color="#DC2626" />
          </View>
          
          <Text style={{ fontFamily: Fonts.bold, fontSize: 20, color: colors.textDark, textAlign: 'center' }}>
            Connection Offline
          </Text>
          
          <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 }}>
            Ayuxa server is currently unreachable. Please check your internet connection and try again.
          </Text>

          <TouchableOpacity 
            style={{ 
              backgroundColor: '#02743F', 
              paddingVertical: 12, 
              paddingHorizontal: 24, 
              borderRadius: 30, 
              flexDirection: 'row', 
              alignItems: 'center', 
              gap: 8,
              marginTop: 8
            }}
            onPress={refetchAllHomeData}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={{ fontFamily: Fonts.bold, fontSize: 14, color: '#FAF7ED' }}>
              Tap to Retry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={s.screen}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <SafeAreaView edges={['top']} style={s.headerSafe}>
        <View style={s.header}>
          <Image source={logoSmall} style={s.logoSmall} resizeMode="contain" />
          <TouchableOpacity style={s.locationPill} onPress={() => router.push('/(auth)/city-selection')}>
            <Ionicons name="location-sharp" size={15} color={colors.primary} />
            <Text style={s.locationText} numberOfLines={1}>
              {currentLocationStr === 'Loading...' ? t('home.location_loading') :
               currentLocationStr === 'Location Unavailable' ? t('home.location_unavailable') :
               currentLocationStr === 'Enable in Settings' ? t('home.enable_in_settings') :
               currentLocationStr === 'Location Required' ? t('home.location_required') :
               currentLocationStr}
            </Text>
          </TouchableOpacity>
          <View style={s.headerRight}>
            {/* Theme Toggle */}
            <TouchableOpacity style={s.themeToggleBtn} onPress={() => toggleDarkMode(!isDarkMode)}>
              <Ionicons name={isDarkMode ? 'moon' : 'sunny'} size={14} color={isDarkMode ? '#F59E0B' : colors.primary} />
              <Text style={s.themeToggleText}>{isDarkMode ? 'NIGHT' : 'DAY'}</Text>
            </TouchableOpacity>

            {/* Font Size Toggle */}
            <TouchableOpacity style={s.fontToggleBtn} onPress={toggleFontScale}>
              <Text style={s.fontToggleText}>Aa</Text>
            </TouchableOpacity>

            {/* SOS Circle */}
            <TouchableOpacity onPress={() => router.push('/sos-emergency')}>
              <LinearGradient colors={['#FF4B2B', '#FF416C']} style={s.sosCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={s.sosCircleText}>SOS</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Notification Bell */}
            <TouchableOpacity onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications" size={22} color={colors.primary} />
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

        {/* Enhanced Green Greeting Card */}
        <LinearGradient
          colors={isDarkMode ? ['#013D21', '#025C32', '#004D25'] : ['#013D21', '#025C32', '#004D25']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.newGreetingBanner}
        >
          {/* Top-Right Dot Matrix Grid Texture */}
          <View style={s.dotMatrixContainer}>
            {Array.from({ length: 24 }).map((_, i) => (
              <View key={i} style={s.dotMatrixDot} />
            ))}
          </View>

          {/* Bottom Elegant Vector ECG Heartbeat Line Texture */}
          <View style={s.ekgLineOverlay} pointerEvents="none">
            <Svg width="360" height="70" viewBox="0 0 360 70" fill="none">
              <Path
                d="M 0 35 L 60 35 L 72 26 L 84 44 L 96 12 L 110 58 L 122 22 L 134 38 L 144 35 L 220 35 L 230 26 L 242 44 L 254 12 L 268 58 L 280 22 L 292 38 L 302 35 L 360 35"
                stroke="rgba(255, 255, 255, 0.16)"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>

          {/* Soft Background Glow Circles */}
          <View style={{
            position: 'absolute',
            bottom: -50,
            right: -20,
            width: 160,
            height: 160,
            borderRadius: 80,
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
          }} />

          <View style={s.greetingContent}>
            <View style={s.greetingTextContainer}>
              <Text style={s.newGreetingTimeText}>
                {t(currentHour >= 16 ? 'home.greeting_evening' : currentHour >= 12 ? 'home.greeting_afternoon' : 'home.greeting_morning')},
              </Text>
              <Text style={s.newGreetingNameText}>
                {userName} <Text style={{ color: '#FBBF24' }}>✦</Text>
              </Text>
              <Text style={s.newGreetingSubtitle}>
                {homeConfig.greeting_banner?.subtitle || t('home.greeting_subtitle')}
              </Text>
              <View style={s.goldenAccentLine} />
              <TouchableOpacity onPress={() => router.push('/my-bookings')} style={s.bookingStatusBtn}>
                <Ionicons name="calendar-outline" size={15} color="#02743F" />
                <Text style={s.bookingStatusBtnText}>{t('home.booking_status')}</Text>
                <Ionicons name="arrow-forward-outline" size={14} color="#02743F" />
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
        </LinearGradient>

        {/* Dynamic Sections Loop */}
        {[...sections]
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map((section) => {
            if (!section.enabled) return null;

            switch (section.type) {
              case 'quick_services':
                return (
                  <QuickServicesStrip
                    key={section.id}
                    section={section}
                    itemWidth={exactEssentialItemWidth}
                    cardHeight={exactEssentialCardHeight}
                    colors={colors}
                  />
                );
              case 'service_grid':
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
              case 'essentials_grid':
                return (services.find(s => s.slug === "home-essentials")?.isEnabled ?? true) && (
                  <EssentialsGrid
                    key={section.id}
                    section={section}
                    itemWidth={exactEssentialItemWidth}
                    cardHeight={exactEssentialCardHeight}
                    colors={colors}
                  />
                );
              case 'custom_card':
              case 'banner_card':
                return (
                  <TouchableOpacity
                    key={section.id}
                    style={s.customCardContainer}
                    onPress={() => section.view_all_route && router.push(section.view_all_route as any)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: section.image_url?.startsWith('http') ? section.image_url : getAssetUrl(section.image_url || 'banner.png') }}
                      style={s.customCardImage}
                      resizeMode="cover"
                    />
                    <View style={s.customCardOverlay}>
                      <View style={s.customCardTextGroup}>
                        <Text style={s.customCardTitle}>{section.title || "Plan Your Next Travel"}</Text>
                        <Text style={s.customCardSubtitle}>{section.subtitle || "Tell us where you want to go."}</Text>
                      </View>
                      <View style={s.customCardCta}>
                        <Text style={s.customCardCtaText}>{section.cta_text || "Share Now"}</Text>
                        <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              default:
                return null;
            }
          })}

        {/* Banner Slider */}
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

function makeStyles(c: ThemeColors, fontScale: number = 1.0, isLargeFont: boolean = false) {
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
      paddingHorizontal: 10,
      paddingBottom: 10,
      paddingTop: 10,
      gap: 6,
    },
    logoSmall: { width: 36, height: 28 },
    locationPill: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: c.bgCardMuted,
      borderRadius: Radius.full,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginHorizontal: 4,
      flex: 1,
      gap: 4,
    },
    locationText: { fontFamily: Fonts.medium, fontSize: Math.round(11.5 * fontScale), color: c.textBody, flex: 1 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    themeToggleBtn: {
      backgroundColor: c.bgCardMuted,
      borderRadius: Radius.full,
      paddingVertical: 5,
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    themeToggleText: { fontFamily: Fonts.semiBold, fontSize: Math.round(10 * fontScale), color: c.primary },
    fontToggleBtn: {
      backgroundColor: isLargeFont ? c.primary : c.bgCardMuted,
      borderRadius: Radius.full,
      paddingVertical: 5,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isLargeFont ? c.primary : c.borderLight,
    },
    fontToggleText: { fontFamily: Fonts.bold, fontSize: Math.round(11 * fontScale), color: isLargeFont ? '#FFFFFF' : c.primary },
    sosCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', ...Shadow.card },
    sosCircleText: { fontFamily: Fonts.bold, fontSize: 10, color: c.textWhite },

    scrollView: { flex: 1 },
    scrollContent: { paddingTop: 10, paddingBottom: 120 },

    newGreetingBanner: {
      marginHorizontal: Spacing.cardMargin,
      marginTop: Spacing.sectionGap,
      borderRadius: 20,
      paddingVertical: 20,
      paddingHorizontal: 20,
      position: 'relative',
      overflow: 'hidden',
      elevation: 0,
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
    },
    dotMatrixContainer: {
      position: 'absolute',
      top: 14,
      right: 14,
      width: 72,
      height: 48,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      opacity: 0.22,
      zIndex: 1,
    },
    dotMatrixDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: '#FAF7ED',
    },
    ekgLineOverlay: {
      position: 'absolute',
      bottom: 6,
      left: 0,
      right: 0,
      zIndex: 1,
    },
    greetingContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 },
    greetingTextContainer: { flex: 1, marginRight: 12 },
    newGreetingTimeText: { fontFamily: Fonts.bold, fontSize: Math.round(20 * fontScale), color: '#FAF7ED', lineHeight: Math.round(26 * fontScale) },
    newGreetingNameText: { fontFamily: Fonts.bold, fontSize: Math.round(20 * fontScale), color: '#FAF7ED', lineHeight: Math.round(26 * fontScale), marginBottom: 6 },
    newGreetingSubtitle: { fontFamily: Fonts.semiBold, fontSize: Math.round(12.5 * fontScale), color: '#FEF08A', opacity: 0.95, lineHeight: Math.round(18 * fontScale) },
    goldenAccentLine: { width: 36, height: 2, backgroundColor: '#FACC15', borderRadius: 1, marginTop: 6, marginBottom: 14 },
    bookingStatusBtn: {
      backgroundColor: '#FAF7ED',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: Radius.full,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 2,
    },
    bookingStatusBtnText: { fontFamily: Fonts.bold, fontSize: Math.round(12 * fontScale), color: '#02743F' },
    greetingAvatarContainer: { width: 96, height: 96, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    greetingAvatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3.5, borderColor: 'rgba(255, 255, 255, 0.85)' },
    greetingAvatarPlaceholder: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#FAF7ED', justifyContent: 'center', alignItems: 'center', borderWidth: 3.5, borderColor: 'rgba(255, 255, 255, 0.85)' },

    featuredMeetupCard: {
      marginHorizontal: Spacing.cardMargin,
      marginTop: Spacing.md,
      marginBottom: Spacing.md,
      borderRadius: Radius.lg,
      overflow: 'hidden',
      height: 220,
      ...Shadow.card,
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
    featuredMeetupBadge: { fontFamily: Fonts.semiBold, fontSize: 10, color: '#FAF7ED', backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    featuredMeetupTitle: { fontFamily: Fonts.semiBold, fontSize: 14, color: '#FAF7ED', marginTop: 6, lineHeight: 18 },
    featuredMeetupMeta: { gap: 8 },
    featuredMeetupMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    featuredMeetupMetaText: { fontFamily: Fonts.regular, fontSize: 11, color: 'rgba(255,255,255,0.85)' },
    featuredMeetupFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
    featuredMeetupPrice: { fontFamily: Fonts.bold, fontSize: 16, color: '#FAF7ED' },

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
      borderWidth: 1.5,
      borderColor: c.primary,
      ...Shadow.card,
    },
    comingSoonContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    comingSoonTextRow: { marginLeft: 12, flex: 1 },
    comingSoonTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: c.textDark, marginBottom: 2 },
    comingSoonDesc: { fontFamily: Fonts.regular, fontSize: 12, color: c.textMuted },
    notifyMeButton: { backgroundColor: c.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
    notifyMeText: { fontFamily: Fonts.medium, fontSize: 14, color: '#FAF7ED' },

    customCardContainer: {
      marginHorizontal: Spacing.cardMargin,
      marginTop: Spacing.sectionGap,
      borderRadius: 20,
      overflow: 'hidden',
      height: 240,
      backgroundColor: c.bgCard,
      ...Shadow.card,
    },
    customCardImage: {
      position: 'absolute',
      width: '100%',
      height: '100%',
    },
    customCardOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
      padding: 20,
      justifyContent: 'flex-end',
      gap: 12,
    },
    customCardTextGroup: {
      gap: 4,
    },
    customCardTitle: {
      fontFamily: Fonts.bold,
      fontSize: Math.round(17 * fontScale),
      lineHeight: Math.round(22 * fontScale),
      color: '#FAF7ED',
    },
    customCardSubtitle: {
      fontFamily: Fonts.medium,
      fontSize: Math.round(12 * fontScale),
      lineHeight: Math.round(16 * fontScale),
      color: 'rgba(255, 255, 255, 0.9)',
    },
    customCardCta: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#02743F', // Green CTA background matching mockup reference
      paddingVertical: 7,
      paddingHorizontal: 16,
      borderRadius: 30,
      gap: 6,
      alignSelf: 'flex-start',
    },
    customCardCtaText: {
      fontFamily: Fonts.bold,
      fontSize: Math.round(11.5 * fontScale),
      color: '#FAF7ED',
    },

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
