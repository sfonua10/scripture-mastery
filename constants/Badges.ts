import { DailyChallengeBadge } from '@/types/scripture';

export type BadgeId =
  | 'first_daily'
  | 'streak_3'
  | 'streak_7'
  | 'streak_14'
  | 'streak_30'
  | 'daily_master';

export const BADGE_DEFINITIONS: Record<BadgeId, Omit<DailyChallengeBadge, 'earnedAt'>> = {
  first_daily: {
    id: 'first_daily',
    name: 'First Steps',
    description: 'Complete your first daily challenge',
    icon: 'star-outline',
  },
  streak_3: {
    id: 'streak_3',
    name: 'Getting Started',
    description: '3-day streak',
    icon: 'flame-outline',
  },
  streak_7: {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7-day streak',
    icon: 'flame',
  },
  streak_14: {
    id: 'streak_14',
    name: 'Devoted',
    description: '14-day streak',
    icon: 'medal-outline',
  },
  streak_30: {
    id: 'streak_30',
    name: 'Scripture Scholar',
    description: '30-day streak',
    icon: 'medal',
  },
  daily_master: {
    id: 'daily_master',
    name: 'Daily Master',
    description: '50 correct daily answers',
    icon: 'trophy',
  },
};
