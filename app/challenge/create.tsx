import { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { GameMode, QuestionCount } from '@/types/scripture';
import { getChallengeGradientColors, capitalize } from '@/utils/styleUtils';
import { getScripturesForChallenge, generateChallengeCode } from '@/utils/scriptureUtils';

type Step = 'difficulty' | 'questions';

export default function CreateChallengeScreen() {
  const colorScheme = useColorScheme();

  const [step, setStep] = useState<Step>('difficulty');
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameMode | null>(null);

  const colors = Colors[colorScheme ?? 'light'];

  const handleDifficultySelect = (difficulty: GameMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDifficulty(difficulty);
    setStep('questions');
  };

  const handleQuestionCountSelect = (count: QuestionCount) => {
    if (!selectedDifficulty) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Generate scriptures locally - don't save to Firestore yet
    const challengeCode = generateChallengeCode();
    const scriptures = getScripturesForChallenge(challengeCode, count);

    // Navigate to game with scriptures data (challenge created after playing)
    router.replace({
      pathname: '/game',
      params: {
        mode: selectedDifficulty,
        challengeMode: 'creating',
        challengeCode,
        scriptures: JSON.stringify(scriptures),
        questionCount: count.toString(),
      },
    });
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
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${count} questions: ${description}`}
          >
            <LinearGradient
              colors={getChallengeGradientColors(selectedDifficulty || 'easy', colorScheme)}
              style={styles.modeButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <ThemedText style={styles.modeButtonText}>{count} Questions</ThemedText>
              <ThemedText style={styles.modeDescription}>
                {description}
              </ThemedText>
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
  stepContentWrapper: {
    width: '100%',
    alignItems: 'center',
  },
});
