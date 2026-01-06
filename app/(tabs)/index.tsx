import { StyleSheet, Pressable, View, AccessibilityInfo, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TutorialModal } from '@/components/TutorialModal';
import { DailyChallengeCard } from '@/components/DailyChallengeCard';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTutorial } from '@/hooks/useTutorial';

// Constants
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
// Icon for dark mode (light colored icon)
const darkModeIcon = require('@/assets/icons/splash-icon-light.png');
// Icon for light mode (dark colored icon)
const lightModeIcon = require('@/assets/icons/splash-icon-dark.png');

const DIFFICULTY_OPTIONS = [
  { mode: 'easy' as const, label: 'Easy', description: 'Guess the book' },
  { mode: 'medium' as const, label: 'Medium', description: 'Guess the book and chapter' },
  { mode: 'hard' as const, label: 'Hard', description: 'Guess the book, chapter, and verse' },
] as const;

// Animation spring config for natural feel
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
};

// Animated pressable for difficulty cards
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface DifficultyCardProps {
  mode: 'easy' | 'medium' | 'hard';
  label: string;
  description: string;
  index: number;
  onPress: () => void;
  gradientColors: readonly [string, string];
  textColor: string;
  accentColor: string;
}

function DifficultyCard({ mode, label, description, index, onPress, gradientColors, textColor, accentColor }: DifficultyCardProps) {
  // Entrance animation
  const translateY = useSharedValue(30);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Staggered entrance animation with slightly increased delay
    const delay = index * 120;
    translateY.value = withDelay(delay, withSpring(0, { damping: 20, stiffness: 90 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, SPRING_CONFIG);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING_CONFIG);
  };

  return (
    <AnimatedPressable
      style={[styles.buttonContainer, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={`${label} difficulty. ${description}`}
      accessibilityHint={`Double tap to start a ${label.toLowerCase()} difficulty game`}
    >
      {/* Left accent border for visual hierarchy */}
      <View style={[styles.accentBorder, { backgroundColor: accentColor }]} />
      <LinearGradient
        colors={gradientColors}
        style={styles.modeButton}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.modeButtonContent}>
          <View style={styles.modeTextContainer}>
            <ThemedText style={[styles.modeButtonText, { color: textColor }]}>{label}</ThemedText>
            <ThemedText style={[styles.modeDescription, { color: textColor, opacity: 0.85 }]}>{description}</ThemedText>
          </View>
          <Ionicons
            name="chevron-forward"
            size={22}
            color={textColor}
            style={{ opacity: 0.7 }}
          />
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
}

interface ChallengeCardButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  accentColor: string;
  backgroundColor: string;
  delay: number;
}

function ChallengeCardButton({ icon, title, subtitle, onPress, accentColor, backgroundColor, delay }: ChallengeCardButtonProps) {
  const translateY = useSharedValue(20);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    translateY.value = withDelay(delay, withSpring(0, { damping: 20, stiffness: 90 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, SPRING_CONFIG);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING_CONFIG);
  };

  return (
    <AnimatedPressable
      style={[styles.challengeCardButton, { backgroundColor }, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={`Double tap to ${title.toLowerCase()} a challenge`}
    >
      <View style={[styles.challengeCardIconContainer, { backgroundColor: accentColor + '20' }]}>
        <Ionicons name={icon} size={24} color={accentColor} />
      </View>
      <View style={styles.challengeCardTextContainer}>
        <ThemedText style={[styles.challengeCardTitle, { color: accentColor }]}>{title}</ThemedText>
        <ThemedText style={styles.challengeCardSubtitle}>{subtitle}</ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={accentColor} style={{ opacity: 0.6 }} />
    </AnimatedPressable>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const { showTutorial, dismissTutorial } = useTutorial();
  const [reduceMotion, setReduceMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  // Hero icon breathing animation
  const iconScale = useSharedValue(1);
  const iconTranslateY = useSharedValue(0);
  const glowOpacity = useSharedValue(0.5);  // Increased for better visibility

  useEffect(() => {
    if (reduceMotion) return;

    // Subtle breathing/float animation
    iconScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    iconTranslateY.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.45, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [reduceMotion]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { translateY: iconTranslateY.value },
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

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

  const handleDailyChallengePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/game', params: { mode: 'daily' } });
  };

  // Enhanced gradient colors with better contrast and hierarchy
  const getGradientColors = (mode: 'easy' | 'medium' | 'hard'): readonly [string, string] => {
    if (colorScheme === 'dark') {
      switch (mode) {
        case 'easy':
          return ['#92400e', '#78350f'] as const;   // Rich amber browns
        case 'medium':
          return ['#b45309', '#92400e'] as const;   // Amber transition
        case 'hard':
          return ['#d97706', '#b45309'] as const;   // Vibrant orange
        default:
          return ['#b45309', '#92400e'] as const;
      }
    } else {
      switch (mode) {
        case 'easy':
          return ['#fef3c7', '#fcd34d'] as const;   // Brighter confident yellow
        case 'medium':
          return ['#fcd34d', '#f59e0b'] as const;   // Golden to amber
        case 'hard':
          return ['#f59e0b', '#c2410c'] as const;   // Rich burnt orange
        default:
          return ['#fcd34d', '#f59e0b'] as const;
      }
    }
  };

  // Left accent border colors for visual hierarchy
  const getAccentColor = (mode: 'easy' | 'medium' | 'hard'): string => {
    switch (mode) {
      case 'easy':
        return colorScheme === 'dark' ? '#fbbf24' : '#eab308';    // Gold
      case 'medium':
        return colorScheme === 'dark' ? '#f59e0b' : '#d97706';    // Amber
      case 'hard':
        return colorScheme === 'dark' ? '#ea580c' : '#c2410c';    // Burnt orange
      default:
        return colorScheme === 'dark' ? '#f59e0b' : '#d97706';
    }
  };

  // Text color for buttons
  const getButtonTextColor = (mode: 'easy' | 'medium' | 'hard'): string => {
    if (colorScheme === 'dark') return 'white';
    return mode === 'easy' ? '#78350f' : 'white';
  };

  // Warm accent color for Challenge section
  const warmAccent = colorScheme === 'dark' ? '#f59e0b' : '#b45309';
  const challengeCardBg = colorScheme === 'dark' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(180, 83, 9, 0.06)';

  // Glow colors for hero
  const glowColors = colorScheme === 'dark'
    ? ['transparent', 'rgba(245, 158, 11, 0.3)', 'transparent'] as const
    : ['transparent', 'rgba(251, 191, 36, 0.4)', 'transparent'] as const;

  // Get the icon based on the color scheme
  const iconSource = colorScheme === 'dark' ? darkModeIcon : lightModeIcon;

  return (
    <SafeAreaView style={styles.container}>
      {/* Hero Section */}
      <ThemedView style={styles.header}>
        {/* Icon with glow effect */}
        <View style={styles.iconWrapper}>
          {/* Soft glow background */}
          <Animated.View style={[styles.glowContainer, glowAnimatedStyle]}>
            <LinearGradient
              colors={glowColors}
              style={styles.glowGradient}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
          </Animated.View>

          {/* Animated icon */}
          <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
            <Image
              source={iconSource}
              style={styles.icon}
              contentFit="contain"
              transition={300}
              accessibilityLabel="Scripture Mastery app icon"
            />
          </Animated.View>
        </View>

        {/* Modern typography */}
        <ThemedText style={styles.title}>Scripture Mastery</ThemedText>
      </ThemedView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <DailyChallengeCard
          onPress={handleDailyChallengePress}
        />

        <ThemedText style={styles.subtitle}>Select Difficulty</ThemedText>

        {DIFFICULTY_OPTIONS.map(({ mode, label, description }, index) => (
          <DifficultyCard
            key={mode}
            mode={mode}
            label={label}
            description={description}
            index={index}
            onPress={() => handleModeSelect(mode)}
            gradientColors={getGradientColors(mode)}
            textColor={getButtonTextColor(mode)}
            accentColor={getAccentColor(mode)}
          />
        ))}

        {/* Challenge Friends Section */}
        <View style={styles.challengeSection}>
          <ThemedText style={styles.challengeSectionTitle}>Challenge Friends</ThemedText>

          <ChallengeCardButton
            icon="add-circle-outline"
            title="Create Challenge"
            subtitle="Send a challenge to friends"
            onPress={handleChallengeCreate}
            accentColor={warmAccent}
            backgroundColor={challengeCardBg}
            delay={350}
          />

          <ChallengeCardButton
            icon="enter-outline"
            title="Join Challenge"
            subtitle="Enter a challenge code"
            onPress={handleChallengeJoin}
            accentColor={warmAccent}
            backgroundColor={challengeCardBg}
            delay={450}
          />
        </View>
      </ScrollView>

      <ThemedView style={styles.footer}>
        <ThemedText style={styles.versionText}>v{APP_VERSION}</ThemedText>
      </ThemedView>

      <TutorialModal visible={showTutorial} onDismiss={dismissTutorial} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 24,  // Increased for better visual separation
    paddingHorizontal: 20,
  },
  iconWrapper: {
    position: 'relative',
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
  },
  iconContainer: {
    width: 130,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginTop: 4,
    paddingTop: 4
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,  // Consistent with safe area guidelines
    paddingTop: 8,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 14,  // Tighter grouping
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',  // For accent border
    // Enhanced shadow for better depth
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
  },
  accentBorder: {
    width: 3,
    // backgroundColor set inline
  },
  modeButton: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  modeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeTextContainer: {
    flex: 1,
  },
  modeButtonText: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  modeDescription: {
    fontSize: 14,
    fontWeight: '400',
  },
  footer: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 13,
    opacity: 0.5,
  },
  challengeSection: {
    width: '100%',
    marginTop: 32,
    paddingTop: 24,
  },
  challengeSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  challengeCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.15)',
  },
  challengeCardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  challengeCardTextContainer: {
    flex: 1,
  },
  challengeCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  challengeCardSubtitle: {
    fontSize: 13,
    opacity: 0.6,
  },
});
