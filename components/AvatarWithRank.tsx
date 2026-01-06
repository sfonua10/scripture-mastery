import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';

interface AvatarWithRankProps {
  photoURL?: string | null;
  nickname: string;
  rank: number;
  size?: number;
}

// Medal colors
const MEDAL_COLORS = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

function getRankBadgeColors(rank: number) {
  switch (rank) {
    case 1:
      return { backgroundColor: MEDAL_COLORS.gold, color: '#000' };
    case 2:
      return { backgroundColor: MEDAL_COLORS.silver, color: '#000' };
    case 3:
      return { backgroundColor: MEDAL_COLORS.bronze, color: '#fff' };
    default:
      return { backgroundColor: '#6B7280', color: '#fff' };
  }
}

// Gold medal shimmer component
function GoldShimmer({ size }: { size: number }) {
  const shimmerProgress = useSharedValue(0);

  useEffect(() => {
    shimmerProgress.value = withRepeat(
      withSequence(
        withDelay(
          2000,
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(shimmerProgress.value, [0, 0.5, 1], [0, 0.6, 0]),
      transform: [
        {
          translateX: interpolate(
            shimmerProgress.value,
            [0, 1],
            [-size * 0.5, size * 0.5]
          ),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.shimmerOverlay,
        {
          width: size * 0.3,
          height: size * 1.5,
        },
        shimmerStyle,
      ]}
    />
  );
}

// Medal badge for top 3
function MedalBadge({ rank, size }: { rank: number; size: number }) {
  const badgeSize = Math.max(22, size * 0.5);
  const iconSize = badgeSize * 0.7;

  const getMedalColor = () => {
    switch (rank) {
      case 1:
        return MEDAL_COLORS.gold;
      case 2:
        return MEDAL_COLORS.silver;
      case 3:
        return MEDAL_COLORS.bronze;
      default:
        return '#6B7280';
    }
  };

  return (
    <View
      style={[
        styles.medalBadge,
        {
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          right: -4,
          bottom: -4,
        },
      ]}
    >
      <View style={styles.medalIconContainer}>
        <Ionicons name="medal" size={iconSize} color={getMedalColor()} />
      </View>
      {rank === 1 && <GoldShimmer size={badgeSize} />}
    </View>
  );
}

// Number badge for rank 4+
function NumberBadge({
  rank,
  size,
}: {
  rank: number;
  size: number;
}) {
  const badgeSize = Math.max(18, size * 0.4);
  const badgeColors = getRankBadgeColors(rank);
  const fontSize = badgeSize * 0.55;

  return (
    <View
      style={[
        styles.rankBadge,
        {
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          backgroundColor: badgeColors.backgroundColor,
          right: -2,
          bottom: -2,
        },
      ]}
    >
      <Text style={[styles.rankText, { color: badgeColors.color, fontSize }]}>
        {rank}
      </Text>
    </View>
  );
}

export function AvatarWithRank({
  photoURL,
  nickname,
  rank,
  size = 48,
}: AvatarWithRankProps) {
  const isTopThree = rank >= 1 && rank <= 3;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Avatar photoURL={photoURL} nickname={nickname} size={size} />
      {isTopThree ? (
        <MedalBadge rank={rank} size={size} />
      ) : (
        <NumberBadge rank={rank} size={size} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  medalBadge: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
    overflow: 'hidden',
  },
  medalIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  shimmerOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    transform: [{ rotate: '20deg' }],
  },
  rankBadge: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  rankText: {
    fontWeight: 'bold',
  },
});
