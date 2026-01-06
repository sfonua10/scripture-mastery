import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { AvatarWithRank } from '@/components/AvatarWithRank';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { LeaderboardEntry as LeaderboardEntryType } from '@/types/scripture';

interface Props {
  entry: LeaderboardEntryType;
  rank: number;
  isCurrentUser: boolean;
  index?: number; // For staggered animation
}

// Medal colors for top 3 glow effect
const MEDAL_COLORS = {
  1: '#FFD700', // Gold
  2: '#C0C0C0', // Silver
  3: '#CD7F32', // Bronze
};

export function LeaderboardEntry({ entry, rank, isCurrentUser, index = 0 }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Animation values
  const animationProgress = useSharedValue(0);

  useEffect(() => {
    // Staggered entrance animation - 50ms delay per item
    animationProgress.value = withDelay(
      index * 50,
      withSpring(1, {
        damping: 15,
        stiffness: 100,
        mass: 0.8,
      })
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        animationProgress.value,
        [0, 1],
        [0, 1],
        Extrapolation.CLAMP
      ),
      transform: [
        {
          translateX: interpolate(
            animationProgress.value,
            [0, 1],
            [-20, 0],
            Extrapolation.CLAMP
          ),
        },
        {
          scale: interpolate(
            animationProgress.value,
            [0, 1],
            [0.95, 1],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  const isTopThree = rank >= 1 && rank <= 3;
  const medalColor = MEDAL_COLORS[rank as keyof typeof MEDAL_COLORS];

  // Get subtle background for top 3
  const getBackgroundStyle = () => {
    if (isTopThree && !isCurrentUser) {
      // Very subtle medal tint for top 3
      const opacity = colorScheme === 'dark' ? '15' : '08';
      return { backgroundColor: `${medalColor}${opacity}` };
    }
    return { backgroundColor: colors.card };
  };

  // Get border/accent style
  const getBorderStyle = () => {
    if (isCurrentUser) {
      // No border for current user - using accent bar instead
      return { borderWidth: 0 };
    }
    if (isTopThree) {
      // Subtle medal-colored border for top 3
      const opacity = colorScheme === 'dark' ? '40' : '30';
      return { borderColor: `${medalColor}${opacity}`, borderWidth: 1 };
    }
    return { borderColor: colors.border, borderWidth: 1 };
  };

  return (
    <Animated.View
      style={[
        styles.container,
        getBackgroundStyle(),
        getBorderStyle(),
        isTopThree && styles.topThreeContainer,
        animatedStyle,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Rank ${rank}, ${entry.nickname}, score ${entry.score} out of 10${isCurrentUser ? ', this is you' : ''}`}
    >
      {/* Left accent bar for current user */}
      {isCurrentUser && (
        <View
          style={[
            styles.accentBar,
            { backgroundColor: colors.tint },
          ]}
        />
      )}

      <View style={[styles.contentContainer, isCurrentUser && styles.contentWithAccent]}>
        <AvatarWithRank
          photoURL={entry.photoURL}
          nickname={entry.nickname}
          rank={rank}
          size={48}
        />

        <View style={styles.infoContainer}>
          <ThemedText style={styles.nickname} numberOfLines={1}>
            {entry.nickname}
            {isCurrentUser && (
              <ThemedText style={[styles.youLabel, { color: colors.tint }]}>
                {' '}(You)
              </ThemedText>
            )}
          </ThemedText>
          {isTopThree && (
            <ThemedText style={[styles.rankLabel, { color: medalColor }]}>
              {rank === 1 ? '1st Place' : rank === 2 ? '2nd Place' : '3rd Place'}
            </ThemedText>
          )}
        </View>

        <View style={[styles.scoreContainer, { backgroundColor: `${colors.tint}15` }]}>
          <ThemedText style={[styles.score, { color: colors.tint }]}>
            {entry.score}/10
          </ThemedText>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 64, // Increased from default for better touch targets
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  topThreeContainer: {
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingVertical: 10,
  },
  contentWithAccent: {
    paddingLeft: 16, // Extra padding to account for accent bar
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  nickname: {
    fontSize: 16,
    fontWeight: '600',
  },
  youLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  rankLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  scoreContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 56,
    alignItems: 'center',
  },
  score: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
