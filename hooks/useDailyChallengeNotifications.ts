import { useState, useEffect, useCallback } from 'react';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Conditionally import native modules - they crash in Expo Go
let Device: typeof import('expo-device') | null = null;
let Notifications: typeof import('expo-notifications') | null = null;
let nativeModulesAvailable = false;

try {
  Device = require('expo-device');
  Notifications = require('expo-notifications');
  nativeModulesAvailable = true;
} catch (e) {
  console.log('Notifications not available in this environment');
}

// AsyncStorage keys
const NOTIFICATION_ENABLED_KEY = '@scripture_mastery_daily_notification_enabled';
const NOTIFICATION_TIME_KEY = '@scripture_mastery_daily_notification_time';
const NOTIFICATION_ID_KEY = '@scripture_mastery_daily_notification_id';

// Default notification time: 8:00 AM
const DEFAULT_HOUR = 8;
const DEFAULT_MINUTE = 0;

export interface NotificationTime {
  hour: number;
  minute: number;
}

// Permission status type (matches expo-notifications)
type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export interface DailyChallengeNotificationState {
  enabled: boolean;
  notificationTime: NotificationTime;
  permissionStatus: NotificationPermissionStatus;
  isLoading: boolean;
}

/**
 * Hook for managing daily challenge reminder notifications
 */
export function useDailyChallengeNotifications() {
  const [enabled, setEnabled] = useState(false);
  const [notificationTime, setNotificationTimeState] = useState<NotificationTime>({
    hour: DEFAULT_HOUR,
    minute: DEFAULT_MINUTE,
  });
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>(
    nativeModulesAvailable ? 'undetermined' : 'unavailable'
  );
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Format time for display (e.g., "8:00 AM")
   */
  const formatTime = useCallback((time: NotificationTime): string => {
    const period = time.hour >= 12 ? 'PM' : 'AM';
    const displayHour = time.hour % 12 || 12;
    const displayMinute = time.minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  }, []);

  /**
   * Check current notification permissions
   */
  const checkPermissions = useCallback(async (): Promise<NotificationPermissionStatus> => {
    if (!nativeModulesAvailable || !Notifications) {
      return 'unavailable';
    }

    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status as NotificationPermissionStatus);
      return status as NotificationPermissionStatus;
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return 'unavailable';
    }
  }, []);

  /**
   * Request notification permissions
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!nativeModulesAvailable || !Notifications || !Device) {
      return false;
    }

    // Push notifications only work on physical devices
    if (!Device.isDevice) {
      console.log('Notifications require a physical device');
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setPermissionStatus(finalStatus as NotificationPermissionStatus);
      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }, []);

  /**
   * Cancel any existing daily challenge notification
   */
  const cancelExistingNotification = useCallback(async () => {
    if (!Notifications) return;

    try {
      const storedId = await AsyncStorage.getItem(NOTIFICATION_ID_KEY);
      if (storedId) {
        await Notifications.cancelScheduledNotificationAsync(storedId);
        await AsyncStorage.removeItem(NOTIFICATION_ID_KEY);
      }
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }, []);

  /**
   * Schedule the daily notification
   */
  const scheduleNotification = useCallback(async (hour: number, minute: number): Promise<string | null> => {
    if (!Notifications) return null;

    try {
      // Cancel any existing notification first
      await cancelExistingNotification();

      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('daily-challenge', {
          name: 'Daily Challenge Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0a7ea4',
        });
      }

      // Schedule the daily notification
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Daily Challenge Ready!',
          body: 'Your scripture is waiting. Keep your streak alive!',
          data: { type: 'daily_challenge' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: Platform.OS === 'android' ? 'daily-challenge' : undefined,
        },
      });

      // Store the notification ID for later cancellation
      await AsyncStorage.setItem(NOTIFICATION_ID_KEY, id);
      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }, [cancelExistingNotification]);

  /**
   * Enable daily challenge notifications
   */
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      return false;
    }

    const notificationId = await scheduleNotification(notificationTime.hour, notificationTime.minute);
    if (!notificationId) {
      return false;
    }

    await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, 'true');
    setEnabled(true);
    return true;
  }, [requestPermissions, scheduleNotification, notificationTime]);

  /**
   * Disable daily challenge notifications
   */
  const disableNotifications = useCallback(async () => {
    await cancelExistingNotification();
    await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, 'false');
    setEnabled(false);
  }, [cancelExistingNotification]);

  /**
   * Update the notification time
   */
  const setNotificationTime = useCallback(async (hour: number, minute: number) => {
    const newTime = { hour, minute };
    setNotificationTimeState(newTime);
    await AsyncStorage.setItem(NOTIFICATION_TIME_KEY, JSON.stringify(newTime));

    // If notifications are enabled, reschedule with new time
    if (enabled) {
      await scheduleNotification(hour, minute);
    }
  }, [enabled, scheduleNotification]);

  /**
   * Open system settings for notifications
   */
  const openSettings = useCallback(async () => {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
  }, []);

  // Load saved preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [storedEnabled, storedTime] = await Promise.all([
          AsyncStorage.getItem(NOTIFICATION_ENABLED_KEY),
          AsyncStorage.getItem(NOTIFICATION_TIME_KEY),
        ]);

        if (storedTime) {
          const time = JSON.parse(storedTime) as NotificationTime;
          setNotificationTimeState(time);
        }

        const isEnabled = storedEnabled === 'true';
        setEnabled(isEnabled);

        // Check current permission status
        await checkPermissions();

        // If notifications were enabled but permissions are now denied, disable
        if (isEnabled && nativeModulesAvailable && Notifications) {
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'granted') {
            setEnabled(false);
            await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, 'false');
          }
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [checkPermissions]);

  return {
    enabled,
    notificationTime,
    permissionStatus,
    isLoading,
    formattedTime: formatTime(notificationTime),
    enableNotifications,
    disableNotifications,
    setNotificationTime,
    openSettings,
    isAvailable: nativeModulesAvailable,
  };
}
