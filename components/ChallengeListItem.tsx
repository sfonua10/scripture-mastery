import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Challenge } from '@/types/scripture';
import { capitalize } from '@/utils/styleUtils';

interface Props {
  challenge: Challenge;
  currentUserId: string;
  onPress: () => void;
  onCancel?: (challengeId: string) => void;
  index?: number;
}

// Status badge colors
const STATUS_COLORS = {
  waiting: '#F59E0B', // Amber
  in_progress: '#3B82F6', // Blue
  won: '#22C55E', // Green
  lost: '#6B7280', // Gray
  tie: '#F59E0B', // Amber
  expired: '#6B7280', // Gray
};

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getExpirationText(expiresAt: Date): { text: string; isUrgent: boolean } {
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { text: 'Expired', isUrgent: true };
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) {
    return { text: 'Expires soon', isUrgent: true };
  }
  if (diffHours < 24) {
    return { text: 'Expires today', isUrgent: true };
  }
  if (diffDays === 1) {
    return { text: 'Expires tomorrow', isUrgent: false };
  }
  return { text: `Expires in ${diffDays} days`, isUrgent: false };
}

function Avatar({ photoURL, nickname, size = 36 }: { photoURL?: string | null; nickname: string; size?: number }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Get initials from nickname
  const initials = nickname
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${colors.tint}20`,
        },
      ]}
    >
      <ThemedText style={[styles.avatarText, { color: colors.tint, fontSize: size * 0.4 }]}>
        {initials}
      </ThemedText>
    </View>
  );
}

export function ChallengeListItem({ challenge, currentUserId, onPress, onCancel, index = 0 }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const isCreator = challenge.creatorId === currentUserId;

  // Determine opponent info
  const opponentName = isCreator
    ? challenge.challengerNickname || 'Waiting for opponent'
    : challenge.creatorNickname;
  const opponentPhotoURL = isCreator
    ? challenge.challengerPhotoURL
    : challenge.creatorPhotoURL;
  const hasOpponent = isCreator ? !!challenge.challengerId : true;

  // Determine scores
  const myScore = isCreator ? challenge.creatorScore : challenge.challengerScore;
  const opponentScore = isCreator ? challenge.challengerScore : challenge.creatorScore;

  // Determine status
  const getStatus = (): { text: string; color: string; icon: string } => {
    if (challenge.status === 'expired') {
      return { text: 'Expired', color: STATUS_COLORS.expired, icon: 'time-outline' };
    }
    if (challenge.status === 'pending') {
      return { text: 'Waiting', color: STATUS_COLORS.waiting, icon: 'time-outline' };
    }
    if (challenge.status === 'accepted') {
      return { text: 'In Progress', color: STATUS_COLORS.in_progress, icon: 'play-outline' };
    }
    if (challenge.status === 'completed') {
      if (challenge.isTie) {
        return { text: 'Tie', color: STATUS_COLORS.tie, icon: 'swap-horizontal' };
      }
      if (challenge.winnerId === currentUserId) {
        return { text: 'Won', color: STATUS_COLORS.won, icon: 'trophy' };
      }
      return { text: 'Lost', color: STATUS_COLORS.lost, icon: 'close-circle-outline' };
    }
    return { text: 'Unknown', color: colors.text, icon: 'help-outline' };
  };

  const status = getStatus();

  // Expiration countdown for pending challenges
  const expirationInfo = challenge.status === 'pending' ? getExpirationText(challenge.expiresAt) : null;

  // Handle cancel
  const handleCancel = () => {
    Alert.alert(
      'Cancel Challenge',
      'Are you sure you want to cancel this challenge? This cannot be undone.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Challenge',
          style: 'destructive',
          onPress: () => onCancel?.(challenge.id),
        },
      ]
    );
  };

  // Handle copy challenge code
  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(challenge.challengeCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied!', `Challenge code ${challenge.challengeCode} copied to clipboard`);
  };

  // Animation
  const animationProgress = useSharedValue(0);

  useEffect(() => {
    animationProgress.value = withDelay(
      index * 50,
      withSpring(1, {
        damping: 15,
        stiffness: 100,
        mass: 0.8,
      })
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        animationProgress.value,
        [0, 1],
        [0, 1],
        Extrapolation.CLAMP
      ),
      transform: [
        {
          translateX: interpolate(
            animationProgress.value,
            [0, 1],
            [-20, 0],
            Extrapolation.CLAMP
          ),
        },
        {
          scale: interpolate(
            animationProgress.value,
            [0, 1],
            [0.95, 1],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderLeftColor: status.color,
            borderLeftWidth: 3,
          },
          animatedStyle,
        ]}
      >
        <View style={styles.contentRow}>
          {/* Avatar */}
          {hasOpponent ? (
            <Avatar photoURL={opponentPhotoURL} nickname={opponentName} />
          ) : (
            <View
              style={[
                styles.avatar,
                { backgroundColor: `${STATUS_COLORS.waiting}15` },
              ]}
            >
              <Ionicons name="hourglass-outline" size={16} color={STATUS_COLORS.waiting} />
            </View>
          )}

          {/* Info */}
          <View style={styles.infoContainer}>
            <View style={styles.topRow}>
              <ThemedText style={styles.opponentName} numberOfLines={1}>
                {opponentName}{challenge.status === 'pending' ? '...' : ''}
              </ThemedText>
              {/* Only show status badge for non-pending challenges */}
              {challenge.status !== 'pending' && (
                <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
                  <Ionicons name={status.icon as any} size={12} color={status.color} />
                  <ThemedText style={[styles.statusText, { color: status.color }]}>
                    {status.text}
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Line 1: Difficulty and question count */}
            <ThemedText style={styles.metaText}>
              {capitalize(challenge.difficulty)} · {challenge.questionCount} Questions
            </ThemedText>

            {/* Line 2: Time or urgent expiry */}
            <View style={styles.bottomRow}>
              {challenge.status === 'expired' ? (
                <ThemedText style={[styles.expiredText, { color: STATUS_COLORS.expired }]}>
                  No one joined
                </ThemedText>
              ) : expirationInfo?.isUrgent ? (
                <ThemedText style={[styles.expirationText, { color: '#EF4444' }]}>
                  {expirationInfo.text}
                </ThemedText>
              ) : (
                <ThemedText style={[styles.timeText, { color: colors.text }]}>
                  {getTimeAgo(challenge.createdAt)}
                </ThemedText>
              )}

              {/* Score display for completed challenges */}
              {challenge.status === 'completed' && myScore !== undefined && opponentScore !== undefined && (
                <View style={styles.scoreContainer}>
                  <ThemedText
                    style={[
                      styles.score,
                      { color: challenge.winnerId === currentUserId ? STATUS_COLORS.won : colors.text },
                    ]}
                  >
                    {myScore}
                  </ThemedText>
                  <ThemedText style={styles.scoreSeparator}>-</ThemedText>
                  <ThemedText style={[styles.score, { color: colors.text }]}>
                    {opponentScore}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Action buttons for pending challenges (creator only) */}
          {challenge.status === 'pending' && isCreator && (
            <View style={styles.actionButtons}>
              <View style={[styles.codeChip, { backgroundColor: `${colors.text}08` }]}>
                <ThemedText style={styles.codeText}>
                  {challenge.challengeCode}
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={handleCopyCode}
                style={[styles.shareButton, { backgroundColor: `${colors.tint}15` }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="share-outline" size={18} color={colors.tint} />
              </TouchableOpacity>
              {onCancel && (
                <TouchableOpacity
                  onPress={handleCancel}
                  style={styles.cancelButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '600',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  opponentName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  metaText: {
    fontSize: 13,
    opacity: 0.5,
  },
  timeText: {
    fontSize: 12,
    opacity: 0.4,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  score: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scoreSeparator: {
    fontSize: 14,
    opacity: 0.4,
    marginHorizontal: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'monospace',
    opacity: 0.5,
  },
  shareButton: {
    padding: 8,
    borderRadius: 8,
  },
  cancelButton: {
    padding: 8,
  },
  expirationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  expiredText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
