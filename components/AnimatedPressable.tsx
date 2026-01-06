/**
 * AnimatedPressable Component
 *
 * A drop-in replacement for TouchableOpacity/Pressable that provides
 * consistent touch feedback across the entire app.
 *
 * Features:
 * - Scale-down animation on press (0.98)
 * - Smooth spring animations
 * - Haptic feedback on iOS
 * - Minimum 44x44pt touch targets (accessibility)
 * - Disabled state styling (0.55 opacity)
 * - Respects reduced motion preferences
 * - Full accessibility support
 *
 * @example
 * ```tsx
 * // Basic usage
 * <AnimatedPressable onPress={handlePress}>
 *   <Text>Press Me</Text>
 * </AnimatedPressable>
 *
 * // With custom scale and no haptics
 * <AnimatedPressable
 *   onPress={handlePress}
 *   pressScale={0.95}
 *   hapticFeedback={false}
 * >
 *   <MyComponent />
 * </AnimatedPressable>
 *
 * // Card-style with highlight
 * <AnimatedPressable
 *   onPress={handlePress}
 *   variant="highlight"
 *   style={styles.card}
 * >
 *   <CardContent />
 * </AnimatedPressable>
 * ```
 */

import React, { useCallback, ReactNode } from 'react';
import {
  StyleSheet,
  ViewStyle,
  Pressable,
  PressableProps,
  GestureResponderEvent,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { SPRING_CONFIG } from '@/hooks/useAnimations';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// ============================================
// Types
// ============================================

type FeedbackVariant = 'scale' | 'opacity' | 'highlight' | 'none';
type HapticStyle = 'light' | 'medium' | 'heavy' | 'none';

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  /** Content to render */
  children: ReactNode;
  /** Press handler */
  onPress?: (event: GestureResponderEvent) => void;
  /** Long press handler */
  onLongPress?: (event: GestureResponderEvent) => void;
  /** Scale value when pressed (default: 0.98) */
  pressScale?: number;
  /** Opacity value when pressed for opacity variant (default: 0.7) */
  pressOpacity?: number;
  /** Feedback style variant (default: 'scale') */
  variant?: FeedbackVariant;
  /** Haptic feedback style (default: 'light') */
  hapticStyle?: HapticStyle;
  /** Disable haptic feedback entirely */
  hapticFeedback?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Container styles */
  style?: ViewStyle | ViewStyle[];
  /** Pressed state styles */
  pressedStyle?: ViewStyle;
  /** Ensure minimum touch target of 44x44 (default: true) */
  enforceMinTouchTarget?: boolean;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Accessibility hint */
  accessibilityHint?: string;
  /** Accessibility role */
  accessibilityRole?: PressableProps['accessibilityRole'];
  /** Test ID for testing */
  testID?: string;
}

// ============================================
// Constants
// ============================================

const DEFAULT_PRESS_SCALE = 0.98;
const DEFAULT_PRESS_OPACITY = 0.7;
const MIN_TOUCH_TARGET = 44;
const DISABLED_OPACITY = 0.55;

// ============================================
// Component
// ============================================

