import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";

/**
 * Props for the ScoreRing component
 */
export interface ScoreRingProps {
  /** Progress value from 0 to 1 representing the fill amount */
  progress: number;
  /** The actual score achieved */
  score: number;
  /** Total possible score */
  total: number;
  /** Size of the ring in pixels */
  size: number;
  /** Width of the ring stroke (currently unused but kept for API compatibility) */
  strokeWidth: number;
}

/**
 * Returns the appropriate color based on the score ratio.
 * - Green (#4CAF50) for 80%+ scores
 * - Orange (#FF9800) for 50-79% scores
 * - Red (#F44336) for below 50% scores
 */
function getScoreColor(score: number, total: number): string {
  const ratio = score / total;
  if (ratio >= 0.8) return "#4CAF50"; // Green
  if (ratio >= 0.5) return "#FF9800"; // Orange
  return "#F44336"; // Red
}

/**
 * An animated circular progress ring that displays score progress.
 * The ring fills up and changes color based on the score achieved.
 *
 * @example
 * ```tsx
 * <ScoreRing
 *   progress={0.8}
 *   score={8}
 *   total={10}
 *   size={140}
 *   strokeWidth={4}
 * />
 * ```
 */
export function ScoreRing({
  progress,
  score,
  total,
  size,
}: ScoreRingProps): React.ReactElement {
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
  }, [progress, score, total, animatedProgress, colorProgress]);

  const ringStyle = useAnimatedStyle(() => {
    const rotation = interpolate(animatedProgress.value, [0, 1], [0, 360]);
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const scoreColor = getScoreColor(score, total);

  return (
    <View style={[styles.scoreRingContainer, { width: size, height: size }]}>
      {/* Background ring */}
      <View
        style={[
          styles.scoreRingBg,
          {
            width: size - 8,
            height: size - 8,
            borderRadius: (size - 8) / 2,
            borderWidth: 4,
            borderColor: "rgba(0,0,0,0.1)",
          },
        ]}
      />
      {/* Progress ring using View rotation trick */}
      <Animated.View
        style={[
          styles.scoreRingProgress,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 4,
            borderColor: scoreColor,
            borderTopColor: "transparent",
            borderRightColor: "transparent",
          },
          ringStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scoreRingContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  scoreRingBg: {
    position: "absolute",
  },
  scoreRingProgress: {
    position: "absolute",
  },
});

export default ScoreRing;
