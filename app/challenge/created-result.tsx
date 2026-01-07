import { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Share,
  Animated,
  ScrollView,
  Image,
  Text,
  InteractionManager,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import ConfettiCannon from 'react-native-confetti-cannon';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useChallenge } from '@/hooks/useChallenge';
import { capitalize, getScoreColorByRatio } from '@/utils/styleUtils';

export default function CreatedResultScreen() {
  const colorScheme = useColorScheme();
  const { challengeId, score, questionCount } = useLocalSearchParams<{
    challengeId: string;
    score: string;
    questionCount: string;
  }>();
  const { challenge, isLoading, getChallengeDeepLink } = useChallenge(challengeId);

  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shareCardRef = useRef<View>(null);

  const colors = Colors[colorScheme ?? 'light'];

  const scoreNum = parseInt(score || '0', 10);
  const totalNum = parseInt(questionCount || '10', 10);
  const isHighScore = scoreNum >= Math.ceil(totalNum * 0.8); // 80% or higher

  // Animation effect with proper cleanup
  useEffect(() => {
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

    if (isHighScore) {
      setShowConfetti(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    return () => {
      animation.stop();
    };
  }, [isHighScore]);

  // Cleanup copy timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Helper to check if error is user cancellation (not a real error)
  const isUserCancellation = (error: unknown): boolean => {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('cancel') ||
             message.includes('dismiss') ||
             message.includes('user');
    }
    return false;
  };

  const handleCopyCode = useCallback(async () => {
    if (!challenge) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Clear any existing timeout
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }

    await Clipboard.setStringAsync(challenge.challengeCode);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }, [challenge]);

  const handleShare = useCallback(async () => {
    if (!challenge) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const shareText =
      `I scored ${scoreNum}/${totalNum} on this Scripture Mastery challenge. Think you can beat me?\n\n` +
      `Difficulty: ${capitalize(challenge.difficulty)}\n` +
      `Use code: ${challenge.challengeCode}\n\n` +
      `Or tap this link:\n${getChallengeDeepLink(challenge.challengeCode)}`;

    try {
      if (shareCardRef.current) {
        // Ensure the view is fully rendered before capture
        await new Promise<void>(resolve => {
          InteractionManager.runAfterInteractions(() => resolve());
        });

        const uri = await captureRef(shareCardRef, {
          format: 'png',
          quality: 1,
        });

        if (Platform.OS === 'ios') {
          // iOS: Share.share supports both message and url (local file path)
          // This shares the image AND the text with deep link
          await Share.share({
            message: shareText,
            url: uri,
          });
        } else {
          // Android: expo-sharing handles local files better
          // The image is shared, text is in dialogTitle (shows in share dialog)
          await Sharing.shareAsync(uri, {
            dialogTitle: shareText,
          });
        }
      } else {
        // Fallback to text share
        await Share.share({ message: shareText });
      }
    } catch (err) {
      // User cancellation is normal - not an error
      if (isUserCancellation(err)) return;

      console.error('Share image capture failed:', err);

      // Fallback to text share if image capture fails
      try {
        await Share.share({ message: shareText });
      } catch (fallbackErr) {
        if (isUserCancellation(fallbackErr)) return;

        console.error('Share fallback failed:', fallbackErr);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Share Failed',
          'Unable to share the challenge. Please try copying the code instead.'
        );
      }
    }
  }, [challenge, scoreNum, totalNum, getChallengeDeepLink]);

  const handleCreateAnother = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/challenge/create');
  }, []);

  const handleHome = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)');
  }, []);

  // Use shared utility for consistent score colors
  const scoreColor = getScoreColorByRatio(scoreNum / totalNum).text;

  if (isLoading || !challenge) {
    return (
      <>
        <Stack.Screen options={{ title: 'Challenge Ready', headerBackTitle: 'Back' }} />
        <SafeAreaView style={styles.container}>
          <ThemedView style={styles.loadingContainer}>
            <ThemedText>Loading...</ThemedText>
          </ThemedView>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Challenge Ready',
          headerBackTitle: 'Back',
          headerLeft: () => null, // Prevent back navigation
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Hidden shareable card for capturing - Image-Dominant Design */}
        {challenge && (
          <View style={styles.shareCardWrapper}>
            <View ref={shareCardRef} style={styles.shareCard} collapsable={false}>
              {/* IMAGE SECTION - 70% of card (420px) */}
              <View style={styles.shareImageSection}>
                <Image
                  source={require('@/assets/images/scriptorian.jpeg')}
                  style={styles.shareCardBanner}
                />
                {/* Gradient overlay for text legibility */}
                <LinearGradient
                  colors={['transparent', 'transparent', 'rgba(0,0,0,0.5)']}
                  locations={[0, 0.5, 1]}
                  style={styles.shareImageOverlay}
                />

                {/* "BEAT MY SCORE" pill - top left */}
                <View style={styles.shareBeatScorePill}>
                  <Text style={styles.shareBeatScoreText}>BEAT MY SCORE!</Text>
                </View>

                {/* Trophy badge - top right with glow */}
                <View style={styles.shareTrophyBadge}>
                  <Ionicons name="trophy" size={28} color="#fff" />
                </View>

                {/* Floating glassmorphism score badge - overlaps into content */}
                <View style={styles.shareFloatingScore}>
                  <Text style={[styles.shareScoreNumber, { color: scoreColor }]}>
                    {scoreNum}
                  </Text>
                  <Text style={styles.shareScoreDivider}>/</Text>
                  <Text style={styles.shareScoreTotal}>{totalNum}</Text>
                </View>
              </View>

              {/* CONTENT SECTION - 30% of card (180px) */}
              <View style={styles.shareCardContent}>
                {/* Challenge code */}
                <View style={styles.shareCodeContainer}>
                  <Text style={styles.shareCodeLabel}>CHALLENGE CODE</Text>
                  <Text style={styles.shareCodeText}>{challenge.challengeCode}</Text>
                </View>

                {/* Metadata badges */}
                <View style={styles.shareDetailsRow}>
                  <View style={styles.shareDetailBadge}>
                    <Text style={styles.shareDetailText}>
                      {capitalize(challenge.difficulty)}
                    </Text>
                  </View>
                  <Text style={styles.shareDetailDot}>•</Text>
                  <View style={styles.shareDetailBadge}>
                    <Text style={styles.shareDetailText}>{totalNum} Questions</Text>
                  </View>
                </View>

                {/* App branding */}
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

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
            style={[
              styles.resultContainer,
              {
                transform: [{ scale: scaleAnim }],
                opacity: fadeAnim,
              },
            ]}
          >
            {/* Success icon */}
            <View
              style={[
                styles.resultIcon,
                { backgroundColor: colors.tint + '20' },
              ]}
            >
              <Ionicons name="trophy" size={64} color={colors.tint} />
            </View>

            <ThemedText style={styles.titleText}>Challenge Ready!</ThemedText>
            <ThemedText style={styles.subtitleText}>
              Share the code so your friend can try to beat your score
            </ThemedText>

            {/* Compact score badge */}
            <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '20' }]}>
              <ThemedText style={[styles.scoreBadgeText, { color: scoreColor }]}>
                Score: {scoreNum}/{totalNum}
              </ThemedText>
            </View>

            {/* Tappable code card with integrated copy */}
            <TouchableOpacity
              style={[styles.codeCard, { backgroundColor: colors.tint + '10' }]}
              onPress={handleCopyCode}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Copy challenge code ${challenge.challengeCode}`}
            >
              {/* Copy icon - positioned top right */}
              <View style={styles.copyIconContainer}>
                <Ionicons
                  name={copied ? 'checkmark-circle' : 'copy-outline'}
                  size={22}
                  color={copied ? '#4CAF50' : colors.tint}
                />
              </View>

              <ThemedText style={styles.codeLabel}>Challenge Code</ThemedText>
              <ThemedText style={[styles.codeText, { color: colors.tint }]}>
                {challenge.challengeCode}
              </ThemedText>

              {/* Integrated difficulty + question count */}
              <ThemedText style={styles.codeMetadata}>
                {capitalize(challenge.difficulty)} · {totalNum} Questions
              </ThemedText>

              {/* Copy hint */}
              <ThemedText style={styles.copyHintText}>
                {copied ? 'Copied!' : 'Tap to copy'}
              </ThemedText>
            </TouchableOpacity>
          </Animated.View>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.buttonContainer} onPress={handleShare}>
              <LinearGradient
                colors={[colors.tint, colors.tint + 'dd']}
                style={styles.actionButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="share-outline" size={24} color="white" />
                <ThemedText style={styles.actionButtonText}>Share Challenge</ThemedText>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: '#4CAF50' }]}
              onPress={handleCreateAnother}
            >
              <Ionicons name="add-circle-outline" size={24} color="#4CAF50" />
              <ThemedText style={[styles.secondaryButtonText, { color: '#4CAF50' }]}>
                Create Another
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.homeButton} onPress={handleHome}>
              <ThemedText style={[styles.homeButtonText, { color: colors.tint }]}>
                Back to Home
              </ThemedText>
            </TouchableOpacity>
          </View>
          </ScrollView>
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
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
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
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  titleText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    paddingTop: 8,
  },
  subtitleText: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  scoreBadge: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginBottom: 20,
  },
  scoreBadgeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  codeCard: {
    width: '100%',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    position: 'relative',
  },
  copyIconContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  codeLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeText: {
    paddingTop: 12,
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 8,
  },
  codeMetadata: {
    marginTop: 16,
    fontSize: 14,
    opacity: 0.6,
  },
  copyHintText: {
    marginTop: 12,
    fontSize: 12,
    opacity: 0.5,
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
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  homeButton: {
    alignItems: 'center',
    padding: 16,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Share card styles - Image-Dominant "Scripture IS the Star" Design
  shareCardWrapper: {
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0,
    pointerEvents: 'none',
  },
  shareCard: {
    width: 400,
    height: 600,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  // IMAGE SECTION - 70% of card
  shareImageSection: {
    width: '100%',
    height: 420,
    position: 'relative',
  },
  shareCardBanner: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  shareImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  // "BEAT MY SCORE" pill - top left on image
  shareBeatScorePill: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  shareBeatScoreText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  // Trophy badge - top right on image
  shareTrophyBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  // Floating glassmorphism score badge - overlaps image/content
  shareFloatingScore: {
    position: 'absolute',
    bottom: -32,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'baseline',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  shareScoreNumber: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
  },
  shareScoreDivider: {
    fontSize: 36,
    fontWeight: '300',
    color: '#9CA3AF',
    marginHorizontal: 2,
  },
  shareScoreTotal: {
    fontSize: 36,
    fontWeight: '600',
    color: '#6B7280',
  },
  // CONTENT SECTION - 30% of card
  shareCardContent: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareCodeContainer: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  shareCodeLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
    letterSpacing: 2,
    fontWeight: '600',
  },
  shareCodeText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#B45309',
    letterSpacing: 5,
  },
  shareDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  shareDetailBadge: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  shareDetailText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  shareDetailDot: {
    color: '#D1D5DB',
    fontSize: 14,
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
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
});