export function AnimatedPressable({
  children,
  onPress,
  onLongPress,
  pressScale = DEFAULT_PRESS_SCALE,
  pressOpacity = DEFAULT_PRESS_OPACITY,
  variant = 'scale',
  hapticStyle = 'light',
  hapticFeedback = true,
  disabled = false,
  style,
  pressedStyle,
  enforceMinTouchTarget = true,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  testID,
  ...pressableProps
}: AnimatedPressableProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const reduceMotion = useReducedMotion();
  const colors = Colors[colorScheme];

  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const highlightOpacity = useSharedValue(0);

  // ----------------------------------------
  // Haptic feedback helper
  // ----------------------------------------
  const triggerHaptic = useCallback(() => {
    if (!hapticFeedback || Platform.OS !== 'ios' || hapticStyle === 'none') return;

    switch (hapticStyle) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
    }
  }, [hapticFeedback, hapticStyle]);

  // ----------------------------------------
  // Press handlers
  // ----------------------------------------
  const handlePressIn = useCallback(() => {
    if (disabled) return;

    triggerHaptic();

    if (reduceMotion || variant === 'none') return;

    switch (variant) {
      case 'scale':
        scale.value = withSpring(pressScale, SPRING_CONFIG.button);
        break;
      case 'opacity':
        opacity.value = withSpring(pressOpacity, SPRING_CONFIG.button);
        break;
      case 'highlight':
        highlightOpacity.value = withSpring(0.1, SPRING_CONFIG.button);
        break;
    }
  }, [disabled, reduceMotion, variant, pressScale, pressOpacity, triggerHaptic]);

  const handlePressOut = useCallback(() => {
    if (reduceMotion || variant === 'none') return;

    switch (variant) {
      case 'scale':
        scale.value = withSpring(1, SPRING_CONFIG.button);
        break;
      case 'opacity':
        opacity.value = withSpring(1, SPRING_CONFIG.button);
        break;
      case 'highlight':
        highlightOpacity.value = withSpring(0, SPRING_CONFIG.button);
        break;
    }
  }, [reduceMotion, variant]);

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (disabled) return;
      onPress?.(event);
    },
    [disabled, onPress]
  );

  const handleLongPress = useCallback(
    (event: GestureResponderEvent) => {
      if (disabled) return;

      // Provide stronger haptic feedback for long press
      if (hapticFeedback && Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      onLongPress?.(event);
    },
    [disabled, hapticFeedback, onLongPress]
  );

  // ----------------------------------------
  // Animated styles
  // ----------------------------------------
  const animatedStyle = useAnimatedStyle(() => {
    const transforms: { scale: number }[] = [];
    let animatedOpacity = 1;

    if (variant === 'scale') {
      transforms.push({ scale: scale.value });
    }

    if (variant === 'opacity') {
      animatedOpacity = opacity.value;
    }

    return {
      transform: transforms.length > 0 ? transforms : undefined,
      opacity: variant === 'opacity' ? animatedOpacity : undefined,
    };
  });

  const highlightStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(${colorScheme === 'dark' ? '255,255,255' : '0,0,0'}, ${highlightOpacity.value})`,
  }));

  // ----------------------------------------
  // Style computation
  // ----------------------------------------
  const containerStyle: ViewStyle[] = [
    styles.container,
    enforceMinTouchTarget && styles.minTouchTarget,
    disabled && { opacity: DISABLED_OPACITY },
    ...(Array.isArray(style) ? style : style ? [style] : []),
  ].filter(Boolean) as ViewStyle[];

  // ----------------------------------------
  // Render
  // ----------------------------------------
  return (
    <Animated.View style={[containerStyle, animatedStyle]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        onLongPress={onLongPress ? handleLongPress : undefined}
        disabled={disabled}
        accessible={true}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        testID={testID}
        style={styles.pressable}
        {...pressableProps}
      >
        {children}

        {/* Highlight overlay for 'highlight' variant */}
        {variant === 'highlight' && (
          <Animated.View
            style={[styles.highlightOverlay, highlightStyle]}
            pointerEvents="none"
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

// ============================================
// Preset Variants
// ============================================

/**
 * AnimatedPressable preset for card-style elements
 * Uses highlight variant with subtle effect
 */
export function AnimatedCard({
  children,
  style,
  ...props
}: Omit<AnimatedPressableProps, 'variant'>) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <AnimatedPressable
      variant="highlight"
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        },
        style,
      ]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * AnimatedPressable preset for list/row items
 * Uses scale variant with subtle feedback
 */
export function AnimatedRow({
  children,
  style,
  ...props
}: Omit<AnimatedPressableProps, 'variant' | 'pressScale'>) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <AnimatedPressable
      variant="scale"
      pressScale={0.99}
      style={[
        {
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * AnimatedPressable preset for icon buttons
 * Circular with prominent scale effect
 */
export function AnimatedIconButton({
  children,
  size = 44,
  style,
  ...props
}: Omit<AnimatedPressableProps, 'variant' | 'pressScale'> & { size?: number }) {
  return (
    <AnimatedPressable
      variant="scale"
      pressScale={0.9}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  minTouchTarget: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
  },
  pressable: {
    flex: 1,
  },
  highlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 'inherit' as any, // TypeScript workaround
  },
});

// ============================================
// Default Export
// ============================================

export default AnimatedPressable;
