/**
 * SkeletonLoader Components
 *
 * A collection of skeleton loading placeholders with smooth shimmer animations.
 * Used to provide visual feedback during data loading states.
 *
 * Features:
 * - Smooth shimmer animation (moving gradient highlight)
 * - Theme-aware colors for light/dark mode
 * - Multiple preset shapes and sizes
 * - Respects reduced motion preferences
 * - Consistent styling with app design system
 *
 * Components:
 * - Skeleton: Base skeleton shape with shimmer
 * - SkeletonText: Text placeholder with variable width
 * - SkeletonAvatar: Circular avatar placeholder
 * - SkeletonLeaderboardEntry: Composite skeleton for leaderboard rows
 * - SkeletonCard: Card-shaped skeleton placeholder
 */

import React, { useEffect, memo } from 'react';
import { View, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  useReducedMotion,
  interpolate,
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// ============================================
// Configuration
// ============================================

const SHIMMER_DURATION = 1500; // Duration of one shimmer cycle
const SHIMMER_WIDTH = 0.4; // Width of shimmer highlight as percentage

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// Hook: useShimmer
// ============================================

function useShimmerAnimation(disabled: boolean = false) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || disabled) {
      progress.value = 0;
      return;
    }

    progress.value = withRepeat(
      withTiming(1, {
        duration: SHIMMER_DURATION,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // Infinite repeat
      false // Don't reverse
    );

    return () => {
      progress.value = 0;
    };
  }, [reduceMotion, disabled]);

  return progress;
}

// ============================================
// Base Skeleton Component
// ============================================

interface SkeletonProps {
  /** Width of the skeleton (number for fixed, string for percentage) */
  width?: number | string;
  /** Height of the skeleton */
  height?: number;
  /** Border radius (default: 4) */
  borderRadius?: number;
  /** Make it circular (overrides borderRadius) */
  circle?: boolean;
  /** Additional styles */
  style?: ViewStyle;
  /** Disable shimmer animation */
  disableAnimation?: boolean;
}

export const Skeleton = memo(function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 4,
  circle = false,
  style,
  disableAnimation = false,
}: SkeletonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const reduceMotion = useReducedMotion();
  const progress = useShimmerAnimation(disableAnimation);

  // Calculate actual border radius
  const actualBorderRadius = circle ? (typeof height === 'number' ? height / 2 : 50) : borderRadius;

  // Theme-aware colors
  const backgroundColor = colorScheme === 'dark' ? '#2a2a2a' : '#e8e8e8';
  const highlightColor = colorScheme === 'dark' ? '#3a3a3a' : '#f5f5f5';

  // Calculate actual width for animation
  const numericWidth = typeof width === 'number' ? width : SCREEN_WIDTH;

  const shimmerStyle = useAnimatedStyle(() => {
    if (reduceMotion || disableAnimation) {
      return { transform: [{ translateX: -numericWidth }] };
    }

    const translateX = interpolate(
      progress.value,
      [0, 1],
      [-numericWidth, numericWidth * 2]
    );

    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: actualBorderRadius,
          backgroundColor,
        },
        style,
      ]}
    >
      {!reduceMotion && !disableAnimation && (
        <Animated.View style={[styles.shimmerContainer, shimmerStyle]}>
          <LinearGradient
            colors={[
              'transparent',
              highlightColor,
              'transparent',
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.shimmer, { width: numericWidth * SHIMMER_WIDTH }]}
          />
        </Animated.View>
      )}
    </View>
  );
});

// ============================================
// SkeletonText Component
// ============================================

interface SkeletonTextProps {
  /** Width as percentage (default: 100) */
  widthPercent?: number;
  /** Number of lines (default: 1) */
  lines?: number;
  /** Line height (default: 14) */
  lineHeight?: number;
  /** Gap between lines (default: 8) */
  gap?: number;
  /** Vary width of lines for more natural look */
  varied?: boolean;
  /** Additional container styles */
  style?: ViewStyle;
}

export const SkeletonText = memo(function SkeletonText({
  widthPercent = 100,
  lines = 1,
  lineHeight = 14,
  gap = 8,
  varied = false,
  style,
}: SkeletonTextProps) {
  // Generate varied widths for each line
  const lineWidths = Array.from({ length: lines }, (_, i) => {
    if (!varied) return widthPercent;
    // Last line is typically shorter
    if (i === lines - 1) return Math.max(widthPercent * 0.6, 40);
    // Vary other lines slightly
    const variation = (Math.sin(i * 2.5) + 1) * 0.1; // 0-20% variation
    return Math.min(widthPercent * (0.9 + variation), 100);
  });

  return (
    <View style={[styles.textContainer, style]}>
      {lineWidths.map((width, index) => (
        <Skeleton
          key={index}
          width={`${width}%`}
          height={lineHeight}
          style={index < lines - 1 ? { marginBottom: gap } : undefined}
        />
      ))}
    </View>
  );
});

