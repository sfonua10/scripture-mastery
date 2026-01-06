import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ThemedText';
import { BaseModal } from '@/components/BaseModal';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (nickname: string) => Promise<void>;
  initialNickname?: string;
  suggestedName?: string | null;
  title?: string;
  subtitle?: string;
}

const MIN_LENGTH = 2;
const MAX_LENGTH = 20;

export function NicknameModal({
  visible,
  onClose,
  onSubmit,
  initialNickname = '',
  suggestedName,
  title = 'Choose a Nickname',
  subtitle = 'This will be shown on the leaderboard',
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  // Use initialNickname if provided, otherwise use suggestedName from Google
  const [nickname, setNickname] = useState(initialNickname || suggestedName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update nickname when suggestedName becomes available (e.g., after Google sign-in)
  useEffect(() => {
    if (suggestedName && !nickname && !initialNickname) {
      setNickname(suggestedName);
    }
  }, [suggestedName]);

  const handleSubmit = async () => {
    const trimmed = nickname.trim();

    if (trimmed.length < MIN_LENGTH) {
      setError(`Nickname must be at least ${MIN_LENGTH} characters`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (trimmed.length > MAX_LENGTH) {
      setError(`Nickname must be at most ${MAX_LENGTH} characters`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Basic validation - alphanumeric, spaces, underscores, hyphens
    if (!/^[\w\s\-]+$/.test(trimmed)) {
      setError('Only letters, numbers, spaces, and hyphens allowed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(trimmed);
      setNickname('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError('Failed to save nickname. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNickname(initialNickname);
    setError(null);
    onClose();
  };

  return (
    <BaseModal
      visible={visible}
      onClose={handleClose}
      showCloseButton
      keyboardAvoiding
      animationType="smooth"
      testID="nickname-modal"
      accessibilityLabel={title}
    >
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name="person-circle-outline"
            size={64}
            color={Colors[colorScheme].tint}
          />
        </View>

        <ThemedText style={styles.title} accessibilityRole="header">
          {title}
        </ThemedText>
        <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>

        {/* Input Field */}
        <TextInput
          style={[
            styles.input,
            {
              borderColor: error
                ? Colors[colorScheme].error
                : Colors[colorScheme].border,
              color: Colors[colorScheme].text,
              backgroundColor: Colors[colorScheme].background,
            },
          ]}
          placeholder="Enter nickname"
          placeholderTextColor={colorScheme === 'dark' ? '#666' : '#888'}
          value={nickname}
          onChangeText={(text) => {
            setNickname(text);
            setError(null);
          }}
          maxLength={MAX_LENGTH}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Nickname input"
          accessibilityHint={`Enter a nickname between ${MIN_LENGTH} and ${MAX_LENGTH} characters`}
        />

        <ThemedText style={styles.charCount}>
          {nickname.length}/{MAX_LENGTH}
        </ThemedText>

        {error && (
          <ThemedText style={styles.error} accessibilityRole="alert">
            {error}
          </ThemedText>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButtonContainer}
          onPress={handleSubmit}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Save nickname"
          accessibilityState={{ disabled: isSubmitting }}
        >
          <LinearGradient
            colors={
              colorScheme === 'dark'
                ? ['#1a7e7e', '#0a5e5e']
                : ['#0a9ea4', '#087d7a']
            }
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <ThemedText style={styles.submitButtonText}>
                Save Nickname
              </ThemedText>
            )}
          </LinearGradient>
        </TouchableOpacity>
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
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: 14,
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 16,
    textAlign: 'center',
    minHeight: 48, // Minimum touch target
  },
  charCount: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  error: {
    color: '#F44336',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  submitButtonContainer: {
    width: '100%',
    marginTop: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  submitButton: {
    padding: 14,
    alignItems: 'center',
    minHeight: 48, // Minimum touch target
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
