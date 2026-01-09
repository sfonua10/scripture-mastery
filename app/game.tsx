import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  View,
  Linking,
  ScrollView,
  Text,
  Share,
  Image,
  AccessibilityInfo,
  Keyboard,
  InteractionManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { LeaderboardPrompt } from "@/components/LeaderboardPrompt";
import { BadgeEarnedModal } from "@/components/BadgeEarnedModal";
import { GradientButton } from "@/components/GradientButton";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useSound } from "@/hooks/useSound";
import { useDailyChallenge } from "@/hooks/useDailyChallenge";
import { useAuth } from "@/contexts/AuthContext";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useChallenge } from "@/hooks/useChallenge";
import { GameMode, Scripture, DailyChallengeBadge, Challenge } from "@/types/scripture";
import {
  getRandomScripture,
  getNextRandomScripture,
  checkGuess,
} from "@/utils/scriptureUtils";
import { Ionicons } from "@expo/vector-icons";
import ConfettiCannon from "react-native-confetti-cannon";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  useAnimatedReaction,
  runOnJS,
  Easing,
  interpolate,
  interpolateColor,
  FadeIn,
  FadeOut,
  SlideInDown,
} from "react-native-reanimated";

const TOTAL_QUESTIONS = 3;

const MIN_SCORE_FOR_LEADERBOARD = 0; // Minimum score to prompt for leaderboard

// Animation constants for consistent spring physics
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
};

const SPRING_CONFIG_BOUNCY = {
  damping: 12,
  stiffness: 180,
};

// Animated score text component
interface AnimatedScoreProps {
  animatedValue: Animated.SharedValue<number>;
  total: number;
  style: any;
}

function AnimatedScore({ animatedValue, total, style }: AnimatedScoreProps) {
  const [displayValue, setDisplayValue] = React.useState(0);

  // Use Reanimated's reaction instead of polling - only updates when value changes
  useAnimatedReaction(
    () => Math.round(animatedValue.value),
    (currentValue, previousValue) => {
      if (currentValue !== previousValue) {
        runOnJS(setDisplayValue)(currentValue);
      }
    },
    [animatedValue]
  );

  return (
    <Text style={style}>
      {displayValue}/{total}
    </Text>
  );
}

// Progress Dot Component with animation
interface ProgressDotProps {
  index: number;
  status: 'pending' | 'correct' | 'incorrect';
  isCurrent: boolean;
  colorScheme: 'light' | 'dark';
}

