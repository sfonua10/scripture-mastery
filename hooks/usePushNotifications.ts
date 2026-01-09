import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';

// Conditionally import native modules - they crash in Expo Go
// Use try-catch as the bulletproof detection method
let Device: typeof import('expo-device') | null = null;
let Notifications: typeof import('expo-notifications') | null = null;
let nativeModulesAvailable = false;

try {
  Device = require('expo-device');
  Notifications = require('expo-notifications');
  nativeModulesAvailable = true;

  // Configure how notifications are handled when the app is in the foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  // Native modules not available (running in Expo Go)
  console.log('Push notifications not available in this environment');
}

// Import types only (doesn't load native code)
import type * as NotificationsTypes from 'expo-notifications';

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: NotificationsTypes.Notification | null;
  isRegistered: boolean;
  error: string | null;
}

/**
 * Hook for managing push notifications
 */
export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationsTypes.Notification | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState<string | null>(!nativeModulesAvailable ? 'Push notifications are not available in Expo Go' : null);

  const { user } = useAuth();

  const notificationListener = useRef<NotificationsTypes.Subscription>();
  const responseListener = useRef<NotificationsTypes.Subscription>();

  /**
   * Register for push notifications and get the Expo push token
   */
  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    // Push notifications don't work in Expo Go
    if (!nativeModulesAvailable) {
      setError('Push notifications are not available in Expo Go');
      return null;
    }

    // Push notifications only work on physical devices
    if (!Device?.isDevice) {
      setError('Push notifications require a physical device');
      return null;
    }

    if (!Notifications) {
      setError('Notifications module not available');
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        setError('Push notification permissions not granted');
        return null;
      }

      // Get the Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        setError('EAS project ID not found');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      const token = tokenData.data;
      setExpoPushToken(token);
      setIsRegistered(true);
      setError(null);

      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0a7ea4',
        });
      }

      return token;
    } catch (err) {
      console.error('Failed to register for push notifications:', err);
      setError('Failed to register for push notifications');
      return null;
    }
  }, []);

  /**
   * Save the push token to the user's Firestore profile
   */
  const savePushTokenToProfile = useCallback(async (token: string) => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        expoPushToken: token,
        pushTokenUpdatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to save push token to profile:', err);
    }
  }, [user]);

  /**
   * Handle notification tap - navigate to appropriate screen
   */
  const handleNotificationResponse = useCallback(
    (response: NotificationsTypes.NotificationResponse) => {
      const data = response.notification.request.content.data;

      // Handle daily challenge notifications
      if (data?.type === 'daily_challenge') {
        router.push({
          pathname: '/game',
          params: { mode: 'daily' },
        });
        return;
      }

      // Handle multiplayer challenge notifications
      if (data?.challengeId) {
        router.push({
          pathname: '/challenge/result',
          params: { challengeId: data.challengeId as string },
        });
      } else if (data?.challengeCode) {
        router.push({
          pathname: '/challenge/join',
          params: { code: data.challengeCode as string },
        });
      }
    },
    []
  );

  // Register for push notifications on mount
  useEffect(() => {
    // Skip setup if native modules not available
    if (!nativeModulesAvailable || !Notifications) {
      return;
    }

    let isMounted = true;

    registerForPushNotifications().then((token) => {
      if (isMounted && token && user) {
        savePushTokenToProfile(token);
      }
    });

    // Listen for incoming notifications (while app is in foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (isMounted) {
          setNotification(notification);
        }
      }
    );

    // Listen for notification responses (when user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    return () => {
      isMounted = false;
      if (notificationListener.current && Notifications) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current && Notifications) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [registerForPushNotifications, user, savePushTokenToProfile, handleNotificationResponse]);

  return {
    expoPushToken,
    notification,
    isRegistered,
    error,
    registerForPushNotifications,
  };
}

/**
 * Schedule a local notification (for testing)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  if (!Notifications) {
    console.warn('Notifications not available in Expo Go');
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
  });
}
