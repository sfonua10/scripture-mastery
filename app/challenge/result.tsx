import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Share,
  Animated,
  Image,
  Text,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import ConfettiCannon from 'react-native-confetti-cannon';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useChallenge } from '@/hooks/useChallenge';
import { useAuth } from '@/contexts/AuthContext';
import { capitalize } from '@/utils/styleUtils';

export default function ChallengeResultScreen() {
  const colorScheme = useColorScheme();
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();
  const { user } = useAuth();
  const { challenge, isLoading, getChallengeShareText, getChallengeDeepLink } = useChallenge(challengeId);

  const [showConfetti, setShowConfetti] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shareCardRef = useRef<View>(null);

  const colors = Colors[colorScheme ?? 'light'];

  const isCreator = challenge?.creatorId === user?.uid;
  const userScore = isCreator ? challenge?.creatorScore : challenge?.challengerScore;
  const opponentScore = isCreator ? challenge?.challengerScore : challenge?.creatorScore;
  const opponentName = isCreator
    ? challenge?.challengerNickname
    : challenge?.creatorNickname;
  const isWinner = challenge?.winnerId === user?.uid;
  const isTie = challenge?.isTie;
  // Wait for winner data to be set before considering the challenge complete
  // This prevents the race condition where status is 'completed' but winnerId/isTie aren't set yet
  const isComplete = challenge?.status === 'completed' &&
    (challenge?.winnerId !== undefined || challenge?.isTie === true);
  const waitingForOpponent = !isComplete && userScore !== undefined;

  useEffect(() => {
    // Animate in
    const animation = Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    // Show confetti if winner
    if (isComplete && isWinner && !isTie) {
      setShowConfetti(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    return () => {
      animation.stop();
    };
  }, [isComplete, isWinner, isTie]);

  const handleShare = async () => {
    if (!challenge) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // For challenge invitations (waiting for opponent), use image sharing
      if (waitingForOpponent && shareCardRef.current) {
        const textFallback = getChallengeShareText(challenge);
        try {
          // Ensure the view is fully rendered before capture
          await new Promise<void>(resolve => {
            InteractionManager.runAfterInteractions(() => resolve());
          });

          const uri = await captureRef(shareCardRef, {
            format: 'png',
            quality: 1,
          });
          await Sharing.shareAsync(uri, {
            dialogTitle: textFallback,
          });
        } catch (captureError) {
          // Fallback to text share if image capture fails
          await Share.share({ message: textFallback });
        }
      } else if (!waitingForOpponent) {
        // For completed challenges, use text sharing with results
        let message = '';
        if (isTie) {
          message = `It's a tie! We both scored ${userScore}/${challenge.questionCount} in Scripture Mastery Pro!`;
        } else if (isWinner) {
          message = `I won! I scored ${userScore}/${challenge.questionCount} vs ${opponentScore}/${challenge.questionCount} in Scripture Mastery Pro!`;
        } else {
          message = `Good game! ${opponentName} beat me ${opponentScore}/${challenge.questionCount} to ${userScore}/${challenge.questionCount} in Scripture Mastery Pro!`;
        }
        await Share.share({ message });
      }
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const handleRematch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/challenge/create');
  };

  const handleHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)');
  };

  const getResultColor = () => {
    if (!isComplete) return colors.tint;
    if (isTie) return '#FFC107';
    return isWinner ? '#4CAF50' : colors.textSecondary;
  };

  const getResultIcon = () => {
    if (!isComplete) return 'hourglass-outline';
    if (isTie) return 'swap-horizontal';
    return isWinner ? 'trophy' : 'ribbon-outline';
  };

  const getResultText = () => {
    if (!isComplete) return 'Waiting for opponent...';
    if (isTie) return "It's a Tie!";
    return isWinner ? 'You Won!' : 'Good Try!';
  };

  if (isLoading || !challenge) {
    return (
      <>
        <Stack.Screen options={{ title: 'Challenge Result', headerBackTitle: 'Back' }} />
        <SafeAreaView style={styles.container}>
          <ThemedView style={styles.loadingContainer}>
            <ThemedText>Loading results...</ThemedText>
          </ThemedView>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Challenge Result',
          headerBackTitle: 'Back',
          headerLeft: () => null, // Prevent back navigation
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Hidden shareable card for capturing */}
        {waitingForOpponent && challenge && (
          <View style={styles.shareCardWrapper}>
            <View ref={shareCardRef} style={styles.shareCard} collapsable={false}>
              {/* Background image with gradient overlay */}
              <View style={styles.shareImageContainer}>
                <Image
                  source={require('@/assets/images/scriptorian.jpeg')}
                  style={styles.shareCardBanner}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.shareImageOverlay}
                />
              </View>

              {/* Floating swords icon */}
              <View style={styles.shareChallengeIcon}>
                <Ionicons name="flash" size={36} color="#fff" />
              </View>

              {/* Content section */}
              <View style={styles.shareCardContent}>
                <Text style={styles.shareCardHeadline}>CHALLENGE ME!</Text>

                {/* Challenge code container */}
                <View style={styles.shareCodeContainer}>
                  <Text style={styles.shareCodeLabel}>Enter code:</Text>
                  <Text style={styles.shareCodeText}>{challenge.challengeCode}</Text>
                </View>

                {/* Challenge details */}
                <View style={styles.shareDetailsRow}>
                  <View style={styles.shareDetailBadge}>
                    <Text style={styles.shareDetailText}>
                      {capitalize(challenge.difficulty)}
                    </Text>
                  </View>
                  <Text style={styles.shareDetailDot}>•</Text>
                  <View style={styles.shareDetailBadge}>
                    <Text style={styles.shareDetailText}>{challenge.questionCount} Questions</Text>
                  </View>
                </View>

                {/* Deep link */}
                <Text style={styles.shareDeepLink}>
                  {getChallengeDeepLink(challenge.challengeCode)}
                </Text>

                {/* Bottom bar with app branding */}
                <View style={styles.shareBottomBar}>
                  <Image
                    source={require('@/assets/icons/ios-light.png')}
                    style={styles.shareAppIcon}
                  />
                  <Text style={styles.shareAppName}>Scripture Mastery Pro</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <ThemedView style={styles.content}>
          {showConfetti && (
            <ConfettiCannon
              count={200}
              origin={{ x: -10, y: 0 }}
              autoStart={true}
              fadeOut={true}
            />
          )}

          <Animated.View
            style={[
              styles.resultContainer,
              {
                transform: [{ scale: scaleAnim }],
                opacity: fadeAnim,
              },
            ]}
          >
            <View
              style={[
                styles.resultIcon,
                { backgroundColor: getResultColor() + '20' },
              ]}
            >
              <Ionicons
                name={getResultIcon() as any}
                size={52}
                color={getResultColor()}
              />
            </View>

            <ThemedText style={[styles.resultText, { color: getResultColor() }]}>
              {getResultText()}
            </ThemedText>

            {/* Score comparison */}
            <View style={[styles.scoreCard, { backgroundColor: colors.tint + '10' }]}>
              {/* Your score */}
              <View style={styles.scoreColumn}>
                <ThemedText style={styles.playerLabel}>You</ThemedText>
                <ThemedText
                  style={[
                    styles.scoreValue,
                    isComplete && isWinner && !isTie && styles.winnerScore,
                  ]}
                >
                  {typeof userScore === 'number' ? userScore : '-'}/{challenge.questionCount}
                </ThemedText>
              </View>

              {/* VS */}
              <View style={styles.vsContainer}>
                <ThemedText style={[styles.vsText, { color: colors.textSecondary }]}>
                  vs
                </ThemedText>
              </View>

              {/* Opponent score */}
              <View style={styles.scoreColumn}>
                <ThemedText style={styles.playerLabel} numberOfLines={1}>
                  {opponentName || 'Opponent'}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.scoreValue,
                    isComplete && !isWinner && !isTie && styles.winnerScore,
                  ]}
                >
                  {isComplete ? (typeof opponentScore === 'number' ? opponentScore : '-') : '?'}/{challenge.questionCount}
                </ThemedText>
              </View>
            </View>

            {/* Challenge info */}
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Ionicons name="speedometer-outline" size={18} color={colors.text + '80'} />
                <ThemedText style={styles.infoText}>
                  {capitalize(challenge.difficulty)} Difficulty
                </ThemedText>
              </View>
            </View>

            {waitingForOpponent && (
              <View style={[styles.waitingBanner, { backgroundColor: colors.tint + '20' }]}>
                <Ionicons name="time-outline" size={20} color={colors.tint} />
                <ThemedText style={[styles.waitingText, { color: colors.tint }]}>
                  Share the challenge code so your friend can play!
                </ThemedText>
              </View>
            )}
          </Animated.View>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.buttonContainer}
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel={waitingForOpponent ? 'Share challenge with friends' : 'Share your result'}
            >
              <LinearGradient
                colors={[colors.tint, colors.tint + 'dd']}
                style={styles.actionButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="share-outline" size={24} color="white" />
                <ThemedText style={styles.actionButtonText}>
                  {waitingForOpponent ? 'Share Challenge' : 'Share Result'}
                </ThemedText>
              </LinearGradient>
            </TouchableOpacity>

            {isComplete && (
              <TouchableOpacity
                style={styles.buttonContainer}
                onPress={handleRematch}
                accessibilityRole="button"
                accessibilityLabel="Create a new challenge"
              >
                <LinearGradient
                  colors={['#4CAF50', '#388E3C']}
                  style={styles.actionButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="refresh" size={24} color="white" />
                  <ThemedText style={styles.actionButtonText}>New Challenge</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.homeButton}
              onPress={handleHome}
              accessibilityRole="button"
              accessibilityLabel="Return to home screen"
            >
              <ThemedText style={[styles.homeButtonText, { color: colors.tint }]}>
                Back to Home
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  resultIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resultText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  scoreColumn: {
    flex: 1,
    alignItems: 'center',
  },
  playerLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
    maxWidth: 100,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 8,
  },
  winnerScore: {
    color: '#4CAF50',
  },
  vsContainer: {
    paddingHorizontal: 16,
  },
  vsText: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.6,
  },
  infoContainer: {
    alignItems: 'center',
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    opacity: 0.7,
  },
  waitingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  waitingText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    gap: 12,
  },
  buttonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 18,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  homeButton: {
    alignItems: 'center',
    padding: 16,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Share card styles (hidden, off-screen for capture)
  shareCardWrapper: {
    position: 'absolute',
    left: -9999,
    top: 0,
  },
  shareCard: {
    width: 350,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  shareImageContainer: {
    width: '100%',
    height: 140,
  },
  shareCardBanner: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  shareImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  shareChallengeIcon: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#0a7ea4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#1a1a2e',
  },
  shareCardContent: {
    paddingTop: 45,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  shareCardHeadline: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
    marginBottom: 16,
  },
  shareCodeContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  shareCodeLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  shareCodeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 6,
  },
  shareDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  shareDetailBadge: {
    backgroundColor: 'rgba(10, 126, 164, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  shareDetailText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  shareDetailDot: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  shareDeepLink: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 16,
  },
  shareBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareAppIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  shareAppName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
