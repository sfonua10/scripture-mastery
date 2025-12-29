import { useTheme } from '@/contexts/ThemeContext';

export function useColorScheme() {
  const { effectiveColorScheme } = useTheme();
  return effectiveColorScheme;
}
