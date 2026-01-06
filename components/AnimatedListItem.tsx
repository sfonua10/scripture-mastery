/**
 * AnimatedListItem Component
 *
 * A wrapper component for FlatList items that provides staggered entrance
 * animations with fadeInUp effect.
 *
 * Features:
 * - Staggered delay based on item index (50ms between items, max 500ms)
 * - FadeInUp animation (translateY from 20 to 0, opacity 0 to 1)
 * - 300ms duration per item
 * - Respects reduced motion preferences
 * - Memoized for optimal FlatList performance
 *
 * @example
 * ```tsx
 * <FlatList
 *   data={items}
 *   renderItem={({ item, index }) => (
 *     <AnimatedListItem index={index}>
 *       <MyItemComponent item={item} />
 *     </AnimatedListItem>
 *   )}
 * />
 * ```
 */

import React, { memo, useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  useReducedMotion,
  FadeInUp,
  Layout,
} from 'react-native-reanimated';

// ============================================
// Configuration Constants
// ============================================

const DEFAULT_STAGGER_DELAY = 50; // ms between each item
const DEFAULT_MAX_DELAY = 500; // maximum total delay
const DEFAULT_DURATION = 300; // animation duration per item
const DEFAULT_TRANSLATE_Y = 20; // starting Y offset

// ============================================
// Types
// ============================================

interface AnimatedListItemProps {
  /** Item index in the list (used for stagger calculation) */
  index: number;
  /** Content to animate */
  children: React.ReactNode;
  /** Custom delay between items in ms (default: 50) */
  staggerDelay?: number;
  /** Maximum total delay in ms (default: 500) */
  maxDelay?: number;
  /** Animation duration in ms (default: 300) */
  duration?: number;
  /** Starting Y translation (default: 20) */
  translateY?: number;
  /** Additional styles for the container */
  style?: ViewStyle;
  /** Disable animation (renders children directly) */
  disabled?: boolean;
  /** Enable layout animation for list reordering */
  enableLayoutAnimation?: boolean;
}

// ============================================
// Component
// ============================================

function AnimatedListItemComponent({
  index,
  children,
  staggerDelay = DEFAULT_STAGGER_DELAY,
  maxDelay = DEFAULT_MAX_DELAY,
  duration = DEFAULT_DURATION,
  translateY: initialTranslateY = DEFAULT_TRANSLATE_Y,
  style,
  disabled = false,
  enableLayoutAnimation = false,
}: AnimatedListItemProps) {
  const reduceMotion = useReducedMotion();

  // Calculate staggered delay (capped at maxDelay)
  const delay = Math.min(index * staggerDelay, maxDelay);

  // Animation values
  const opacity = useSharedValue(reduceMotion || disabled ? 1 : 0);
  const translateY = useSharedValue(reduceMotion || disabled ? 0 : initialTranslateY);

  useEffect(() => {
    if (reduceMotion || disabled) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    const timingConfig = {
      duration,
      easing: Easing.out(Easing.cubic),
    };

    opacity.value = withDelay(delay, withTiming(1, timingConfig));
    translateY.value = withDelay(delay, withTiming(0, timingConfig));
  }, [reduceMotion, disabled, delay, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // If disabled, render children directly without animation wrapper
  if (disabled && !enableLayoutAnimation) {
    return <>{children}</>;
  }

  return (
    <Animated.View
      style={[animatedStyle, style]}
      layout={enableLayoutAnimation && !reduceMotion ? Layout.springify() : undefined}
    >
      {children}
    </Animated.View>
  );
}

// Memoize for FlatList performance
export const AnimatedListItem = memo(AnimatedListItemComponent);

// ============================================
// Entering Animation Variant
// ============================================

/**
 * Alternative approach using Reanimated's entering animations
 * Better for items that are added dynamically to the list
 *
 * @example
 * ```tsx
 * <FlatList
 *   data={items}
 *   renderItem={({ item, index }) => (
 *     <AnimatedListItemEntering index={index}>
 *       <MyItemComponent item={item} />
 *     </AnimatedListItemEntering>
 *   )}
 * />
 * ```
 */

interface AnimatedListItemEnteringProps {
  /** Item index in the list */
  index: number;
  /** Content to animate */
  children: React.ReactNode;
  /** Custom delay between items in ms (default: 50) */
  staggerDelay?: number;
  /** Maximum total delay in ms (default: 500) */
  maxDelay?: number;
  /** Animation duration in ms (default: 300) */
  duration?: number;
  /** Additional styles */
  style?: ViewStyle;
}

function AnimatedListItemEnteringComponent({
  index,
  children,
  staggerDelay = DEFAULT_STAGGER_DELAY,
  maxDelay = DEFAULT_MAX_DELAY,
  duration = DEFAULT_DURATION,
  style,
}: AnimatedListItemEnteringProps) {
  const reduceMotion = useReducedMotion();

  // Calculate staggered delay
  const delay = Math.min(index * staggerDelay, maxDelay);

  if (reduceMotion) {
    return <Animated.View style={style}>{children}</Animated.View>;
  }

  return (
    <Animated.View
      style={style}
      entering={FadeInUp.delay(delay).duration(duration).easing(Easing.out(Easing.cubic))}
    >
      {children}
    </Animated.View>
  );
}

export const AnimatedListItemEntering = memo(AnimatedListItemEnteringComponent);

// ============================================
// Hook for List Animation Control
// ============================================

interface UseListAnimationOptions {
  /** Number of items in the list */
  itemCount: number;
  /** Delay between items (default: 50) */
  staggerDelay?: number;
  /** Maximum delay (default: 500) */
  maxDelay?: number;
}

/**
 * Hook to control list animation state
 * Useful for triggering re-animation when data changes
 *
 * @example
 * ```tsx
 * const { getItemDelay, resetAnimation } = useListAnimation({ itemCount: items.length });
 *
 * // Reset animation when refreshing
 * const handleRefresh = async () => {
 *   await fetchNewData();
 *   resetAnimation();
 * };
 * ```
 */
export function useListAnimation(options: UseListAnimationOptions) {
  const { staggerDelay = DEFAULT_STAGGER_DELAY, maxDelay = DEFAULT_MAX_DELAY } = options;
  const reduceMotion = useReducedMotion();
  const animationKey = useSharedValue(0);

  const getItemDelay = (index: number): number => {
    if (reduceMotion) return 0;
    return Math.min(index * staggerDelay, maxDelay);
  };

  const resetAnimation = () => {
    animationKey.value = animationKey.value + 1;
  };

  return {
    getItemDelay,
    resetAnimation,
    animationKey: animationKey.value,
  };
}

// ============================================
// Exports
// ============================================

export default AnimatedListItem;
