import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import JailMonkey from 'jail-monkey';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { useTranslation } from 'react-i18next';
import { CustomAlertModal } from '@/components/common/CustomAlertModal';
import { appMessageService, AppMessage } from '@/services/api/appMessageService';
import { notificationService } from '@/services/device/notificationService';
import 'react-native-reanimated';
import '@/i18n/i18n';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useInAppUpdate } from '@/hooks/use-in-app-update';
import { AuthProvider } from '@/context/AuthContext';
import { UserProvider, useUser } from '@/context/UserContext';
import { AddressProvider } from '@/context/AddressContext';
import { BookingProvider } from '@/context/BookingContext';
import { CartProvider } from '@/context/CartContext';
import { AppConfigProvider } from '@/context/AppConfigContext';
import { ThemeProvider, useTheme, ThemeContext } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';

// Intercept all Text rendering for global font size scaling
const RN = require('react-native');
const OriginalText = RN.Text;

// Completely disable all pop-up alert dialogs across the application
if (RN.Alert) {
  RN.Alert.alert = () => {};
}

if (OriginalText) {
  const ScaledText = React.forwardRef((props: any, ref: any) => {
    // Subscribe to ThemeContext updates to trigger re-renders dynamically!
    const theme = useContext(ThemeContext);
    const scale = theme?.fontScale || 1.0;

    let { style, children, ...rest } = props;

    if (scale !== 1.0 && style) {
      const flattenStyle = StyleSheet.flatten(style);
      if (flattenStyle && typeof flattenStyle.fontSize === 'number') {
        const newFontSize = Math.round(flattenStyle.fontSize * scale);
        const override: any = { fontSize: newFontSize };
        if (typeof flattenStyle.lineHeight === 'number') {
          override.lineHeight = Math.round(flattenStyle.lineHeight * scale);
        }
        style = [style, override];
      }
    }

    return (
      <OriginalText ref={ref} style={style} {...rest}>
        {children}
      </OriginalText>
    );
  });

  (ScaledText as any).displayName = 'Text';

  Object.defineProperty(RN, 'Text', {
    configurable: true,
    enumerable: true,
    get() {
      return ScaledText;
    },
  });
}

// Keep the native splash visible until splash.tsx explicitly hides it.
// Never hide it here — doing so causes a blank/Metro screen gap.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  // Start loading fonts in the background. We do NOT block rendering on this —
  // the native splash stays up, then splash.tsx takes over.
  useFonts({
    'Poppins-SemiBold': 'https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-SemiBold.ttf',
    'Poppins-Bold': 'https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf',
    'Poppins_600SemiBold': 'https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-SemiBold.ttf',
    'Poppins_700Bold': 'https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf',
    'LexendDeca-Light': 'https://github.com/google/fonts/raw/main/ofl/lexenddeca/LexendDeca%5Bwght%5D.ttf',
    'LexendDeca-Regular': 'https://github.com/google/fonts/raw/main/ofl/lexenddeca/LexendDeca%5Bwght%5D.ttf',
    'LexendDeca-Medium': 'https://github.com/google/fonts/raw/main/ofl/lexenddeca/LexendDeca%5Bwght%5D.ttf',
    'LexendDeca_300Light': 'https://github.com/google/fonts/raw/main/ofl/lexenddeca/LexendDeca%5Bwght%5D.ttf',
    'LexendDeca_400Regular': 'https://github.com/google/fonts/raw/main/ofl/lexenddeca/LexendDeca%5Bwght%5D.ttf',
    'LexendDeca_500Medium': 'https://github.com/google/fonts/raw/main/ofl/lexenddeca/LexendDeca%5Bwght%5D.ttf',
  });

  return (
    <SafeAreaProvider>
    <AppConfigProvider>
      <AuthProvider>
        <UserProvider>
          <AddressProvider>
            <ThemeProvider>
              <BookingProvider>
                <CartProvider>
                  <ToastProvider>
                    <RootLayoutContent />
                  </ToastProvider>
                </CartProvider>
              </BookingProvider>
            </ThemeProvider>
          </AddressProvider>
        </UserProvider>
      </AuthProvider>
    </AppConfigProvider>
    </SafeAreaProvider>
  );
}

// Warn-only per the elder-care/healthcare context: a false positive on a
// legitimate patient's device (some detectors misfire on custom ROMs/OEM
// software) must never lock them out of their care. Shown once per app
// install (persisted via AsyncStorage), not on every launch — a user who
// already acknowledged it shouldn't be nagged every time they open the app.
const ROOTED_WARNING_SEEN_KEY = 'ayuxa_rooted_warning_seen';

