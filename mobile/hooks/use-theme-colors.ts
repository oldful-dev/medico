import { useMemo } from 'react';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

export interface ThemeColors {
  // Primary greens
  primary: string;
  primaryDark: string;
  primaryDeep: string;
  primaryText: string;

  // Accent
  accent: string;
  accentBright: string;

  // Backgrounds
  bgScreen: string;
  bgCard: string;
  bgHeader: string;
  bgCardMuted: string;

  // Text
  textDark: string;
  textBody: string;
  textMuted: string;
  textLight: string;
  textWhite: string;

  // Status
  sosRed: string;
  warning: string;
  info: string;

  // Border
  borderGreen: string;
  borderLight: string;

  // Overlays
  overlay: string;
  shadowColor: string;
}

const LIGHT_THEME: ThemeColors = {
  primary: Colors.primary,
  primaryDark: Colors.primaryDark,
  primaryDeep: Colors.primaryDeep,
  primaryText: Colors.primaryText,

  accent: Colors.accent,
  accentBright: Colors.accentBright,

  bgScreen: Colors.bgScreen,
  bgCard: Colors.bgCard,
  bgHeader: Colors.bgHeader,
  bgCardMuted: Colors.bgCardMuted,

  textDark: Colors.textDark,
  textBody: Colors.textBody,
  textMuted: Colors.textMuted,
  textLight: Colors.textLight,
  textWhite: Colors.textWhite,

  sosRed: Colors.sosRed,
  warning: Colors.warning,
  info: Colors.info,

  borderGreen: Colors.borderGreen,
  borderLight: Colors.borderLight,

  overlay: Colors.overlay,
  shadowColor: Colors.shadowColor,
};

const DARK_THEME: ThemeColors = {
  primary: '#34C759',        // Keep primary green, it's readable on dark
  primaryDark: '#27AE60',
  primaryDeep: '#1E8449',
  primaryText: '#4FD485',

  accent: Colors.accent,
  accentBright: Colors.accentBright,

  bgScreen: '#0F172A',       // Very dark blue-black
  bgCard: '#1E293B',         // Slightly lighter card background
  bgHeader: '#1A202C',       // Dark header
  bgCardMuted: 'rgba(255,255,255,0.08)',

  textDark: '#F1F5F9',       // Light gray-white for main text
  textBody: '#E2E8F0',       // Slightly darker than textDark
  textMuted: '#94A3B8',      // Muted gray for secondary text
  textLight: '#64748B',      // Even more muted
  textWhite: '#FFFFFF',      // Keep white for contrast

  sosRed: '#FF3B30',         // Keep bright red
  warning: '#FFC107',        // Keep warning yellow
  info: '#17A2B8',           // Keep info blue

  borderGreen: '#34C759',    // Use bright green for borders
  borderLight: '#334155',    // Dark borders

  overlay: 'rgba(0,0,0,0.8)',
  shadowColor: '#000000',
};

export function useThemeColors(): ThemeColors {
  const { isDarkMode } = useTheme();

  return useMemo(() => {
    return isDarkMode ? DARK_THEME : LIGHT_THEME;
  }, [isDarkMode]);
}
