/**
 * Reusable Animation Hooks
 *
 * A collection of animation utilities built on react-native-reanimated
 * for consistent micro-interactions throughout the app.
 *
 * Design Principles:
 * - Subtle, not flashy (200-300ms for micro-interactions)
 * - Spring physics for natural, organic feel
 * - Respect reduced motion preferences
 * - Consistent feedback across all interactive elements
 */

import { useCallback, useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
  SharedValue,
  AnimatedStyleProp,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';
import { ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

// ============================================
// Animation Configuration Constants
// ============================================

/**
 * Spring configurations for different interaction types
 */
export const SPRING_CONFIG = {
  // For button press feedback - snappy and responsive
  button: {
    damping: 20,
    stiffness: 300,
    mass: 1,
  },
  // For bouncy elements like selection indicators
  bouncy: {
    damping: 12,
    stiffness: 200,
    mass: 0.8,
  },
  // For gentle transitions
  gentle: {
    damping: 25,
    stiffness: 150,
    mass: 1,
  },
  // For micro-interactions like tab icons
  micro: {
    damping: 15,
    stiffness: 400,
    mass: 0.5,
  },
} as const;

/**
 * Timing configurations for various animations
 */
export const TIMING_CONFIG = {
  // Very fast - for immediate feedback
  instant: { duration: 100, easing: Easing.out(Easing.ease) },
  // Fast - for micro-interactions
  fast: { duration: 200, easing: Easing.out(Easing.cubic) },
  // Normal - for standard transitions
  normal: { duration: 300, easing: Easing.inOut(Easing.ease) },
  // Slow - for dramatic reveals
  slow: { duration: 400, easing: Easing.inOut(Easing.cubic) },
} as const;


// ============================================
// useScaleAnimation
// ============================================

interface UseScaleAnimationOptions {
  /** Scale value when pressed (default: 0.98) */
  pressedScale?: number;
  /** Scale value when released (default: 1) */
  releasedScale?: number;
  /** Spring configuration */
  springConfig?: typeof SPRING_CONFIG.button;
  /** Disable animation (e.g., when button is disabled) */
  disabled?: boolean;
}

interface UseScaleAnimationReturn {
  /** Animated style to apply to the component */
  animatedStyle: AnimatedStyleProp<ViewStyle>;
  /** Call on press in */
  onPressIn: () => void;
  /** Call on press out */
  onPressOut: () => void;
  /** Shared value for external control */
  scale: SharedValue<number>;
}

/**
 * Hook for scale-down animation on press
 *
 * @example
 * ```tsx
 * const { animatedStyle, onPressIn, onPressOut } = useScaleAnimation();
 *
 * return (
 *   <Animated.View style={[styles.button, animatedStyle]}>
 *     <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
 *       <Text>Press Me</Text>
 *     </Pressable>
 *   </Animated.View>
 * );
 * ```
 */
export function useScaleAnimation(
  options: UseScaleAnimationOptions = {}
): UseScaleAnimationReturn {
  const {
    pressedScale = 0.98,
    releasedScale = 1,
    springConfig = SPRING_CONFIG.button,
    disabled = false,
  } = options;

  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(releasedScale);

  const onPressIn = useCallback(() => {
    if (disabled) return;

    if (reduceMotion) {
      scale.value = pressedScale;
    } else {
      scale.value = withSpring(pressedScale, springConfig);
    }
  }, [disabled, reduceMotion, pressedScale, springConfig]);

  const onPressOut = useCallback(() => {
    if (reduceMotion) {
      scale.value = releasedScale;
    } else {
      scale.value = withSpring(releasedScale, springConfig);
    }
  }, [reduceMotion, releasedScale, springConfig]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return {
    animatedStyle,
    onPressIn,
    onPressOut,
    scale,
  };
}


// ============================================
// useFadeIn
// ============================================

interface UseFadeInOptions {
  /** Starting opacity (default: 0) */
  from?: number;
  /** Ending opacity (default: 1) */
  to?: number;
  /** Animation duration in ms (default: 300) */
  duration?: number;
  /** Delay before animation starts (default: 0) */
  delay?: number;
  /** Starting Y translation for slide-up effect (default: 20) */
  translateY?: number;
  /** Auto-start on mount (default: true) */
  autoStart?: boolean;
}

interface UseFadeInReturn {
  /** Animated style with opacity and transform */
  animatedStyle: AnimatedStyleProp<ViewStyle>;
  /** Manually trigger the fade in animation */
  fadeIn: () => void;
  /** Reset to initial state */
  reset: () => void;
  /** Opacity shared value */
  opacity: SharedValue<number>;
}

/**
 * Hook for fade-in entrance animations
 * Combines opacity fade with subtle slide-up translation
 *
 * @example
 * ```tsx
 * const { animatedStyle } = useFadeIn({ delay: 100 });
 *
 * return (
 *   <Animated.View style={[styles.card, animatedStyle]}>
 *     <Text>I fade in!</Text>
 *   </Animated.View>
 * );
 * ```
 */
export function useFadeIn(options: UseFadeInOptions = {}): UseFadeInReturn {
  const {
    from = 0,
    to = 1,
    duration = 300,
    delay = 0,
    translateY: initialTranslateY = 20,
    autoStart = true,
  } = options;

  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(from);
  const translateY = useSharedValue(reduceMotion ? 0 : initialTranslateY);

  const fadeIn = useCallback(() => {
    const timingConfig = {
      duration: reduceMotion ? 0 : duration,
      easing: Easing.out(Easing.cubic),
    };

    if (delay > 0 && !reduceMotion) {
      opacity.value = withDelay(delay, withTiming(to, timingConfig));
      translateY.value = withDelay(delay, withTiming(0, timingConfig));
    } else {
      opacity.value = withTiming(to, timingConfig);
      translateY.value = withTiming(0, timingConfig);
    }
  }, [delay, duration, reduceMotion, to]);

  const reset = useCallback(() => {
    opacity.value = from;
    translateY.value = reduceMotion ? 0 : initialTranslateY;
  }, [from, initialTranslateY, reduceMotion]);

  useEffect(() => {
    if (autoStart) {
      fadeIn();
    }
  }, [autoStart, fadeIn]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return {
    animatedStyle,
    fadeIn,
    reset,
    opacity,
  };
}


// ============================================
// useShake
// ============================================

interface UseShakeOptions {
  /** Maximum translation distance (default: 8) */
  distance?: number;
  /** Number of shake oscillations (default: 3) */
  oscillations?: number;
  /** Total duration in ms (default: 400) */
  duration?: number;
  /** Callback when shake completes */
  onComplete?: () => void;
}

interface UseShakeReturn {
  /** Animated style with translateX transform */
  animatedStyle: AnimatedStyleProp<ViewStyle>;
  /** Trigger the shake animation */
  shake: () => void;
  /** Is currently shaking */
  isShaking: SharedValue<number>;
}

/**
 * Hook for shake animation on error
 *
 * @example
 * ```tsx
 * const { animatedStyle, shake } = useShake();
 *
 * const handleError = () => {
 *   shake();
 *   Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
 * };
 * ```
 */
export function useShake(options: UseShakeOptions = {}): UseShakeReturn {
  const {
    distance = 8,
    oscillations = 3,
    duration = 400,
    onComplete,
  } = options;

  const reduceMotion = useReducedMotion();
  const translateX = useSharedValue(0);
  const isShaking = useSharedValue(0);

  const shake = useCallback(() => {
    if (reduceMotion) {
      // For reduced motion, just briefly show visual state
      if (onComplete) {
        onComplete();
      }
      return;
    }

    isShaking.value = 1;

    // Build the shake sequence
    const singleShakeDuration = duration / (oscillations * 2);
    const timingConfig = {
      duration: singleShakeDuration,
      easing: Easing.inOut(Easing.ease),
    };

    // Create oscillation sequence: right, left, right, left... center
    const sequence: ReturnType<typeof withTiming>[] = [];
    for (let i = 0; i < oscillations; i++) {
      // Decrease amplitude with each oscillation for natural decay
      const amplitude = distance * (1 - i / oscillations);
      sequence.push(withTiming(amplitude, timingConfig));
      sequence.push(withTiming(-amplitude, timingConfig));
    }
    sequence.push(withTiming(0, { duration: singleShakeDuration / 2 }));

    translateX.value = withSequence(
      ...sequence,
      withTiming(0, { duration: 0 }, () => {
        isShaking.value = 0;
        if (onComplete) {
          runOnJS(onComplete)();
        }
      })
    );
  }, [reduceMotion, distance, oscillations, duration, onComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return {
    animatedStyle,
    shake,
    isShaking,
  };
}


// ============================================
// useIconPulse
// ============================================

interface UseIconPulseOptions {
  /** Target scale when pulsed (default: 1.15) */
  pulseScale?: number;
  /** Duration of one pulse cycle (default: 200) */
  duration?: number;
}

interface UseIconPulseReturn {
  /** Animated style with scale transform */
  animatedStyle: AnimatedStyleProp<ViewStyle>;
  /** Trigger a single pulse */
  pulse: () => void;
  /** Scale shared value */
  scale: SharedValue<number>;
}

/**
 * Hook for icon pulse animation on selection/activation
 *
 * @example
 * ```tsx
 * const { animatedStyle, pulse } = useIconPulse();
 *
 * useEffect(() => {
 *   if (isSelected) pulse();
 * }, [isSelected]);
 * ```
 */
export function useIconPulse(options: UseIconPulseOptions = {}): UseIconPulseReturn {
  const { pulseScale = 1.15, duration = 200 } = options;

  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const pulse = useCallback(() => {
    if (reduceMotion) return;

    scale.value = withSequence(
      withTiming(pulseScale, { duration: duration / 2, easing: Easing.out(Easing.ease) }),
      withSpring(1, SPRING_CONFIG.micro)
    );
  }, [reduceMotion, pulseScale, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return {
    animatedStyle,
    pulse,
    scale,
  };
}


// ============================================
// useStaggeredList
// ============================================

interface UseStaggeredListOptions {
  /** Delay between each item in ms (default: 50) */
  staggerDelay?: number;
  /** Maximum total delay in ms (default: 500) */
  maxDelay?: number;
  /** Animation duration per item in ms (default: 300) */
  duration?: number;
  /** Starting Y translation (default: 20) */
  translateY?: number;
}

/**
 * Hook for calculating staggered animation delay for list items
 *
 * @example
 * ```tsx
 * const getItemDelay = useStaggeredList();
 *
 * const renderItem = ({ item, index }) => (
 *   <AnimatedListItem delay={getItemDelay(index)}>
 *     <Text>{item.name}</Text>
 *   </AnimatedListItem>
 * );
 * ```
 */
export function useStaggeredList(options: UseStaggeredListOptions = {}) {
  const {
    staggerDelay = 50,
    maxDelay = 500,
    duration = 300,
    translateY = 20,
  } = options;

  const reduceMotion = useReducedMotion();

  const getItemDelay = useCallback((index: number): number => {
    if (reduceMotion) return 0;
    return Math.min(index * staggerDelay, maxDelay);
  }, [reduceMotion, staggerDelay, maxDelay]);

  const getAnimationConfig = useCallback((index: number) => ({
    delay: getItemDelay(index),
    duration: reduceMotion ? 0 : duration,
    translateY: reduceMotion ? 0 : translateY,
  }), [getItemDelay, reduceMotion, duration, translateY]);

  return {
    getItemDelay,
    getAnimationConfig,
  };
}


// ============================================
// useSuccessAnimation
// ============================================

interface UseSuccessAnimationOptions {
  /** Duration of the success highlight (default: 800) */
  duration?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
}

interface UseSuccessAnimationReturn {
  /** Animated style with background color overlay */
  animatedStyle: AnimatedStyleProp<ViewStyle>;
  /** Trigger success animation */
  triggerSuccess: () => void;
  /** Is currently animating */
  isAnimating: SharedValue<number>;
}

/**
 * Hook for success state animation (brief green tint)
 *
 * @example
 * ```tsx
 * const { animatedStyle, triggerSuccess } = useSuccessAnimation();
 *
 * const handleSubmit = async () => {
 *   const result = await submit();
 *   if (result.success) triggerSuccess();
 * };
 * ```
 */
export function useSuccessAnimation(
  options: UseSuccessAnimationOptions = {}
): UseSuccessAnimationReturn {
  const { duration = 800, onComplete } = options;

  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const isAnimating = useSharedValue(0);

  const triggerSuccess = useCallback(() => {
    if (reduceMotion) {
      if (onComplete) onComplete();
      return;
    }

    isAnimating.value = 1;
    progress.value = withSequence(
      withTiming(1, { duration: duration / 4 }),
      withTiming(1, { duration: duration / 2 }),
      withTiming(0, { duration: duration / 4 }, () => {
        isAnimating.value = 0;
        if (onComplete) {
          runOnJS(onComplete)();
        }
      })
    );
  }, [reduceMotion, duration, onComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(76, 175, 80, ${interpolate(progress.value, [0, 1], [0, 0.15])})`,
  }));

  return {
    animatedStyle,
    triggerSuccess,
    isAnimating,
  };
}


// ============================================
// useErrorAnimation
// ============================================

interface UseErrorAnimationOptions {
  /** Duration of the error highlight (default: 600) */
  duration?: number;
  /** Include shake effect (default: true) */
  includeShake?: boolean;
  /** Callback when animation completes */
  onComplete?: () => void;
}

interface UseErrorAnimationReturn {
  /** Animated style combining shake and tint */
  animatedStyle: AnimatedStyleProp<ViewStyle>;
  /** Trigger error animation */
  triggerError: () => void;
  /** Is currently animating */
  isAnimating: SharedValue<number>;
}

/**
 * Hook for error state animation (red tint + optional shake)
 *
 * @example
 * ```tsx
 * const { animatedStyle, triggerError } = useErrorAnimation();
 *
 * const handleSubmit = async () => {
 *   const result = await submit();
 *   if (!result.success) triggerError();
 * };
 * ```
 */
export function useErrorAnimation(
  options: UseErrorAnimationOptions = {}
): UseErrorAnimationReturn {
  const { duration = 600, includeShake = true, onComplete } = options;

  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const translateX = useSharedValue(0);
  const isAnimating = useSharedValue(0);

  const triggerError = useCallback(() => {
    isAnimating.value = 1;

    if (reduceMotion) {
      // Just flash briefly
      progress.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 100 }, () => {
          isAnimating.value = 0;
          if (onComplete) {
            runOnJS(onComplete)();
          }
        })
      );
      return;
    }

    // Tint animation
    progress.value = withSequence(
      withTiming(1, { duration: duration / 4 }),
      withTiming(1, { duration: duration / 4 }),
      withTiming(0, { duration: duration / 2 }, () => {
        isAnimating.value = 0;
        if (onComplete) {
          runOnJS(onComplete)();
        }
      })
    );

    // Shake animation
    if (includeShake) {
      const shakeDuration = duration / 6;
      translateX.value = withSequence(
        withTiming(6, { duration: shakeDuration }),
        withTiming(-6, { duration: shakeDuration }),
        withTiming(4, { duration: shakeDuration }),
        withTiming(-4, { duration: shakeDuration }),
        withTiming(0, { duration: shakeDuration })
      );
    }
  }, [reduceMotion, duration, includeShake, onComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(244, 67, 54, ${interpolate(progress.value, [0, 1], [0, 0.15])})`,
    transform: [{ translateX: translateX.value }],
  }));

  return {
    animatedStyle,
    triggerError,
    isAnimating,
  };
}


// ============================================
// useShimmer
// ============================================

interface UseShimmerOptions {
  /** Duration of one shimmer cycle (default: 1500) */
  duration?: number;
  /** Auto-start shimmer (default: true) */
  autoStart?: boolean;
}

interface UseShimmerReturn {
  /** Progress value 0-1 for shimmer position */
  progress: SharedValue<number>;
  /** Start shimmer animation */
  start: () => void;
  /** Stop shimmer animation */
  stop: () => void;
}

/**
 * Hook for shimmer loading animation
 * Used with LinearGradient for skeleton loaders
 *
 * @example
 * ```tsx
 * const { progress } = useShimmer();
 *
 * const animatedStyle = useAnimatedStyle(() => ({
 *   transform: [{ translateX: interpolate(progress.value, [0, 1], [-width, width]) }],
 * }));
 * ```
 */
export function useShimmer(options: UseShimmerOptions = {}): UseShimmerReturn {
  const { duration = 1500, autoStart = true } = options;

  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  const start = useCallback(() => {
    if (reduceMotion) return;

    progress.value = 0;
    progress.value = withTiming(1, {
      duration,
      easing: Easing.inOut(Easing.ease),
    }, (finished) => {
      if (finished) {
        progress.value = 0;
        // Restart the animation
        runOnJS(start)();
      }
    });
  }, [reduceMotion, duration]);

  const stop = useCallback(() => {
    cancelAnimation(progress);
    progress.value = 0;
  }, []);

  useEffect(() => {
    if (autoStart && !reduceMotion) {
      start();
    }
    return () => stop();
  }, [autoStart, reduceMotion, start, stop]);

  return {
    progress,
    start,
    stop,
  };
}


// ============================================
// Helper: Combine multiple animated styles
// ============================================

/**
 * Utility to combine multiple animated styles safely
 * Note: In reanimated, you typically just spread styles in an array
 * This is mainly for documentation/type safety
 */
export function combineAnimatedStyles(
  ...styles: AnimatedStyleProp<ViewStyle>[]
): AnimatedStyleProp<ViewStyle>[] {
  return styles;
}
