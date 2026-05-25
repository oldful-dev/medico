import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTheme } from '@/context/ThemeContext';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof ReturnType<typeof useThemeColors>
) {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? 'dark' : 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return useThemeColors()[colorName];
  }
}
