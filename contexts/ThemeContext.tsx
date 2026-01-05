import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'light' | 'dark' | 'system';
type ColorScheme = 'light' | 'dark';

interface ThemeContextType {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  effectiveColorScheme: ColorScheme;
}

const THEME_STORAGE_KEY = '@scripture_mastery_theme';

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadThemePreference();
  }, []);

  const setPreference = useCallback(async (newPreference: ThemePreference) => {
    setPreferenceState(newPreference);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newPreference);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  }, []);

  const effectiveColorScheme: ColorScheme =
    preference === 'system' ? (systemColorScheme ?? 'light') : preference;

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ preference, setPreference, effectiveColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
