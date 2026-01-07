import { GameMode } from '@/types/scripture';

/**
 * Capitalize the first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get gradient colors for challenge screens based on difficulty
 * Used in create.tsx, join.tsx, and other challenge-related screens
 */
export function getChallengeGradientColors(
  mode: GameMode,
  colorScheme: 'light' | 'dark' | null
): readonly [string, string] {
  if (colorScheme === 'dark') {
    switch (mode) {
      case 'easy':
        return ['#1a5d7e', '#0a3d5e'] as const;
      case 'medium':
        return ['#1a6e7e', '#0a4e5e'] as const;
      case 'hard':
        return ['#1a7e7e', '#0a5e5e'] as const;
    }
  } else {
    switch (mode) {
      case 'easy':
        return ['#0a7ea4', '#085d7a'] as const;
      case 'medium':
        return ['#0a8ea4', '#086d7a'] as const;
      case 'hard':
        return ['#0a9ea4', '#087d7a'] as const;
    }
  }
}

/**
 * Get score color based on percentage (0-1 ratio)
 * Returns both background and text colors for score displays
 */
export function getScoreColorByRatio(ratio: number): {
  bg: string;
  text: string;
} {
  if (ratio >= 0.8) return { bg: '#e6f7e6', text: '#4CAF50' };
  if (ratio >= 0.5) return { bg: '#fff8e6', text: '#FF9800' };
  return { bg: '#ffebee', text: '#F44336' };
}
