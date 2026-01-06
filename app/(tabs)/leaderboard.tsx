import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LeaderboardEntry } from '@/components/LeaderboardEntry';
import { SkeletonList } from '@/components/SkeletonLoader';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { GameMode } from '@/types/scripture';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

type DifficultyTab = 'easy' | 'medium' | 'hard';

const TABS: { key: DifficultyTab; label: string }[] = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_CONTAINER_PADDING = 4;
const TAB_CONTAINER_MARGIN = 16;
const TAB_CONTAINER_WIDTH = SCREEN_WIDTH - TAB_CONTAINER_MARGIN * 2;
const TAB_WIDTH = (TAB_CONTAINER_WIDTH - TAB_CONTAINER_PADDING * 2) / 3;

// Animated Number Counter Component
function AnimatedCounter({ value, suffix = '' }: { value: number | string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    const numValue = typeof value === 'string' ? parseInt(value, 10) || 0 : value;
    animatedValue.value = 0;
    animatedValue.value = withTiming(numValue, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });

    // Animate the displayed number
    const startTime = Date.now();
    const duration = 800;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing function (ease out cubic)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(easedProgress * numValue);
      setDisplayValue(current);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }, [value]);

  return (
    <ThemedText style={styles.userStatValue}>
      {displayValue}{suffix}
    </ThemedText>
  );
}

// Bouncing Trophy for Empty State
function BouncingTrophy({ color }: { color: string }) {
  const bounceValue = useSharedValue(0);

  useEffect(() => {
    bounceValue.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: bounceValue.value }],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons
        name="trophy-outline"
        size={80}
        color={color}
        style={{ opacity: 0.4 }}
      />
    </Animated.View>
  );
}

// Animated Tab Indicator
function TabIndicator({ selectedIndex, colors }: { selectedIndex: number; colors: typeof Colors.light }) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withSpring(selectedIndex * TAB_WIDTH, {
      damping: 15,
      stiffness: 150,
      mass: 0.8,
    });
  }, [selectedIndex]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.tabIndicator,
        { backgroundColor: colors.tint },
        animatedStyle,
      ]}
    />
  );
}

export default function LeaderboardScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { difficulty } = useLocalSearchParams<{ difficulty?: GameMode }>();
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyTab>('easy');
  const { entries, isLoading, error, userRank, refresh } = useLeaderboard(selectedDifficulty);
  const { user, hasJoinedLeaderboard, localHighScores } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [listKey, setListKey] = useState(0); // Key to force re-render for animations

  // Get selected tab index
  const selectedIndex = TABS.findIndex(t => t.key === selectedDifficulty);

  // Pre-select difficulty tab based on navigation param
  useEffect(() => {
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      setSelectedDifficulty(difficulty as DifficultyTab);
    }
  }, [difficulty]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setListKey(prev => prev + 1); // Force re-animation
    setRefreshing(false);
  };

  const handleTabPress = (tab: DifficultyTab) => {
    if (tab !== selectedDifficulty) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedDifficulty(tab);
      setListKey(prev => prev + 1); // Force re-animation when switching tabs
    }
  };

  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refresh();
    setListKey(prev => prev + 1);
  };

  const renderTab = (tab: typeof TABS[0], index: number) => {
    const isSelected = selectedDifficulty === tab.key;
    return (
      <TouchableOpacity
        key={tab.key}
        style={styles.tab}
        onPress={() => handleTabPress(tab.key)}
        activeOpacity={0.7}
        accessibilityRole="tab"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${tab.label} difficulty`}
        accessibilityHint={`Switch to ${tab.label} difficulty leaderboard`}
      >
        <ThemedText
          style={[
            styles.tabText,
            isSelected && styles.tabTextSelected,
          ]}
        >
          {tab.label}
        </ThemedText>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <BouncingTrophy color={colors.text} />
      <ThemedText style={styles.emptyText}>
        No scores yet for {selectedDifficulty} mode
      </ThemedText>
      <ThemedText style={styles.emptySubtext}>
        Be the first to make it on the leaderboard!
      </ThemedText>
      <ThemedText style={[styles.emptyHint, { color: colors.tint }]}>
        Play a game to submit your score
      </ThemedText>
    </View>
  );

  const renderUserStats = () => {
    if (!hasJoinedLeaderboard) return null;

    const gradientColors = colorScheme === 'dark'
      ? [`${colors.tint}08`, `${colors.tint}03`]
      : [`${colors.tint}05`, `${colors.tint}02`];

    return (
      <View style={styles.userStatsWrapper}>
        <LinearGradient
          colors={gradientColors as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.userStatsContainer,
            { backgroundColor: colors.card },
          ]}
        >
          <View style={styles.userStatItem}>
            <ThemedText style={styles.userStatLabel}>Your Rank</ThemedText>
            {userRank ? (
              <View style={styles.rankContainer}>
                <AnimatedCounter value={userRank} suffix="" />
                <ThemedText style={[styles.rankHash, { color: colors.tint }]}>#</ThemedText>
              </View>
            ) : (
              <ThemedText style={styles.userStatValue}>-</ThemedText>
            )}
          </View>
          <View style={[styles.userStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.userStatItem}>
            <ThemedText style={styles.userStatLabel}>High Score</ThemedText>
            <View style={styles.scoreValueContainer}>
              <AnimatedCounter value={localHighScores[selectedDifficulty]} suffix="" />
              <ThemedText style={styles.scoreSuffix}>/10</ThemedText>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ThemedView style={styles.content}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Leaderboard</ThemedText>
        </View>

        {/* Tab Selector with Sliding Indicator */}
        <View
          style={[
            styles.tabContainer,
            { backgroundColor: colors.card },
          ]}
        >
          <TabIndicator selectedIndex={selectedIndex} colors={colors} />
          {TABS.map((tab, index) => renderTab(tab, index))}
        </View>

        {renderUserStats()}

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={colors.error}
            />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: `${colors.tint}20` }]}
              onPress={handleRetry}
              accessibilityRole="button"
              accessibilityLabel="Retry loading leaderboard"
            >
              <ThemedText style={[styles.retryText, { color: colors.tint }]}>
                Retry
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : isLoading && entries.length === 0 ? (
          <View style={styles.loadingContainer}>
            <SkeletonList count={6} type="leaderboard" />
          </View>
        ) : (
          <FlatList
            key={listKey}
            data={entries}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <LeaderboardEntry
                entry={item}
                rank={index + 1}
                isCurrentUser={user?.uid === item.documentId}
                index={index}
              />
            )}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.tint}
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
    marginHorizontal: TAB_CONTAINER_MARGIN,
    marginBottom: 12,
    borderRadius: 12,
    padding: TAB_CONTAINER_PADDING,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    width: TAB_WIDTH,
    height: '100%',
    borderRadius: 10,
    top: TAB_CONTAINER_PADDING,
    left: TAB_CONTAINER_PADDING,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    zIndex: 1,
    minHeight: 44, // Minimum touch target
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextSelected: {
    color: 'white',
  },
  userStatsWrapper: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  userStatsContainer: {
    flexDirection: 'row',
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
    fontSize: 24,
    fontWeight: 'bold',
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankHash: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 2,
    opacity: 0.8,
  },
  scoreValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreSuffix: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.6,
    marginLeft: 2,
  },
  userStatDivider: {
    width: 1,
    marginHorizontal: 16,
  },
  listContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    paddingTop: 8,
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
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 24,
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
    minHeight: 44, // Touch target
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
