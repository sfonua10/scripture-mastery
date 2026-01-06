/**
 * Animation Utilities
 *
 * Reusable animation presets and helpers built on react-native-reanimated.
 * These utilities provide consistent, performant animations across the app.
 *
 * Design Principles:
 * - Spring physics for natural, organic feel
 * - Respect reduced motion preferences
 * - Performant worklets for smooth 60fps
 *
 * Usage:
 * import { AnimationConfig, useEntranceAnimation, usePressAnimation } from '@/utils/animations';
 */

import { useCallback, useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  interpolate,
  Easing,
  runOnJS,
  SharedValue,
  AnimatedStyle,
  useReducedMotion,
} from 'react-native-reanimated';
import { ViewStyle } from 'react-native';

/**
 * Spring Configuration Presets
 *
 * These presets define the physics for different animation feels:
 * - default: Balanced for most interactions
 * - snappy: Quick, responsive for buttons
 * - gentle: Soft, elegant for modals/sheets
 * - bouncy: Playful with overshoot for celebrations
 */
export const SpringConfig = {
  /** Standard spring - balanced feel for most animations */
  default: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  /** Snappy spring - quick, responsive for button presses */
  snappy: {
    damping: 20,
    stiffness: 300,
    mass: 0.8,
  },
  /** Gentle spring - soft, elegant for modals and sheets */
  gentle: {
    damping: 20,
    stiffness: 100,
    mass: 1,
  },
  /** Bouncy spring - playful with overshoot for celebrations */
  bouncy: {
    damping: 10,
    stiffness: 180,
    mass: 1,
  },
} as const;

/**
 * Timing Configuration Presets
 */
export const TimingConfig = {
  /** Fast - micro-interactions, button feedback */
  fast: {
    duration: 150,
    easing: Easing.out(Easing.cubic),
  },
  /** Normal - standard transitions */
  normal: {
    duration: 250,
    easing: Easing.out(Easing.cubic),
  },
  /** Slow - emphasis, complex transitions */
  slow: {
    duration: 400,
    easing: Easing.out(Easing.cubic),
  },
  /** Enter - elements appearing */
  enter: {
    duration: 300,
    easing: Easing.out(Easing.exp),
  },
  /** Exit - elements disappearing */
  exit: {
    duration: 200,
    easing: Easing.in(Easing.cubic),
  },
} as const;

/**
 * Animation Duration Constants
 */
export const Duration = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400,
  slower: 600,
} as const;

// ============================================================================
// ENTRANCE ANIMATIONS
// ============================================================================

/**
 * Fade In Up Animation Hook
 *
 * Creates an entrance animation that fades in while sliding up.
 * Perfect for list items, cards, and modal content.
 *
 * @param delay - Optional delay before animation starts (ms)
 * @param distance - How far to translate from (default: 20)
 * @returns Animated style to spread on Animated.View
 *
 * @example
 * const animatedStyle = useFadeInUp(100);
 * return <Animated.View style={[styles.card, animatedStyle]} />;
 */
export function useFadeInUp(delay: number = 0, distance: number = 20) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(reducedMotion ? 1 : 0);
  const translateY = useSharedValue(reducedMotion ? 0 : distance);

  useEffect(() => {
    if (reducedMotion) return;

    opacity.value = withDelay(delay, withTiming(1, TimingConfig.enter));
    translateY.value = withDelay(delay, withSpring(0, SpringConfig.gentle));
  }, [delay, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return animatedStyle;
}

/**
 * Fade In Scale Animation Hook
 *
 * Creates an entrance animation that fades in while scaling up.
 * Great for modals, popovers, and focus elements.
 *
 * @param delay - Optional delay before animation starts (ms)
 * @param initialScale - Starting scale (default: 0.95)
 */
export function useFadeInScale(delay: number = 0, initialScale: number = 0.95) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(reducedMotion ? 1 : 0);
  const scale = useSharedValue(reducedMotion ? 1 : initialScale);

  useEffect(() => {
    if (reducedMotion) return;

    opacity.value = withDelay(delay, withTiming(1, TimingConfig.enter));
    scale.value = withDelay(delay, withSpring(1, SpringConfig.gentle));
  }, [delay, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return animatedStyle;
}

/**
 * Staggered Animation Helper
 *
 * Calculates delay for staggered list animations.
 *
 * @param index - Item index in the list
 * @param baseDelay - Initial delay before stagger starts (default: 0)
 * @param staggerDelay - Delay between each item (default: 50)
 * @param maxDelay - Maximum total delay to prevent long waits (default: 500)
 */
export function staggeredDelay(
  index: number,
  baseDelay: number = 0,
  staggerDelay: number = 50,
  maxDelay: number = 500
): number {
  return Math.min(baseDelay + index * staggerDelay, maxDelay);
}

// ============================================================================
// PRESS ANIMATIONS
// ============================================================================

/**
 * Scale Press Animation Hook
 *
 * Creates a button press animation that scales down on press.
 * Provides tactile feedback without haptics alone.
 *
 * @param pressedScale - Scale when pressed (default: 0.98)
 * @returns Object with handlers and animated style
 *
 * @example
 * const { animatedStyle, onPressIn, onPressOut } = useScalePress();
 * return (
 *   <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
 *     <Animated.View style={[styles.button, animatedStyle]}>
 *       <Text>Press Me</Text>
 *     </Animated.View>
 *   </Pressable>
 * );
 */
export function useScalePress(pressedScale: number = 0.98) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    if (reducedMotion) return;
    scale.value = withSpring(pressedScale, SpringConfig.snappy);
  }, [pressedScale, reducedMotion]);

  const onPressOut = useCallback(() => {
    if (reducedMotion) return;
    scale.value = withSpring(1, SpringConfig.snappy);
  }, [reducedMotion]);

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

