// Design Tokens — Single source of truth for the Medico mobile UI
// All screens must import from here for consistency
import { Platform } from 'react-native';

// ─── Colors ───
export const Colors = {
  // Primary greens (standardized from 4 variants → 2)
  primary: '#048357',        // Main actions, buttons, links
  primaryDark: '#02743F',    // Borders, darker accents
  primaryDeep: '#034C2A',    // Headings on white bg
  primaryText: '#085B34',    // Text on light bg

  // Accent
  accent: '#34C759',         // Success, highlights, borders
  accentBright: '#0EDD94',   // Decorative accent

  // Backgrounds
  bgScreen: '#FFFFE3',       // Main app background
  bgCard: '#FFFFFF',         // Cards, containers
  bgHeader: '#FFFFF8',       // Header bar
  bgCardMuted: 'rgba(222,222,222,0.43)', // Muted card/grid item bg

  // Text
  textDark: '#1E1E1E',       // Primary body text
  textBody: '#2F2F2F',       // Secondary body text
  textMuted: '#848484',      // Muted text, captions
  textLight: '#AAAEAC',      // Placeholder, disabled text
  textWhite: '#FFFFFF',      // Text on dark bg

  // Status
  sosRed: '#FF3B30',         // SOS tag
  warning: '#FFC107',
  info: '#17A2B8',

  // Border
  borderGreen: '#02743F',
  borderLight: '#DEE2E6',

  // Overlays
  overlay: 'rgba(0,0,0,0.5)',
  shadowColor: '#000000',
};

// ─── Typography ───
// Font family helpers — handles iOS/Android naming differences
const poppins = (weight: 'Light' | 'Regular' | 'Medium' | 'SemiBold' | 'Bold') => {
  const androidMap = {
    Light: 'Poppins_300Light',
    Regular: 'Poppins_400Regular',
    Medium: 'Poppins_500Medium',
    SemiBold: 'Poppins_600SemiBold',
    Bold: 'Poppins_700Bold',
  };
  return Platform.select({
    ios: `Poppins-${weight}`,
    android: androidMap[weight],
    default: 'System',
  });
};

const lexendDeca = (weight: 'Light' | 'Regular' | 'Medium') => {
  const androidMap = {
    Light: 'LexendDeca_300Light',
    Regular: 'LexendDeca_400Regular',
    Medium: 'LexendDeca_500Medium',
  };
  return Platform.select({
    ios: `LexendDeca-${weight}`,
    android: androidMap[weight],
    default: 'System',
  });
};

export const Fonts = {
  // Headlines — Poppins
  semiBold: poppins('SemiBold'),   // Section titles, card titles
  bold: poppins('Bold'),           // Large headings

  // Body / Descriptions — Lexend Deca
  regular: lexendDeca('Regular'),  // Body text, descriptions
  medium: lexendDeca('Medium'),    // Emphasized body text, buttons
  light: lexendDeca('Light'),      // Subtle or secondary text

  // Escape hatch — when Poppins is needed for non-headline text
  poppinsRegular: poppins('Regular'),
  poppinsMedium: poppins('Medium'),

  // Legacy aliases
  mono: Platform.select({ ios: 'SpaceMono', android: 'SpaceMono', default: 'monospace' }),
  rounded: Platform.select({ ios: 'Poppins-SemiBold', android: 'Poppins_600SemiBold', default: 'System' }),
};

// Standardized font size scale
export const FontSize = {
  caption: 10,     // Tags, badges, grid item labels, small icons text
  bodySmall: 12,   // Secondary text, timestamps, captions
  body: 14,        // Body text, descriptions, form labels
  button: 16,      // Button text, sub-section titles
  heading3: 16,    // Sub-section / card group titles
  heading2: 18,    // Section headings
  heading1: 22,    // Screen titles, page headings
  display: 24,     // Large decorative text (login title etc)
};

// ─── Spacing ───
export const Spacing = {
  xs: 4,           // Tight: icon-to-text, within badges
  sm: 8,           // Small: between small elements
  md: 12,          // Standard: grid gaps, card internals
  lg: 16,          // Section spacing, screen padding, card padding
  xl: 24,          // Large section separators
  '2xl': 32,       // Major section breaks
  screenPadding: 16, // Horizontal padding for all screens
  cardMargin: 16,    // Horizontal margin for all cards/sections
  sectionGap: 16,    // Vertical gap between sections
};

// ─── Border Radius ───
export const Radius = {
  sm: 8,           // Badges, tags, small buttons
  md: 12,          // Cards, inputs, containers
  lg: 16,          // Large cards, modals
  xl: 20,          // Rounded cards (quick service strip)
  full: 999,       // Circular elements (avatars, round icons)
};

// ─── Shadow (standardized) ───
export const Shadow = {
  card: {
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  header: {
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
};
