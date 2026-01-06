/**
 * GradientButton Component
 *
 * A polished, animated button with gradient background, haptic feedback,
 * and state-aware visual feedback for success/error conditions.
 *
 * Features:
 * - Scale-down animation on press (scale to 0.98)
 * - Smooth spring animations (damping: 20, stiffness: 300)
 * - Success state: brief green tint overlay
 * - Error state: red tint + shake
 * - Loading spinner with smooth fade transition
 * - Haptic feedback on iOS
 * - Reduced motion support
 */

import React, { useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  Pressable,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  runOnJS,
  Easing,
  useReducedMotion,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { SPRING_CONFIG } from '@/hooks/useAnimations';

// ============================================
// Types
// ============================================

type GradientVariant = 'primary' | 'teal' | 'warm';
type ButtonState = 'idle' | 'loading' | 'success' | 'error';

export interface GradientButtonRef {
  /** Trigger success animation programmatically */
  triggerSuccess: () => void;
  /** Trigger error animation programmatically */
  triggerError: () => void;
}

interface GradientButtonProps {
  /** Press handler */
  onPress: () => void | Promise<void>;
  /** Button label text */
  label: string;
  /** Color variant (default: 'teal') */
  variant?: GradientVariant;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state - shows spinner */
  loading?: boolean;
  /** Additional container styles */
  style?: ViewStyle;
  /** Enable haptic feedback (default: true) */
  hapticFeedback?: boolean;
  /** Accessibility label override */
  accessibilityLabel?: string;
  /** Accessibility hint */
  accessibilityHint?: string;
  /** Icon component to show before label */
  icon?: React.ReactNode;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Called when success animation completes */
  onSuccessComplete?: () => void;
  /** Called when error animation completes */
  onErrorComplete?: () => void;
}

// ============================================
// Gradient Configuration
// ============================================

const GRADIENT_COLORS: Record<
  GradientVariant,
  { light: readonly [string, string]; dark: readonly [string, string] }
> = {
  primary: {
    light: [Colors.light.tint, '#92400e'] as const,
    dark: [Colors.dark.tint, '#b45309'] as const,
  },
  teal: {
    light: ['#0a9ea4', '#087d7a'] as const,
    dark: ['#1a7e7e', '#0a5e5e'] as const,
  },
  warm: {
    light: ['#f59e0b', '#d97706'] as const,
    dark: ['#b45309', '#92400e'] as const,
  },
};

// Size configurations
const SIZE_CONFIG = {
  small: {
    padding: 12,
    fontSize: 14,
    borderRadius: 8,
    minHeight: 44, // Maintain accessibility minimum
  },
  medium: {
    padding: 15,
    fontSize: 16,
    borderRadius: 8,
    minHeight: 50,
  },
  large: {
    padding: 18,
    fontSize: 18,
    borderRadius: 12,
    minHeight: 56,
  },
};

// Animation constants
const PRESS_SCALE = 0.98;
const SUCCESS_DURATION = 800;
const ERROR_DURATION = 600;

// ============================================
// Component
// ============================================

export const GradientButton = forwardRef<GradientButtonRef, GradientButtonProps>(
  function GradientButton(
    {
      onPress,
      label,
      variant = 'teal',
      disabled = false,
      loading = false,
      style,
      hapticFeedback = true,
      accessibilityLabel,
      accessibilityHint,
      icon,
      size = 'medium',
      onSuccessComplete,
      onErrorComplete,
    },
    ref
  ) {
    const colorScheme = useColorScheme() ?? 'light';
    const reduceMotion = useReducedMotion();
    const gradientColors = GRADIENT_COLORS[variant][colorScheme];
    const sizeConfig = SIZE_CONFIG[size];

    // Animation shared values
    const scale = useSharedValue(1);
    const successOverlay = useSharedValue(0);
    const errorOverlay = useSharedValue(0);
    const shakeX = useSharedValue(0);

    // Track loading state for smooth transitions
    const wasLoading = useRef(loading);

    // ----------------------------------------
    // Imperative handle for external triggers
    // ----------------------------------------
    useImperativeHandle(ref, () => ({
      triggerSuccess: () => {
        if (hapticFeedback) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        if (reduceMotion) {
          successOverlay.value = withTiming(0.2, { duration: 100 }, () => {
            successOverlay.value = withTiming(0, { duration: 100 }, () => {
              if (onSuccessComplete) runOnJS(onSuccessComplete)();
            });
          });
          return;
        }

        successOverlay.value = withSequence(
          withTiming(0.2, { duration: SUCCESS_DURATION / 4 }),
          withTiming(0.2, { duration: SUCCESS_DURATION / 2 }),
          withTiming(0, { duration: SUCCESS_DURATION / 4 }, () => {
            if (onSuccessComplete) runOnJS(onSuccessComplete)();
          })
        );
      },
      triggerError: () => {
        if (hapticFeedback) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }

        if (reduceMotion) {
          errorOverlay.value = withTiming(0.2, { duration: 100 }, () => {
            errorOverlay.value = withTiming(0, { duration: 100 }, () => {
              if (onErrorComplete) runOnJS(onErrorComplete)();
            });
          });
          return;
        }

        // Combined shake + tint animation
        errorOverlay.value = withSequence(
          withTiming(0.2, { duration: ERROR_DURATION / 4 }),
          withTiming(0.2, { duration: ERROR_DURATION / 4 }),
          withTiming(0, { duration: ERROR_DURATION / 2 }, () => {
            if (onErrorComplete) runOnJS(onErrorComplete)();
          })
        );

        const shakeDuration = ERROR_DURATION / 6;
        shakeX.value = withSequence(
          withTiming(6, { duration: shakeDuration }),
          withTiming(-6, { duration: shakeDuration }),
          withTiming(4, { duration: shakeDuration }),
          withTiming(-4, { duration: shakeDuration }),
          withTiming(2, { duration: shakeDuration }),
          withTiming(0, { duration: shakeDuration })
        );
      },
    }));

    // ----------------------------------------
    // Press handlers
    // ----------------------------------------
    const handlePressIn = useCallback(() => {
      if (disabled || loading) return;

      if (reduceMotion) {
        scale.value = PRESS_SCALE;
      } else {
        scale.value = withSpring(PRESS_SCALE, SPRING_CONFIG.button);
      }
    }, [disabled, loading, reduceMotion]);

    const handlePressOut = useCallback(() => {
      if (reduceMotion) {
        scale.value = 1;
      } else {
        scale.value = withSpring(1, SPRING_CONFIG.button);
      }
    }, [reduceMotion]);

    const handlePress = useCallback(() => {
      if (disabled || loading) return;

      if (hapticFeedback) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress();
    }, [disabled, loading, hapticFeedback, onPress]);

    // ----------------------------------------
    // Animated styles
    // ----------------------------------------
    const containerAnimatedStyle = useAnimatedStyle(() => ({
      transform: [
        { scale: scale.value },
        { translateX: shakeX.value },
      ],
    }));

    const successOverlayStyle = useAnimatedStyle(() => ({
      ...StyleSheet.absoluteFillObject,
      backgroundColor: `rgba(76, 175, 80, ${successOverlay.value})`,
      borderRadius: sizeConfig.borderRadius,
    }));

    const errorOverlayStyle = useAnimatedStyle(() => ({
      ...StyleSheet.absoluteFillObject,
      backgroundColor: `rgba(244, 67, 54, ${errorOverlay.value})`,
      borderRadius: sizeConfig.borderRadius,
    }));

    // ----------------------------------------
    // Render
    // ----------------------------------------
    const isDisabled = disabled || loading;
    const buttonOpacity = isDisabled ? 0.55 : 1;

    return (
      <Animated.View
        style={[
          styles.container,
          { borderRadius: sizeConfig.borderRadius },
          style,
          containerAnimatedStyle,
        ]}
      >
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          disabled={isDisabled}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel || label}
          accessibilityHint={accessibilityHint}
          accessibilityState={{
            disabled: isDisabled,
            busy: loading,
          }}
          style={({ pressed }) => [
            { opacity: buttonOpacity },
          ]}
        >
          <LinearGradient
            colors={gradientColors}
            style={[
              styles.gradient,
              {
                padding: sizeConfig.padding,
                borderRadius: sizeConfig.borderRadius,
                minHeight: sizeConfig.minHeight,
              },
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.content}>
              {loading ? (
                <Animated.View
                  entering={reduceMotion ? undefined : FadeIn.duration(200)}
                  exiting={reduceMotion ? undefined : FadeOut.duration(150)}
                >
                  <ActivityIndicator
                    color="white"
                    size={size === 'small' ? 'small' : 'small'}
                  />
                </Animated.View>
              ) : (
                <Animated.View
                  style={styles.labelContainer}
                  entering={reduceMotion ? undefined : FadeIn.duration(200)}
                >
                  {icon && <View style={styles.iconContainer}>{icon}</View>}
                  <ThemedText
                    style={[
                      styles.text,
                      { fontSize: sizeConfig.fontSize },
                    ]}
                  >
                    {label}
                  </ThemedText>
                </Animated.View>
              )}
            </View>

            {/* Success overlay */}
            <Animated.View
              style={successOverlayStyle}
              pointerEvents="none"
            />

            {/* Error overlay */}
            <Animated.View
              style={errorOverlayStyle}
              pointerEvents="none"
            />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }
);

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    // Shadow for depth - adjusted for visibility in both themes
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  gradient: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
  },
});

// ============================================
// Default export for backward compatibility
// ============================================

export default GradientButton;
