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
        return ['#b45309', '#92400e'] as const;
      case 'medium':
        return ['#c2410c', '#9a3412'] as const;
      case 'hard':
        return ['#dc2626', '#b91c1c'] as const;
    }
  } else {
    switch (mode) {
      case 'easy':
        return ['#fcd34d', '#f59e0b'] as const;
      case 'medium':
        return ['#f59e0b', '#ea580c'] as const;
      case 'hard':
        return ['#ea580c', '#dc2626'] as const;
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
