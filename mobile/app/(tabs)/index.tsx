// Home Screen — Responsive Flexbox Layout with Design Tokens
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

// ─── Figma-exported assets ───
const logoSmall = require('@/assets/images/9d3e74b5e16af4e10bcec4b72af07a9d93ea14b8.png');
const greetingBanner = require('@/assets/images/63e6c29e1ee4daac9d964f5b379bfa5d992c8dec.png');
// Quick service icons
const doctorIcon = require('@/assets/images/98e939543c86f26f5f26210bb160eb927b5ff057.png');
const nursingIcon = require('@/assets/images/21e5a8a8650cf8eda36be3744c70099580173129.png');
const caregiverIcon = require('@/assets/images/2fb222a5f206ff64415b72a8d4ac9290b4e6f720.png');
const emergencyIcon = require('@/assets/images/e1baef7b977f856b4e0401f74fbf21e0ce5348f7.png');
// Service grid images
const doctorVisitImg = require('@/assets/images/32a4661f97e2fa2dd2c85c403a7c530b7214e7f7.png');
const homingNursingImg = require('@/assets/images/afd8e2afab202de7ddce09bf8add378c861b9347.png');
const fitnessTherapyImg = require('@/assets/images/54f5c849cf75e776592dec8236f221da3694ca53.png');
const homeBloodTestImg = require('@/assets/images/f74321d18a86a9e77628058ed35a50d284752eb2.png');
const orderMedicineImg = require('@/assets/images/79c15725f6f1a73658b615886f1289634cef9408.png');
const rentEquipmentImg = require('@/assets/images/d3906f517597b2ef10369d92c422b16bf20e879e.png');
const physioFitnessImg = require('@/assets/images/4ea419052803769fad63ff4292316ce7f8f77dbc.png');
const mealServiceImg = require('@/assets/images/8f136eff1200bb21c080348f6cdb7ad1c2831bdf.png');
// Trust badges
const supportIcon = require('@/assets/images/cea3b8dc2ce488942e83a8a4cd0dbe1e6173764b.png');
const caregiversIcon = require('@/assets/images/4dcdffbd537a1de53d947d7f0c7c548318bc85a7.png');
const familyCareIcon = require('@/assets/images/f90ea6c9d084318475183b0a2f11175f0f34640e.png');
// SOS banner
const sosIcon = require('@/assets/images/5eedb2a89f68f0fea90ef304401e7d38d0fc1790.png');
const medicalReportIcon = require('@/assets/images/e453f94c7e87531b0da0b6712f8dc4b3bc7084a9.png');
// Home essentials icons
const acRepairIcon = require('@/assets/images/fa6360cf6179cebaed29a6c808bafae2d31ad753.png');
const plumbingIcon = require('@/assets/images/8ce612b04a3a83f1e834c7b71a6dd2c0174cb918.png');
const cleaningIcon = require('@/assets/images/ad6b9b061bc7b1487a0e73c2557f711136d2a4d9.png');
const driverIcon = require('@/assets/images/60d4d0afa5801aeaa9e593bc049e3b017ef5624c.png');
const billsIcon = require('@/assets/images/056ecb9c01dd2283b1c0db1e84c1eb94c6d8a45a.png');
const bankWorkIcon = require('@/assets/images/33ede0e57be708b9775957c3ecec7013b0a56c6d.png');
const groceryIcon = require('@/assets/images/8888c71f466119aa294bd00136ff887f616d4737.png');
const anythingElseIcon = require('@/assets/images/6c8ed456023258e8b4095af93909c6cbc6c4b909.png');

// ─── Data for quick services and grids ───
const QUICK_SERVICES = [
  { icon: doctorIcon, label1: 'Oldful', label2: '' },
  { icon: nursingIcon, label1: 'Nursing', label2: 'Care' },
  { icon: caregiverIcon, label1: 'Caregiver', label2: 'Support' },
  { icon: emergencyIcon, label1: 'Emergency', label2: 'Assist' },
];

const SERVICE_GRID = [
  { image: doctorVisitImg, label1: 'Doctor', label2: 'Visit', route: '/doctor-visit' },
  { image: homingNursingImg, label1: 'Homing', label2: 'Nursing', route: '/nurse-care' },
  { image: homeBloodTestImg, label1: 'Home', label2: 'Blood Test', route: '/blood-test' },
  { image: fitnessTherapyImg, label1: 'Fitness &', label2: 'Therapy', route: '/physio-fitness' },
  { image: rentEquipmentImg, label1: 'Rent Medical', label2: 'Equipment', route: '/medical-equipment' },
  { image: orderMedicineImg, label1: 'Order', label2: 'Medicines', route: '/order-medicines' },
  { image: mealServiceImg, label1: 'Meal', label2: 'Service', route: '/meal-service' },
  { image: physioFitnessImg, label1: 'Physio', label2: 'Fitness', route: '/physio-fitness' },
  { image: emergencyIcon, label1: 'Hospital', label2: 'Trip', route: '/hospital-trip' },
  { image: medicalReportIcon, label1: 'Insurance', label2: '& Claims', route: '/insurance' },
];