function ProgressDot({ index, status, isCurrent, colorScheme }: ProgressDotProps) {
  const scale = useSharedValue(isCurrent ? 1 : 0.8);
  const opacity = useSharedValue(status === 'pending' ? 0.4 : 1);

  useEffect(() => {
    scale.value = withSpring(isCurrent ? 1.2 : (status !== 'pending' ? 1 : 0.8), SPRING_CONFIG);
    opacity.value = withTiming(status === 'pending' && !isCurrent ? 0.4 : 1, { duration: 200 });
  }, [isCurrent, status]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const getColor = () => {
    if (status === 'correct') return '#4CAF50';
    if (status === 'incorrect') return '#F44336';
    return colorScheme === 'dark' ? '#555' : '#ddd';
  };

  return (
    <Animated.View
      style={[
        styles.progressDot,
        { backgroundColor: getColor() },
        isCurrent && styles.progressDotCurrent,
        animatedStyle,
      ]}
      accessibilityLabel={`Question ${index + 1}: ${status === 'pending' ? 'upcoming' : status}`}
      accessibilityRole="progressbar"
    />
  );
}

// Progress Indicator Component
interface ProgressIndicatorProps {
  currentQuestion: number;
  totalQuestions: number;
  answers: ('correct' | 'incorrect' | 'pending')[];
  colorScheme: 'light' | 'dark';
}

function ProgressIndicator({ currentQuestion, totalQuestions, answers, colorScheme }: ProgressIndicatorProps) {
  return (
    <View
      style={styles.progressContainer}
      accessibilityLabel={`Question ${currentQuestion} of ${totalQuestions}`}
      accessibilityRole="progressbar"
    >
      {Array.from({ length: totalQuestions }).map((_, index) => (
        <ProgressDot
          key={index}
          index={index}
          status={answers[index] || 'pending'}
          isCurrent={index === currentQuestion - 1}
          colorScheme={colorScheme}
        />
      ))}
    </View>
  );
}

// Animated Checkmark with pulse effect
interface AnimatedFeedbackIconProps {
  isCorrect: boolean;
  colors: typeof Colors.light;
}

function AnimatedFeedbackIcon({ isCorrect, colors }: AnimatedFeedbackIconProps) {
  const scale = useSharedValue(0);
  const pulseScale = useSharedValue(0);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    // Main icon animation - spring with overshoot
    scale.value = withSpring(1, SPRING_CONFIG_BOUNCY);

    // Pulse/ripple animation
    pulseScale.value = withTiming(1.8, { duration: 400, easing: Easing.out(Easing.cubic) });
    pulseOpacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const backgroundColor = isCorrect ? '#e6f7e6' : '#ffebee';
  const iconColor = isCorrect ? colors.success : colors.error;
  const pulseColor = isCorrect ? colors.success : colors.error;

  return (
    <View style={styles.iconContainer}>
      {/* Pulse/ripple effect */}
      <Animated.View
        style={[
          styles.feedbackPulse,
          { backgroundColor: pulseColor },
          pulseStyle,
        ]}
      />
      {/* Main icon */}
      <Animated.View
        style={[
          isCorrect ? styles.checkCircle : styles.xCircle,
          { backgroundColor },
          iconStyle,
        ]}
      >
        <ThemedText style={isCorrect ? styles.checkmark : styles.xMark}>
          {isCorrect ? '✓' : '✗'}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

// Animated Result Card with shake for incorrect
interface AnimatedResultCardProps {
  isCorrect: boolean;
  userGuess: string;
  correctAnswer: string;
  fullReference: string;
  colors: typeof Colors.light;
}

function AnimatedResultCard({ isCorrect, userGuess, correctAnswer, fullReference, colors }: AnimatedResultCardProps) {
  const translateX = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(20);

  useEffect(() => {
    // Slide in animation
    cardOpacity.value = withTiming(1, { duration: 200 });
    cardTranslateY.value = withSpring(0, SPRING_CONFIG);

    if (!isCorrect) {
      // Shake animation for incorrect - 3 oscillations
      translateX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-4, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      // Red flash overlay
      flashOpacity.value = withSequence(
        withTiming(0.1, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );
    }
  }, [isCorrect]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: cardTranslateY.value },
    ],
    opacity: cardOpacity.value,
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  return (
    <Animated.View style={[styles.resultCard, { backgroundColor: colors.card }, cardStyle]}>
      {/* Red flash overlay for incorrect */}
      {!isCorrect && (
        <Animated.View
          style={[
            styles.flashOverlay,
            { backgroundColor: colors.error },
            flashStyle,
          ]}
        />
      )}

      <AnimatedFeedbackIcon isCorrect={isCorrect} colors={colors} />

      {isCorrect ? (
        <>
          <ThemedText style={[styles.correctText, { color: colors.success }]}>
            Correct!
          </ThemedText>
          <ThemedText style={styles.correctReference}>
            {fullReference}
          </ThemedText>
        </>
      ) : (
        <>
          <ThemedText style={styles.incorrectGuess}>
            You guessed{" "}
            <ThemedText style={[styles.userGuessText, { color: colors.error }]}>
              {userGuess}
            </ThemedText>
          </ThemedText>
          <ThemedText style={styles.correctReference}>
            It was{" "}
            <ThemedText style={[styles.correctAnswerText, { color: colors.success }]}>
              {correctAnswer}
            </ThemedText>
          </ThemedText>
        </>
      )}

      {/* Full reference link */}
      <TouchableOpacity
        style={styles.fullReferenceLink}
        onPress={() =>
          Linking.openURL(
            "https://www.churchofjesuschrist.org/study/scriptures?lang=eng"
          )
        }
        accessibilityLabel={`Open ${fullReference} in scriptures`}
        accessibilityRole="link"
        accessibilityHint="Opens the scripture reference in a web browser"
      >
        <View style={styles.fullReferenceContainer}>
          <ThemedText style={styles.fullReferenceText}>
            {fullReference}
          </ThemedText>
          <Ionicons
            name="open-outline"
            size={12}
            color="#888888"
            style={styles.fullReferenceIcon}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Animated Input Field with focus glow and shake
interface AnimatedInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  colors: typeof Colors.light;
  colorScheme: 'light' | 'dark';
  onSubmitEditing: () => void;
  inputRef: React.RefObject<TextInput>;
  shouldShake: boolean;
  onShakeComplete: () => void;
}

function AnimatedInput({
  value,
  onChangeText,
  placeholder,
  colors,
  colorScheme,
  onSubmitEditing,
  inputRef,
  shouldShake,
  onShakeComplete,
}: AnimatedInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const borderWidth = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (isFocused) {
      borderWidth.value = withTiming(2, { duration: 150 });
      glowOpacity.value = withTiming(1, { duration: 150 });
    } else {
      borderWidth.value = withTiming(1, { duration: 150 });
      glowOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [isFocused]);

  useEffect(() => {
    if (shouldShake) {
      translateX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-3, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      // Notify parent that shake is complete
      setTimeout(onShakeComplete, 300);
    }
  }, [shouldShake]);

  // Teal focus color to match the teal button variant
  const tealFocusColor = colorScheme === 'dark' ? '#1a7e7e' : '#0a9ea4';

  const inputContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    borderWidth: borderWidth.value,
    borderColor: isFocused ? tealFocusColor : colors.border,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.inputWrapper}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.inputGlow,
          {
            backgroundColor: tealFocusColor,
            shadowColor: tealFocusColor,
          },
          glowStyle,
        ]}
      />
      <Animated.View style={[styles.animatedInputContainer, inputContainerStyle, { backgroundColor: colors.background }]}>
        <TextInput
          ref={inputRef}
          style={[
            styles.guessInputInner,
            { color: colors.text },
          ]}
          placeholder={placeholder}
          placeholderTextColor={colorScheme === 'dark' ? '#666' : '#888'}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="words"
          returnKeyType="go"
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel="Enter your scripture reference guess"
          accessibilityHint={placeholder}
        />
      </Animated.View>
    </View>
  );
}

// Animated Submit Button with scale effect
interface AnimatedSubmitButtonProps {
  onPress: () => void;
  loading: boolean;
  disabled: boolean;
  label: string;
}

function AnimatedSubmitButton({ onPress, loading, disabled, label }: AnimatedSubmitButtonProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 20, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <GradientButton
        onPress={onPress}
        label={label}
        variant="teal"
        loading={loading}
        disabled={disabled}
      />
    </Animated.View>
  );
}

// Score Ring Progress Component
interface ScoreRingProps {
  progress: number; // 0-1
  score: number;
  total: number;
  size: number;
  strokeWidth: number;
}

