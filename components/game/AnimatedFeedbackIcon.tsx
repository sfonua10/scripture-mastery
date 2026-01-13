import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";

/**
 * Spring configuration for bouncy animations.
 * Used for the icon scale-in effect.
 */
const SPRING_CONFIG_BOUNCY = {
  damping: 12,
  stiffness: 180,
};

export interface AnimatedFeedbackIconProps {
  /** Whether the user's answer was correct */
  isCorrect: boolean;
  /** Color palette to use (light or dark theme colors) */
  colors: typeof Colors.light;
}

/**
 * Animated feedback icon that displays a checkmark or X with a pulse effect.
 * Used to provide visual feedback after the user submits an answer.
 *
 * @example
 * ```tsx
 * <AnimatedFeedbackIcon isCorrect={true} colors={colors} />
 * ```
 */
export function AnimatedFeedbackIcon({
  isCorrect,
  colors,
}: AnimatedFeedbackIconProps): React.ReactElement {
  const scale = useSharedValue(0);
  const pulseScale = useSharedValue(0);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    // Main icon animation - spring with overshoot
    scale.value = withSpring(1, SPRING_CONFIG_BOUNCY);

    // Pulse/ripple animation
    pulseScale.value = withTiming(1.8, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
    pulseOpacity.value = withTiming(0, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [pulseOpacity, pulseScale, scale]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const backgroundColor = isCorrect ? "#e6f7e6" : "#ffebee";
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
          {isCorrect ? "\u2713" : "\u2717"}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  feedbackPulse: {
    position: "absolute",
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
});

export default AnimatedFeedbackIcon;
