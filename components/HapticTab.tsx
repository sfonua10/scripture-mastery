/**
 * HapticTab Component
 *
 * Enhanced tab bar button with:
 * - Haptic feedback on press (iOS)
 * - Icon scale animation on selection (1.0 -> 1.1 -> 1.0)
 * - Smooth color transitions between selected/unselected states
 * - Subtle bounce on tap
 * - Accessibility support
 *
 * Design Principles:
 * - Micro-interactions should be subtle but noticeable
 * - Feedback should be immediate and natural
 * - Animations respect reduced motion preferences
 */

import { useCallback, useEffect, useRef } from 'react';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { Platform, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  useReducedMotion,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { SPRING_CONFIG } from '@/hooks/useAnimations';

// Animation constants
const TAB_PRESS_SCALE = 0.92;
const TAB_SELECTED_SCALE = 1.0;
const TAB_PULSE_SCALE = 1.12;

export function HapticTab(props: BottomTabBarButtonProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const wasSelected = useRef(props.accessibilityState?.selected);

  // Handle selection change animation
  useEffect(() => {
    const isSelected = props.accessibilityState?.selected;
    const justBecameSelected = isSelected && !wasSelected.current;

    if (justBecameSelected && !reduceMotion) {
      // Pulse animation when tab becomes selected
      scale.value = withSequence(
        withSpring(TAB_PULSE_SCALE, SPRING_CONFIG.micro),
        withSpring(TAB_SELECTED_SCALE, SPRING_CONFIG.bouncy)
      );
    }

    wasSelected.current = isSelected;
  }, [props.accessibilityState?.selected, reduceMotion]);

  // Press handlers
  const handlePressIn = useCallback((ev: any) => {
    // Haptic feedback on iOS
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Scale down animation
    if (!reduceMotion) {
      scale.value = withSpring(TAB_PRESS_SCALE, SPRING_CONFIG.micro);
    }

    // Call original handler
    props.onPressIn?.(ev);
  }, [reduceMotion, props.onPressIn]);

  const handlePressOut = useCallback((ev: any) => {
    // Scale back up
    if (!reduceMotion) {
      scale.value = withSpring(TAB_SELECTED_SCALE, SPRING_CONFIG.bouncy);
    }

    // Call original handler
    props.onPressOut?.(ev);
  }, [reduceMotion, props.onPressOut]);

  // Animated style for the content wrapper
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Wrap the children in an animated view for scale effect
  const AnimatedContent = () => (
    <Animated.View style={[styles.contentWrapper, animatedStyle]}>
      {props.children}
    </Animated.View>
  );

  return (
    <PlatformPressable
      {...props}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <AnimatedContent />
    </PlatformPressable>
  );
}

const styles = StyleSheet.create({
  contentWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ============================================
// AnimatedTabIcon Component
// ============================================

interface AnimatedTabIconProps {
  /** Whether the tab is currently selected */
  focused: boolean;
  /** The icon component to render */
  children: React.ReactNode;
  /** Selected color */
  selectedColor?: string;
  /** Unselected color */
  unselectedColor?: string;
}

/**
 * Optional wrapper for tab icons that adds additional animation effects
 * Can be used to wrap individual icons for more control
 *
 * @example
 * ```tsx
 * <Tabs.Screen
 *   name="home"
 *   options={{
 *     tabBarIcon: ({ color, focused }) => (
 *       <AnimatedTabIcon focused={focused}>
 *         <IconSymbol name="house.fill" color={color} size={28} />
 *       </AnimatedTabIcon>
 *     ),
 *   }}
 * />
 * ```
 */
export function AnimatedTabIcon({
  focused,
  children,
}: AnimatedTabIconProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const previousFocused = useRef(focused);

  useEffect(() => {
    // Only animate when becoming focused, not on initial render
    if (focused && !previousFocused.current && !reduceMotion) {
      scale.value = withSequence(
        withSpring(1.15, SPRING_CONFIG.micro),
        withSpring(1, SPRING_CONFIG.bouncy)
      );
    }
    previousFocused.current = focused;
  }, [focused, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
}

// ============================================
// Badge Component for Tab Icons
// ============================================

interface TabBadgeProps {
  /** Badge count (0 or undefined hides the badge) */
  count?: number;
  /** Maximum number to display (shows "99+" if exceeded) */
  maxCount?: number;
  /** Badge background color */
  color?: string;
}

/**
 * Notification badge for tab bar icons
 * Automatically animates in/out with scale and opacity
 *
 * @example
 * ```tsx
 * <Tabs.Screen
 *   name="notifications"
 *   options={{
 *     tabBarIcon: ({ color }) => (
 *       <View>
 *         <IconSymbol name="bell.fill" color={color} size={28} />
 *         <TabBadge count={unreadCount} />
 *       </View>
 *     ),
 *   }}
 * />
 * ```
 */
export function TabBadge({
  count,
  maxCount = 99,
  color = '#FF3B30',
}: TabBadgeProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const previousCount = useRef<number | undefined>(undefined);

  useEffect(() => {
    const shouldShow = count !== undefined && count > 0;
    const wasShowing = previousCount.current !== undefined && previousCount.current > 0;

    if (shouldShow && !wasShowing) {
      // Animate in
      if (reduceMotion) {
        scale.value = 1;
        opacity.value = 1;
      } else {
        scale.value = withSequence(
          withSpring(1.3, SPRING_CONFIG.micro),
          withSpring(1, SPRING_CONFIG.bouncy)
        );
        opacity.value = withTiming(1, { duration: 150 });
      }
    } else if (!shouldShow && wasShowing) {
      // Animate out
      if (reduceMotion) {
        scale.value = 0;
        opacity.value = 0;
      } else {
        scale.value = withTiming(0, { duration: 150, easing: Easing.in(Easing.ease) });
        opacity.value = withTiming(0, { duration: 150 });
      }
    } else if (shouldShow && wasShowing && count !== previousCount.current) {
      // Count changed - subtle bounce
      if (!reduceMotion) {
        scale.value = withSequence(
          withSpring(1.2, SPRING_CONFIG.micro),
          withSpring(1, SPRING_CONFIG.bouncy)
        );
      }
    }

    previousCount.current = count;
  }, [count, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (count === undefined || count === 0) {
    // Still render with opacity 0 to allow animate-out
    if (previousCount.current === undefined || previousCount.current === 0) {
      return null;
    }
  }

  const displayText = count !== undefined && count > maxCount ? `${maxCount}+` : String(count ?? 0);

  return (
    <Animated.View
      style={[
        badgeStyles.container,
        { backgroundColor: color },
        animatedStyle,
      ]}
    >
      <Animated.Text style={badgeStyles.text}>
        {displayText}
      </Animated.Text>
    </Animated.View>
  );
}

const badgeStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    // Add border for visibility on any background
    borderWidth: 2,
    borderColor: 'white',
  },
  text: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
