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

  const getGradientColors = (mode: GameMode): readonly [string, string] => {
    if (colorScheme === 'dark') {
      switch (mode) {
        case 'easy':
          return ['#1a5d7e', '#0a3d5e'] as const;
        case 'medium':
          return ['#1a6e7e', '#0a4e5e'] as const;
        case 'hard':
          return ['#1a7e7e', '#0a5e5e'] as const;
      }
    } else {
      switch (mode) {
        case 'easy':
          return ['#0a7ea4', '#085d7a'] as const;
        case 'medium':
          return ['#0a8ea4', '#086d7a'] as const;
        case 'hard':
          return ['#0a9ea4', '#087d7a'] as const;
      }
    }
  };

  const renderDifficultyStep = () => (
    <>
      <ThemedText style={styles.stepTitle}>Select Difficulty</ThemedText>
      <ThemedText style={styles.stepSubtitle}>
        Choose the challenge difficulty for you and your friend
      </ThemedText>

      {(['easy', 'medium', 'hard'] as GameMode[]).map((mode) => (
        <TouchableOpacity
          key={mode}
          style={styles.buttonContainer}
          onPress={() => handleDifficultySelect(mode)}
        >
          <LinearGradient
            colors={getGradientColors(mode)}
            style={styles.modeButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <ThemedText style={styles.modeButtonText}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </ThemedText>
            <ThemedText style={styles.modeDescription}>
              {mode === 'easy' && 'Guess the book'}
              {mode === 'medium' && 'Guess the book and chapter'}
              {mode === 'hard' && 'Guess the book, chapter, and verse'}
            </ThemedText>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </>
  );

  const renderQuestionsStep = () => (
    <>
      <ThemedText style={styles.stepTitle}>Number of Questions</ThemedText>
      <ThemedText style={styles.stepSubtitle}>
        How many scriptures should the challenge include?
      </ThemedText>

      {([3, 5, 10] as QuestionCount[]).map((count) => (
        <TouchableOpacity
          key={count}
          style={styles.buttonContainer}
          onPress={() => handleQuestionCountSelect(count)}
          disabled={isLoading}
        >
          <LinearGradient
            colors={getGradientColors(selectedDifficulty || 'easy')}
            style={[styles.modeButton, isLoading && styles.disabledButton]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isLoading && selectedQuestionCount === count ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <ThemedText style={styles.modeButtonText}>{count} Questions</ThemedText>
                <ThemedText style={styles.modeDescription}>
                  {count === 3 && 'Quick challenge'}
                  {count === 5 && 'Standard challenge'}
                  {count === 10 && 'Full challenge'}
                </ThemedText>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStep('difficulty')}
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

          {step === 'difficulty' && renderDifficultyStep()}
          {step === 'questions' && renderQuestionsStep()}
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
    alignItems: 'center',
    justifyContent: 'center',
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
