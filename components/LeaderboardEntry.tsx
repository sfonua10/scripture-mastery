import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { AvatarWithRank } from '@/components/AvatarWithRank';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { LeaderboardEntry as LeaderboardEntryType } from '@/types/scripture';

interface Props {
  entry: LeaderboardEntryType;
  rank: number;
  isCurrentUser: boolean;
}

export function LeaderboardEntry({ entry, rank, isCurrentUser }: Props) {
  const colorScheme = useColorScheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isCurrentUser
            ? colorScheme === 'dark'
              ? 'rgba(10, 158, 164, 0.2)'
              : 'rgba(10, 158, 164, 0.1)'
            : Colors[colorScheme ?? 'light'].card,
          borderColor: isCurrentUser
            ? Colors[colorScheme ?? 'light'].tint
            : Colors[colorScheme ?? 'light'].border,
        },
      ]}
    >
      <AvatarWithRank
        photoURL={entry.photoURL}
        nickname={entry.nickname}
        rank={rank}
        size={44}
      />

      <View style={styles.infoContainer}>
        <ThemedText style={styles.nickname} numberOfLines={1}>
          {entry.nickname}
          {isCurrentUser && (
            <ThemedText style={styles.youLabel}> (You)</ThemedText>
          )}
        </ThemedText>
      </View>

      <View style={styles.scoreContainer}>
        <ThemedText style={styles.score}>{entry.score}/10</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
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
    fontWeight: '400',
    opacity: 0.7,
  },
  scoreContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  score: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
