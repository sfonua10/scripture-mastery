import React, { useEffect } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
  withTiming,
  withSpring,
  SharedValue,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GradientButton } from "@/components/GradientButton";
import { ScoreRing } from "@/components/game/ScoreRing";
import { Colors } from "@/constants/Colors";

// Animation constants for consistent spring physics
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
};

/**
 * Score color configuration for visual feedback
 */
export interface ScoreColorConfig {
  /** Background color for the score circle */
  bg: string;
  /** Text color for the score display */
  text: string;
}

/**
 * Props for the AnimatedScore component
 */
interface AnimatedScoreProps {
  /** Animated shared value for the score count-up animation */
  animatedValue: SharedValue<number>;
  /** Total number of questions */
  total: number;
  /** Style to apply to the score text */
  style: object;
}

/**
 * Animated score display that counts up from 0 to the final score.
 * Uses Reanimated's reaction to efficiently update only when value changes.
 */
function AnimatedScore({
  animatedValue,
  total,
  style,
}: AnimatedScoreProps): React.ReactElement {
  const [displayValue, setDisplayValue] = React.useState(0);

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

/**
 * Props for the AnimatedSummaryCard component
 */
interface AnimatedSummaryCardProps {
  /** Child elements to render inside the card */
  children: React.ReactNode;
  /** Theme colors object */
  colors: typeof Colors.light;
  /** Whether the card should be visible and animate in */
  visible: boolean;
}

/**
 * Animated container card that slides up and fades in when visible.
 * Used to wrap the summary content on the result screen.
 */
function AnimatedSummaryCard({
  children,
  colors,
  visible,
}: AnimatedSummaryCardProps): React.ReactElement {
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, SPRING_CONFIG);
      opacity.value = withTiming(1, { duration: 300 });
    }
  }, [visible, translateY, opacity]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.summaryCard, { backgroundColor: colors.card }, cardStyle]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Props for the RegularGameResult component
 */
export interface RegularGameResultProps {
  /** Number of correct answers */
  correctCount: number;
  /** Total number of questions in the game */
  totalQuestions: number;
  /** Theme colors object from useColorScheme */
  colors: typeof Colors.light;
  /** Whether to show the summary card (triggers animation) */
  showSummaryCard: boolean;
  /** Animated style for the score circle scale effect */
  animatedCircleStyle: object;
  /** Animated shared value for the score count-up animation */
  scoreAnimation: SharedValue<number>;
  /** Returns the appropriate colors for the current score */
  getScoreColor: () => ScoreColorConfig;
  /** Handler for sharing the score */
  handleShare: () => void;
  /** Handler for playing again */
  handlePlayAgain: () => void;
  /** Handler for viewing the leaderboard */
  handleViewLeaderboard: () => void;
}

/**
 * Displays the Regular Game result summary card with:
 * - Animated score ring showing progress
 * - Score circle with count-up animation
 * - Contextual message based on performance
 * - Action buttons for sharing, playing again, and viewing leaderboard
 *
 * @example
 * ```tsx
 * <RegularGameResult
 *   correctCount={8}
 *   totalQuestions={10}
 *   colors={colors}
 *   showSummaryCard={true}
 *   animatedCircleStyle={animatedCircleStyle}
 *   scoreAnimation={scoreAnimation}
 *   getScoreColor={() => ({ bg: '#e6f7e6', text: '#4CAF50' })}
 *   handleShare={handleShare}
 *   handlePlayAgain={handlePlayAgain}
 *   handleViewLeaderboard={handleViewLeaderboard}
 * />
 * ```
 */
export function RegularGameResult({
  correctCount,
  totalQuestions,
  colors,
  showSummaryCard,
  animatedCircleStyle,
  scoreAnimation,
  getScoreColor,
  handleShare,
  handlePlayAgain,
  handleViewLeaderboard,
}: RegularGameResultProps): React.ReactElement {
  const scoreColor = getScoreColor();

  /**
   * Returns an encouraging message based on the player's performance.
   */
  const getSummaryMessage = (): string => {
    if (correctCount === totalQuestions) return "Perfect score!";
    if (correctCount >= 8) return "Great job!";
    if (correctCount >= 5) return "Good effort!";
    return "Keep practicing!";
  };

  return (
    <AnimatedSummaryCard colors={colors} visible={showSummaryCard}>
      <ThemedText style={styles.summaryTitle}>Session Complete!</ThemedText>

      <View style={styles.scoreCircleWrapper}>
        <ScoreRing
          progress={correctCount / totalQuestions}
          score={correctCount}
          total={totalQuestions}
          size={160}
          strokeWidth={4}
        />
        <Animated.View
          style={[
            styles.scoreCircle,
            { backgroundColor: scoreColor.bg },
            animatedCircleStyle,
          ]}
        >
          <AnimatedScore
            animatedValue={scoreAnimation}
            total={totalQuestions}
            style={[styles.scoreText, { color: scoreColor.text }]}
          />
        </Animated.View>
      </View>

      <ThemedText style={styles.summaryMessage}>
        {getSummaryMessage()}
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
            <ThemedText
              style={[styles.shareButtonText, { color: colors.tint }]}
            >
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
            <Ionicons
              name="trophy-outline"
              size={18}
              color={colors.tint}
              style={styles.leaderboardIcon}
            />
            <ThemedText
              style={[styles.leaderboardButtonText, { color: colors.tint }]}
            >
              View Leaderboard
            </ThemedText>
          </View>
        </TouchableOpacity>
      </View>
    </AnimatedSummaryCard>
  );
}

const styles = StyleSheet.create({
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
    position: "relative",
    width: 160,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
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
  leaderboardIcon: {
    marginRight: 6,
  },
  leaderboardButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default RegularGameResult;
