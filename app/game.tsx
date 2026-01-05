import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  View,
  Linking,
  ScrollView,
  Text,
  Share,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { LeaderboardPrompt } from "@/components/LeaderboardPrompt";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useAuth } from "@/contexts/AuthContext";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { GameMode, Scripture } from "@/types/scripture";
import {
  getRandomScripture,
  getNextRandomScripture,
  checkGuess,
} from "@/utils/scriptureUtils";
import { Ionicons } from "@expo/vector-icons";
import ConfettiCannon from "react-native-confetti-cannon";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

const TOTAL_QUESTIONS = 3;

const MIN_SCORE_FOR_LEADERBOARD = 0; // Minimum score to prompt for leaderboard

export default function GameScreen() {
  const { mode } = useLocalSearchParams<{ mode: GameMode }>();
  const colorScheme = useColorScheme();

  // Auth and leaderboard hooks
  const {
    nickname,
    hasJoinedLeaderboard,
    isNewHighScore,
    updateHighScore,
    joinLeaderboard
  } = useAuth();
  const { submitScore } = useLeaderboard(mode as GameMode);

  const [currentScripture, setCurrentScripture] = useState<Scripture | null>(
    null
  );
  const [userGuess, setUserGuess] = useState("");
  const [hasGuessed, setHasGuessed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(1);
  const [correctCount, setCorrectCount] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showSummaryCard, setShowSummaryCard] = useState(false);
  const [showLeaderboardPrompt, setShowLeaderboardPrompt] = useState(false);
  const [isHighScore, setIsHighScore] = useState(false);
  const shareCardRef = useRef<View>(null);

  useEffect(() => {
    // Select a random scripture when the component mounts
    setCurrentScripture(getRandomScripture());
  }, []);

  // Handle session completion - check for high score and show leaderboard prompt
  useEffect(() => {
    if (sessionComplete) {
      const checkHighScore = async () => {
        const newHighScore = isNewHighScore(mode as GameMode, correctCount);
        setIsHighScore(newHighScore);

        // Update local high score
        if (newHighScore) {
          await updateHighScore(mode as GameMode, correctCount);
        }

        // Determine if we should show leaderboard prompt
        const shouldPrompt = correctCount >= MIN_SCORE_FOR_LEADERBOARD &&
          (newHighScore || !hasJoinedLeaderboard);

        if (shouldPrompt) {
          // Show prompt after a short delay (or after confetti for high scores)
          const delay = correctCount >= 8 ? 1500 : 500;
          setTimeout(() => {
            setShowLeaderboardPrompt(true);
          }, delay);
        }
      };

      checkHighScore();

      // Delay showing the summary card to let confetti play first
      if (correctCount >= 8) {
        const timer = setTimeout(() => {
          setShowSummaryCard(true);
        }, 1500);
        return () => clearTimeout(timer);
      } else {
        setShowSummaryCard(true);
      }
    }
  }, [sessionComplete, correctCount, mode, isNewHighScore, updateHighScore, hasJoinedLeaderboard]);

  const handleSubmitGuess = async () => {
    if (!currentScripture) return;

    if (!userGuess.trim()) {
      Alert.alert("Please enter a guess");
      return;
    }

    setLoading(true);

    // Simulate a brief loading state
    setTimeout(async () => {
      const correct = checkGuess(currentScripture, userGuess, mode as GameMode);

      setIsCorrect(correct);
      setHasGuessed(true);

      setLoading(false);

      // Track correct answers
      if (correct) {
        setCorrectCount(prev => prev + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }, 500);
  };

  const handleNextScripture = () => {
    if (!currentScripture) return;

    // Check if session is complete
    if (questionCount >= TOTAL_QUESTIONS) {
      setSessionComplete(true);
      return;
    }

    // Select a new random scripture
    setCurrentScripture(getNextRandomScripture(currentScripture));
    setUserGuess("");
    setHasGuessed(false);
    setIsCorrect(false);
    setQuestionCount(prev => prev + 1);
  };

  const handlePlayAgain = () => {
    setQuestionCount(1);
    setCorrectCount(0);
    setSessionComplete(false);
    setShowSummaryCard(false);
    setShowLeaderboardPrompt(false);
    setIsHighScore(false);
    setCurrentScripture(getRandomScripture());
    setUserGuess("");
    setHasGuessed(false);
    setIsCorrect(false);
  };

  const handleLeaderboardSubmit = async (submittedNickname: string) => {
    try {
      if (!hasJoinedLeaderboard) {
        // First time joining - create profile and submit
        await joinLeaderboard(submittedNickname, mode as GameMode, correctCount);
      }
      // Submit score to leaderboard
      await submitScore(correctCount, submittedNickname);
      setShowLeaderboardPrompt(false);
    } catch (error) {
      console.error('Failed to submit to leaderboard:', error);
      Alert.alert('Error', 'Failed to save score. Please try again.');
    }
  };

  const handleLeaderboardSkip = () => {
    setShowLeaderboardPrompt(false);
  };

  const handleShare = async () => {
    const APP_STORE_LINK = 'https://apps.apple.com/us/app/scripture-mastery-pro/id6742937573';
    const message = `I got ${correctCount}/${TOTAL_QUESTIONS} on Scripture Mastery! Can you beat my score?\n${APP_STORE_LINK}`;

    try {
      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1,
      });
      await Sharing.shareAsync(uri, {
        dialogTitle: message,
      });
    } catch (error) {
      // Fallback to text share
      await Share.share({ message });
    }
  };

  const getPlaceholderText = () => {
    switch (mode) {
      case "easy":
        return 'Enter book name (e.g., "John")';
      case "medium":
        return 'Enter book and chapter (e.g., "John 3")';
      case "hard":
        return 'Enter book, chapter, and verse (e.g., "John 3:16")';
      default:
        return "Enter your guess";
    }
  };

  const getCorrectAnswer = () => {
    if (!currentScripture) return "";

    const { book, chapter, verse } = currentScripture.reference;

    switch (mode) {
      case "easy":
        return book;
      case "medium":
        return `${book} ${chapter}`;
      case "hard":
        return `${book} ${chapter}:${verse}`;
      default:
        return "";
    }
  };

  const getFullReference = () => {
    if (!currentScripture) return "";

    const { book, chapter, verse } = currentScripture.reference;
    return `${book} ${chapter}:${verse}`;
  };

  const getDifficultyTitle = () => {
    switch (mode) {
      case "easy":
        return "Easy Mode";
      case "medium":
        return "Medium Mode";
      case "hard":
        return "Hard Mode";
      default:
        return "Scripture Mastery";
    }
  };

  const getScoreColor = () => {
    if (correctCount >= 8) return { bg: "#e6f7e6", text: "#4CAF50" }; // green
    if (correctCount >= 5) return { bg: "#fff8e6", text: "#FF9800" }; // yellow/orange
    return { bg: "#ffebee", text: "#F44336" }; // red
  };

  if (!currentScripture) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator
          size="large"
          color={Colors[colorScheme ?? "light"].tint}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={{ alignItems: 'center' }}>
              <Text style={{
                color: Colors[colorScheme ?? "light"].text,
                fontSize: 17,
                fontWeight: '600'
              }}>
                {getDifficultyTitle()}
              </Text>
              <Text style={{
                color: Colors[colorScheme ?? "light"].text,
                fontSize: 12,
                opacity: 0.6
              }}>
                {sessionComplete ? "Complete!" : `Question ${questionCount} of ${TOTAL_QUESTIONS}`}
              </Text>
            </View>
          ),
          headerBackTitle: "Home",
          headerStyle: {
            backgroundColor: Colors[colorScheme ?? "light"].background,
          },
          headerTintColor: Colors[colorScheme ?? "light"].tint,
          headerShadowVisible: false,
        }}
      />

      {sessionComplete ? (
        <ThemedView style={styles.summaryContainer}>
          {correctCount >= 8 && (
            <ConfettiCannon
              count={200}
              origin={{ x: -10, y: 0 }}
              autoStart={true}
              fadeOut={true}
            />
          )}

          {showSummaryCard && (
            <>
              {/* Hidden shareable card for capturing */}
              <View style={styles.shareCardWrapper}>
                <View ref={shareCardRef} style={styles.shareCard}>
                  {/* Image section with gradient overlay */}
                  <View style={styles.shareImageContainer}>
                    <Image
                      source={require('@/assets/images/scriptorian.jpeg')}
                      style={styles.shareCardBanner}
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.7)']}
                      style={styles.shareImageOverlay}
                    />
                  </View>

                  {/* Floating score circle */}
                  <View style={[styles.shareScoreCircle, { backgroundColor: getScoreColor().bg, borderColor: '#fff' }]}>
                    <Text style={[styles.shareScoreText, { color: getScoreColor().text }]}>
                      {correctCount}/{TOTAL_QUESTIONS}
                    </Text>
                  </View>

                  {/* Content section */}
                  <View style={styles.shareCardContent}>
                    <Text style={styles.shareCardMessage}>CAN YOU BEAT ME?</Text>
                    <Text style={styles.shareCardDifficulty}>{getDifficultyTitle()}</Text>

                    {/* Bottom bar with icon, name, and App Store badge */}
                    <View style={styles.shareBottomBar}>
                      <Image
                        source={require('@/assets/icons/ios-light.png')}
                        style={styles.shareAppIcon}
                      />
                      <Text style={styles.shareAppName}>Scripture Mastery Pro</Text>
                      <View style={styles.appStoreBadge}>
                        <Ionicons name="logo-apple" size={12} color="#fff" />
                        <Text style={styles.appStoreBadgeText}>App Store</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

          <View style={[styles.summaryCard, { backgroundColor: Colors[colorScheme ?? "light"].card }]}>
            <ThemedText style={styles.summaryTitle}>Session Complete!</ThemedText>
            <View style={[styles.scoreCircle, { backgroundColor: getScoreColor().bg }]}>
              <ThemedText style={[styles.scoreText, { color: getScoreColor().text }]}>
                {correctCount}/{TOTAL_QUESTIONS}
              </ThemedText>
            </View>
            <ThemedText style={styles.summaryMessage}>
              {correctCount === TOTAL_QUESTIONS ? "Perfect score!" :
               correctCount >= 8 ? "Great job!" :
               correctCount >= 5 ? "Good effort!" :
               "Keep practicing!"}
            </ThemedText>

            <View style={styles.summaryButtons}>
              <TouchableOpacity
                style={styles.playAgainButtonContainer}
                onPress={handlePlayAgain}
              >
                <LinearGradient
                  colors={
                    colorScheme === 'dark'
                      ? ['#1a7e7e', '#0a5e5e']
                      : ['#0a9ea4', '#087d7a']
                  }
                  style={styles.playAgainButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <ThemedText style={styles.playAgainButtonText}>Play Again</ThemedText>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareButtonContainer}
                onPress={handleShare}
              >
                <View style={[styles.shareButton, { borderColor: Colors[colorScheme ?? "light"].tint }]}>
                  <ThemedText style={[styles.shareButtonText, { color: Colors[colorScheme ?? "light"].tint }]}>
                    Share Score
                  </ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.leaderboardButtonContainer}
                onPress={() => router.push('/(tabs)/leaderboard')}
              >
                <View style={[styles.leaderboardButton, { borderColor: Colors[colorScheme ?? "light"].tint }]}>
                  <Ionicons name="trophy-outline" size={18} color={Colors[colorScheme ?? "light"].tint} style={{ marginRight: 6 }} />
                  <ThemedText style={[styles.leaderboardButtonText, { color: Colors[colorScheme ?? "light"].tint }]}>
                    View Leaderboard
                  </ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.homeButtonContainer}
                onPress={() => router.back()}
              >
                <View style={[styles.homeButton, { borderColor: Colors[colorScheme ?? "light"].border }]}>
                  <ThemedText style={styles.homeButtonText}>Home</ThemedText>
                </View>
              </TouchableOpacity>
            </View>
          </View>
            </>
          )}

          <LeaderboardPrompt
            visible={showLeaderboardPrompt}
            score={correctCount}
            totalQuestions={TOTAL_QUESTIONS}
            difficulty={mode as GameMode}
            isNewHighScore={isHighScore}
            hasNickname={!!nickname}
            nickname={nickname}
            onClose={() => setShowLeaderboardPrompt(false)}
            onSubmit={handleLeaderboardSubmit}
            onSkip={handleLeaderboardSkip}
          />
        </ThemedView>
      ) : (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ThemedView style={styles.content}>
          {/* Use ScrollView for content to make it scrollable */}
          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {hasGuessed && (
              <ThemedView style={styles.resultContainer}>
                {isCorrect ? (
                  // Correct answer UI
                  <View style={[styles.resultCard, { backgroundColor: Colors[colorScheme ?? "light"].card }]}>
                    <View style={styles.iconContainer}>
                      <View style={styles.checkCircle}>
                        <ThemedText style={styles.checkmark}>✓</ThemedText>
                      </View>
                    </View>
                    <ThemedText style={[styles.correctText, { color: Colors[colorScheme ?? "light"].success }]}>
                      Correct!
                    </ThemedText>
                    <ThemedText style={styles.correctReference}>
                      {getFullReference()}
                    </ThemedText>

                    {/* Add this full reference link */}
                    <TouchableOpacity
                      style={styles.fullReferenceLink}
                      onPress={() =>
                        Linking.openURL(
                          "https://www.churchofjesuschrist.org/study/scriptures?lang=eng"
                        )
                      }
                    >
                      <View style={styles.fullReferenceContainer}>
                        <ThemedText style={styles.fullReferenceText}>
                          {getFullReference()}
                        </ThemedText>
                        <Ionicons
                          name="open-outline"
                          size={12}
                          color="#888888"
                          style={styles.fullReferenceIcon}
                        />
                      </View>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // Incorrect answer UI
                  <View style={[styles.resultCard, { backgroundColor: Colors[colorScheme ?? "light"].card }]}>
                    <View style={styles.iconContainer}>
                      <View style={styles.xCircle}>
                        <ThemedText style={styles.xMark}>✗</ThemedText>
                      </View>
                    </View>
                    <ThemedText style={styles.incorrectGuess}>
                      You guessed{" "}
                      <ThemedText style={[styles.userGuessText, { color: Colors[colorScheme ?? "light"].error }]}>
                        {userGuess}
                      </ThemedText>
                    </ThemedText>
                    <ThemedText style={styles.correctReference}>
                      It was{" "}
                      <ThemedText style={[styles.correctAnswerText, { color: Colors[colorScheme ?? "light"].success }]}>
                        {getCorrectAnswer()}
                      </ThemedText>
                    </ThemedText>

                    {/* Full reference in gray text with icon */}
                    <TouchableOpacity
                      style={styles.fullReferenceLink}
                      onPress={() =>
                        Linking.openURL(
                          "https://www.churchofjesuschrist.org/study/scriptures?lang=eng"
                        )
                      }
                    >
                      <View style={styles.fullReferenceContainer}>
                        <ThemedText style={styles.fullReferenceText}>
                          {getFullReference()}
                        </ThemedText>
                        <Ionicons
                          name="open-outline"
                          size={12}
                          color="#888888"
                          style={styles.fullReferenceIcon}
                        />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </ThemedView>
            )}

            <ThemedView 
              style={[
                styles.scriptureContainer, 
                { 
                  borderColor: Colors[colorScheme ?? "light"].border,
                  backgroundColor: Colors[colorScheme ?? "light"].card 
                }
              ]}
            >
              <ThemedText style={styles.scriptureText}>
                "{currentScripture.text}"
              </ThemedText>
            </ThemedView>

            {/* Add padding at the bottom of ScrollView for better appearance */}
            <View style={{ paddingBottom: 20 }} />
          </ScrollView>
        </ThemedView>

        {!hasGuessed ? (
          <ThemedView 
            style={[
              styles.inputContainer, 
              { 
                borderTopColor: Colors[colorScheme ?? "light"].border,
                backgroundColor: Colors[colorScheme ?? "light"].card 
              }
            ]}
          >
            <ThemedText style={styles.guessLabel}>
              What's the reference?
            </ThemedText>
            <TextInput
              style={[
                styles.guessInput,
                {
                  borderColor: Colors[colorScheme ?? "light"].border,
                  color: Colors[colorScheme ?? "light"].text,
                  backgroundColor: Colors[colorScheme ?? "light"].background,
                },
              ]}
              placeholder={getPlaceholderText()}
              placeholderTextColor={colorScheme === 'dark' ? '#666' : '#888'}
              value={userGuess}
              onChangeText={setUserGuess}
              autoCapitalize="words"
              returnKeyType="go"
              onSubmitEditing={handleSubmitGuess}
            />
            <TouchableOpacity
              style={styles.submitButtonContainer}
              onPress={handleSubmitGuess}
              disabled={loading}
            >
              <LinearGradient
                colors={
                  colorScheme === 'dark' 
                    ? ['#1a5d7e', '#0a3d5e'] 
                    : [Colors.light.tint, '#085d7a']
                }
                style={styles.submitButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ThemedText style={styles.submitButtonText}>Submit</ThemedText>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          <ThemedView 
            style={[
              styles.bottomButtonContainer, 
              { 
                borderTopColor: Colors[colorScheme ?? "light"].border,
                backgroundColor: Colors[colorScheme ?? "light"].card 
              }
            ]}
          >
            <TouchableOpacity
              style={styles.nextButtonContainer}
              onPress={handleNextScripture}
            >
              <LinearGradient
                colors={
                  colorScheme === 'dark' 
                    ? ['#1a7e7e', '#0a5e5e'] 
                    : ['#0a9ea4', '#087d7a']
                }
                style={styles.nextButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <ThemedText style={styles.nextButtonText}>
                  {questionCount >= TOTAL_QUESTIONS ? "See Results" : "Next Scripture"}
                </ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </ThemedView>
        )}
      </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  scriptureContainer: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minHeight: 150, // Ensure there's always enough space
  },
  scriptureText: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: "Times New Roman",
    textAlign: "left",
  },
  spacer: {
    flex: 1,
  },
  inputContainer: {
    padding: 20,
    borderTopWidth: 1,
  },
  bottomButtonContainer: {
    padding: 20,
    borderTopWidth: 1,
  },
  guessLabel: {
    fontSize: 18,
    marginBottom: 16,
    textAlign: "center",
    fontWeight: "500",
  },
  guessInput: {
    width: "100%",
    padding: 15,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
  },
  submitButtonContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitButton: {
    width: "100%",
    padding: 15,
    alignItems: "center",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  resultContainer: {
    marginBottom: 20,
  },
  resultCard: {
    width: "100%",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e6f7e6",
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: {
    color: "#4CAF50",
    fontSize: 40,
    fontWeight: "bold",
    lineHeight: 40,
    textAlign: "center",
    textAlignVertical: "center",
  },
  xCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ffebee",
    justifyContent: "center",
    alignItems: "center",
  },
  xMark: {
    color: "#F44336",
    fontSize: 40,
    fontWeight: "bold",
    lineHeight: 40,
    textAlign: "center",
    textAlignVertical: "center",
  },
  correctText: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    fontFamily: "Times New Roman",
  },
  incorrectGuess: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
    fontFamily: "Times New Roman",
  },
  userGuessText: {
    fontWeight: "bold",
  },
  correctReference: {
    fontSize: 18,
    textAlign: "center",
    fontFamily: "Times New Roman",
  },
  correctAnswerText: {
    fontWeight: "bold",
  },
  nextButtonContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  nextButton: {
    width: "100%",
    padding: 15,
    alignItems: "center",
  },
  nextButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  fullReferenceLink: {
    marginTop: 12,
  },
  fullReferenceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  fullReferenceText: {
    color: "#888888",
    fontSize: 12,
    fontFamily: "Times New Roman",
  },
  fullReferenceIcon: {
    marginLeft: 3,
    color: "#888888",
  },
  // Summary screen styles
  summaryContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  summaryCard: {
    width: "100%",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  scoreText: {
    fontSize: 36,
    fontWeight: "bold",
    lineHeight: 44,
  },
  summaryMessage: {
    fontSize: 18,
    fontFamily: "Times New Roman",
  },
  summaryButtons: {
    width: "100%",
    marginTop: 24,
    gap: 12,
  },
  playAgainButtonContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  playAgainButton: {
    width: "100%",
    padding: 15,
    alignItems: "center",
  },
  playAgainButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  homeButtonContainer: {
    width: "100%",
  },
  homeButton: {
    width: "100%",
    padding: 15,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  shareButtonContainer: {
    width: "100%",
  },
  shareButton: {
    width: "100%",
    padding: 15,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  leaderboardButtonContainer: {
    width: "100%",
  },
  leaderboardButton: {
    width: "100%",
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
  },
  leaderboardButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  // Hidden shareable card styles
  shareCardWrapper: {
    position: 'absolute',
    left: -9999,
    top: -9999,
  },
  shareCard: {
    width: 350,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  shareImageContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
  },
  shareCardBanner: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  shareImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  shareScoreCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    position: 'absolute',
    top: 165,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -55,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  shareScoreText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  shareCardContent: {
    paddingTop: 70,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  shareCardMessage: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0a9ea4',
    letterSpacing: 1,
    marginBottom: 4,
  },
  shareCardDifficulty: {
    fontSize: 12,
    fontWeight: '400',
    color: '#999',
    marginBottom: 20,
    textTransform: 'lowercase',
  },
  shareBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  shareAppIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  shareAppName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  appStoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    gap: 4,
  },
  appStoreBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
});