function ScoreRing({ progress, score, total, size }: ScoreRingProps) {
  const animatedProgress = useSharedValue(0);
  const colorProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 1500,
      easing: Easing.out(Easing.cubic),
    });
    colorProgress.value = withTiming(score / total, {
      duration: 1500,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, score, total]);

  // Calculate colors based on score
  const getScoreColor = () => {
    const ratio = score / total;
    if (ratio >= 0.8) return '#4CAF50'; // Green
    if (ratio >= 0.5) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const ringStyle = useAnimatedStyle(() => {
    const rotation = interpolate(animatedProgress.value, [0, 1], [0, 360]);
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={[styles.scoreRingContainer, { width: size, height: size }]}>
      {/* Background ring */}
      <View style={[styles.scoreRingBg, {
        width: size - 8,
        height: size - 8,
        borderRadius: (size - 8) / 2,
        borderWidth: 4,
        borderColor: 'rgba(0,0,0,0.1)',
      }]} />
      {/* Progress ring using View rotation trick */}
      <Animated.View
        style={[
          styles.scoreRingProgress,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 4,
            borderColor: getScoreColor(),
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
          },
          ringStyle,
        ]}
      />
    </View>
  );
}

// Animated Summary Card with staggered children
interface AnimatedSummaryCardProps {
  children: React.ReactNode;
  colors: typeof Colors.light;
  visible: boolean;
}

function AnimatedSummaryCard({ children, colors, visible }: AnimatedSummaryCardProps) {
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, SPRING_CONFIG);
      opacity.value = withTiming(1, { duration: 300 });
    }
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.summaryCard, { backgroundColor: colors.card }, cardStyle]}>
      {children}
    </Animated.View>
  );
}

