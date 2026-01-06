import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DailyChallengeStats,
  DailyChallengeResult,
  DailyChallengeBadge,
  Scripture,
} from '@/types/scripture';
import { getDailyScripture, getTodayDateString } from '@/utils/scriptureUtils';
import { BADGE_DEFINITIONS, BadgeId } from '@/constants/Badges';

const DAILY_CHALLENGE_STATS_KEY = '@scripture_mastery_daily_stats';
const DAILY_CHALLENGE_HISTORY_KEY = '@scripture_mastery_daily_history';

const defaultStats: DailyChallengeStats = {
  currentStreak: 0,
  longestStreak: 0,
  totalCompleted: 0,
  totalCorrect: 0,
  lastCompletedDate: null,
  badges: [],
};

function isYesterday(dateString: string | null): boolean {
  if (!dateString) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateString === yesterday.toISOString().split('T')[0];
}

function isToday(dateString: string | null): boolean {
  if (!dateString) return false;
  return dateString === getTodayDateString();
}

export function useDailyChallenge() {
  const [stats, setStats] = useState<DailyChallengeStats>(defaultStats);
  const [todayCompleted, setTodayCompleted] = useState(false);
  const [todayResult, setTodayResult] = useState<DailyChallengeResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const dailyScripture: Scripture = getDailyScripture();
  const todayDateString = getTodayDateString();

  const getHistory = useCallback(async (): Promise<Record<string, DailyChallengeResult>> => {
    try {
      const stored = await AsyncStorage.getItem(DAILY_CHALLENGE_HISTORY_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }, []);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedStats = await AsyncStorage.getItem(DAILY_CHALLENGE_STATS_KEY);
      const storedHistory = await AsyncStorage.getItem(DAILY_CHALLENGE_HISTORY_KEY);

      let loadedStats = defaultStats;
      if (storedStats) {
        loadedStats = JSON.parse(storedStats);

        // Check if streak should be reset (missed a day)
        if (loadedStats.lastCompletedDate &&
            !isToday(loadedStats.lastCompletedDate) &&
            !isYesterday(loadedStats.lastCompletedDate)) {
          loadedStats = {
            ...loadedStats,
            currentStreak: 0,
          };
          await AsyncStorage.setItem(DAILY_CHALLENGE_STATS_KEY, JSON.stringify(loadedStats));
        }

        setStats(loadedStats);
      }

      if (storedHistory) {
        const history: Record<string, DailyChallengeResult> = JSON.parse(storedHistory);
        const todayEntry = history[todayDateString];
        if (todayEntry) {
          setTodayCompleted(true);
          setTodayResult(todayEntry);
        }
      }
    } catch (error) {
      console.error('Error loading daily challenge stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [todayDateString]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const checkForNewBadges = useCallback(
    (newStats: DailyChallengeStats, wasCorrect: boolean): DailyChallengeBadge[] => {
      const earned: DailyChallengeBadge[] = [];
      const existingIds = new Set(stats.badges.map((b) => b.id));

      // First daily
      if (newStats.totalCompleted === 1 && !existingIds.has('first_daily')) {
        earned.push({ ...BADGE_DEFINITIONS.first_daily, earnedAt: new Date() });
      }

      // Streak badges
      const streakBadges: [number, BadgeId][] = [
        [3, 'streak_3'],
        [7, 'streak_7'],
        [14, 'streak_14'],
        [30, 'streak_30'],
      ];

      for (const [threshold, badgeId] of streakBadges) {
        if (newStats.currentStreak >= threshold && !existingIds.has(badgeId)) {
          earned.push({ ...BADGE_DEFINITIONS[badgeId], earnedAt: new Date() });
        }
      }

      // Daily master (50 correct)
      if (newStats.totalCorrect >= 50 && !existingIds.has('daily_master')) {
        earned.push({ ...BADGE_DEFINITIONS.daily_master, earnedAt: new Date() });
      }

      return earned;
    },
    [stats.badges]
  );

  const completeDailyChallenge = useCallback(
    async (correct: boolean): Promise<DailyChallengeBadge[]> => {
      if (todayCompleted) {
        return [];
      }

      const newResult: DailyChallengeResult = {
        date: todayDateString,
        completed: true,
        correct,
        timestamp: new Date(),
      };

      // Calculate new streak
      const isConsecutiveDay = isYesterday(stats.lastCompletedDate);
      const newStreak = isConsecutiveDay ? stats.currentStreak + 1 : 1;

      // Update stats
      const newStats: DailyChallengeStats = {
        ...stats,
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, stats.longestStreak),
        totalCompleted: stats.totalCompleted + 1,
        totalCorrect: correct ? stats.totalCorrect + 1 : stats.totalCorrect,
        lastCompletedDate: todayDateString,
        badges: stats.badges,
      };

      // Check for new badges
      const newBadges = checkForNewBadges(newStats, correct);
      newStats.badges = [...stats.badges, ...newBadges];

      try {
        // Get current history and update atomically
        const history = await getHistory();
        history[todayDateString] = newResult;

        // Use multiSet for atomic writes - both succeed or both fail
        await AsyncStorage.multiSet([
          [DAILY_CHALLENGE_STATS_KEY, JSON.stringify(newStats)],
          [DAILY_CHALLENGE_HISTORY_KEY, JSON.stringify(history)],
        ]);

        // Only update state after successful persistence
        setStats(newStats);
        setTodayCompleted(true);
        setTodayResult(newResult);

        return newBadges;
      } catch (error) {
        console.error('Error saving daily challenge:', error);
        return []; // Return empty array on error
      }
    },
    [stats, todayDateString, todayCompleted, checkForNewBadges, getHistory]
  );

  return {
    dailyScripture,
    stats,
    todayCompleted,
    todayResult,
    isLoading,
    completeDailyChallenge,
    refreshStats: loadStats,
  };
}
