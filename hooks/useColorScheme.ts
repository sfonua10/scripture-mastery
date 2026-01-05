import { useContext } from 'react';
import { ThemeContext } from '@/contexts/ThemeContext';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export function useColorScheme() {
  const context = useContext(ThemeContext);
  const systemColorScheme = useSystemColorScheme();

  // Fallback to system color scheme if context not yet available
  if (!context) {
    return systemColorScheme ?? 'light';
  }

  return context.effectiveColorScheme;
}
