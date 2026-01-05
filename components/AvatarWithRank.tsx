import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Avatar } from './Avatar';

interface AvatarWithRankProps {
  photoURL?: string | null;
  nickname: string;
  rank: number;
  size?: number;
}

function getRankBadgeColors(rank: number) {
  switch (rank) {
    case 1:
      return { backgroundColor: '#FFD700', color: '#000' }; // Gold
    case 2:
      return { backgroundColor: '#C0C0C0', color: '#000' }; // Silver
    case 3:
      return { backgroundColor: '#CD7F32', color: '#fff' }; // Bronze
    default:
      return { backgroundColor: '#6B7280', color: '#fff' }; // Gray
  }
}

export function AvatarWithRank({
  photoURL,
  nickname,
  rank,
  size = 48,
}: AvatarWithRankProps) {
  const badgeSize = Math.max(18, size * 0.4);
  const badgeColors = getRankBadgeColors(rank);
  const fontSize = badgeSize * 0.55;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Avatar photoURL={photoURL} nickname={nickname} size={size} />

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
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
