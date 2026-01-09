import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import React from 'react';
import { Platform, Linking } from 'react-native';
import * as ExpoLinking from 'expo-linking';

import { Colors } from '@/constants/Colors';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { usePushNotifications } from '@/hooks/usePushNotifications';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  // Initialize push notifications
  usePushNotifications();

  // Handle deep links for challenges
  useEffect(() => {
    let isMounted = true;

    const handleDeepLink = (event: { url: string }) => {
      if (!isMounted) return;

      const url = event.url;
      // Parse deep link: scripture-mastery://challenge/{code}
      const match = url.match(/scripture-mastery:\/\/challenge\/([A-Za-z0-9]+)/);
      if (match) {
        const code = match[1];
        router.push({
          pathname: '/challenge/join',
          params: { code: code.toUpperCase() },
        });
      }
    };

    // Handle initial URL if app was opened via deep link
    const checkInitialURL = async () => {
      const initialUrl = await ExpoLinking.getInitialURL();
      if (initialUrl && isMounted) {
        handleDeepLink({ url: initialUrl });
      }
    };

    checkInitialURL();

    // Listen for incoming deep links while app is open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors[colorScheme ?? 'light'].background,
          },
          headerTintColor: Colors[colorScheme ?? 'light'].text,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          animation: Platform.OS === 'ios' ? 'default' : 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            gestureEnabled: true,
            gestureDirection: 'vertical',
            headerShown: false,
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </AuthProvider>
  );
}
