import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Avatar } from './Avatar';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileButtonProps {
  onPress: () => void;
}

export function ProfileButton({ onPress }: ProfileButtonProps) {
  const { authProvider, userProfile } = useAuth();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const isSignedIn = authProvider !== 'anonymous';

  // Get display name for avatar initials
  const displayName =
    userProfile?.displayName ||
    userProfile?.nickname ||
    userProfile?.email?.split('@')[0] ||
    'Guest';

  // Anonymous state: show person icon
  if (!isSignedIn) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          styles.anonymousButton,
          pressed && styles.buttonPressed,
        ]}
        accessibilityLabel="Open settings - Not signed in"
        accessibilityRole="button"
        accessibilityHint="Double tap to open settings and sign in"
      >
        <Ionicons name="person" size={20} color="#8B7355" />
      </Pressable>
    );
  }

  // Signed in: show avatar with photo or initials
  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        styles.signedInButton,
        pressed && styles.buttonPressed,
      ]}
      accessibilityLabel={`Open settings - Signed in as ${displayName}`}
      accessibilityRole="button"
      accessibilityHint="Double tap to open settings"
    >
      <Avatar
        photoURL={userProfile?.photoURL}
        nickname={displayName}
        size={40}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  anonymousButton: {
    backgroundColor: '#F5E6D3',
  },
  signedInButton: {
    overflow: 'hidden',
  },
});
