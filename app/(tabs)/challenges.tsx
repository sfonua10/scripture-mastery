import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ChallengeListItem } from '@/components/ChallengeListItem';
import { SkeletonList } from '@/components/SkeletonLoader';
import { useMyChallenges } from '@/hooks/useMyChallenges';
import { useChallenge } from '@/hooks/useChallenge';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Challenge } from '@/types/scripture';

type TabType = 'active' | 'completed';

const TABS: { key: TabType; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_CONTAINER_PADDING = 4;
const TAB_CONTAINER_MARGIN = 16;
const TAB_CONTAINER_WIDTH = SCREEN_WIDTH - TAB_CONTAINER_MARGIN * 2;
const TAB_WIDTH = (TAB_CONTAINER_WIDTH - TAB_CONTAINER_PADDING * 2) / 2;

// Bouncing icon for empty state
function BouncingIcon({ name, color }: { name: string; color: string }) {
  const bounceValue = useSharedValue(0);

  React.useEffect(() => {
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
      <Ionicons name={name as any} size={80} color={color} style={{ opacity: 0.4 }} />
    </Animated.View>
  );
}

// Animated tab indicator
function TabIndicator({ selectedIndex, colors }: { selectedIndex: number; colors: typeof Colors.light }) {
  const translateX = useSharedValue(0);

  React.useEffect(() => {
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
      style={[styles.tabIndicator, { backgroundColor: colors.tint }, animatedStyle]}
    />
  );
}

export default function ChallengesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const { activeChallenges, completedChallenges, isLoading, error, refresh } = useMyChallenges();
  const { cancelChallenge } = useChallenge();
  const [selectedTab, setSelectedTab] = useState<TabType>('active');
  const [refreshing, setRefreshing] = useState(false);
  const [listKey, setListKey] = useState(0);

  const selectedIndex = TABS.findIndex((t) => t.key === selectedTab);
  const challenges = selectedTab === 'active' ? activeChallenges : completedChallenges;

  const handleRefresh = async () => {
    setRefreshing(true);
    refresh();
    setListKey((prev) => prev + 1);
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleTabPress = (tab: TabType) => {
    if (tab !== selectedTab) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedTab(tab);
      setListKey((prev) => prev + 1);
    }
  };

  const handleChallengePress = (challenge: Challenge) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/challenge/result',
      params: { challengeId: challenge.id },
    });
  };

  const handleCreateChallenge = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/challenge/create');
  };

  const handleCancelChallenge = async (challengeId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await cancelChallenge(challengeId);
  };

  const renderTab = (tab: (typeof TABS)[0]) => {
    const isSelected = selectedTab === tab.key;
    const count = tab.key === 'active' ? activeChallenges.length : completedChallenges.length;

    return (
      <TouchableOpacity
        key={tab.key}
        style={styles.tab}
        onPress={() => handleTabPress(tab.key)}
        activeOpacity={0.7}
        accessibilityRole="tab"
        accessibilityState={{ selected: isSelected }}
      >
        <ThemedText style={[styles.tabText, isSelected && styles.tabTextSelected]}>
          {tab.label}
          {count > 0 && (
            <ThemedText style={[styles.tabCount, isSelected && styles.tabCountSelected]}>
              {' '}({count})
            </ThemedText>
          )}
        </ThemedText>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    const isActiveTab = selectedTab === 'active';

    return (
      <View style={styles.emptyContainer}>
        <BouncingIcon
          name={isActiveTab ? 'flash-outline' : 'checkmark-done-outline'}
          color={colors.text}
        />
        <ThemedText style={styles.emptyText}>
          {isActiveTab ? 'No active challenges' : 'No completed challenges'}
        </ThemedText>
        <ThemedText style={styles.emptySubtext}>
          {isActiveTab
            ? 'Create a challenge and invite a friend to compete!'
            : 'Complete some challenges to see your results here'}
        </ThemedText>
        {isActiveTab && (
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.tint }]}
            onPress={handleCreateChallenge}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="white" />
            <ThemedText style={styles.createButtonText}>Create Challenge</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderItem = useCallback(
    ({ item, index }: { item: Challenge; index: number }) => (
      <ChallengeListItem
        challenge={item}
        currentUserId={user?.uid || ''}
        onPress={() => handleChallengePress(item)}
        onCancel={item.status === 'pending' ? handleCancelChallenge : undefined}
        index={index}
      />
    ),
    [user?.uid, handleCancelChallenge]
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ThemedView style={styles.content}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>My Challenges</ThemedText>
          </View>
          <View style={styles.emptyContainer}>
            <BouncingIcon name="person-outline" color={colors.text} />
            <ThemedText style={styles.emptyText}>Sign in to view challenges</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Create an account to challenge your friends
            </ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ThemedView style={styles.content}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>My Challenges</ThemedText>
        </View>

        {/* Tab Selector */}
        <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
          <TabIndicator selectedIndex={selectedIndex} colors={colors} />
          {TABS.map(renderTab)}
        </View>

        {/* Error State */}
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: `${colors.tint}20` }]}
              onPress={handleRefresh}
            >
              <ThemedText style={[styles.retryText, { color: colors.tint }]}>Retry</ThemedText>
            </TouchableOpacity>
          </View>
        ) : isLoading && challenges.length === 0 ? (
          <View style={styles.loadingContainer}>
            <SkeletonList count={4} type="leaderboard" />
          </View>
        ) : (
          <FlatList
            key={listKey}
            data={challenges}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
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
    minHeight: 44,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextSelected: {
    color: 'white',
  },
  tabCount: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.7,
  },
  tabCountSelected: {
    color: 'white',
    opacity: 0.9,
  },
  listContent: {
    paddingBottom: 100,
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
    paddingHorizontal: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 24,
    gap: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
    minHeight: 44,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
