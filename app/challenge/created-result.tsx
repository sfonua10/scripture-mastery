import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Share,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useChallenge } from '@/hooks/useChallenge';

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

  const handleCopyCode = async () => {
    if (!challenge) return;

    // Clear any existing timeout
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }

    await Clipboard.setStringAsync(challenge.challengeCode);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!challenge) return;
    try {
      const difficultyLabel =
        challenge.difficulty.charAt(0).toUpperCase() +
        challenge.difficulty.slice(1);

      const message =
        `I scored ${scoreNum}/${totalNum} on this Scripture Mastery challenge. Think you can beat me?\n\n` +
        `Difficulty: ${difficultyLabel}\n` +
        `Use code: ${challenge.challengeCode}\n\n` +
        `Or tap this link:\n${getChallengeDeepLink(challenge.challengeCode)}`;

      await Share.share({ message });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const handleCreateAnother = () => {
    router.replace('/challenge/create');
  };

  const handleHome = () => {
    router.replace('/(tabs)');
  };

  const getScoreColor = () => {
    const percentage = scoreNum / totalNum;
    if (percentage >= 0.8) return '#4CAF50'; // Green for 80%+
    if (percentage >= 0.5) return '#FFC107'; // Orange for 50-79%
    return '#F44336'; // Red for below 50%
  };

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

            {/* Score display */}
            <View style={[styles.scoreCard, { backgroundColor: getScoreColor() + '15' }]}>
              <ThemedText style={styles.scoreLabel}>Your Score</ThemedText>
              <View style={styles.scoreRow}>
                <ThemedText style={[styles.scoreValue, { color: getScoreColor() }]}>
                  {scoreNum}
                </ThemedText>
                <ThemedText style={styles.scoreTotal}>/{totalNum}</ThemedText>
              </View>
            </View>

            {/* Challenge code */}
            <View style={[styles.codeContainer, { backgroundColor: colors.tint + '10' }]}>
              <ThemedText style={styles.codeLabel}>Challenge Code</ThemedText>
              <ThemedText style={[styles.codeText, { color: colors.tint }]}>
                {challenge.challengeCode}
              </ThemedText>
            </View>

            {/* Copy button */}
            <TouchableOpacity
              style={[styles.copyButton, { backgroundColor: colors.tint + '20' }]}
              onPress={handleCopyCode}
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={20}
                color={colors.tint}
              />
              <ThemedText style={[styles.copyButtonText, { color: colors.tint }]}>
                {copied ? 'Copied!' : 'Copy Code'}
              </ThemedText>
            </TouchableOpacity>

            {/* Challenge info */}
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Ionicons name="speedometer-outline" size={18} color={colors.text + '80'} />
                <ThemedText style={styles.infoText}>
                  {challenge.difficulty.charAt(0).toUpperCase() +
                    challenge.difficulty.slice(1)}{' '}
                  Difficulty
                </ThemedText>
              </View>
            </View>
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

            <TouchableOpacity style={styles.buttonContainer} onPress={handleCreateAnother}>
              <LinearGradient
                colors={['#4CAF50', '#388E3C']}
                style={styles.actionButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="add-circle-outline" size={24} color="white" />
                <ThemedText style={styles.actionButtonText}>Create Another</ThemedText>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.homeButton} onPress={handleHome}>
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
  scoreCard: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scoreTotal: {
    fontSize: 24,
    opacity: 0.5,
    marginLeft: 4,
  },
  codeContainer: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
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
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
});
