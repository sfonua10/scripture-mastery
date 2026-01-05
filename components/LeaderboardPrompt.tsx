import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { NicknameModal } from '@/components/NicknameModal';
import { AuthChoiceModal } from '@/components/AuthChoiceModal';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GameMode } from '@/types/scripture';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  visible: boolean;
  score: number;
  totalQuestions: number;
  difficulty: GameMode;
  isNewHighScore: boolean;
  hasNickname: boolean;
  nickname?: string | null;
  onClose: () => void;
  onSubmit: (nickname: string) => Promise<void>;
  onSkip: () => void;
}

export function LeaderboardPrompt({
  visible,
  score,
  totalQuestions,
  difficulty,
  isNewHighScore,
  hasNickname,
  nickname,
  onClose,
  onSubmit,
  onSkip,
}: Props) {
  const colorScheme = useColorScheme();
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [showAuthChoice, setShowAuthChoice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    authProvider,
    hasJoinedLeaderboard,
    googleDisplayName,
    isGoogleLoading,
    promptGoogleSignIn,
    isAppleAvailable,
    isAppleLoading,
    promptAppleSignIn,
  } = useAuth();

  const handleYes = async () => {
    // If user hasn't joined leaderboard yet and is anonymous, show auth choice
    if (!hasJoinedLeaderboard && authProvider === 'anonymous') {
      setShowAuthChoice(true);
      return;
    }

    // User has already joined or is Google user
    if (hasNickname && nickname) {
      // Already has nickname, submit directly
      setIsSubmitting(true);
      try {
        await onSubmit(nickname);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Need to get nickname first
      setShowNicknameModal(true);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await promptGoogleSignIn();
      if (result?.type === 'success') {
        // Only proceed on success - show nickname modal
        // The googleDisplayName will be available as a suggestion
        setShowAuthChoice(false);
        setShowNicknameModal(true);
      }
      // If dismissed/canceled, auth choice modal stays open
    } catch (error) {
      console.error('Google sign-in failed:', error);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const result = await promptAppleSignIn();
      if (result?.success) {
        // Only proceed on success - show nickname modal
        // The googleDisplayName (which stores Apple display name too) will be available
        setShowAuthChoice(false);
        setShowNicknameModal(true);
      }
      // If canceled, auth choice modal stays open
    } catch (error) {
      console.error('Apple sign-in failed:', error);
    }
  };

  const handleContinueAsGuest = () => {
    setShowAuthChoice(false);
    setShowNicknameModal(true);
  };

  const handleNicknameSubmit = async (newNickname: string) => {
    await onSubmit(newNickname);
    setShowNicknameModal(false);
  };

  const getDifficultyLabel = () => {
    switch (difficulty) {
      case 'easy':
        return 'Easy';
      case 'medium':
        return 'Medium';
      case 'hard':
        return 'Hard';
    }
  };

  return (
    <>
      <Modal
        visible={visible && !showNicknameModal && !showAuthChoice}
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
            <View style={styles.iconContainer}>
              <Ionicons
                name="trophy"
                size={56}
                color="#FFD700"
              />
            </View>

            <ThemedText style={styles.title}>
              {isNewHighScore ? 'New High Score!' : 'Great Score!'}
            </ThemedText>

            <View style={styles.scoreContainer}>
              <ThemedText style={styles.score}>
                {score}/{totalQuestions}
              </ThemedText>
              <ThemedText style={styles.difficulty}>
                {getDifficultyLabel()} Mode
              </ThemedText>
            </View>

            <ThemedText style={styles.question}>
              Save to leaderboard?
            </ThemedText>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.yesButtonContainer}
                onPress={handleYes}
                disabled={isSubmitting}
              >
                <LinearGradient
                  colors={
                    colorScheme === 'dark'
                      ? ['#1a7e7e', '#0a5e5e']
                      : ['#0a9ea4', '#087d7a']
                  }
                  style={styles.yesButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <ThemedText style={styles.yesButtonText}>
                      Yes, Save It!
                    </ThemedText>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.noButton,
                  { borderColor: Colors[colorScheme ?? 'light'].border },
                ]}
                onPress={onSkip}
                disabled={isSubmitting}
              >
                <ThemedText style={styles.noButtonText}>Not Now</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AuthChoiceModal
        visible={showAuthChoice}
        onGoogleSignIn={handleGoogleSignIn}
        onAppleSignIn={handleAppleSignIn}
        onContinueAsGuest={handleContinueAsGuest}
        onClose={() => setShowAuthChoice(false)}
        isGoogleLoading={isGoogleLoading}
        isAppleLoading={isAppleLoading}
        isAppleAvailable={isAppleAvailable}
      />

      <NicknameModal
        visible={showNicknameModal}
        onClose={() => setShowNicknameModal(false)}
        onSubmit={handleNicknameSubmit}
        suggestedName={googleDisplayName}
        title="Join the Leaderboard"
        subtitle="Choose a nickname to display with your score"
      />
    </>
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
  iconContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  score: {
    fontSize: 48,
    fontWeight: 'bold',
    lineHeight: 56,
  },
  difficulty: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 4,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  yesButtonContainer: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  yesButton: {
    padding: 14,
    alignItems: 'center',
  },
  yesButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noButton: {
    padding: 14,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  noButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
