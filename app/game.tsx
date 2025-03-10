import React, { useState, useEffect } from "react";
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
  ScrollView, // Import ScrollView component
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { GameMode, Scripture } from "@/types/scripture";
import {
  getRandomScripture,
  getNextRandomScripture,
  checkGuess,
} from "@/utils/scriptureUtils";
import { Ionicons } from "@expo/vector-icons";

export default function GameScreen() {
  const { mode } = useLocalSearchParams<{ mode: GameMode }>();
  const colorScheme = useColorScheme();

  const [currentScripture, setCurrentScripture] = useState<Scripture | null>(
    null
  );
  const [userGuess, setUserGuess] = useState("");
  const [hasGuessed, setHasGuessed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Select a random scripture when the component mounts
    setCurrentScripture(getRandomScripture());
  }, []);

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

      // Provide haptic feedback based on result
      if (correct) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }, 500);
  };

  const handleNextScripture = () => {
    if (!currentScripture) return;

    // Select a new random scripture
    setCurrentScripture(getNextRandomScripture(currentScripture));
    setUserGuess("");
    setHasGuessed(false);
    setIsCorrect(false);
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
          title: getDifficultyTitle(),
          headerBackTitle: "Home",
          headerStyle: {
            backgroundColor: Colors[colorScheme ?? "light"].background,
          },
          headerTintColor: Colors[colorScheme ?? "light"].tint,
          headerShadowVisible: false,
        }}
      />

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
                  Next Scripture
                </ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </ThemedView>
        )}
      </KeyboardAvoidingView>
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
});