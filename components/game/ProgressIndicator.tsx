import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

/** Spring configuration for smooth animations */
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
};

interface ProgressDotProps {
  index: number;
  status: 'pending' | 'correct' | 'incorrect';
  isCurrent: boolean;
  colorScheme: 'light' | 'dark';
}

/**
 * A single animated dot in the progress indicator.
 * Displays the status of a question (pending, correct, or incorrect).
 */
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

  const getColor = (): string => {
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

export interface ProgressIndicatorProps {
  /** The current question number (1-indexed) */
  currentQuestion: number;
  /** Total number of questions in the game */
  totalQuestions: number;
  /** Array of answer statuses for each question */
  answers: ('correct' | 'incorrect' | 'pending')[];
  /** Current color scheme for theming */
  colorScheme: 'light' | 'dark';
}

/**
 * Displays a row of dots representing game progress.
 * Each dot shows whether a question is pending, answered correctly, or incorrectly.
 */
export function ProgressIndicator({
  currentQuestion,
  totalQuestions,
  answers,
  colorScheme
}: ProgressIndicatorProps) {
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

const styles = StyleSheet.create({
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
});

export default ProgressIndicator;
