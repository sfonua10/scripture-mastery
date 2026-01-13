import React, { useEffect } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";

// Animation constants for consistent spring physics
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
};

const SPRING_CONFIG_BOUNCY = {
  damping: 12,
  stiffness: 180,
};

// Animated Checkmark/X with pulse effect
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
export interface AnimatedResultCardProps {
  isCorrect: boolean;
  userGuess: string;
  correctAnswer: string;
  fullReference: string;
  colors: typeof Colors.light;
}

export function AnimatedResultCard({
  isCorrect,
  userGuess,
  correctAnswer,
  fullReference,
  colors,
}: AnimatedResultCardProps) {
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

const styles = StyleSheet.create({
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
});

export default AnimatedResultCard;
