import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ThemedText';
import { NicknameModal } from '@/components/NicknameModal';
import { AuthChoiceModal } from '@/components/AuthChoiceModal';
import { GradientButton } from '@/components/GradientButton';
import { BaseModal } from '@/components/BaseModal';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
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
  onSubmit: (nickname: string, photoURL?: string | null) => Promise<void>;
  onSkip: () => void;
  onNavigateToLeaderboard?: () => void;
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
  onNavigateToLeaderboard,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [showAuthChoice, setShowAuthChoice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayedScore, setDisplayedScore] = useState(0);

  // Animation values
  const trophyScale = useSharedValue(0);
  const trophyRotation = useSharedValue(-15);
  const scoreOpacity = useSharedValue(0);

  const {
    authProvider,
    hasJoinedLeaderboard,
    googleDisplayName,
    isGoogleLoading,
    signInWithGoogleAndGetProfile,
    isAppleAvailable,
    isAppleLoading,
    promptAppleSignIn,
  } = useAuth();

  // Animated score counter
  useEffect(() => {
    if (visible) {
      setDisplayedScore(0);
      const duration = 1000;
      const steps = 20;
      const stepDuration = duration / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        // Ease out cubic for natural deceleration
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        setDisplayedScore(Math.round(easedProgress * score));

        if (currentStep >= steps) {
          clearInterval(interval);
          setDisplayedScore(score);
        }
      }, stepDuration);

      return () => clearInterval(interval);
    }
  }, [visible, score]);

  // Trophy bounce animation
  useEffect(() => {
    if (visible && !showNicknameModal && !showAuthChoice) {
      // Reset
      trophyScale.value = 0;
      trophyRotation.value = -15;
      scoreOpacity.value = 0;

      // Trophy bounce in with rotation
      trophyScale.value = withDelay(
        100,
        withSpring(1, {
          damping: 8,
          stiffness: 150,
          mass: 0.6,
        })
      );

      trophyRotation.value = withDelay(
        100,
        withSequence(
          withSpring(5, { damping: 10, stiffness: 200 }),
          withSpring(0, { damping: 15, stiffness: 150 })
        )
      );

      // Score fade in
      scoreOpacity.value = withDelay(
        300,
        withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
      );
    }
  }, [visible, showNicknameModal, showAuthChoice]);

  const trophyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: trophyScale.value },
      { rotate: `${trophyRotation.value}deg` },
    ],
  }));

  const scoreAnimatedStyle = useAnimatedStyle(() => ({
    opacity: scoreOpacity.value,
  }));

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

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip();
  };

  const handleGoogleSignIn = async () => {
    try {
      const profile = await signInWithGoogleAndGetProfile();
      const displayName =
        profile.displayName ||
        (profile.email ? profile.email.split('@')[0] : 'Player');

      setIsSubmitting(true);
      await onSubmit(displayName, profile.photoURL);
      onClose();
      setShowAuthChoice(false);
      onNavigateToLeaderboard?.();
    } catch (error: any) {
      if (error.message !== 'dismiss' && error.message !== 'cancel') {
        console.error('Google sign-in failed:', error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const result = await promptAppleSignIn();
      if (result?.success && result.profile) {
        const displayName =
          result.profile.displayName ||
          (result.profile.email ? result.profile.email.split('@')[0] : 'Player');

        setIsSubmitting(true);
        await onSubmit(displayName, result.profile.photoURL);
        onClose();
        setShowAuthChoice(false);
        onNavigateToLeaderboard?.();
      }
    } catch (error) {
      console.error('Apple sign-in failed:', error);
    } finally {
      setIsSubmitting(false);
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
      <BaseModal
        visible={visible && !showNicknameModal && !showAuthChoice}
        onClose={onClose}
        animationType="spring"
        testID="leaderboard-prompt-modal"
        accessibilityLabel={`Score ${score} out of ${totalQuestions}. Save to leaderboard?`}
      >
        <View style={styles.content}>
          {/* Trophy Icon with Bounce */}
          <Animated.View style={[styles.iconContainer, trophyAnimatedStyle]}>
            <Ionicons name="trophy" size={56} color="#FFD700" />
          </Animated.View>

          <ThemedText style={styles.title} accessibilityRole="header">
            {isNewHighScore ? 'New High Score!' : 'Great Score!'}
          </ThemedText>

          {/* Animated Score Display */}
          <Animated.View style={[styles.scoreContainer, scoreAnimatedStyle]}>
            <ThemedText style={styles.score} accessibilityLabel={`${score} out of ${totalQuestions}`}>
              {displayedScore}/{totalQuestions}
            </ThemedText>
            <ThemedText style={styles.difficulty}>
              {getDifficultyLabel()} Mode
            </ThemedText>
          </Animated.View>

          <ThemedText style={styles.question}>
            Save to leaderboard?
          </ThemedText>

          <View style={styles.buttonContainer}>
            <GradientButton
              onPress={handleYes}
              label="Yes, Save It!"
              variant="teal"
              loading={isSubmitting}
              disabled={isSubmitting}
            />

            <TouchableOpacity
              style={[
                styles.noButton,
                { borderColor: Colors[colorScheme].border },
              ]}
              onPress={handleSkip}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Skip saving to leaderboard"
            >
              <ThemedText style={styles.noButtonText}>Not Now</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </BaseModal>

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
  content: {
    alignItems: 'center',
    width: '100%',
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
  noButton: {
    padding: 14,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 48, // Minimum touch target
  },
  noButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
