/**
 * DailyChallengeResult Component
 *
 * Displays the completion UI for the Daily Challenge mode, including:
 * - Hero streak display with flame icon
 * - Animated streak count
 * - Share functionality for streaks >= 3 days
 * - Navigation to regular game or leaderboard
 *
 * This component receives all data and handlers as props to maintain
 * separation of concerns with the parent GameScreen.
 */

import React from "react";
import { StyleSheet, TouchableOpacity, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { GradientButton } from "@/components/GradientButton";

// ============================================
// Types
// ============================================

interface DailyStats {
  currentStreak: number;
  longestStreak: number;
  totalDaysPlayed: number;
  lastPlayedDate: string | null;
}

interface ThemeColors {
  background: string;
  text: string;
  textSecondary: string;
  tint: string;
  border: string;
  cardBackground: string;
  inputBackground: string;
  correct: string;
  incorrect: string;
}

export interface DailyChallengeResultProps {
  /** Daily challenge statistics including streak data */
  dailyStats: DailyStats;
  /** Theme colors for styling */
  colors: ThemeColors;
  /** Handler for sharing the streak */
  handleShare: () => void;
  /** Handler for navigating to regular game */
  handlePlayRegularGame: () => void;
  /** Handler for viewing the leaderboard */
  handleViewLeaderboard: () => void;
  /** Animated style for the streak hero section */
  animatedStreakStyle: ViewStyle;
  /** Animated style for the flame icon */
  animatedIconStyle: ViewStyle;
}

// ============================================
// Constants
// ============================================

const STREAK_THRESHOLD_FOR_SHARE_PROMINENCE = 3;
const FLAME_ICON_SIZE_LARGE = 32;
const FLAME_ICON_SIZE_SMALL = 24;
const FLAME_COLOR = "#ff6b35";

// ============================================
// Component
// ============================================

/**
 * DailyChallengeResult displays the completion screen for Daily Challenge mode.
 *
 * When streak >= 3 days:
 * - Shows prominent share button with streak count
 * - Secondary actions (Play Game, Leaderboard) in a row below
 *
 * When streak < 3 days:
 * - Shows Play Game button prominently with Leaderboard
 * - Subtle share link at bottom
 */
export function DailyChallengeResult({
  dailyStats,
  colors,
  handleShare,
  handlePlayRegularGame,
  handleViewLeaderboard,
  animatedStreakStyle,
  animatedIconStyle,
}: DailyChallengeResultProps): React.JSX.Element {
  const hasSignificantStreak =
    dailyStats.currentStreak >= STREAK_THRESHOLD_FOR_SHARE_PROMINENCE;
  const flameIconSize = hasSignificantStreak
    ? FLAME_ICON_SIZE_LARGE
    : FLAME_ICON_SIZE_SMALL;
  const flameOpacity = hasSignificantStreak ? 1 : 0.7;

  return (
    <Animated.View style={styles.dailyResultContainer}>
      <ThemedText style={styles.dailyResultTitle}>
        Daily Challenge Complete!
      </ThemedText>

      {/* Hero Streak Display */}
      <Animated.View style={[styles.dailyStreakHero, animatedStreakStyle]}>
        <Animated.View style={animatedIconStyle}>
          <Ionicons
            name="flame"
            size={flameIconSize}
            color={FLAME_COLOR}
            style={{ opacity: flameOpacity }}
          />
        </Animated.View>
        <ThemedText style={styles.dailyStreakNumber}>
          {dailyStats.currentStreak}
        </ThemedText>
        <ThemedText style={styles.dailyStreakLabel}>
          day{dailyStats.currentStreak === 1 ? "" : "s"} streak
        </ThemedText>
      </Animated.View>

      {/* Daily Challenge Buttons */}
      <View style={styles.dailySummaryButtons}>
        {hasSignificantStreak ? (
          <SignificantStreakActions
            currentStreak={dailyStats.currentStreak}
            colors={colors}
            handleShare={handleShare}
            handlePlayRegularGame={handlePlayRegularGame}
            handleViewLeaderboard={handleViewLeaderboard}
          />
        ) : (
          <StandardActions
            colors={colors}
            handleShare={handleShare}
            handlePlayRegularGame={handlePlayRegularGame}
            handleViewLeaderboard={handleViewLeaderboard}
          />
        )}
      </View>
    </Animated.View>
  );
}

// ============================================
// Sub-components
// ============================================

interface SignificantStreakActionsProps {
  currentStreak: number;
  colors: ThemeColors;
  handleShare: () => void;
  handlePlayRegularGame: () => void;
  handleViewLeaderboard: () => void;
}

/**
 * Actions displayed when user has a significant streak (>= 3 days).
 * Prioritizes sharing the streak.
 */
function SignificantStreakActions({
  currentStreak,
  colors,
  handleShare,
  handlePlayRegularGame,
  handleViewLeaderboard,
}: SignificantStreakActionsProps): React.JSX.Element {
  return (
    <>
      <GradientButton
        onPress={handleShare}
        label={`Share Your ${currentStreak}-Day Streak`}
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
          <Ionicons
            name="play-outline"
            size={18}
            color={colors.textSecondary}
          />
          <ThemedText
            style={[
              styles.secondaryActionText,
              { color: colors.textSecondary },
            ]}
          >
            Play Game
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryAction, { borderColor: colors.border }]}
          onPress={handleViewLeaderboard}
          accessibilityLabel="View leaderboard"
          accessibilityRole="button"
        >
          <Ionicons
            name="trophy-outline"
            size={18}
            color={colors.textSecondary}
          />
          <ThemedText
            style={[
              styles.secondaryActionText,
              { color: colors.textSecondary },
            ]}
          >
            Leaderboard
          </ThemedText>
        </TouchableOpacity>
      </View>
    </>
  );
}

interface StandardActionsProps {
  colors: ThemeColors;
  handleShare: () => void;
  handlePlayRegularGame: () => void;
  handleViewLeaderboard: () => void;
}

/**
 * Actions displayed when user has a small streak (< 3 days).
 * Prioritizes playing more games to build the streak.
 */
function StandardActions({
  colors,
  handleShare,
  handlePlayRegularGame,
  handleViewLeaderboard,
}: StandardActionsProps): React.JSX.Element {
  return (
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
          <Ionicons
            name="trophy-outline"
            size={18}
            color={colors.textSecondary}
          />
          <ThemedText
            style={[
              styles.secondaryActionText,
              { color: colors.textSecondary },
            ]}
          >
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
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  dailyResultContainer: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  dailyResultTitle: {
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: -0.3,
    marginBottom: 40,
    textAlign: "center",
  },
  dailyStreakHero: {
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 48,
  },
  dailyStreakNumber: {
    fontSize: 72,
    fontWeight: "800",
    color: "#ff6b35",
    lineHeight: 80,
    marginTop: 4,
    textShadowColor: "rgba(0, 0, 0, 0.06)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  dailyStreakLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    opacity: 0.5,
    marginTop: 4,
  },
  dailySummaryButtons: {
    width: "100%",
    marginTop: 8,
    gap: 14,
    alignItems: "stretch",
  },
  secondaryActionsRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: "500",
  },
  subtleShareLink: {
    paddingVertical: 12,
    alignItems: "center",
  },
  subtleShareText: {
    fontSize: 14,
    fontWeight: "500",
  },
});

// ============================================
// Exports
// ============================================

export default DailyChallengeResult;
