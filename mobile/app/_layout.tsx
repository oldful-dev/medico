import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/context/AuthContext';
import { UserProvider } from '@/context/UserContext';
import { BookingProvider } from '@/context/BookingContext';
import { CartProvider } from '@/context/CartContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <UserProvider>
        <BookingProvider>
          <CartProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack>
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

                {/* Standalone Screens */}
                <Stack.Screen name="sos-emergency" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
                <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
                <Stack.Screen name="search" options={{ title: 'Search' }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              </Stack>
              <StatusBar style="auto" />
            </ThemeProvider>
          </CartProvider>
        </BookingProvider>
      </UserProvider>
    </AuthProvider>
  );
}