// ============================================
// SkeletonAvatar Component
// ============================================

interface SkeletonAvatarProps {
  /** Size of the avatar (default: 44) */
  size?: number;
  /** Additional styles */
  style?: ViewStyle;
}

export const SkeletonAvatar = memo(function SkeletonAvatar({
  size = 44,
  style,
}: SkeletonAvatarProps) {
  return (
    <Skeleton
      width={size}
      height={size}
      circle
      style={style}
    />
  );
});

// ============================================
// SkeletonLeaderboardEntry Component
// ============================================

interface SkeletonLeaderboardEntryProps {
  /** Show rank badge (default: true) */
  showRank?: boolean;
  /** Additional styles */
  style?: ViewStyle;
}

export const SkeletonLeaderboardEntry = memo(function SkeletonLeaderboardEntry({
  showRank = true,
  style,
}: SkeletonLeaderboardEntryProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const backgroundColor = Colors[colorScheme].card;
  const borderColor = Colors[colorScheme].border;

  return (
    <View
      style={[
        styles.leaderboardEntry,
        {
          backgroundColor,
          borderColor,
        },
        style,
      ]}
    >
      {/* Avatar with rank */}
      <View style={styles.leaderboardAvatar}>
        <SkeletonAvatar size={44} />
        {showRank && (
          <View style={styles.rankBadgePlaceholder}>
            <Skeleton width={20} height={20} circle />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.leaderboardInfo}>
        <Skeleton width="70%" height={16} borderRadius={4} />
      </View>

      {/* Score */}
      <View style={styles.leaderboardScore}>
        <Skeleton width={48} height={20} borderRadius={8} />
      </View>
    </View>
  );
});

// ============================================
// SkeletonCard Component
// ============================================

interface SkeletonCardProps {
  /** Card height (default: 120) */
  height?: number;
  /** Show header section (default: true) */
  showHeader?: boolean;
  /** Number of content lines (default: 2) */
  contentLines?: number;
  /** Additional styles */
  style?: ViewStyle;
}

export const SkeletonCard = memo(function SkeletonCard({
  height = 120,
  showHeader = true,
  contentLines = 2,
  style,
}: SkeletonCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const backgroundColor = Colors[colorScheme].card;
  const borderColor = Colors[colorScheme].border;

  return (
    <View
      style={[
        styles.card,
        {
          height,
          backgroundColor,
          borderColor,
        },
        style,
      ]}
    >
      {showHeader && (
        <View style={styles.cardHeader}>
          <SkeletonAvatar size={36} />
          <View style={styles.cardHeaderText}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="40%" height={10} style={{ marginTop: 6 }} />
          </View>
        </View>
      )}
      <View style={styles.cardContent}>
        <SkeletonText lines={contentLines} varied />
      </View>
    </View>
  );
});

// ============================================
// SkeletonList Component
// ============================================

interface SkeletonListProps {
  /** Number of skeleton items to show (default: 5) */
  count?: number;
  /** Component type to render */
  type?: 'leaderboard' | 'card' | 'text';
  /** Additional styles for each item */
  itemStyle?: ViewStyle;
  /** Container styles */
  style?: ViewStyle;
}

export const SkeletonList = memo(function SkeletonList({
  count = 5,
  type = 'leaderboard',
  itemStyle,
  style,
}: SkeletonListProps) {
  const items = Array.from({ length: count }, (_, index) => index);

  const renderItem = (index: number) => {
    switch (type) {
      case 'leaderboard':
        return (
          <SkeletonLeaderboardEntry
            key={index}
            style={itemStyle}
          />
        );
      case 'card':
        return (
          <SkeletonCard
            key={index}
            style={itemStyle}
          />
        );
      case 'text':
        return (
          <SkeletonText
            key={index}
            lines={2}
            varied
            style={[{ marginBottom: 16 }, itemStyle]}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={style}>
      {items.map(renderItem)}
    </View>
  );
});

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  shimmerContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  shimmer: {
    height: '100%',
  },
  textContainer: {
    width: '100%',
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  leaderboardAvatar: {
    position: 'relative',
  },
  rankBadgePlaceholder: {
    position: 'absolute',
    bottom: -4,
    right: -4,
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  leaderboardScore: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
});

// ============================================
// Default Export
// ============================================

export default Skeleton;
