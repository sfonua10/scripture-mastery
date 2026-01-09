import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'light' | 'dark' | 'system';
type ColorScheme = 'light' | 'dark';

interface ThemeContextType {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  effectiveColorScheme: ColorScheme;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

const THEME_STORAGE_KEY = '@scripture_mastery_theme';
const SOUND_STORAGE_KEY = '@scripture_mastery_sound';

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [storedTheme, storedSound] = await Promise.all([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          AsyncStorage.getItem(SOUND_STORAGE_KEY),
        ]);

        if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
          setPreferenceState(storedTheme);
        }

        if (storedSound !== null) {
          setSoundEnabledState(storedSound === 'true');
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadPreferences();
  }, []);

  const setPreference = useCallback(async (newPreference: ThemePreference) => {
    setPreferenceState(newPreference);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newPreference);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  }, []);

  const setSoundEnabled = useCallback(async (enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      await AsyncStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
    } catch (error) {
      console.error('Error saving sound preference:', error);
    }
  }, []);

  const effectiveColorScheme = useMemo<ColorScheme>(
    () => (preference === 'system' ? (systemColorScheme ?? 'light') : preference),
    [preference, systemColorScheme]
  );

  const contextValue = useMemo<ThemeContextType>(
    () => ({
      preference,
      setPreference,
      effectiveColorScheme,
      soundEnabled,
      setSoundEnabled,
    }),
    [preference, setPreference, effectiveColorScheme, soundEnabled, setSoundEnabled]
  );

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
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