const TRUST_BADGES = [
  { icon: supportIcon, label: '24/7 Support' },
  { icon: caregiversIcon, label: 'Verified Caregivers' },
  { icon: familyCareIcon, label: 'Family-first Care' },
];

const ESSENTIALS_ROW1 = [
  { icon: acRepairIcon, label: 'AC\nRepair', route: '/appliance-repair' },
  { icon: plumbingIcon, label: 'Plumbing', route: '/plumbing-electrical' },
  { icon: cleaningIcon, label: 'Cleaning', route: '/deep-cleaning' },
  { icon: driverIcon, label: 'Driver', route: '/driving-cab' },
];
const ESSENTIALS_ROW2 = [
  { icon: billsIcon, label: 'Bills', route: '/bill-payment' },
  { icon: bankWorkIcon, label: 'Bank\nWork', route: '/bank-paperwork' },
  { icon: groceryIcon, label: 'Gro-\ncery', route: '/grocery-run' },
  { icon: anythingElseIcon, label: 'Anything\nElse', route: '/anything-else' },
];
const ESSENTIALS_ROW3 = [
  { icon: bankWorkIcon, label: 'Paper &\nLegal', route: '/paper-legal' },
  { icon: driverIcon, label: 'Trip &\nTravel', route: '/trip-travels' },
  { icon: acRepairIcon, label: 'Tech\nHelper', route: '/tech-helper' },
  { icon: cleaningIcon, label: 'Smart\nUpgrade', route: '/smart-upgrade' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [currentLocationStr, setCurrentLocationStr] = React.useState('Loading...');

  // Fetch Location on mount
  React.useEffect(() => {
    (async () => {
      try {
        const hasPermission = await locationService.requestPermission();
        if (hasPermission) {
          const coords = await locationService.getCurrentLocation();

          // For the home screen pill we only want the city area, not the full address.
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
      } catch (err) {
        console.error("Home screen location error:", err);
        setCurrentLocationStr('Location Required');
      }
    })();
  }, []);

  // ─── MATH.FLOOR PIXEL CALCS (Prevents Sub-Pixel Wrapping on iOS) ───
  // Total screen minus 15px outer margin (x2) minus 15px inner padding (x2)
  const availableWidth = width - 60;

  // Oldful Grid: We want 3 items. 31.5% ensures enough room for space-between to do its job.
  const exactOldfulItemWidth = Math.floor(availableWidth * 0.315);
  // Lock Heights absolutely so flex cannot stretch them
  const exactOldfulImageHeight = exactOldfulItemWidth * 0.85;
  const exactOldfulCardHeight = exactOldfulImageHeight + 56; // Image + Text area

  // Essentials Grid: We want 4 items.
  const exactEssentialItemWidth = Math.floor(availableWidth * 0.23);
  const exactEssentialCardHeight = exactEssentialItemWidth * 1.35;

  // ─── ALIGNMENT FIX FOR LAST ROW ───
  // We truncate to top 6 items for the home screen so it doesn't get cluttered.
  const homeServiceGrid = SERVICE_GRID.slice(0, 6);

  // ─── Dynamic Greeting Logic ───
  const userName = "Shankar";
  const currentHour = new Date().getHours();
  const greeting = currentHour >= 16 ? "Good Evening" : currentHour >= 12 ? "Good Afternoon" : "Good Morning";

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      {/* ═══════════════ FIXED HEADER ═══════════════ */}
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

      {/* ═══════════════ SCROLLABLE CONTENT ═══════════════ */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ─── Greeting Banner ─── */}
        <ImageBackground source={greetingBanner} style={styles.greetingBanner} resizeMode="cover">
          <Text style={styles.greetingTitle}>{greeting}, {userName}</Text>
        </ImageBackground>

        {/* ─── Quick Service Strip ─── */}
        <View style={styles.quickServiceCard}>
          {QUICK_SERVICES.map((item, i) => {
            const routes = ['/doctor-visit', '/nurse-care', '/nurse-care', '/sos-emergency'];
            return (
              <TouchableOpacity key={i} style={styles.quickServiceBox} onPress={() => router.push(routes[i] as any)}>
                <Image source={item.icon} style={styles.quickServiceIcon} resizeMode="contain" />
                <Text style={styles.quickServiceLabel}>{item.label1}</Text>
                {item.label2 ? <Text style={styles.quickServiceLabel}>{item.label2}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── Oldful Services Grid ─── */}
        <View style={styles.servicesCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Oldful Services</Text>
            <TouchableOpacity onPress={() => router.push('/all-oldful-services' as any)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.serviceGrid}>
            {homeServiceGrid.map((item, i) => {
              if ('empty' in item) {
                return <View key={`empty-${i}`} style={{ width: exactOldfulItemWidth }} />;
              }

              return (
                <TouchableOpacity
                  key={`service-${i}`}
                  style={[styles.serviceGridItem, { width: exactOldfulItemWidth, height: exactOldfulCardHeight }]}
                  onPress={() => router.push(item.route as any)}
                >
                  <Image
                    source={item.image}
                    style={[styles.serviceGridImage, { width: exactOldfulItemWidth, height: exactOldfulImageHeight }]}
                    resizeMode="cover"
                  />
                  <View style={styles.serviceGridLabelContainer}>
                    <Text style={styles.serviceGridLabel}>{item.label1}</Text>
                    {item.label2 ? <Text style={styles.serviceGridLabel}>{item.label2}</Text> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─── Trust Badges ─── */}
        <View style={styles.trustCard}>
          {TRUST_BADGES.map((badge, i) => (
            <React.Fragment key={i}>
              <View style={styles.trustItem}>
                <Image source={badge.icon} style={styles.trustIcon} resizeMode="contain" />
                <Text style={styles.trustLabel}>{badge.label}</Text>
              </View>
              {i < TRUST_BADGES.length - 1 && <View style={styles.trustDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ─── SOS Emergency Banner ─── */}
        <View style={styles.sosBanner}>
          <View style={styles.sosContent}>
            <Image source={sosIcon} style={styles.sosIcon} resizeMode="contain" />
            <View style={styles.sosTextGroup}>
              <Text style={styles.sosTitle}>Need Immediate</Text>
              <Text style={styles.sosTitle}>Medical Support?</Text>
              <TouchableOpacity style={styles.sosButton} onPress={() => router.push('/sos-emergency')}>
                <Text style={styles.sosButtonText}>Click here</Text>
                <Ionicons name="arrow-forward" size={10} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
          <Image source={medicalReportIcon} style={styles.sosIllustration} resizeMode="contain" />
        </View>

        {/* ─── Home Essentials Services ─── */}
        <View style={styles.essentialsCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.essentialsTitle}>Home Essentials Services</Text>
            <TouchableOpacity onPress={() => router.push('/all-home-essentials' as any)}>
              <Text style={styles.viewAllSmall}>View All</Text>
            </TouchableOpacity>
          </View>
          {/* Row 1 */}
          <View style={styles.essentialsRow}>
            {ESSENTIALS_ROW1.map((item, i) => (
              <TouchableOpacity
                key={`r1-${i}`}
                style={[styles.essentialItem, { width: exactEssentialItemWidth, height: exactEssentialCardHeight }]}
                onPress={() => router.push(item.route as any)}
              >
                <View style={styles.essentialIconCircle}>
                  <Image source={item.icon} style={styles.essentialIcon} resizeMode="contain" />
                </View>
                <Text style={styles.essentialLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Row 2 */}
          <View style={styles.essentialsRow}>
            {ESSENTIALS_ROW2.map((item, i) => (
              <TouchableOpacity
                key={`r2-${i}`}
                style={[styles.essentialItem, { width: exactEssentialItemWidth, height: exactEssentialCardHeight }]}
                onPress={() => router.push(item.route as any)}
              >
                <View style={styles.essentialIconCircle}>
                  <Image source={item.icon} style={styles.essentialIcon} resizeMode="contain" />
                </View>
                <Text style={styles.essentialLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  /* ═══ Screen ═══ */
  screen: {
    flex: 1,
    backgroundColor: Colors.bgScreen,
  },

  /* ═══ Fixed Header ═══ */
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
    justifyContent: 'space-between', // Forces items to space evenly
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.md,
  },
  logoSmall: {
    width: 42, // Increased width
    height: 32, // Increased height
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
    marginHorizontal: Spacing.sm, // Replaced marginLeft with marginHorizontal to perfectly balance both sides
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

  /* ═══ Scroll ═══ */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  /* ═══ Greeting Banner ═══ */
  greetingBanner: {
    height: 117,
    width: 'auto',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  greetingTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.heading2,
    color: Colors.textWhite,
  },

  /* ═══ Quick Service Strip ═══ */
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

  /* ═══ Oldful Services Grid ═══ */
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

  /* ═══ Trust Badges ═══ */
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

  /* ═══ SOS Emergency Banner ═══ */
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

  /* ═══ Home Essentials Services ═══ */
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