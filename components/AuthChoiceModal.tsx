import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ThemedText';
import { BaseModal } from '@/components/BaseModal';
import { GoogleLogo } from '@/components/GoogleLogo';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface Props {
  visible: boolean;
  onGoogleSignIn: () => Promise<void>;
  onAppleSignIn: () => Promise<void>;
  onContinueAsGuest: () => void;
  onClose: () => void;
  isGoogleLoading: boolean;
  isAppleLoading: boolean;
  isAppleAvailable: boolean;
}

export function AuthChoiceModal({
  visible,
  onGoogleSignIn,
  onAppleSignIn,
  onContinueAsGuest,
  onClose,
  isGoogleLoading,
  isAppleLoading,
  isAppleAvailable,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const isLoading = isGoogleLoading || isAppleLoading;

  const handleGoogleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await onGoogleSignIn();
    } catch (error) {
      console.error('Google sign-in error:', error);
    }
  };

  const handleAppleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await onAppleSignIn();
    } catch (error) {
      console.error('Apple sign-in error:', error);
    }
  };

  const handleContinueAsGuest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onContinueAsGuest();
  };

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      showCloseButton
      animationType="smooth"
      testID="auth-choice-modal"
      accessibilityLabel="Join the Leaderboard - Choose sign in method"
    >
      <View style={styles.content}>
        {/* Trophy Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="trophy" size={56} color="#FFD700" />
        </View>

        <ThemedText style={styles.title} accessibilityRole="header">
          Join the Leaderboard
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          How would you like to join?
        </ThemedText>

        <View style={styles.buttonContainer}>
          {/* Apple Sign-In - Show first on iOS if available */}
          {Platform.OS === 'ios' && isAppleAvailable && (
            <>
              <TouchableOpacity
                style={[
                  styles.appleButton,
                  { opacity: isLoading ? 0.7 : 1 },
                ]}
                onPress={handleAppleSignIn}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Sign in with Apple"
                accessibilityState={{ disabled: isLoading }}
              >
                {isAppleLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="logo-apple" size={20} color="#fff" />
                    <ThemedText style={styles.appleButtonText}>
                      Sign in with Apple
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.buttonSpacer} />
            </>
          )}

          {/* Google Sign-In */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              { opacity: isLoading ? 0.7 : 1 },
            ]}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Sign in with Google"
            accessibilityState={{ disabled: isLoading }}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#757575" />
            ) : (
              <>
                <GoogleLogo size={20} />
                <ThemedText style={styles.googleButtonText}>
                  Sign in with Google
                </ThemedText>
              </>
            )}
          </TouchableOpacity>

          <ThemedText style={styles.providerBenefit}>
            Keep your scores across devices
          </ThemedText>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View
              style={[
                styles.divider,
                { backgroundColor: Colors[colorScheme].border },
              ]}
            />
            <ThemedText style={styles.dividerText}>or</ThemedText>
            <View
              style={[
                styles.divider,
                { backgroundColor: Colors[colorScheme].border },
              ]}
            />
          </View>

          {/* Guest Option */}
          <TouchableOpacity
            style={[
              styles.guestButton,
              { borderColor: Colors[colorScheme].border },
            ]}
            onPress={handleContinueAsGuest}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Continue as Guest"
            accessibilityState={{ disabled: isLoading }}
          >
            <Ionicons
              name="person-outline"
              size={20}
              color={Colors[colorScheme].text}
            />
            <ThemedText style={styles.guestButtonText}>
              Continue as Guest
            </ThemedText>
          </TouchableOpacity>

          <ThemedText style={styles.guestBenefit}>
            Quick and anonymous
          </ThemedText>
        </View>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    width: '100%',
    paddingTop: 8, // Account for close button
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  appleButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    minHeight: 48, // Minimum touch target
  },
  appleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSpacer: {
    height: 12,
  },
  googleButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dadce0',
    minHeight: 48, // Minimum touch target
  },
  googleButtonText: {
    color: '#3c4043',
    fontSize: 16,
    fontWeight: '500',
  },
  providerBenefit: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 8,
    textAlign: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    opacity: 0.5,
    marginHorizontal: 12,
  },
  guestButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 48, // Minimum touch target
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  guestBenefit: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 8,
    textAlign: 'center',
  },
});