export default function GameScreen() {
  const {
    mode,
    challengeId,
    isCreator,
    challengeMode,
    challengeCode,
    scriptures: scripturesParam,
    questionCount: questionCountParam,
  } = useLocalSearchParams<{
    mode: GameMode | 'daily';
    challengeId?: string;
    isCreator?: string;
    challengeMode?: 'creating';
    challengeCode?: string;
    scriptures?: string;
    questionCount?: string;
  }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { playCorrect, playWrong } = useSound();

  // Check if this is daily challenge mode
  const isDailyChallenge = mode === 'daily';
  const effectiveMode: GameMode = isDailyChallenge ? 'easy' : (mode as GameMode);

  // Challenge mode
  const isChallengeMode = !!challengeId;
  const isChallenger = isCreator === 'false';

  // Creating challenge mode (scriptures passed as params, not yet saved to Firestore)
  const isCreatingChallenge = challengeMode === 'creating';
  const creatingScriptures: Scripture[] = React.useMemo(() => {
    if (isCreatingChallenge && scripturesParam) {
      try {
        return JSON.parse(scripturesParam);
      } catch {
        return [];
      }
    }
    return [];
  }, [isCreatingChallenge, scripturesParam]);

  // Daily challenge hook
  const {
    dailyScripture,
    stats: dailyStats,
    todayCompleted,
    completeDailyChallenge,
  } = useDailyChallenge();

  // Auth and leaderboard hooks
  const {
    nickname,
    hasJoinedLeaderboard,
    isNewHighScore,
    updateHighScore,
    joinLeaderboard
  } = useAuth();
  const { submitScore } = useLeaderboard(effectiveMode);

  // Challenge hook
  const {
    challenge,
    submitCreatorScore,
    submitChallengerScore,
  } = useChallenge(challengeId);

  // Challenge scriptures and question tracking
  const [challengeScriptureIndex, setChallengeScriptureIndex] = useState(0);
  const totalQuestions = isDailyChallenge
    ? 1
    : isCreatingChallenge && questionCountParam
      ? parseInt(questionCountParam, 10)
      : isChallengeMode && challenge
        ? challenge.questionCount
        : TOTAL_QUESTIONS;

  const [currentScripture, setCurrentScripture] = useState<Scripture | null>(
    null
  );
  const [userGuess, setUserGuess] = useState("");
  const [hasGuessed, setHasGuessed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(1);
  const [correctCount, setCorrectCount] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showSummaryCard, setShowSummaryCard] = useState(false);
  const [showLeaderboardPrompt, setShowLeaderboardPrompt] = useState(false);
  const [isHighScore, setIsHighScore] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<DailyChallengeBadge[]>([]);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0);
  const [inputShouldShake, setInputShouldShake] = useState(false);

  // Track answers for progress indicator
  const [answerHistory, setAnswerHistory] = useState<('correct' | 'incorrect' | 'pending')[]>(
    Array(totalQuestions).fill('pending')
  );

  // Reinitialize answerHistory when totalQuestions changes (e.g., challenge loads)
  useEffect(() => {
    setAnswerHistory(Array(totalQuestions).fill('pending'));
  }, [totalQuestions]);

  const shareCardRef = useRef<View>(null);
  const isMountedRef = useRef(true);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Animation shared values
  const scoreAnimation = useSharedValue(0);
  const circleScale = useSharedValue(0.8);

  // Streak celebration animation values
  const streakScale = useSharedValue(0);
  const streakRotation = useSharedValue(-15);

  // Animated style for the score circle
  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  // Animated style for streak hero (bounce + wiggle)
  const animatedStreakStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: streakScale.value },
      { rotate: `${streakRotation.value}deg` },
    ],
  }));

  useEffect(() => {
    // Select scripture when the component mounts
    if (isDailyChallenge) {
      setCurrentScripture(dailyScripture);
    } else if (isCreatingChallenge && creatingScriptures.length > 0) {
      // Use locally-generated scriptures for challenge creation flow
      setCurrentScripture(creatingScriptures[0]);
      setChallengeScriptureIndex(0);
    } else if (isChallengeMode && challenge) {
      // Use pre-defined challenge scriptures
      setCurrentScripture(challenge.scriptures[0]);
      setChallengeScriptureIndex(0);
    } else if (!isChallengeMode && !isCreatingChallenge) {
      setCurrentScripture(getRandomScripture());
    }
  }, [isDailyChallenge, dailyScripture, isChallengeMode, challenge, isCreatingChallenge, creatingScriptures]);

  // Handle session completion - check for high score and show leaderboard prompt
  useEffect(() => {
    if (!sessionComplete) return;

    let isMounted = true;
    const timeoutIds: NodeJS.Timeout[] = [];

    const handleCompletion = async () => {
      try {
        // Handle creating challenge mode - navigate directly to created-result screen
        if (isCreatingChallenge && challengeCode) {
          router.replace({
            pathname: '/challenge/created-result',
            params: {
              challengeCode,
              scriptures: scripturesParam,
              difficulty: mode,
              questionCount: totalQuestions.toString(),
              score: correctCount.toString(),
            },
          });
          return;
        }

        // Handle challenge mode completion
        if (isChallengeMode && challengeId) {
          // Submit score to challenge
          if (isChallenger) {
            await submitChallengerScore(challengeId, correctCount);
            if (!isMounted) return;
            // Challenger goes to result screen to see comparison
            router.replace({
              pathname: '/challenge/result',
              params: { challengeId },
            });
          } else {
            await submitCreatorScore(challengeId, correctCount);
            if (!isMounted) return;
            // Creator goes to created-result screen with score to share
            router.replace({
              pathname: '/challenge/created-result',
              params: {
                challengeId,
                score: correctCount.toString(),
                questionCount: totalQuestions.toString(),
              },
            });
          }
          return;
        }

        // Handle daily challenge completion
        if (isDailyChallenge) {
          const newBadges = await completeDailyChallenge(correctCount > 0);
          if (!isMounted) return;

          if (newBadges.length > 0) {
            setEarnedBadges(newBadges);
            setCurrentBadgeIndex(0);
            setShowBadgeModal(true);
          }
          setShowSummaryCard(true);
          return;
        }

        // Regular game mode - check for high score
        const newHighScore = isNewHighScore(effectiveMode, correctCount);
        if (!isMounted) return;

        setIsHighScore(newHighScore);

        // Update local high score
        if (newHighScore) {
          await updateHighScore(effectiveMode, correctCount);
          if (!isMounted) return;
        }

        // Determine if we should show leaderboard prompt
        const shouldPrompt = correctCount >= MIN_SCORE_FOR_LEADERBOARD &&
          (newHighScore || !hasJoinedLeaderboard);

        if (shouldPrompt) {
          // Show prompt after a short delay (or after confetti for high scores)
          const delay = correctCount >= 8 ? 1500 : 500;
          const promptTimeout = setTimeout(() => {
            if (isMounted) setShowLeaderboardPrompt(true);
          }, delay);
          timeoutIds.push(promptTimeout);
        }

        // Delay showing the summary card to let confetti play first
        if (correctCount >= 8) {
          const summaryTimeout = setTimeout(() => {
            if (isMounted) setShowSummaryCard(true);
          }, 1500);
          timeoutIds.push(summaryTimeout);
        } else {
          setShowSummaryCard(true);
        }
      } catch (error) {
        console.error('Error completing session:', error);
      }
    };

    handleCompletion();

    return () => {
      isMounted = false;
      timeoutIds.forEach(clearTimeout);
    };
  }, [sessionComplete, correctCount, effectiveMode, isNewHighScore, updateHighScore, hasJoinedLeaderboard, isDailyChallenge, completeDailyChallenge, isChallengeMode, challengeId, isChallenger, submitCreatorScore, submitChallengerScore, isCreatingChallenge, challengeCode, scripturesParam, mode, totalQuestions]);

  // Trigger score animation when summary card appears
  useEffect(() => {
    if (showSummaryCard) {
      // Count up animation (for regular game)
      scoreAnimation.value = withTiming(correctCount, {
        duration: 1500,
        easing: Easing.out(Easing.cubic),
      });
      // Pop/bounce effect (for regular game)
      circleScale.value = withSpring(1, {
        damping: 12,
        stiffness: 150,
      });

      // Streak celebration animation (for daily challenge)
      if (isDailyChallenge) {
        // Bounce in with overshoot
        streakScale.value = withSequence(
          withSpring(1.2, { damping: 8, stiffness: 200 }),
          withSpring(1, { damping: 12, stiffness: 150 })
        );
        // Wiggle effect
        streakRotation.value = withSequence(
          withTiming(15, { duration: 150 }),
          withTiming(-10, { duration: 150 }),
          withTiming(5, { duration: 150 }),
          withTiming(0, { duration: 150 })
        );
      }
    }
  }, [showSummaryCard, correctCount, isDailyChallenge]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmitGuess = async () => {
    if (!currentScripture) return;

    if (!userGuess.trim()) {
      // Trigger shake animation on input
      setInputShouldShake(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    // Capture current values to avoid stale closure
    const capturedScripture = currentScripture;
    const capturedGuess = userGuess;

    // Clear any existing timeout
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
    }

    // Simulate a brief loading state
    submitTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;

      const correct = checkGuess(capturedScripture, capturedGuess, effectiveMode);

      setIsCorrect(correct);
      setHasGuessed(true);
      setLoading(false);

      // Update answer history for progress indicator
      setAnswerHistory(prev => {
        const newHistory = [...prev];
        newHistory[questionCount - 1] = correct ? 'correct' : 'incorrect';
        return newHistory;
      });

      // Track correct answers
      if (correct) {
        setCorrectCount(prev => prev + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        playCorrect();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        playWrong();
      }
    }, 500);
  };

  const handleNextScripture = () => {
    if (!currentScripture) return;

    // Daily challenge is single question - always complete after first question
    if (isDailyChallenge) {
      setSessionComplete(true);
      return;
    }

    // Check if session is complete
    if (questionCount >= totalQuestions) {
      setSessionComplete(true);
      return;
    }

    // Creating challenge mode - use locally-generated scriptures
    if (isCreatingChallenge && creatingScriptures.length > 0) {
      const nextIndex = challengeScriptureIndex + 1;
      setCurrentScripture(creatingScriptures[nextIndex]);
      setChallengeScriptureIndex(nextIndex);
    } else if (isChallengeMode && challenge) {
      // Challenge mode - use pre-defined scriptures
      const nextIndex = challengeScriptureIndex + 1;
      setCurrentScripture(challenge.scriptures[nextIndex]);
      setChallengeScriptureIndex(nextIndex);
    } else {
      // Select a new random scripture
      setCurrentScripture(getNextRandomScripture(currentScripture));
    }

    setUserGuess("");
    setHasGuessed(false);
    setIsCorrect(false);
    setQuestionCount(prev => prev + 1);
  };

  const handlePlayAgain = () => {
    setQuestionCount(1);
    setCorrectCount(0);
    setSessionComplete(false);
    setShowSummaryCard(false);
    setShowLeaderboardPrompt(false);
    setIsHighScore(false);
    setCurrentScripture(getRandomScripture());
    setUserGuess("");
    setHasGuessed(false);
    setIsCorrect(false);
    setAnswerHistory(Array(totalQuestions).fill('pending'));
    // Reset animations for next game
    scoreAnimation.value = 0;
    circleScale.value = 0.8;
  };

  const handleLeaderboardSubmit = async (submittedNickname: string, photoURL?: string | null) => {
    try {
      if (!hasJoinedLeaderboard) {
        // First time joining - create profile and submit
        await joinLeaderboard(submittedNickname, effectiveMode, correctCount);
      }
      // Submit score to leaderboard - pass photoURL directly to avoid React state timing issues
      await submitScore(correctCount, submittedNickname, photoURL);
      setShowLeaderboardPrompt(false);
    } catch (error) {
      console.error('Failed to submit to leaderboard:', error);
      Alert.alert('Error', 'Failed to save score. Please try again.');
    }
  };

  const handlePlayRegularGame = () => {
    router.replace({
      pathname: '/game',
      params: { mode: 'easy' }
    });
  };

  const handleDismissBadge = () => {
    if (currentBadgeIndex < earnedBadges.length - 1) {
      setCurrentBadgeIndex(prev => prev + 1);
    } else {
      setShowBadgeModal(false);
    }
  };

  const handleLeaderboardSkip = () => {
    setShowLeaderboardPrompt(false);
  };

  const handleNavigateToLeaderboard = () => {
    setShowLeaderboardPrompt(false);
    router.push({
      pathname: '/(tabs)/leaderboard',
      params: { difficulty: mode }
    });
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const APP_STORE_LINK = 'https://apps.apple.com/us/app/scripture-mastery-pro/id6742937573';
    const message = `I got ${correctCount}/${totalQuestions} on Scripture Mastery! Can you beat my score?\n${APP_STORE_LINK}`;

    try {
      // Ensure the view is fully rendered before capture (important for Android)
      await new Promise<void>(resolve => {
        InteractionManager.runAfterInteractions(() => resolve());
      });

      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1,
      });

      if (Platform.OS === 'ios') {
        await Share.share({
          message,
          url: uri,
        });
      } else {
        await Sharing.shareAsync(uri, {
          dialogTitle: message,
        });
      }
    } catch (error) {
      // Fallback to text share
      await Share.share({ message });
    }
  };

  const handleViewLeaderboard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/leaderboard');
  };

  const getPlaceholderText = () => {
    switch (effectiveMode) {
      case "easy":
        return 'e.g., John';
      case "medium":
        return 'e.g., John 3';
      case "hard":
        return 'e.g., John 3:16';
      default:
        return "Enter your guess";
    }
  };

  const getCorrectAnswer = () => {
    if (!currentScripture) return "";

    const { book, chapter, verse } = currentScripture.reference;

    switch (effectiveMode) {
      case "easy":
        return book;
      case "medium":
        return `${book} ${chapter}`;
      case "hard":
        return `${book} ${chapter}:${verse}`;
      default:
        return "";
    }
  };

  const getFullReference = () => {
    if (!currentScripture) return "";

    const { book, chapter, verse } = currentScripture.reference;
    return `${book} ${chapter}:${verse}`;
  };

  const getDifficultyTitle = () => {
    if (isDailyChallenge) {
      return "Daily Challenge";
    }
    if (isChallengeMode && challenge) {
      const opponentName = isChallenger
        ? challenge.creatorNickname
        : 'Friend';
      return `Challenge vs ${opponentName}`;
    }
    switch (mode) {
      case "easy":
        return "Easy Mode";
      case "medium":
        return "Medium Mode";
      case "hard":
        return "Hard Mode";
      default:
        return "Scripture Mastery";
    }
  };

  const getSimpleDifficulty = () => {
    if (isDailyChallenge) return 'Daily';
    switch (effectiveMode) {
      case 'easy': return 'Easy';
      case 'medium': return 'Medium';
      case 'hard': return 'Hard';
      default: return 'Easy';
    }
  };

  const getScoreColor = () => {
    if (correctCount >= 8) return { bg: "#e6f7e6", text: "#4CAF50" }; // green
    if (correctCount >= 5) return { bg: "#fff8e6", text: "#FF9800" }; // yellow/orange
    return { bg: "#ffebee", text: "#F44336" }; // red
  };

  if (!currentScripture) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator
          size="large"
          color={colors.tint}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={{ alignItems: 'center' }}>
              <Text style={{
                color: colors.text,
                fontSize: 17,
                fontWeight: '600'
              }}>
                {getDifficultyTitle()}
              </Text>
              {!sessionComplete && !isDailyChallenge && (
                <ProgressIndicator
                  currentQuestion={questionCount}
                  totalQuestions={totalQuestions}
                  answers={answerHistory}
                  colorScheme={colorScheme ?? 'light'}
                />
              )}
              {!sessionComplete && isDailyChallenge && (
                <Text style={{
                  color: colors.text,
                  fontSize: 12,
                  opacity: 0.6
                }}>
                  Guess the book
                </Text>
              )}
            </View>
          ),
          headerBackTitle: "Home",
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.tint,
          headerShadowVisible: false,
        }}
      />

      {sessionComplete ? (
        isCreatingChallenge ? (
          // Simple transition for challenge creation - navigating to Challenge Ready screen
          <ThemedView style={[styles.summaryContainer, styles.transitionContainer]}>
            <ActivityIndicator size="large" color={colors.tint} />
          </ThemedView>
        ) : (
        <ThemedView style={styles.summaryContainer}>
          {/* Confetti for high scores OR streak milestones (7, 14, 30 days) */}
          {(correctCount >= 8 || (isDailyChallenge && [7, 14, 30].includes(dailyStats.currentStreak))) && (
            <ConfettiCannon
              count={200}
              origin={{ x: -10, y: 0 }}
              autoStart={true}
              fadeOut={true}
            />
          )}

          {showSummaryCard && (
            <>
              {/* Hidden shareable card for capturing - Image-Dominant Design */}
              <View style={styles.shareCardWrapper}>
                <View ref={shareCardRef} style={styles.shareCard} collapsable={false}>
                  {/* IMAGE SECTION - 70% of card (420px) */}
                  <View style={styles.shareImageSection}>
                    <Image
                      source={require('@/assets/images/scriptorian.jpeg')}
                      style={styles.shareCardBanner}
                    />
                    {/* Gradient overlay for text legibility */}
                    <LinearGradient
                      colors={['transparent', 'transparent', 'rgba(0,0,0,0.5)']}
                      locations={[0, 0.5, 1]}
                      style={styles.shareImageOverlay}
                    />

                    {/* "BEAT MY SCORE" pill - top left */}
                    <View style={styles.shareBeatScorePill}>
                      <Text style={styles.shareBeatScoreText}>BEAT MY SCORE!</Text>
                    </View>

                    {/* Trophy badge - top right with glow */}
                    <View style={styles.shareTrophyBadge}>
                      <Ionicons name="trophy" size={28} color="#fff" />
                    </View>

                    {/* Floating glassmorphism score badge - overlaps into content */}
                    <View style={styles.shareFloatingScore}>
                      <Text style={[styles.shareScoreNumber, { color: getScoreColor().text }]}>
                        {correctCount}
                      </Text>
                      <Text style={styles.shareScoreDivider}>/</Text>
                      <Text style={styles.shareScoreTotal}>{totalQuestions}</Text>
                    </View>
                  </View>

                  {/* CONTENT SECTION - 30% of card */}
                  <View style={styles.shareCardContent}>
                    {/* Challenge code section - only in challenge mode */}
                    {isChallengeMode && challenge && (
                      <View style={styles.shareChallengeCodeSection}>
                        <Text style={styles.shareChallengeCodeLabel}>CHALLENGE CODE</Text>
                        <Text style={styles.shareChallengeCodeValue}>{challenge.challengeCode}</Text>
                      </View>
                    )}

                    {/* Difficulty and question count pills */}
                    <View style={styles.sharePillsRow}>
                      <View style={styles.sharePill}>
                        <Text style={styles.sharePillText}>{getSimpleDifficulty()}</Text>
                      </View>
                      <Text style={styles.sharePillDot}>•</Text>
                      <View style={styles.sharePill}>
                        <Text style={styles.sharePillText}>{totalQuestions} Questions</Text>
                      </View>
                    </View>

                    {/* Bottom bar with icon and name */}
                    <View style={styles.shareBottomBar}>
                      <Image
                        source={require('@/assets/icons/ios-light.png')}
                        style={styles.shareAppIcon}
                      />
                      <Text style={styles.shareAppName}>Scripture Mastery Pro</Text>
                    </View>
                  </View>
                </View>
              </View>

          <AnimatedSummaryCard colors={colors} visible={showSummaryCard}>
            <ThemedText style={styles.summaryTitle}>
              {isDailyChallenge ? "Daily Challenge Complete!" : "Session Complete!"}
            </ThemedText>

            {isDailyChallenge ? (
              <>
                {/* Hero Streak Display - Animated */}
                <Animated.View style={[styles.dailyStreakHero, animatedStreakStyle]}>
                  <Ionicons name="flame" size={32} color="#ff6b35" />
                  <ThemedText style={styles.dailyStreakNumber}>
                    {dailyStats.currentStreak}
                  </ThemedText>
                  <ThemedText style={styles.dailyStreakLabel}>
                    day{dailyStats.currentStreak === 1 ? '' : 's'} streak
                  </ThemedText>
                </Animated.View>

                {/* Result Badge */}
                <View style={[
                  styles.dailyResultBadge,
                  { backgroundColor: correctCount > 0 ? colors.successLight : colors.errorLight }
                ]}>
                  <Ionicons
                    name={correctCount > 0 ? "checkmark" : "close"}
                    size={20}
                    color={correctCount > 0 ? colors.success : colors.error}
                  />
                  <ThemedText style={[
                    styles.dailyResultText,
                    { color: correctCount > 0 ? colors.success : colors.error }
                  ]}>
                    {correctCount > 0 ? "Correct!" : "Incorrect"}
                  </ThemedText>
                </View>

                {/* Encouragement Text */}
                <ThemedText style={styles.dailyEncouragement}>
                  {correctCount > 0 ? "Keep it going!" : "Come back tomorrow!"}
                </ThemedText>
              </>
            ) : (
              <>
                <View style={styles.scoreCircleWrapper}>
                  <ScoreRing
                    progress={correctCount / TOTAL_QUESTIONS}
                    score={correctCount}
                    total={TOTAL_QUESTIONS}
                    size={160}
                    strokeWidth={4}
                  />
                  <Animated.View style={[styles.scoreCircle, { backgroundColor: getScoreColor().bg }, animatedCircleStyle]}>
                    <AnimatedScore
                      animatedValue={scoreAnimation}
                      total={TOTAL_QUESTIONS}
                      style={[styles.scoreText, { color: getScoreColor().text }]}
                    />
                  </Animated.View>
                </View>
                <ThemedText style={styles.summaryMessage}>
                  {correctCount === TOTAL_QUESTIONS ? "Perfect score!" :
                   correctCount >= 8 ? "Great job!" :
                   correctCount >= 5 ? "Good effort!" :
                   "Keep practicing!"}
                </ThemedText>
              </>
            )}

            {isDailyChallenge ? (
              /* Daily Challenge Buttons - New hierarchy */
              <View style={styles.dailySummaryButtons}>
                {/* Primary CTA: Share Your Streak */}
                <GradientButton
                  onPress={handleShare}
                  label={`Share Your ${dailyStats.currentStreak}-Day Streak`}
                  variant="warm"
                  icon={<Ionicons name="share-outline" size={18} color="white" />}
                />

                {/* Secondary Actions Row */}
                <View style={styles.secondaryActionsRow}>
                  <TouchableOpacity
                    style={[styles.secondaryAction, { borderColor: colors.border }]}
                    onPress={handlePlayRegularGame}
                    accessibilityLabel="Play regular game"
                    accessibilityRole="button"
                  >
                    <Ionicons name="play-outline" size={18} color={colors.textSecondary} />
                    <ThemedText style={[styles.secondaryActionText, { color: colors.textSecondary }]}>
                      Play Game
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.secondaryAction, { borderColor: colors.border }]}
                    onPress={handleViewLeaderboard}
                    accessibilityLabel="View leaderboard"
                    accessibilityRole="button"
                  >
                    <Ionicons name="trophy-outline" size={18} color={colors.textSecondary} />
                    <ThemedText style={[styles.secondaryActionText, { color: colors.textSecondary }]}>
                      Leaderboard
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Regular Game Buttons */
              <View style={styles.summaryButtons}>
                <GradientButton
                  onPress={handlePlayAgain}
                  label="Play Again"
                  variant="teal"
                />

                <TouchableOpacity
                  style={styles.shareButtonContainer}
                  onPress={handleShare}
                  accessibilityLabel="Share your score"
                  accessibilityRole="button"
                >
                  <View style={[styles.shareButton, { borderColor: colors.tint }]}>
                    <ThemedText style={[styles.shareButtonText, { color: colors.tint }]}>
                      Share Score
                    </ThemedText>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.leaderboardButtonContainer}
                  onPress={handleViewLeaderboard}
                  accessibilityLabel="View leaderboard"
                  accessibilityRole="button"
                >
                  <View style={[styles.leaderboardButton, { borderColor: colors.tint }]}>
                    <Ionicons name="trophy-outline" size={18} color={colors.tint} style={{ marginRight: 6 }} />
                    <ThemedText style={[styles.leaderboardButtonText, { color: colors.tint }]}>
                      View Leaderboard
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </AnimatedSummaryCard>
            </>
          )}

          <LeaderboardPrompt
            visible={showLeaderboardPrompt}
            score={correctCount}
            totalQuestions={TOTAL_QUESTIONS}
            difficulty={effectiveMode}
            isNewHighScore={isHighScore}
            hasNickname={!!nickname}
            nickname={nickname}
            onClose={() => setShowLeaderboardPrompt(false)}
            onSubmit={handleLeaderboardSubmit}
            onSkip={handleLeaderboardSkip}
            onNavigateToLeaderboard={handleNavigateToLeaderboard}
          />

          <BadgeEarnedModal
            badge={earnedBadges[currentBadgeIndex] || null}
            visible={showBadgeModal}
            onDismiss={handleDismissBadge}
          />
        </ThemedView>
        )
      ) : (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ThemedView style={styles.content}>
          {/* Use ScrollView for content to make it scrollable */}
          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {hasGuessed && (
              <ThemedView style={styles.resultContainer}>
                <AnimatedResultCard
                  isCorrect={isCorrect}
                  userGuess={userGuess}
                  correctAnswer={getCorrectAnswer()}
                  fullReference={getFullReference()}
                  colors={colors}
                />
              </ThemedView>
            )}

            <ThemedView
              style={[
                styles.scriptureContainer,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.card
                }
              ]}
            >
              <ThemedText style={styles.scriptureText}>
                "{currentScripture.text}"
              </ThemedText>
            </ThemedView>

            {/* Add padding at the bottom of ScrollView for better appearance */}
            <View style={{ paddingBottom: 20 }} />
          </ScrollView>
        </ThemedView>

        {!hasGuessed ? (
          <ThemedView
            style={[
              styles.inputContainer,
              {
                borderTopColor: colors.border,
                backgroundColor: colors.card
              }
            ]}
          >
            <ThemedText style={styles.guessLabel}>
              What's the reference?
            </ThemedText>
            <AnimatedInput
              value={userGuess}
              onChangeText={setUserGuess}
              placeholder={getPlaceholderText()}
              colors={colors}
              colorScheme={colorScheme ?? 'light'}
              onSubmitEditing={handleSubmitGuess}
              inputRef={inputRef as React.RefObject<TextInput>}
              shouldShake={inputShouldShake}
              onShakeComplete={() => setInputShouldShake(false)}
            />
            <AnimatedSubmitButton
              onPress={handleSubmitGuess}
              loading={loading}
              disabled={loading}
              label="Submit"
            />
          </ThemedView>
        ) : (
          <ThemedView
            style={[
              styles.bottomButtonContainer,
              {
                borderTopColor: colors.border,
                backgroundColor: colors.card
              }
            ]}
          >
            <GradientButton
              onPress={handleNextScripture}
              label={questionCount >= totalQuestions ? "See Results" : "Next Scripture"}
              variant="teal"
            />
          </ThemedView>
        )}
      </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  scriptureContainer: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minHeight: 150, // Ensure there's always enough space
  },
  scriptureText: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: "Times New Roman",
    textAlign: "left",
  },
  inputContainer: {
    padding: 20,
    borderTopWidth: 1,
  },
  bottomButtonContainer: {
    padding: 20,
    borderTopWidth: 1,
  },
  guessLabel: {
    fontSize: 18,
    marginBottom: 16,
    textAlign: "center",
    fontWeight: "500",
  },
  // New animated input styles
  inputWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  inputGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 0,
  },
  animatedInputContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  guessInputInner: {
    width: "100%",
    padding: 15,
    fontSize: 16,
    letterSpacing: 0,
  },
  guessInput: {
    width: "100%",
    padding: 15,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
  },
  resultContainer: {
    marginBottom: 20,
  },
  resultCard: {
    width: "100%",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  iconContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  feedbackPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.3,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e6f7e6",
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: {
    color: "#4CAF50",
    fontSize: 40,
    fontWeight: "bold",
    lineHeight: 40,
    textAlign: "center",
    textAlignVertical: "center",
  },
  xCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ffebee",
    justifyContent: "center",
    alignItems: "center",
  },
  xMark: {
    color: "#F44336",
    fontSize: 40,
    fontWeight: "bold",
    lineHeight: 40,
    textAlign: "center",
    textAlignVertical: "center",
  },
  correctText: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    fontFamily: "Times New Roman",
  },
  incorrectGuess: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
    fontFamily: "Times New Roman",
  },
  userGuessText: {
    fontWeight: "bold",
  },
  correctReference: {
    fontSize: 18,
    textAlign: "center",
    fontFamily: "Times New Roman",
  },
  correctAnswerText: {
    fontWeight: "bold",
  },
  fullReferenceLink: {
    marginTop: 12,
  },
  fullReferenceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  fullReferenceText: {
    color: "#888888",
    fontSize: 12,
    fontFamily: "Times New Roman",
  },
  fullReferenceIcon: {
    marginLeft: 3,
    color: "#888888",
  },
  // Progress indicator styles
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressDotCurrent: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  // Summary screen styles
  summaryContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  transitionContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  summaryCard: {
    width: "100%",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  scoreCircleWrapper: {
    position: 'relative',
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreRingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreRingBg: {
    position: 'absolute',
  },
  scoreRingProgress: {
    position: 'absolute',
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreText: {
    fontSize: 36,
    fontWeight: "bold",
    lineHeight: 44,
  },
  summaryMessage: {
    fontSize: 18,
    fontFamily: "Times New Roman",
  },
  summaryButtons: {
    width: "100%",
    marginTop: 24,
    gap: 12,
  },
  homeButtonContainer: {
    width: "100%",
  },
  homeButton: {
    width: "100%",
    padding: 15,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  shareButtonContainer: {
    width: "100%",
  },
  shareButton: {
    width: "100%",
    padding: 15,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  leaderboardButtonContainer: {
    width: "100%",
  },
  leaderboardButton: {
    width: "100%",
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
  },
  leaderboardButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  // Hidden shareable card styles - Image-Dominant Design
  shareCardWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0,
    pointerEvents: 'none',
  },
  shareCard: {
    width: 400,
    height: 600,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  // IMAGE SECTION
  shareImageSection: {
    width: '100%',
    height: 370,
    position: 'relative',
  },
  shareCardBanner: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  shareImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  // "BEAT MY SCORE" pill - top left on image
  shareBeatScorePill: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  shareBeatScoreText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  // Trophy badge - top right on image
  shareTrophyBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  // Floating glassmorphism score badge - overlaps image/content (centered)
  shareFloatingScore: {
    position: 'absolute',
    bottom: -40,
    left: '50%',
    transform: [{ translateX: -70 }],
    width: 140,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  shareScoreNumber: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
  },
  shareScoreDivider: {
    fontSize: 36,
    fontWeight: '300',
    color: '#9CA3AF',
    marginHorizontal: 2,
  },
  shareScoreTotal: {
    fontSize: 36,
    fontWeight: '600',
    color: '#6B7280',
  },
  // CONTENT SECTION
  shareCardContent: {
    flex: 1,
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#fff',
    gap: 12,
  },
  // Challenge code section styles
  shareChallengeCodeSection: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  shareChallengeCodeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
    letterSpacing: 2,
    marginBottom: 4,
  },
  shareChallengeCodeValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 4,
  },
  // Pills row styles
  sharePillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sharePill: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  sharePillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  sharePillDot: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  shareBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    gap: 8,
  },
  shareAppIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  shareAppName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  // Daily challenge styles - New streak hero design
  dailyStreakHero: {
    alignItems: 'center',
    marginBottom: 16,
  },
  dailyStreakNumber: {
    fontSize: 64,
    fontWeight: '800',
    color: '#ff6b35',
    lineHeight: 72,
    marginTop: 8,
  },
  dailyStreakLabel: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.7,
    marginTop: -4,
  },
  dailyResultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginBottom: 8,
  },
  dailyResultText: {
    fontSize: 15,
    fontWeight: '600',
  },
  dailyEncouragement: {
    fontSize: 16,
    opacity: 0.6,
    marginBottom: 8,
  },
  dailySummaryButtons: {
    width: '100%',
    marginTop: 24,
    gap: 16,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  // Legacy daily challenge styles (kept for reference)
  streakDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 20,
  },
  streakDisplayText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
