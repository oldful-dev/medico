import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import 'react-native-reanimated';
import '@/i18n/i18n';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/context/AuthContext';
import { UserProvider } from '@/context/UserContext';
import { BookingProvider } from '@/context/BookingContext';
import { CartProvider } from '@/context/CartContext';
import { AppConfigProvider } from '@/context/AppConfigContext';

// Keep the native splash visible until splash.tsx explicitly hides it.
// Never hide it here — doing so causes a blank/Metro screen gap.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();

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
    <AppConfigProvider>
      <AuthProvider>
        <UserProvider>
          <BookingProvider>
            <CartProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <Stack screenOptions={{ headerShown: false }}>
                  {/* Auth / Onboarding Flow */}
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />

                  {/* Main App with Bottom Tabs */}
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

                  {/* Feature Flows */}
                  <Stack.Screen name="doctor-visit" options={{ headerShown: false }} />
                  <Stack.Screen name="nurse-care" options={{ headerShown: false }} />
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

                  {/* Service Listing Screens */}
                  <Stack.Screen name="all-home-essentials/index" options={{ headerShown: false }} />
                  <Stack.Screen name="all-ayuxa-services/index" options={{ headerShown: false }} />

                  {/* Unmapped Screens */}
                  <Stack.Screen name="smart-upgrade/index" options={{ headerShown: false }} />
                  <Stack.Screen name="hospital-trip/index" options={{ headerShown: false }} />
                  <Stack.Screen name="blood-test/index" options={{ headerShown: false }} />
                  <Stack.Screen name="tech-helper/index" options={{ headerShown: false }} />
                </Stack>
                <StatusBar style="auto" />
              </ThemeProvider>
            </CartProvider>
          </BookingProvider>
        </UserProvider>
      </AuthProvider>
    </AppConfigProvider>
  );
}
