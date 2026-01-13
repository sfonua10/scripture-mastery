import React, { useEffect, useRef, useCallback } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import { useColorScheme } from '@/hooks/useColorScheme';

interface DailyChallengeCardProps {
  onPress: () => void;
}

// Animated components
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Spring config for natural feel
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
};

// Animated number component for streak counter
function AnimatedNumber({ value, color }: { value: number; color: string }) {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    // Animate number change with a tick effect
    animatedValue.value = 0;
    animatedValue.value = withSequence(
      withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) }),
      withTiming(0, { duration: 150, easing: Easing.in(Easing.ease) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(animatedValue.value, [0, 0.5, 1], [1, 1.15, 1]) },
      { translateY: interpolate(animatedValue.value, [0, 0.5, 1], [0, -2, 0]) },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <ThemedText style={[styles.streakNumber, { color }]}>
        {value}
      </ThemedText>
    </Animated.View>
  );
}

export function DailyChallengeCard({ onPress }: DailyChallengeCardProps) {
  const colorScheme = useColorScheme();
  const { stats, todayCompleted, isLoading, refreshStats } = useDailyChallenge();
  const previousStreakRef = useRef(stats.currentStreak);

  // Refresh stats when screen comes into focus (fixes streak not updating on return)
  useFocusEffect(
    useCallback(() => {
      refreshStats();
    }, [refreshStats])
  );

  // Animation values - simplified (only press feedback)
  const scale = useSharedValue(1);
  const checkmarkScale = useSharedValue(todayCompleted ? 1 : 0);
  const checkmarkOpacity = useSharedValue(todayCompleted ? 1 : 0);

  // Checkmark animation when completed
  useEffect(() => {
    if (todayCompleted) {
      checkmarkScale.value = withSpring(1, { damping: 12, stiffness: 200 });
      checkmarkOpacity.value = withTiming(1, { duration: 300 });
    } else {
      checkmarkScale.value = 0;
      checkmarkOpacity.value = 0;
    }
  }, [todayCompleted]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
    opacity: checkmarkOpacity.value,
  }));

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.97, SPRING_CONFIG);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING_CONFIG);
  };

  const getGradientColors = (): readonly [string, string, string] => {
    if (todayCompleted) {
      // Warm bronze/gold - feels rewarding, not punishing
      return colorScheme === 'dark'
        ? ['#4a3f2f', '#3d3426', '#30291f'] as const  // Rich warm brown
        : ['#f5e6d3', '#e8d4be', '#d9c4a9'] as const; // Warm cream/bronze
    }
    // Active state - warm gradients
    return colorScheme === 'dark'
      ? ['#8b4c1a', '#a65a1f', '#c97820'] as const
      : ['#fef7e0', '#f7c94d', '#e5a01a'] as const;
  };

  const getTextColor = () => {
    if (todayCompleted) {
      // Bronze text on warm background
      return colorScheme === 'dark' ? '#e8d4be' : '#78350f';
    }
    return colorScheme === 'dark' ? 'white' : '#78350f';
  };

  const getSubtitleColor = () => {
    if (todayCompleted) {
      return colorScheme === 'dark' ? 'rgba(232,212,190,0.75)' : 'rgba(120,53,15,0.7)';
    }
    return colorScheme === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(120,53,15,0.75)';
  };

  const getStreakText = () => {
    if (stats.currentStreak === 0) {
      return 'Start your streak!';
    }
    return `day${stats.currentStreak === 1 ? '' : 's'}`;
  };

  const getSubtitleText = () => {
    if (todayCompleted) {
      return 'Come back tomorrow!';
    }
    return 'New scripture available!';
  };

  // Only show nothing on initial load - keep showing existing data during refresh
  if (isLoading && stats.currentStreak === 0 && stats.totalCompleted === 0) {
    return null;
  }

  const textColor = getTextColor();
  const subtitleColor = getSubtitleColor();

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={`Daily Challenge. ${todayCompleted ? 'Completed' : 'New scripture available'}. ${stats.currentStreak} day streak.`}
        accessibilityHint={todayCompleted ? 'Double tap to view your result' : 'Double tap to start the daily challenge'}
      >
        <LinearGradient
          colors={getGradientColors()}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.content}>
            {/* Left: Icon + Text */}
            <View style={styles.leftSection}>
              <View style={styles.iconRow}>
                <View style={styles.iconContainer}>
                  {todayCompleted ? (
                    <Animated.View style={checkmarkAnimatedStyle}>
                      <Ionicons
                        name="checkmark-circle"
                        size={34}
                        color={colorScheme === 'dark' ? '#4ade80' : '#22c55e'}
                      />
                    </Animated.View>
                  ) : (
                    <Ionicons
                      name="book-outline"
                      size={28}
                      color={textColor}
                    />
                  )}
                </View>
                <View style={styles.textContainer}>
                  <ThemedText style={[styles.title, { color: textColor }]}>
                    Daily Challenge
                  </ThemedText>
                  <ThemedText style={[styles.subtitle, { color: subtitleColor }]}>
                    {getSubtitleText()}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Right: Streak */}
            <View style={styles.streakSection}>
              {stats.currentStreak > 0 ? (
                <>
                  <Ionicons name="flame" size={18} color="#ff6b35" />
                  <View style={styles.streakTextContainer}>
                    <AnimatedNumber value={stats.currentStreak} color={textColor} />
                    <ThemedText style={[styles.streakLabel, { color: textColor }]}>
                      {getStreakText()}
                    </ThemedText>
                  </View>
                </>
              ) : (
                <ThemedText style={[styles.streakTextSmall, { color: subtitleColor }]}>
                  {getStreakText()}
                </ThemedText>
              )}
            </View>
          </View>
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    // Subtle shadow
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
  },
  gradient: {
    padding: 16,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flex: 1,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 10,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  streakSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    marginLeft: 10,
  },
  streakTextContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 6,
  },
  streakNumber: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 4,
  },
  streakLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  streakTextSmall: {
    fontSize: 12,
    fontWeight: '500',
  },
});
