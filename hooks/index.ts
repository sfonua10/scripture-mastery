/**
 * Hook Exports
 *
 * Centralized exports for all custom hooks.
 * Import from '@/hooks' for cleaner imports.
 *
 * @example
 * import { useColorScheme, useScaleAnimation, useFadeIn } from '@/hooks';
 */

// Theme hooks
export { useColorScheme } from './useColorScheme';
export { useThemeColor } from './useThemeColor';

// Animation hooks
export {
  useScaleAnimation,
  useFadeIn,
  useShake,
  useIconPulse,
  useStaggeredList,
  useSuccessAnimation,
  useErrorAnimation,
  useShimmer,
  combineAnimatedStyles,
  SPRING_CONFIG,
  TIMING_CONFIG,
} from './useAnimations';

// Feature hooks
export { useTutorial } from './useTutorial';
export { useLeaderboard } from './useLeaderboard';
export { useDailyChallenge } from './useDailyChallenge';
export { useChallenge } from './useChallenge';
export { useMyChallenges } from './useMyChallenges';
export { useSound } from './useSound';
export { usePushNotifications } from './usePushNotifications';
export { useDailyChallengeNotifications } from './useDailyChallengeNotifications';
