import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Share,
  Animated,
  ScrollView,
  Image,
  Text,
  InteractionManager,
  Alert,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import ConfettiCannon from 'react-native-confetti-cannon';

import { ThemedText } from '@/components/ThemedText';
import { GradientButton } from '@/components/GradientButton';

// Module-level constants to prevent re-render issues
const CONFETTI_ORIGIN = { x: -10, y: 0 };
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useChallenge } from '@/hooks/useChallenge';
import { capitalize, getScoreColorByRatio } from '@/utils/styleUtils';
import { Scripture, GameMode, QuestionCount } from '@/types/scripture';

export default function CreatedResultScreen() {
  const colorScheme = useColorScheme();
  // Accept both saved challenge params (challengeId) and unsaved challenge params (scriptures, difficulty, challengeCode)
  const { challengeId, score, questionCount, scriptures, difficulty, challengeCode } = useLocalSearchParams<{
    challengeId?: string;
    score: string;
    questionCount: string;
    // Unsaved challenge params (coming directly from game.tsx)
    scriptures?: string;
    difficulty?: string;
    challengeCode?: string;
  }>();
  const { challenge, isLoading, getChallengeDeepLink, createChallengeWithScore } = useChallenge(challengeId);

  // Determine if this is an unsaved challenge (coming from game.tsx directly)
  const isUnsavedChallenge = !challengeId && !!challengeCode;

  // Parse scriptures for unsaved challenges (memoized to prevent re-parsing on every render)
  const parsedScriptures = useMemo<Scripture[]>(
    () => (scriptures ? JSON.parse(scriptures) : []),
    [scriptures]
  );

  // Use ref + animated value for copy feedback to avoid state-based re-renders
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedChallengeId, setSavedChallengeId] = useState<string | null>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shareCardRef = useRef<View>(null);

  // Refs for stable callback dependencies (avoids handleShare recreation)
  const challengeDataRef = useRef({ scoreNum: 0, totalNum: 0, challengeCode: '', difficulty: '' });
  const parsedScripturesRef = useRef<Scripture[]>([]);

  // Memoize colors to prevent object recreation on every render
  const colors = useMemo(() => Colors[colorScheme ?? 'light'], [colorScheme]);

  const scoreNum = parseInt(score || '0', 10);
  const totalNum = parseInt(questionCount || '10', 10);
  const isHighScore = scoreNum >= Math.ceil(totalNum * 0.8); // 80% or higher

  // Use shared utility for consistent score colors
  const scoreColor = getScoreColorByRatio(scoreNum / totalNum).text;

  // Get the challenge code to display (from saved challenge or params)
  // Memoized to prevent unnecessary recalculations
  const displayChallengeCode = useMemo(
    () => challenge?.challengeCode || challengeCode || '',
    [challenge?.challengeCode, challengeCode]
  );
  const displayDifficulty = useMemo(
    () => challenge?.difficulty || difficulty || 'easy',
    [challenge?.difficulty, difficulty]
  );

  // Sync refs with current values for stable callback dependencies
  useEffect(() => {
    challengeDataRef.current = {
      scoreNum,
      totalNum,
      challengeCode: challengeCode || '',
      difficulty: difficulty || 'easy',
    };
    parsedScripturesRef.current = parsedScriptures;
  }, [scoreNum, totalNum, challengeCode, difficulty, parsedScriptures]);

  // Animation effect - runs only on mount to avoid re-triggering
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

    // Haptic feedback for high scores on mount only
    if (isHighScore) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    return () => {
      animation.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

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
    if (!displayChallengeCode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Clear any existing timeout
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }

    await Clipboard.setStringAsync(displayChallengeCode);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 1500);
  }, [displayChallengeCode]);

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Read current values from refs to avoid stale closures
    const { scoreNum: currentScore, totalNum: currentTotal, challengeCode: currentCode, difficulty: currentDifficulty } = challengeDataRef.current;
    const currentScriptures = parsedScripturesRef.current;

    // If this is an unsaved challenge, save it first
    if (isUnsavedChallenge && !savedChallengeId) {
      setIsSubmitting(true);
      try {
        // Create challenge with score
        const newChallenge = await createChallengeWithScore({
          challengeCode: currentCode,
          difficulty: currentDifficulty as GameMode,
          questionCount: currentTotal as QuestionCount,
          scriptures: currentScriptures,
          creatorScore: currentScore,
        });

        if (newChallenge) {
          setSavedChallengeId(newChallenge.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Error', 'Failed to save challenge. Please try again.');
          setIsSubmitting(false);
          return;
        }
      } catch (err) {
        console.error('Failed to create challenge:', err);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'Failed to save challenge. Please try again.');
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
    }

    // Use the saved challenge data or params for sharing
    const shareCode = challenge?.challengeCode || currentCode;
    const shareDifficulty = challenge?.difficulty || currentDifficulty;

    const shareText =
      `I scored ${currentScore}/${currentTotal} on this Scripture Mastery challenge. Think you can beat me?\n\n` +
      `Difficulty: ${capitalize(shareDifficulty)}\n` +
      `Use code: ${shareCode}\n\n` +
      `Or tap this link:\n${getChallengeDeepLink(shareCode)}`;

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
      // Navigate to home after successful share
      router.replace('/(tabs)');
    } catch (err) {
      // User cancellation is normal - still navigate home (they saw the code)
      if (isUserCancellation(err)) {
        router.replace('/(tabs)');
        return;
      }

      console.error('Share image capture failed:', err);

      // Fallback to text share if image capture fails
      try {
        await Share.share({ message: shareText });
        // Navigate to home after successful fallback share
        router.replace('/(tabs)');
      } catch (fallbackErr) {
        // User cancellation - still navigate home (they saw the code)
        if (isUserCancellation(fallbackErr)) {
          router.replace('/(tabs)');
          return;
        }

        console.error('Share fallback failed:', fallbackErr);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Share Failed',
          'Unable to share the challenge. Please try copying the code instead.'
        );
      }
    }
  }, [challenge, getChallengeDeepLink, isUnsavedChallenge, savedChallengeId, createChallengeWithScore]);

  // Handle cancel with confirmation for unsaved challenges
  const handleCancel = useCallback(() => {
    if (isUnsavedChallenge && !savedChallengeId) {
      Alert.alert(
        'Discard Challenge?',
        'Your challenge has not been shared yet. Are you sure you want to leave?',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.replace('/(tabs)');
            },
          },
        ]
      );
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.replace('/(tabs)');
    }
  }, [isUnsavedChallenge, savedChallengeId]);

  // Show loading only for saved challenges that need to be fetched
  if (!isUnsavedChallenge && (isLoading || !challenge)) {
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
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleCancel}
              style={{ paddingHorizontal: 8 }}
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={28} color={colors.tint} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Hidden shareable card for capturing - Image-Dominant Design */}
        {(challenge || isUnsavedChallenge) && (
          <View style={styles.shareCardWrapper}>
            <View ref={shareCardRef} style={styles.shareCard} collapsable={false}>
              {/* IMAGE SECTION - 70% of card (420px) */}
              <View style={styles.shareImageSection}>
                <Image
                  source={require('@/assets/images/share-background.png')}
                  style={styles.shareCardBanner}
                />
                {/* Gradient overlay for text legibility */}
                <LinearGradient
                  colors={['transparent', 'transparent', 'rgba(0,0,0,0.5)']}
                  locations={[0, 0.5, 1]}
                  style={styles.shareImageOverlay}
                />

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
                  <Text style={styles.shareCodeText}>{displayChallengeCode}</Text>
                </View>

                {/* Metadata badges */}
                <View style={styles.shareDetailsRow}>
                  <View style={styles.shareDetailBadge}>
                    <Text style={styles.shareDetailText}>
                      {capitalize(displayDifficulty)}
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
          {isHighScore && (
            <ConfettiCannon
              count={200}
              origin={CONFETTI_ORIGIN}
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
              {/* "You scored" label */}
              <ThemedText style={styles.scoreLabel}>You scored</ThemedText>

              {/* Hero score - clean, no container */}
              <View style={styles.heroScore}>
                <ThemedText style={[styles.scoreNumber, { color: scoreColor }]}>{scoreNum}</ThemedText>
                <ThemedText style={styles.scoreDivider}>/</ThemedText>
                <ThemedText style={styles.scoreTotalNumber}>{totalNum}</ThemedText>
              </View>

              {/* Share button - primary action */}
              <View style={styles.actions}>
                <GradientButton
                  onPress={handleShare}
                  label="Share Challenge"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  variant="primary"
                  size="large"
                  icon={<Ionicons name="share-outline" size={24} color="white" />}
                />
              </View>

              {/* Minimal code row with copy icon */}
              <TouchableOpacity
                style={styles.codeRow}
                onPress={handleCopyCode}
                accessibilityLabel={`Copy challenge code ${displayChallengeCode}`}
              >
                <ThemedText style={styles.inlineCode}>{displayChallengeCode}</ThemedText>
                <Feather
                  name={copied ? 'check' : 'copy'}
                  size={16}
                  color={copied ? colors.tint : colors.icon}
                />
              </TouchableOpacity>

              {/* Metadata */}
              <ThemedText style={styles.metadata}>
                {capitalize(displayDifficulty)} · {totalNum} Questions
              </ThemedText>
            </Animated.View>
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
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '300',
    opacity: 0.6,
    marginBottom: 8,
  },
  heroScore: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 40,
  },
  scoreNumber: {
    lineHeight: 80,
    fontSize: 72,
    fontWeight: '800',
    letterSpacing: -2,
  },
  scoreDivider: {
    lineHeight: 56,
    fontSize: 48,
    fontWeight: '200',
    opacity: 0.3,
    marginHorizontal: 4,
  },
  scoreTotalNumber: {
    lineHeight: 56,
    fontSize: 48,
    fontWeight: '400',
    opacity: 0.5,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    paddingVertical: 8,
  },
  inlineCode: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 2,
    opacity: 0.7,
  },
  metadata: {
    fontSize: 12,
    fontWeight: '300',
    opacity: 0.4,
    marginTop: 8,
    textAlign: 'center',
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
