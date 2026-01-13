import { StyleSheet, Pressable, View, ActionSheetIOS, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { TutorialModal } from '@/components/TutorialModal';
import { DailyChallengeCard } from '@/components/DailyChallengeCard';
import { ProfileButton } from '@/components/ProfileButton';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTutorial } from '@/hooks/useTutorial';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import { Colors } from '@/constants/Colors';

// Icon for dark mode (light colored icon)
const darkModeIcon = require('@/assets/icons/splash-icon-light.png');
// Icon for light mode (dark colored icon)
const lightModeIcon = require('@/assets/icons/splash-icon-dark.png');

const DIFFICULTY_OPTIONS = [
  { mode: 'easy' as const, label: 'Easy' },
  { mode: 'medium' as const, label: 'Medium' },
  { mode: 'hard' as const, label: 'Hard' },
] as const;

// Animation spring config for natural feel
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Segmented control for difficulty selection
interface DifficultySegmentProps {
  mode: 'easy' | 'medium' | 'hard';
  label: string;
  isFirst: boolean;
  isLast: boolean;
  onPress: () => void;
  colorScheme: 'light' | 'dark' | null;
}

function DifficultySegment({ mode, label, isFirst, isLast, onPress, colorScheme }: DifficultySegmentProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, SPRING_CONFIG);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING_CONFIG);
  };

  // Get background color based on difficulty and theme
  const getSegmentStyle = () => {
    const isDark = colorScheme === 'dark';
    switch (mode) {
      case 'easy':
        return {
          backgroundColor: isDark ? '#92400e' : '#fef3c7',
          textColor: isDark ? 'white' : '#78350f',
        };
      case 'medium':
        return {
          backgroundColor: isDark ? '#b45309' : '#fcd34d',
          textColor: isDark ? 'white' : '#78350f',
        };
      case 'hard':
        return {
          backgroundColor: isDark ? '#c2410c' : '#f59e0b',
          textColor: 'white',
        };
    }
  };

  const segmentStyle = getSegmentStyle();

  return (
    <AnimatedPressable
      style={[
        styles.difficultySegment,
        { backgroundColor: segmentStyle.backgroundColor },
        isFirst && styles.segmentFirst,
        isLast && styles.segmentLast,
        animatedStyle,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={`${label} difficulty`}
      accessibilityHint={`Double tap to start a ${label.toLowerCase()} difficulty game`}
    >
      <ThemedText style={[styles.segmentText, { color: segmentStyle.textColor }]}>
        {label}
      </ThemedText>
    </AnimatedPressable>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const { showTutorial, dismissTutorial } = useTutorial();
  const { todayCompleted } = useDailyChallenge();

  const handleModeSelect = (mode: 'easy' | 'medium' | 'hard') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/game',
      params: { mode }
    });
  };

  const handleChallengeCreate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/challenge/create');
  };

  const handleChallengeJoin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/challenge/join');
  };

  const handleChallengeFriends = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Create Challenge', 'Join Challenge'],
          cancelButtonIndex: 0,
          title: 'Challenge Friends',
          message: 'Create a new challenge or join an existing one',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleChallengeCreate();
          } else if (buttonIndex === 2) {
            handleChallengeJoin();
          }
        }
      );
    } else {
      // Android fallback - simple alert with buttons
      Alert.alert(
        'Challenge Friends',
        'Create a new challenge or join an existing one',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Create Challenge', onPress: handleChallengeCreate },
          { text: 'Join Challenge', onPress: handleChallengeJoin },
        ]
      );
    }
  };

  const handleDailyChallengePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/game',
      params: {
        mode: 'daily',
        ...(todayCompleted && { showResults: 'true' })
      }
    });
  };

  // Warm accent color for Challenge section
  const warmAccent = colorScheme === 'dark' ? '#f59e0b' : '#b45309';
  const challengeRowBg = colorScheme === 'dark' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(180, 83, 9, 0.06)';

  // Get the icon based on the color scheme
  const iconSource = colorScheme === 'dark' ? darkModeIcon : lightModeIcon;

  // Challenge row press animation
  const challengeScale = useSharedValue(1);
  const challengeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: challengeScale.value }],
  }));

  const handleChallengeRowPressIn = () => {
    challengeScale.value = withSpring(0.98, SPRING_CONFIG);
  };

  const handleChallengeRowPressOut = () => {
    challengeScale.value = withSpring(1, SPRING_CONFIG);
  };

  // Get theme colors
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Compact inline header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={iconSource}
            style={styles.headerIcon}
            contentFit="contain"
            accessibilityLabel="Scripture Mastery app icon"
          />
          <ThemedText style={styles.headerTitle}>Scripture Mastery</ThemedText>
        </View>
        <ProfileButton onPress={() => router.push('/settings')} />
      </View>

      <View style={styles.content}>
        {/* Daily Challenge Card */}
        <DailyChallengeCard onPress={handleDailyChallengePress} />

        {/* Challenge Friends row */}
        <AnimatedPressable
          style={[
            styles.challengeRow,
            { backgroundColor: challengeRowBg },
            challengeAnimatedStyle,
          ]}
          onPress={handleChallengeFriends}
          onPressIn={handleChallengeRowPressIn}
          onPressOut={handleChallengeRowPressOut}
          accessibilityRole="button"
          accessibilityLabel="Challenge Friends"
          accessibilityHint="Double tap to create or join a challenge"
        >
          <Ionicons name="people-outline" size={24} color={warmAccent} />
          <ThemedText style={[styles.challengeRowText, { color: warmAccent }]}>
            Challenge Friends
          </ThemedText>
          <Ionicons name="chevron-forward" size={20} color={warmAccent} style={{ opacity: 0.6 }} />
        </AnimatedPressable>

        {/* Practice Mode section */}
        <ThemedText style={styles.sectionTitle}>Practice Mode</ThemedText>

        {/* Segmented difficulty control */}
        <View style={styles.difficultyContainer}>
          {DIFFICULTY_OPTIONS.map(({ mode, label }, index) => (
            <DifficultySegment
              key={mode}
              mode={mode}
              label={label}
              isFirst={index === 0}
              isLast={index === DIFFICULTY_OPTIONS.length - 1}
              onPress={() => handleModeSelect(mode)}
              colorScheme={colorScheme}
            />
          ))}
        </View>
      </View>

      <TutorialModal visible={showTutorial} onDismiss={dismissTutorial} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 44,
    height: 44,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  difficultyContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    // Subtle shadow
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  difficultySegment: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentFirst: {
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  segmentLast: {
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },
  segmentText: {
    fontSize: 16,
    fontWeight: '600',
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.15)',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.6,
    marginBottom: 10,
    marginLeft: 4,
  },
  challengeRowText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
  },
});
