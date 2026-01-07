import { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useChallenge } from '@/hooks/useChallenge';
import { useAuth } from '@/contexts/AuthContext';
import { GameMode, QuestionCount } from '@/types/scripture';
import { getChallengeGradientColors, capitalize } from '@/utils/styleUtils';

type Step = 'difficulty' | 'questions';

export default function CreateChallengeScreen() {
  const colorScheme = useColorScheme();
  const { userProfile } = useAuth();
  const { createChallenge, isLoading, error } = useChallenge();

  const [step, setStep] = useState<Step>('difficulty');
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameMode | null>(null);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<QuestionCount | null>(null);

  const colors = Colors[colorScheme ?? 'light'];

  const handleDifficultySelect = (difficulty: GameMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDifficulty(difficulty);
    setStep('questions');
  };

  const handleQuestionCountSelect = async (count: QuestionCount) => {
    if (!selectedDifficulty || !userProfile?.nickname) {
      Alert.alert(
        'Nickname Required',
        'You need to set a nickname before creating challenges. Go to Settings to set one.',
        [{ text: 'OK' }]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedQuestionCount(count);

    const challenge = await createChallenge(selectedDifficulty, count);
    if (challenge) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigate directly to game - creator plays first
      router.replace({
        pathname: '/game',
        params: {
          mode: challenge.difficulty,
          challengeId: challenge.id,
          isCreator: 'true',
        },
      });
    } else {
      // Error state is set by useChallenge hook, provide haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSelectedQuestionCount(null); // Reset selection to allow retry
    }
  };

  const renderDifficultyStep = () => (
    <>
      <ThemedText style={styles.stepTitle}>Select Difficulty</ThemedText>
      <ThemedText style={styles.stepSubtitle}>
        Choose the challenge difficulty for you and your friend
      </ThemedText>

      {(['easy', 'medium', 'hard'] as GameMode[]).map((mode) => {
        const description =
          mode === 'easy' ? 'Guess the book' :
          mode === 'medium' ? 'Guess the book and chapter' :
          'Guess the book, chapter, and verse';
        return (
          <TouchableOpacity
            key={mode}
            style={styles.buttonContainer}
            onPress={() => handleDifficultySelect(mode)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${capitalize(mode)} difficulty: ${description}`}
          >
            <LinearGradient
              colors={getChallengeGradientColors(mode, colorScheme)}
              style={styles.modeButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <ThemedText style={styles.modeButtonText}>
                {capitalize(mode)}
              </ThemedText>
              <ThemedText style={styles.modeDescription}>
                {description}
              </ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        );
      })}

      {/* Placeholder to match questions step height (prevents vertical shifting) */}
      <View style={styles.backButtonPlaceholder} />
    </>
  );

  const renderQuestionsStep = () => (
    <>
      <ThemedText style={styles.stepTitle}>Number of Questions</ThemedText>
      <ThemedText style={styles.stepSubtitle}>
        How many scriptures should the challenge include?
      </ThemedText>

      {([3, 5, 10] as QuestionCount[]).map((count) => {
        const description =
          count === 3 ? 'Quick challenge' :
          count === 5 ? 'Standard challenge' :
          'Full challenge';
        return (
          <TouchableOpacity
            key={count}
            style={styles.buttonContainer}
            onPress={() => handleQuestionCountSelect(count)}
            disabled={isLoading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${count} questions: ${description}`}
            accessibilityState={{ disabled: isLoading }}
          >
            <LinearGradient
              colors={getChallengeGradientColors(selectedDifficulty || 'easy', colorScheme)}
              style={[styles.modeButton, isLoading && styles.disabledButton]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading && selectedQuestionCount === count ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="white" size="small" />
                </View>
              ) : (
                <>
                  <ThemedText style={styles.modeButtonText}>{count} Questions</ThemedText>
                  <ThemedText style={styles.modeDescription}>
                    {description}
                  </ThemedText>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setStep('difficulty');
        }}
        accessibilityRole="button"
        accessibilityLabel="Go back to difficulty selection"
      >
        <ThemedText style={[styles.backButtonText, { color: colors.tint }]}>
          Back to difficulty
        </ThemedText>
      </TouchableOpacity>
    </>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Create Challenge',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ThemedView style={styles.content}>
          {error && (
            <View style={[styles.errorBanner, { backgroundColor: '#ff4444' }]}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          )}

          <View style={styles.stepContentWrapper}>
            {step === 'difficulty' && renderDifficultyStep()}
            {step === 'questions' && renderQuestionsStep()}
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
    paddingTop: 60,
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingTop: 4,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 32,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modeButton: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  modeButtonText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modeDescription: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
  },
  disabledButton: {
    opacity: 0.7,
  },
  backButton: {
    marginTop: 16,
    padding: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonPlaceholder: {
    marginTop: 16,
    padding: 12,
    height: 44,
  },
  loadingContainer: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContentWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  errorBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 12,
    zIndex: 1,
  },
  errorText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
});