// Spec 6.1 "Wish & Information > Birthday Wishes": popup once per birthday
// year, never again for that same birthday once dismissed. Key is scoped to
// the year so next year's birthday shows again automatically — no reset job
// needed, unlike a permanent seen-flag.
const birthdayWishSeenKey = (year: number) => `ayuxa_birthday_wish_seen_${year}`;

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const { profile } = useUser();
  const [showRootedWarning, setShowRootedWarning] = useState(false);
  const [showBirthdayWish, setShowBirthdayWish] = useState(false);
  const [activeAppMessage, setActiveAppMessage] = useState<AppMessage | null>(null);

  // Google Play In-App Updates (Android). All UI is Play Core's own.
  useInAppUpdate();

  // App-wide screenshot/screen-recording block, active from the moment the
  // app opens (not just on individual PHI screens) — this app deals with
  // medical data end to end, not only on the handful of screens that used to
  // carry their own usePreventScreenCapture() call.
  usePreventScreenCapture('app-wide');

  useEffect(() => {
    (async () => {
      try {
        if (!JailMonkey.isJailBroken()) return;
        const alreadySeen = await AsyncStorage.getItem(ROOTED_WARNING_SEEN_KEY);
        if (!alreadySeen) setShowRootedWarning(true);
      } catch {
        // Detection failing shouldn't ever block app usage.
      }
    })();
  }, []);

  const dismissRootedWarning = () => {
    setShowRootedWarning(false);
    AsyncStorage.setItem(ROOTED_WARNING_SEEN_KEY, 'true').catch(() => {});
  };

  useEffect(() => {
    if (!profile?.dateOfBirth) return;
    (async () => {
      try {
        const dob = new Date(profile.dateOfBirth as string);
        const today = new Date();
        const isBirthdayToday = dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate();
        if (!isBirthdayToday) return;

        const key = birthdayWishSeenKey(today.getFullYear());
        const alreadySeen = await AsyncStorage.getItem(key);
        if (!alreadySeen) setShowBirthdayWish(true);
      } catch {
        // Never block app usage over a popup.
      }
    })();
  }, [profile?.dateOfBirth]);

  const dismissBirthdayWish = () => {
    setShowBirthdayWish(false);
    AsyncStorage.setItem(birthdayWishSeenKey(new Date().getFullYear()), 'true').catch(() => {});
  };

  // Spec 6.4: dismissal state is tracked server-side per (customer, message,
  // version) — not AsyncStorage — so /active already accounts for the 24h
  // re-show cooldown and permanent dismissal. Only fetch once logged in
  // (endpoint requires auth); profile.id changing (e.g. login/logout) re-checks.
  const fetchActiveMessage = async () => {
    try {
      const res = await appMessageService.getActive();
      const message = res.success ? res.data : null;
      if (message) setActiveAppMessage(message);
    } catch {
      // Never block app usage over a popup.
    }
  };

  useEffect(() => {
    if (!profile?.id) return;
    fetchActiveMessage();
  }, [profile?.id]);

  // A Wish & Information push arrives when an admin creates one while the
  // user already has the app open — the login-only fetch above would miss
  // it, so re-check /active on receipt (foreground or background tap).
  useEffect(() => {
    if (!profile?.id) return;
    const sub = notificationService.addNotificationListener((notification) => {
      if (notification.request.content.data?.type === 'app_message') fetchActiveMessage();
    });
    return () => sub.remove();
  }, [profile?.id]);

  // Spec 6.3: OK/Agree -> acknowledge (never shown again). Dismiss -> dismiss
  // (re-shown once after 24h, then never). Both are recorded server-side.
  const acknowledgeAppMessage = () => {
    const message = activeAppMessage;
    setActiveAppMessage(null);
    if (message) appMessageService.acknowledge(message.id).catch(() => {});
  };

  const dismissAppMessage = () => {
    const message = activeAppMessage;
    setActiveAppMessage(null);
    if (message) appMessageService.dismiss(message.id).catch(() => {});
  };

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Auth / Onboarding Flow */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

        {/* Main App with Bottom Tabs */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Feature Flows */}
        <Stack.Screen name="doctor-visit" options={{ headerShown: false }} />
        <Stack.Screen name="nurse-care" options={{ headerShown: false }} />
        <Stack.Screen name="caregiver-support" options={{ headerShown: false }} />
        <Stack.Screen name="transportation" options={{ headerShown: false }} />
        <Stack.Screen name="insurance" options={{ headerShown: false }} />
        <Stack.Screen name="payment" options={{ headerShown: false }} />

        {/* Wellness Store */}
        <Stack.Screen name="wellness-product" options={{ headerShown: false }} />

        {/* Standalone Screens */}
        <Stack.Screen name="sos-emergency" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: false }} />

        {/* Checkout & Confirmation */}
        <Stack.Screen name="service-checkout" options={{ headerShown: false }} />
        <Stack.Screen name="service-confirmation" options={{ headerShown: false }} />

        {/* Bookings & History */}
        <Stack.Screen name="my-bookings" options={{ headerShown: false }} />
        <Stack.Screen name="booking-details" options={{ headerShown: false }} />
        <Stack.Screen name="my-prescriptions" options={{ headerShown: false }} />
        <Stack.Screen name="order-history" options={{ headerShown: false }} />

        {/* Profile sub-screens */}
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="family-members" options={{ headerShown: false }} />
        <Stack.Screen name="emergency-contacts" options={{ headerShown: false }} />
        <Stack.Screen name="my-sos-alerts" options={{ headerShown: false }} />
        <Stack.Screen name="refer-earn" options={{ headerShown: false }} />
        <Stack.Screen name="medical-card" options={{ headerShown: false }} />
        <Stack.Screen name="manage-addresses" options={{ headerShown: false }} />
        <Stack.Screen name="payments-wallet" options={{ headerShown: false }} />
        <Stack.Screen name="help-support" options={{ headerShown: false }} />
        <Stack.Screen name="ticket-chat" options={{ headerShown: false }} />
        <Stack.Screen name="terms-policy" options={{ headerShown: false }} />
        <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
        <Stack.Screen name="refund-policy" options={{ headerShown: false }} />
        <Stack.Screen name="rate-us" options={{ headerShown: false }} />

        {/* Service Listing Screens */}
        <Stack.Screen name="all-home-essentials/index" options={{ headerShown: false }} />
        <Stack.Screen name="all-ayuxa-services/index" options={{ headerShown: false }} />

        {/* Service Flow Screens */}
        <Stack.Screen name="meetup" options={{ headerShown: false }} />
        <Stack.Screen name="blood-test" options={{ headerShown: false }} />
        <Stack.Screen name="cart" options={{ headerShown: false }} />
        <Stack.Screen name="fitness" options={{ headerShown: false }} />
        <Stack.Screen name="physio" options={{ headerShown: false }} />
        <Stack.Screen name="scan-ecg" options={{ headerShown: false }} />
        <Stack.Screen name="meal-service" options={{ headerShown: false }} />
        <Stack.Screen name="medical-equipment" options={{ headerShown: false }} />
        <Stack.Screen name="order-medicines" options={{ headerShown: false }} />
        <Stack.Screen name="paper-legal" options={{ headerShown: false }} />
        <Stack.Screen name="anything-else" options={{ headerShown: false }} />
        <Stack.Screen name="appliance-repair" options={{ headerShown: false }} />
        <Stack.Screen name="plumbing-electrical" options={{ headerShown: false }} />
        <Stack.Screen name="bill-payment" options={{ headerShown: false }} />
        <Stack.Screen name="bank-paperwork" options={{ headerShown: false }} />
        <Stack.Screen name="grocery-run" options={{ headerShown: false }} />
        <Stack.Screen name="deep-cleaning" options={{ headerShown: false }} />
        <Stack.Screen name="driving-cab" options={{ headerShown: false }} />
        <Stack.Screen name="trip-travels" options={{ headerShown: false }} />
        <Stack.Screen name="smart-upgrade" options={{ headerShown: false }} />
        <Stack.Screen name="hospital-trip" options={{ headerShown: false }} />
        <Stack.Screen name="tech-helper" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
      <CustomAlertModal
        visible={showRootedWarning}
        title={t('security.rooted_device_title')}
        message={t('security.rooted_device_msg')}
        iconName="shield-outline"
        buttonText={t('common.ok')}
        onClose={dismissRootedWarning}
      />
      <CustomAlertModal
        visible={showBirthdayWish}
        title={t('birthday.title', 'Happy Birthday! 🎂')}
        message={t('birthday.message', `Wishing you a wonderful day, ${profile?.name || ''}! The Ayuxa team is grateful to be part of your care journey.`)}
        iconName="gift-outline"
        buttonText={t('common.ok')}
        onClose={dismissBirthdayWish}
      />
      <CustomAlertModal
        visible={!!activeAppMessage}
        title={activeAppMessage?.title || ''}
        message={activeAppMessage?.body || ''}
        iconName="megaphone-outline"
        imageUrl={activeAppMessage?.imageUrl}
        buttonText={activeAppMessage?.requiresAgreement ? t('common.agree', 'Agree') : t('common.ok')}
        onClose={acknowledgeAppMessage}
        secondaryButtonText={t('common.dismiss', 'Dismiss')}
        onSecondaryPress={dismissAppMessage}
      />
    </NavigationThemeProvider>
  );
}