/**
 * Opacity Press Animation Hook
 *
 * Creates a simple opacity-based press feedback.
 * More subtle than scale, good for text buttons.
 *
 * @param pressedOpacity - Opacity when pressed (default: 0.7)
 */
export function useOpacityPress(pressedOpacity: number = 0.7) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  const onPressIn = useCallback(() => {
    opacity.value = withTiming(pressedOpacity, TimingConfig.fast);
  }, [pressedOpacity]);

  const onPressOut = useCallback(() => {
    opacity.value = withTiming(1, TimingConfig.fast);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return {
    animatedStyle,
    onPressIn,
    onPressOut,
    opacity,
  };
}

// ============================================================================
// FEEDBACK ANIMATIONS
// ============================================================================

/**
 * Success Pulse Animation Hook
 *
 * Creates a celebration pulse effect for correct answers/achievements.
 * Scales up briefly then back, with optional color flash.
 *
 * @returns Trigger function and animated style
 *
 * @example
 * const { triggerPulse, animatedStyle } = useSuccessPulse();
 *
 * const handleCorrectAnswer = () => {
 *   triggerPulse();
 *   playSuccessSound();
 * };
 */
export function useSuccessPulse() {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  const triggerPulse = useCallback(() => {
    if (reducedMotion) return;

    scale.value = withSequence(
      withSpring(1.05, SpringConfig.bouncy),
      withSpring(1, SpringConfig.default)
    );

    opacity.value = withSequence(
      withTiming(0.3, { duration: 100 }),
      withTiming(0, { duration: 300 })
    );
  }, [reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return {
    triggerPulse,
    animatedStyle,
    overlayStyle,
    scale,
  };
}

/**
 * Shake Animation Hook
 *
 * Creates a horizontal shake for incorrect input/errors.
 * Communicates "no" or "wrong" without being harsh.
 *
 * @param intensity - Shake distance in pixels (default: 8)
 */
export function useShake(intensity: number = 8) {
  const reducedMotion = useReducedMotion();
  const translateX = useSharedValue(0);

  const triggerShake = useCallback(() => {
    if (reducedMotion) return;

    translateX.value = withSequence(
      withTiming(-intensity, { duration: 50 }),
      withTiming(intensity, { duration: 50 }),
      withTiming(-intensity * 0.5, { duration: 50 }),
      withTiming(intensity * 0.5, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, [intensity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return {
    triggerShake,
    animatedStyle,
    translateX,
  };
}

// ============================================================================
// UTILITY ANIMATIONS
// ============================================================================

/**
 * Breathing/Pulsing Animation Hook
 *
 * Creates a subtle continuous pulse, good for attention-drawing elements.
 *
 * @param minScale - Minimum scale (default: 0.97)
 * @param maxScale - Maximum scale (default: 1.03)
 */
export function useBreathing(minScale: number = 0.97, maxScale: number = 1.03) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;

    scale.value = withRepeat(
      withSequence(
        withTiming(maxScale, { duration: 1000, easing: Easing.inOut(Easing.sine) }),
        withTiming(minScale, { duration: 1000, easing: Easing.inOut(Easing.sine) })
      ),
      -1, // Infinite
      true // Reverse
    );

    return () => {
      scale.value = 1;
    };
  }, [reducedMotion, minScale, maxScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return animatedStyle;
}

/**
 * Progress Animation Hook
 *
 * Animates a progress value smoothly, perfect for progress bars.
 *
 * @param targetProgress - Target progress (0-1)
 */
export function useAnimatedProgress(targetProgress: number) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = targetProgress;
    } else {
      progress.value = withSpring(targetProgress, SpringConfig.default);
    }
  }, [targetProgress, reducedMotion]);

  return progress;
}

/**
 * Rotation Animation Hook
 *
 * Creates a continuous rotation animation.
 * Perfect for loading spinners.
 *
 * @param duration - Time for one full rotation (default: 1000ms)
 */
export function useRotation(duration: number = 1000) {
  const reducedMotion = useReducedMotion();
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;

    rotation.value = withRepeat(
      withTiming(360, { duration, easing: Easing.linear }),
      -1, // Infinite
      false // Don't reverse
    );

    return () => {
      rotation.value = 0;
    };
  }, [duration, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return animatedStyle;
}

// ============================================================================
// TRANSITION HELPERS
// ============================================================================

/**
 * Create a spring animation value
 *
 * Helper for creating consistent spring animations.
 *
 * @param toValue - Target value
 * @param config - Spring configuration preset name
 */
export function springTo(
  toValue: number,
  config: keyof typeof SpringConfig = 'default'
) {
  return withSpring(toValue, SpringConfig[config]);
}

/**
 * Create a timing animation value
 *
 * Helper for creating consistent timing animations.
 *
 * @param toValue - Target value
 * @param config - Timing configuration preset name
 */
export function timingTo(
  toValue: number,
  config: keyof typeof TimingConfig = 'normal'
) {
  return withTiming(toValue, TimingConfig[config]);
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type SpringConfigKey = keyof typeof SpringConfig;
export type TimingConfigKey = keyof typeof TimingConfig;
export type DurationKey = keyof typeof Duration;
