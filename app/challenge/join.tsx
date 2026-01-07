import { useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { NicknameModal } from '@/components/NicknameModal';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useChallenge } from '@/hooks/useChallenge';
import { useAuth } from '@/contexts/AuthContext';
import { Challenge, GameMode } from '@/types/scripture';
import { getChallengeGradientColors, capitalize } from '@/utils/styleUtils';

export default function JoinChallengeScreen() {
  const colorScheme = useColorScheme();
  const { code: initialCode } = useLocalSearchParams<{ code?: string }>();
  const { userProfile, setNickname } = useAuth();
  const { getChallengeByCode, joinChallenge, isLoading, error } = useChallenge();

  const [code, setCode] = useState(initialCode?.toUpperCase() || '');
  const [foundChallenge, setFoundChallenge] = useState<Challenge | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);

  const colors = Colors[colorScheme ?? 'light'];

  // Auto-search if code is provided via deep link
  useEffect(() => {
    const autoSearch = async () => {
      if (initialCode && initialCode.length === 6) {
        const searchCode = initialCode.toUpperCase();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const challenge = await getChallengeByCode(searchCode);
        if (challenge) {
          setFoundChallenge(challenge);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    };
    autoSearch();
  }, [initialCode, getChallengeByCode]);

  const handleCodeChange = (text: string) => {
    // Only allow alphanumeric, convert to uppercase
    const cleaned = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    setCode(cleaned.slice(0, 6));
    // Reset found challenge if code changes
    if (foundChallenge) {
      setFoundChallenge(null);
    }
  };

  const handleSearch = async (codeToSearch?: string) => {
    const searchCode = codeToSearch || code;
    if (searchCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-character challenge code.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const challenge = await getChallengeByCode(searchCode);
    if (challenge) {
      setFoundChallenge(challenge);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const proceedWithJoin = async () => {
    if (!foundChallenge) return;

    setIsJoining(true);
    const success = await joinChallenge(foundChallenge);
    setIsJoining(false);

    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: '/game',
        params: {
          mode: foundChallenge.difficulty,
          challengeId: foundChallenge.id,
          isCreator: 'false',
        },
      });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Unable to Join',
        error || 'Failed to join challenge. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleJoin = async () => {
    if (!foundChallenge) return;

    if (!userProfile?.nickname) {
      setShowNicknameModal(true);
      return;
    }

    proceedWithJoin();
  };

  const handleNicknameSubmit = async (newNickname: string) => {
    try {
      await setNickname(newNickname);
      setShowNicknameModal(false);
      // Call proceedWithJoin directly - bypasses nickname check
      proceedWithJoin();
    } catch (err) {
      Alert.alert('Error', 'Failed to save nickname. Please try again.');
    }
  };

  const renderCodeInput = () => (
    <>
      <View style={[styles.iconContainer, { backgroundColor: colors.tint + '20' }]}>
        <Ionicons name="game-controller-outline" size={48} color={colors.tint} />
      </View>

      <ThemedText style={styles.title}>Join Challenge</ThemedText>
      <ThemedText style={styles.subtitle}>
        Enter the 6-character code from your friend
      </ThemedText>

      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.codeInput,
            {
              backgroundColor: colors.tint + '10',
              color: colors.text,
              borderColor: code.length === 6 ? colors.tint : 'transparent',
            },
          ]}
          value={code}
          onChangeText={handleCodeChange}
          placeholder="ABCDEF"
          placeholderTextColor={colors.text + '40'}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          keyboardType="default"
          textAlign="center"
          accessibilityLabel="Challenge code input"
          accessibilityHint="Enter the 6-character challenge code from your friend"
        />
      </View>

      <TouchableOpacity
        style={styles.buttonContainer}
        onPress={() => handleSearch()}
        disabled={code.length !== 6 || isLoading}
        accessibilityRole="button"
        accessibilityLabel="Search for challenge"
        accessibilityState={{ disabled: code.length !== 6 || isLoading }}
      >
        <LinearGradient
          colors={
            code.length === 6
              ? [colors.tint, colors.tint + 'dd']
              : [colors.tint + '60', colors.tint + '40']
          }
          style={styles.searchButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="search" size={24} color="white" />
              <ThemedText style={styles.searchButtonText}>Find Challenge</ThemedText>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </>
  );

  const renderFoundChallenge = () => (
    <>
      <View style={[styles.iconContainer, { backgroundColor: '#4CAF50' + '20' }]}>
        <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
      </View>

      <ThemedText style={styles.title}>Challenge Found!</ThemedText>

      <View style={[styles.challengeCard, { backgroundColor: colors.tint + '10' }]}>
        <View style={styles.challengerInfo}>
          {foundChallenge?.creatorPhotoURL ? (
            <Image
              source={{ uri: foundChallenge.creatorPhotoURL }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
              <ThemedText style={styles.avatarText}>
                {foundChallenge?.creatorNickname.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          )}
          <View style={styles.challengerText}>
            <ThemedText style={styles.challengerName}>
              {foundChallenge?.creatorNickname}
            </ThemedText>
            <ThemedText style={styles.challengerLabel}>challenges you!</ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.challengeDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="speedometer-outline" size={20} color={colors.tint} />
            <ThemedText style={styles.detailText}>
              {foundChallenge?.difficulty && capitalize(foundChallenge.difficulty)} Difficulty
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="help-circle-outline" size={20} color={colors.tint} />
            <ThemedText style={styles.detailText}>
              {foundChallenge?.questionCount} Questions
            </ThemedText>
          </View>
          {foundChallenge?.creatorScore !== undefined && (
            <View style={styles.detailRow}>
              <Ionicons name="trophy-outline" size={20} color={colors.tint} />
              <ThemedText style={styles.detailText}>
                Score to beat: {foundChallenge.creatorScore}/{foundChallenge.questionCount}
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.buttonContainer}
        onPress={handleJoin}
        disabled={isJoining}
      >
        <LinearGradient
          colors={getChallengeGradientColors(foundChallenge?.difficulty || 'easy', colorScheme)}
          style={styles.searchButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {isJoining ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="play" size={24} color="white" />
              <ThemedText style={styles.searchButtonText}>Accept Challenge</ThemedText>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setFoundChallenge(null);
        }}
      >
        <ThemedText style={[styles.backButtonText, { color: colors.tint }]}>
          Enter Different Code
        </ThemedText>
      </TouchableOpacity>
    </>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Join Challenge',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ThemedView style={styles.content}>
            {error && !foundChallenge && (
              <View style={[styles.errorBanner, { backgroundColor: '#ff4444' }]}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            )}

            {foundChallenge ? renderFoundChallenge() : renderCodeInput()}
          </ThemedView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <NicknameModal
        visible={showNicknameModal}
        onClose={() => setShowNicknameModal(false)}
        onSubmit={handleNicknameSubmit}
        initialNickname=""
        title="Set Nickname"
        subtitle="Choose a nickname to join this challenge"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingTop: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 32,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  codeInput: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 8,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  buttonContainer: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 18,
  },
  searchButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  challengeCard: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  challengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  challengerText: {
    flex: 1,
  },
  challengerName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  challengerLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  divider: {
    height: 1,
    backgroundColor: '#00000020',
    marginVertical: 12,
  },
  challengeDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    fontSize: 16,
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
