import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  View,
  ScrollView,
  Text,
  Image,

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
import { AnimatedResultCard } from "@/components/game/AnimatedResultCard";
import { AnimatedInput } from "@/components/game/AnimatedInput";
import { ScoreRing } from "@/components/game/ScoreRing";
import { ProgressIndicator } from "@/components/game/ProgressIndicator";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useSound } from "@/hooks/useSound";
import { useDailyChallenge } from "@/hooks/useDailyChallenge";
import { useAuth } from "@/contexts/AuthContext";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useChallenge } from "@/hooks/useChallenge";
import { GameMode, Scripture, DailyChallengeBadge } from "@/types/scripture";
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
} from "react-native-reanimated";

const TOTAL_QUESTIONS = 3;

const MIN_SCORE_FOR_LEADERBOARD = 0; // Minimum score to prompt for leaderboard

// Animation constants for consistent spring physics
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
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

// Animated Submit Button with scale effect
interface AnimatedSubmitButtonProps {
  onPress: () => void;
  loading: boolean;
  disabled: boolean;
  label: string;
}

function AnimatedSubmitButton({ onPress, loading, disabled, label }: AnimatedSubmitButtonProps) {
  return (
    <GradientButton
      onPress={onPress}
      label={label}
      variant="teal"
      loading={loading}
      disabled={disabled}
    />
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
    showResults,
  } = useLocalSearchParams<{
    mode: GameMode | 'daily';
    challengeId?: string;
    isCreator?: string;
    challengeMode?: 'creating';
    challengeCode?: string;
    scriptures?: string;
    questionCount?: string;
    showResults?: string;
  }>();

  // When navigating to view completed daily challenge results
  const showingDailyResults = showResults === 'true';
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
  const [sessionComplete, setSessionComplete] = useState(showingDailyResults);
  const [showSummaryCard, setShowSummaryCard] = useState(showingDailyResults);
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
  const inputValueRef = useRef('');

  // Animation shared values
  const scoreAnimation = useSharedValue(0);
  const circleScale = useSharedValue(0.8);

  // Streak celebration animation values
  const streakScale = useSharedValue(0);
  const streakRotation = useSharedValue(-15);
  const iconScale = useSharedValue(1);

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

  // Animated style for icon pulse
  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
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
        // Delayed bounce in - starts after card appears
        streakScale.value = withDelay(
          200,
          withSequence(
            withSpring(1.15, { damping: 10, stiffness: 180 }),
            withSpring(1, { damping: 14, stiffness: 160 })
          )
        );
        // Subtle rotation settle
        streakRotation.value = withDelay(
          200,
          withSequence(
            withSpring(-4, { damping: 8, stiffness: 200 }),
            withSpring(2, { damping: 10, stiffness: 180 }),
            withSpring(0, { damping: 12, stiffness: 160 })
          )
        );
        // Icon heartbeat pulse - delayed until after main animation
        iconScale.value = withDelay(
          600,
          withSequence(
            withSpring(1.2, { damping: 8, stiffness: 200 }),
            withSpring(1, { damping: 12, stiffness: 160 })
          )
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
    const capturedGuess = inputValueRef.current;

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

  const handleGuessChange = (text: string) => {
    inputValueRef.current = text;
    setUserGuess(text);
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

    inputValueRef.current = '';
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
    inputValueRef.current = '';
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

    try {
      // Ensure the view is fully rendered before capture (important for Android)
      await new Promise<void>(resolve => {
        InteractionManager.runAfterInteractions(() => resolve());
      });

      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1,
      });

      // Share only the self-contained image (no text, no URL)
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
      });
    } catch (error) {
      // Fallback: show error silently (image capture failed)
      console.log('Share failed:', error);
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
              {/* Hidden shareable card for capturing */}
              <View style={styles.shareCardWrapper}>
                <View ref={shareCardRef} style={styles.shareCard} collapsable={false}>
                  {isDailyChallenge ? (
                    // STREAK SHARE CARD
                    <View style={styles.streakShareCard}>
                      <Image
                        source={require('@/assets/images/streak-share-background.png')}
                        style={styles.streakShareBackground}
                      />
                      {/* Dynamic streak number overlay */}
                      <View style={styles.streakShareContent}>
                        <Text style={styles.streakShareNumber}>{dailyStats.currentStreak}</Text>
                        <Text style={styles.streakShareLabel}>DAY STREAK</Text>
                        <Text style={styles.streakShareCTA}>Can you beat my streak?</Text>
                      </View>
                      {/* Bottom branding with download prompt */}
                      <View style={styles.streakShareBottomBar}>
                        <Image
                          source={require('@/assets/icons/ios-light.png')}
                          style={styles.shareAppIcon}
                        />
                        <View style={styles.streakShareBrandingText}>
                          <Text style={styles.shareAppName}>Scripture Mastery Pro</Text>
                          <Text style={styles.streakShareDownload}>Download on the App Store</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    // SCORE SHARE CARD - Image-Dominant Design
                    <>
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
                    </>
                  )}
                </View>
              </View>

          {isDailyChallenge ? (
            /* Daily Challenge - No card, content floats on background */
            <Animated.View style={styles.dailyResultContainer}>
              <ThemedText style={styles.dailyResultTitle}>
                Daily Challenge Complete!
              </ThemedText>

              {/* Hero Streak Display */}
              <Animated.View style={[styles.dailyStreakHero, animatedStreakStyle]}>
                <Animated.View style={animatedIconStyle}>
                  <Ionicons
                    name="flame"
                    size={dailyStats.currentStreak >= 3 ? 32 : 24}
                    color="#ff6b35"
                    style={{ opacity: dailyStats.currentStreak >= 3 ? 1 : 0.7 }}
                  />
                </Animated.View>
                <ThemedText style={styles.dailyStreakNumber}>
                  {dailyStats.currentStreak}
                </ThemedText>
                <ThemedText style={styles.dailyStreakLabel}>
                  day{dailyStats.currentStreak === 1 ? '' : 's'} streak
                </ThemedText>
              </Animated.View>

              {/* Daily Challenge Buttons */}
              <View style={styles.dailySummaryButtons}>
                {dailyStats.currentStreak >= 3 ? (
                  <>
                    <GradientButton
                      onPress={handleShare}
                      label={`Share Your ${dailyStats.currentStreak}-Day Streak`}
                      variant="warm"
                      icon={<Ionicons name="share-outline" size={18} color="white" />}
                    />
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
                  </>
                ) : (
                  <>
                    <View style={styles.secondaryActionsRow}>
                      <GradientButton
                        onPress={handlePlayRegularGame}
                        label="Play Game"
                        variant="teal"
                        icon={<Ionicons name="play" size={18} color="white" />}
                        style={{ flex: 1 }}
                      />
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
                    <TouchableOpacity
                      style={styles.subtleShareLink}
                      onPress={handleShare}
                      accessibilityLabel="Share streak"
                      accessibilityRole="button"
                    >
                      <ThemedText style={[styles.subtleShareText, { color: colors.tint }]}>
                        Share streak
                      </ThemedText>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </Animated.View>
          ) : (
            /* Regular Game - Uses card */
            <AnimatedSummaryCard colors={colors} visible={showSummaryCard}>
              <ThemedText style={styles.summaryTitle}>
                Session Complete!
              </ThemedText>

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
            </AnimatedSummaryCard>
          )}
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
              onChangeText={handleGuessChange}
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
  resultContainer: {
    marginBottom: 20,
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
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: -0.3,
    marginBottom: 24,
  },
  scoreCircleWrapper: {
    position: 'relative',
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
  // Streak share card styles
  streakShareCard: {
    width: 400,
    height: 600,
    position: 'relative',
  },
  streakShareBackground: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    position: 'absolute',
  },
  streakShareContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  streakShareNumber: {
    fontSize: 120,
    fontWeight: '700',
    color: '#6B7280',
  },
  streakShareLabel: {
    fontSize: 24,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 4,
    marginTop: -10,
  },
  streakShareBottomBar: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  streakShareCTA: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 20,
  },
  streakShareBrandingText: {
    flexDirection: 'column',
  },
  streakShareDownload: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  // Daily challenge styles - Card-less design
  dailyResultContainer: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  dailyResultTitle: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 40,
    textAlign: 'center',
  },
  dailyStreakHero: {
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 48,
  },
  dailyStreakNumber: {
    fontSize: 72,
    fontWeight: '800',
    color: '#ff6b35',
    lineHeight: 80,
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.06)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  dailyStreakLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.5,
    marginTop: 4,
  },
  dailySummaryButtons: {
    width: '100%',
    marginTop: 8,
    gap: 14,
    alignItems: 'stretch',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    width: '100%',
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
  subtleShareLink: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  subtleShareText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
