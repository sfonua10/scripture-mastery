import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

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
  const colorScheme = useColorScheme();
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
      return;
    }

    if (trimmed.length > MAX_LENGTH) {
      setError(`Nickname must be at most ${MAX_LENGTH} characters`);
      return;
    }

    // Basic validation - alphanumeric, spaces, underscores, hyphens
    if (!/^[\w\s\-]+$/.test(trimmed)) {
      setError('Only letters, numbers, spaces, and hyphens allowed');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(trimmed);
      setNickname('');
    } catch (err) {
      setError('Failed to save nickname. Please try again.');
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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View
          style={[
            styles.container,
            { backgroundColor: Colors[colorScheme ?? 'light'].card },
          ]}
        >
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons
              name="close"
              size={24}
              color={Colors[colorScheme ?? 'light'].text}
            />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Ionicons
              name="person-circle-outline"
              size={64}
              color={Colors[colorScheme ?? 'light'].tint}
            />
          </View>

          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>

          <TextInput
            style={[
              styles.input,
              {
                borderColor: error
                  ? Colors[colorScheme ?? 'light'].error
                  : Colors[colorScheme ?? 'light'].border,
                color: Colors[colorScheme ?? 'light'].text,
                backgroundColor: Colors[colorScheme ?? 'light'].background,
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
          />

          <ThemedText style={styles.charCount}>
            {nickname.length}/{MAX_LENGTH}
          </ThemedText>

          {error && <ThemedText style={styles.error}>{error}</ThemedText>}

          <TouchableOpacity
            style={styles.submitButtonContainer}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <LinearGradient
              colors={
                colorScheme === 'dark'
                  ? ['#1a7e7e', '#0a5e5e']
                  : ['#0a9ea4', '#087d7a']
              }
              style={styles.submitButton}
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
      </KeyboardAvoidingView>
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
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: 14,
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 16,
    textAlign: 'center',
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
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
