import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { GoogleLogo } from '@/components/GoogleLogo';

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
  const colorScheme = useColorScheme();
  const isLoading = isGoogleLoading || isAppleLoading;

  const handleGoogleSignIn = async () => {
    try {
      await onGoogleSignIn();
    } catch (error) {
      console.error('Google sign-in error:', error);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await onAppleSignIn();
    } catch (error) {
      console.error('Apple sign-in error:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.container,
            { backgroundColor: Colors[colorScheme ?? 'light'].card },
          ]}
        >
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons
              name="close"
              size={24}
              color={Colors[colorScheme ?? 'light'].text}
            />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Ionicons name="trophy" size={56} color="#FFD700" />
          </View>

          <ThemedText style={styles.title}>Join the Leaderboard</ThemedText>
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

            <View style={styles.dividerContainer}>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: Colors[colorScheme ?? 'light'].border },
                ]}
              />
              <ThemedText style={styles.dividerText}>or</ThemedText>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: Colors[colorScheme ?? 'light'].border },
                ]}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.guestButton,
                { borderColor: Colors[colorScheme ?? 'light'].border },
              ]}
              onPress={onContinueAsGuest}
              disabled={isLoading}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={Colors[colorScheme ?? 'light'].text}
              />
              <ThemedText style={styles.guestButtonText}>
                Continue as Guest
              </ThemedText>
            </TouchableOpacity>

            <ThemedText style={styles.guestBenefit}>
              Quick & anonymous
            </ThemedText>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
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
