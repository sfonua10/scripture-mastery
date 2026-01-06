/**
 * Component Exports
 *
 * Centralized exports for all reusable components.
 * Import from '@/components' for cleaner imports.
 *
 * @example
 * import { GradientButton, AnimatedPressable, SkeletonLoader } from '@/components';
 */

// Core themed components
export { ThemedText } from './ThemedText';
export { ThemedView } from './ThemedView';

// Animation components
export { GradientButton, type GradientButtonRef } from './GradientButton';
export {
  AnimatedPressable,
  AnimatedCard,
  AnimatedRow,
  AnimatedIconButton,
} from './AnimatedPressable';
export {
  AnimatedListItem,
  AnimatedListItemEntering,
  useListAnimation,
} from './AnimatedListItem';

// Loading components
export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonLeaderboardEntry,
  SkeletonCard,
  SkeletonList,
} from './SkeletonLoader';

// Tab components
export { HapticTab, AnimatedTabIcon, TabBadge } from './HapticTab';

// Modals
export { TutorialModal } from './TutorialModal';
export { NicknameModal } from './NicknameModal';
export { BadgeEarnedModal } from './BadgeEarnedModal';

// Feature components
export { DailyChallengeCard } from './DailyChallengeCard';
export { LeaderboardEntry } from './LeaderboardEntry';
export { LeaderboardPrompt } from './LeaderboardPrompt';
export { Avatar } from './Avatar';
export { AvatarWithRank } from './AvatarWithRank';
