import React, { useEffect, useRef } from 'react';
import { Pressable, View, StyleSheet, AccessibilityInfo } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import { useColorScheme } from '@/hooks/useColorScheme';

interface DailyChallengeCardProps {
  onPress: () => void;
}

// Animated components
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

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
  const { stats, todayCompleted, todayResult, isLoading } = useDailyChallenge();
  const previousStreakRef = useRef(stats.currentStreak);

  // Animation values
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const flameScale = useSharedValue(1);
  const flameRotate = useSharedValue(0);
  const checkmarkScale = useSharedValue(todayCompleted ? 1 : 0);
  const checkmarkOpacity = useSharedValue(todayCompleted ? 1 : 0);
  const entranceOpacity = useSharedValue(0);
  const entranceTranslateY = useSharedValue(20);
  const depthOffset = useSharedValue(0);

  // Check for reduced motion
  const [reduceMotion, setReduceMotion] = React.useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  // Entrance animation
  useEffect(() => {
    entranceOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    entranceTranslateY.value = withDelay(100, withSpring(0, { damping: 20, stiffness: 90 }));
  }, []);

  // Subtle flame pulse when streak > 0
  useEffect(() => {
    if (reduceMotion) return;

    if (stats.currentStreak > 0 && !todayCompleted) {
      flameScale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Subtle flame sway
      flameRotate.value = withRepeat(
        withSequence(
          withTiming(5, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(-5, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [stats.currentStreak, todayCompleted, reduceMotion]);

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

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entranceOpacity.value,
    transform: [{ translateY: entranceTranslateY.value }],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  // Parallax depth effect on content
  const contentDepthStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: depthOffset.value * 0.5 },
    ],
  }));

  const badgeDepthStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: depthOffset.value * -0.3 },
    ],
  }));

  const animatedFlameStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: flameScale.value },
      { rotate: `${flameRotate.value}deg` },
    ],
  }));

  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
    opacity: checkmarkOpacity.value,
  }));

  const handlePressIn = () => {
    if (!todayCompleted) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      scale.value = withSpring(0.97, SPRING_CONFIG);
      // Subtle depth effect - card presses down
      translateY.value = withSpring(2, SPRING_CONFIG);
      depthOffset.value = withSpring(3, SPRING_CONFIG);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING_CONFIG);
    translateY.value = withSpring(0, SPRING_CONFIG);
    depthOffset.value = withSpring(0, SPRING_CONFIG);
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

  // Badge colors - subtle, blends with card
  const getBadgeColors = () => {
    if (todayCompleted) {
      return {
        // Subtle badge that blends with the card
        background: colorScheme === 'dark' ? 'rgba(232,212,190,0.15)' : 'rgba(120,53,15,0.10)',
        text: colorScheme === 'dark' ? 'rgba(232,212,190,0.8)' : 'rgba(120,53,15,0.7)',
      };
    }
    return {
      background: 'rgba(0,0,0,0.12)',
      text: 'white',
    };
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

  if (isLoading) {
    return null;
  }

  const textColor = getTextColor();
  const subtitleColor = getSubtitleColor();
  const badgeColors = getBadgeColors();

  return (
    <Animated.View style={[styles.wrapper, entranceStyle]}>
      <Animated.View style={[styles.container, animatedContainerStyle]}>
        <AnimatedPressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={todayCompleted}
          accessibilityRole="button"
          accessibilityLabel={`Daily Challenge. ${todayCompleted ? 'Completed' : 'New scripture available'}. ${stats.currentStreak} day streak.`}
          accessibilityHint={todayCompleted ? 'Challenge completed for today' : 'Double tap to start the daily challenge'}
        >
          <LinearGradient
            colors={getGradientColors()}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* TODAY / DONE Badge with depth effect */}
            <Animated.View style={[styles.badge, { backgroundColor: badgeColors.background }, badgeDepthStyle]}>
              <ThemedText style={[styles.badgeText, { color: badgeColors.text }]}>
                {todayCompleted ? 'DONE' : 'TODAY'}
              </ThemedText>
            </Animated.View>

            <Animated.View style={[styles.content, contentDepthStyle]}>
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
                    <Animated.View style={animatedFlameStyle}>
                      <Ionicons name="flame" size={18} color="#ff6b35" />
                    </Animated.View>
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
            </Animated.View>
          </LinearGradient>
        </AnimatedPressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 28,
  },
  container: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    // Enhanced shadow for better depth
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  gradient: {
    padding: 20,
    paddingTop: 16,
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor set inline based on state
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  badgeText: {
    // color set inline based on state
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
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
