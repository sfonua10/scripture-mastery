import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LeaderboardEntry } from '@/components/LeaderboardEntry';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { GameMode } from '@/types/scripture';
import { Ionicons } from '@expo/vector-icons';

type DifficultyTab = 'easy' | 'medium' | 'hard';

export default function LeaderboardScreen() {
  const colorScheme = useColorScheme();
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyTab>('easy');
  const { entries, isLoading, error, userRank, refresh } = useLeaderboard(selectedDifficulty);
  const { user, hasJoinedLeaderboard, localHighScores } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const renderTab = (difficulty: DifficultyTab, label: string) => {
    const isSelected = selectedDifficulty === difficulty;
    return (
      <TouchableOpacity
        key={difficulty}
        style={[
          styles.tab,
          isSelected && {
            backgroundColor: Colors[colorScheme ?? 'light'].tint,
          },
        ]}
        onPress={() => setSelectedDifficulty(difficulty)}
      >
        <ThemedText
          style={[
            styles.tabText,
            isSelected && styles.tabTextSelected,
          ]}
        >
          {label}
        </ThemedText>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="trophy-outline"
        size={64}
        color={Colors[colorScheme ?? 'light'].text}
        style={{ opacity: 0.3 }}
      />
      <ThemedText style={styles.emptyText}>
        No scores yet for {selectedDifficulty} mode
      </ThemedText>
      <ThemedText style={styles.emptySubtext}>
        Be the first to make it on the leaderboard!
      </ThemedText>
    </View>
  );

  const renderUserStats = () => {
    if (!hasJoinedLeaderboard) return null;

    return (
      <View
        style={[
          styles.userStatsContainer,
          { backgroundColor: Colors[colorScheme ?? 'light'].card },
        ]}
      >
        <View style={styles.userStatItem}>
          <ThemedText style={styles.userStatLabel}>Your Rank</ThemedText>
          <ThemedText style={styles.userStatValue}>
            {userRank ? `#${userRank}` : '-'}
          </ThemedText>
        </View>
        <View style={styles.userStatDivider} />
        <View style={styles.userStatItem}>
          <ThemedText style={styles.userStatLabel}>High Score</ThemedText>
          <ThemedText style={styles.userStatValue}>
            {localHighScores[selectedDifficulty]}/10
          </ThemedText>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ThemedView style={styles.content}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Leaderboard</ThemedText>
        </View>

        <View
          style={[
            styles.tabContainer,
            { backgroundColor: Colors[colorScheme ?? 'light'].card },
          ]}
        >
          {renderTab('easy', 'Easy')}
          {renderTab('medium', 'Medium')}
          {renderTab('hard', 'Hard')}
        </View>

        {renderUserStats()}

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={Colors[colorScheme ?? 'light'].error}
            />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <TouchableOpacity style={styles.retryButton} onPress={refresh}>
              <ThemedText style={styles.retryText}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        ) : isLoading && entries.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={Colors[colorScheme ?? 'light'].tint}
            />
          </View>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <LeaderboardEntry
                entry={item}
                rank={index + 1}
                isCurrentUser={user?.uid === item.documentId}
              />
            )}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors[colorScheme ?? 'light'].tint}
              />
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: {
    paddingTop: 8,
    fontSize: 28,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextSelected: {
    color: '#fff',
  },
  userStatsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  userStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  userStatLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 4,
  },
  userStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  userStatDivider: {
    width: 1,
    backgroundColor: 'rgba(128,128,128,0.3)',
    marginHorizontal: 16,
  },
  listContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 158, 164, 0.2)',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
