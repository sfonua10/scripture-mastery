import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Linking,
  View,
  Alert,
  Platform,
  ScrollView,
  Switch,
  Animated,
  LayoutAnimation,
  UIManager,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TutorialModal } from '@/components/TutorialModal';
import { NicknameModal } from '@/components/NicknameModal';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTutorial } from '@/hooks/useTutorial';
import { useTheme, ThemePreference } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Constants
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const ICON_SIZE = 20;
const SECTION_ICON_SIZE = 18;

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

// Section configuration with icons
const SECTION_CONFIG = {
  appearance: { icon: 'color-palette-outline' as const, title: 'Appearance' },
  sound: { icon: 'volume-high-outline' as const, title: 'Sound' },
  leaderboard: { icon: 'trophy-outline' as const, title: 'Leaderboard' },
  account: { icon: 'person-outline' as const, title: 'Account' },
  resources: { icon: 'book-outline' as const, title: 'Resources' },
  about: { icon: 'information-circle-outline' as const, title: 'About' },
};

// Helper function to get score color
const getScoreColor = (score: number): string => {
  if (score >= 8) return '#4CAF50'; // Green
  if (score >= 5) return '#FFA726'; // Amber
  return '#EF5350'; // Red
};

// Section Header Component
interface SectionHeaderProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  showDivider?: boolean;
  tintColor: string;
  borderColor: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, showDivider, tintColor, borderColor }) => (
  <View style={styles.sectionHeaderContainer}>
    {showDivider && <View style={[styles.sectionDivider, { backgroundColor: borderColor }]} />}
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={SECTION_ICON_SIZE} color={tintColor} style={styles.sectionIcon} />
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
    </View>
  </View>
);

// Settings Card Container
interface SettingsCardProps {
  children: React.ReactNode;
  cardColor: string;
  borderColor: string;
}

const SettingsCard: React.FC<SettingsCardProps> = ({ children, cardColor, borderColor }) => (
  <View style={[styles.settingsCard, { backgroundColor: cardColor, borderColor }]}>
    {children}
  </View>
);

// Settings Row Component
interface SettingsRowProps {
  label: string;
  subtitle?: string;
  onPress?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  rightIconColor?: string;
  showChevron?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  disabled?: boolean;
  colors: typeof Colors.light;
  children?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const SettingsRow: React.FC<SettingsRowProps> = ({
  label,
  subtitle,
  onPress,
  rightIcon,
  rightIconColor,
  showChevron = false,
  isFirst = false,
  isLast = false,
  disabled = false,
  colors,
  children,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const content = (
    <View
      style={[
        styles.settingsRow,
        isFirst && styles.settingsRowFirst,
        isLast && styles.settingsRowLast,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.settingsRowContent}>
        <ThemedText style={styles.settingLabel}>{label}</ThemedText>
        {subtitle && (
          <ThemedText style={[styles.settingSubtitle, { color: colors.text, opacity: 0.5 }]}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      <View style={styles.settingsRowRight}>
        {children}
        {rightIcon && (
          <Ionicons name={rightIcon} size={ICON_SIZE} color={rightIconColor || colors.tint} />
        )}
        {showChevron && (
          <Ionicons name="chevron-forward" size={ICON_SIZE} color={colors.icon} style={styles.chevronIcon} />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={disabled ? styles.disabledRow : undefined}
        accessibilityLabel={accessibilityLabel || label}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// Progress Bar Component for High Scores
interface ScoreProgressBarProps {
  label: string;
  score: number;
  maxScore: number;
}

const ScoreProgressBar: React.FC<ScoreProgressBarProps> = ({ label, score, maxScore }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const scoreColor = getScoreColor(score);

  useEffect(() => {
    Animated.spring(progress, {
      toValue: score / maxScore,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  }, [score, maxScore]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.scoreProgressContainer}>
      <View style={styles.scoreProgressHeader}>
        <ThemedText style={styles.scoreProgressLabel}>{label}</ThemedText>
        <ThemedText style={[styles.scoreProgressValue, { color: scoreColor }]}>
          {score}/{maxScore}
        </ThemedText>
      </View>
      <View style={styles.scoreProgressTrack}>
        <Animated.View
          style={[
            styles.scoreProgressFill,
            { width, backgroundColor: scoreColor },
          ]}
        />
      </View>
    </View>
  );
};

// Theme Pill Selector Component
interface ThemePillSelectorProps {
  preference: ThemePreference;
  onSelect: (value: ThemePreference) => void;
  colors: typeof Colors.light;
}

const ThemePillSelector: React.FC<ThemePillSelectorProps> = ({ preference, onSelect, colors }) => {
  const slideAnim = useRef(new Animated.Value(
    THEME_OPTIONS.findIndex(opt => opt.value === preference)
  )).current;

  const handleSelect = (value: ThemePreference, index: number) => {
    Animated.spring(slideAnim, {
      toValue: index,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
    onSelect(value);
  };

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, 1, 2].map(i => i * (PILL_WIDTH + 4)),
  });

  return (
    <View style={[styles.themePillContainer, { backgroundColor: colors.border + '40' }]}>
      <Animated.View
        style={[
          styles.themePillIndicator,
          {
            backgroundColor: colors.tint,
            transform: [{ translateX }],
          },
        ]}
      />
      {THEME_OPTIONS.map((option, index) => (
        <TouchableOpacity
          key={option.value}
          style={styles.themePillOption}
          onPress={() => handleSelect(option.value, index)}
          accessibilityLabel={`${option.label} theme`}
          accessibilityRole="button"
          accessibilityState={{ selected: preference === option.value }}
        >
          <Ionicons
            name={option.icon}
            size={18}
            color={preference === option.value ? '#FFFFFF' : colors.icon}
          />
          <ThemedText
            style={[
              styles.themePillLabel,
              preference === option.value && styles.themePillLabelSelected,
            ]}
          >
            {option.label}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Account Status Badge Component
interface AccountBadgeProps {
  provider: 'anonymous' | 'google' | 'apple';
  colors: typeof Colors.light;
}

const AccountBadge: React.FC<AccountBadgeProps> = ({ provider, colors }) => {
  const isConnected = provider !== 'anonymous';
  const badgeColor = isConnected ? '#4CAF50' : colors.icon;
  const badgeIcon = isConnected ? 'checkmark-circle' : 'person-outline';
  const badgeText = provider === 'google' ? 'Google' : provider === 'apple' ? 'Apple' : 'Guest';

  return (
    <View style={[styles.accountBadge, { backgroundColor: badgeColor + '20', borderColor: badgeColor }]}>
      <Ionicons name={badgeIcon as keyof typeof Ionicons.glyphMap} size={14} color={badgeColor} />
      <ThemedText style={[styles.accountBadgeText, { color: badgeColor }]}>{badgeText}</ThemedText>
    </View>
  );
};

// Pill width calculation (for 3 options in container)
const PILL_WIDTH = 100;

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { showTutorial, dismissTutorial, openTutorial } = useTutorial();
  const { preference, setPreference, soundEnabled, setSoundEnabled } = useTheme();
  const {
    nickname,
    hasJoinedLeaderboard,
    setNickname,
    localHighScores,
    authProvider,
    googleEmail,
    isGoogleLoading,
    linkGoogleAccount,
    isAppleAvailable,
    isAppleLoading,
    linkAppleAccount,
    signOut,
  } = useAuth();
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  const handleUpgradeToGoogle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await linkGoogleAccount();
    } catch (error) {
      Alert.alert('Error', 'Failed to sign in with Google. Please try again.');
    }
  };

  const handleUpgradeToApple = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await linkAppleAccount();
    } catch (error) {
      Alert.alert('Error', 'Failed to sign in with Apple. Please try again.');
    }
  };

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Sign Out',
      'Your scores are saved and will be available when you sign back in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        },
      ]
    );
  };

  const handleLearnMorePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('https://www.churchofjesuschrist.org/study/scriptures?lang=eng');
  };

  const handleContactPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const email = 'admin@deseretcodestudios.com';
    const emailUrl = `mailto:${email}?subject=Scripture%20Mastery%20App%20Feedback`;

    try {
      await Linking.openURL(emailUrl);
    } catch (error) {
      Alert.alert(
        "Contact Information",
        `Please email us at: ${email}`
      );
    }
  };

  const handleThemeChange = (value: ThemePreference) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!reduceMotion) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setPreference(value);
  };

  const handleSoundToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSoundEnabled(value);
  };

  const handleOpenTutorial = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    openTutorial();
  };

  const handleEditNickname = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowNicknameModal(true);
  };

  const handleNicknameSubmit = async (newNickname: string) => {
    try {
      await setNickname(newNickname);
      setShowNicknameModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save nickname. Please try again.');
    }
  };

  const handleViewLeaderboard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/leaderboard');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: "Settings",
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.tint,
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance Section */}
        <View style={styles.section}>
          <SectionHeader
            icon={SECTION_CONFIG.appearance.icon}
            title={SECTION_CONFIG.appearance.title}
            tintColor={colors.tint}
            borderColor={colors.border}
          />
          <SettingsCard cardColor={colors.card} borderColor={colors.border}>
            <View style={styles.themeSettingRow}>
              <ThemedText style={styles.settingLabel}>Theme</ThemedText>
              <ThemePillSelector
                preference={preference}
                onSelect={handleThemeChange}
                colors={colors}
              />
            </View>
          </SettingsCard>
        </View>

        {/* Sound Section */}
        <View style={styles.section}>
          <SectionHeader
            icon={SECTION_CONFIG.sound.icon}
            title={SECTION_CONFIG.sound.title}
            showDivider
            tintColor={colors.tint}
            borderColor={colors.border}
          />
          <SettingsCard cardColor={colors.card} borderColor={colors.border}>
            <SettingsRow
              label="Sound Effects"
              subtitle="Play sounds for correct/wrong answers"
              colors={colors}
              isFirst
              isLast
              accessibilityLabel="Sound Effects toggle"
              accessibilityHint="Double tap to toggle sound effects"
            >
              <Switch
                value={soundEnabled}
                onValueChange={handleSoundToggle}
                trackColor={{ false: colors.border, true: colors.tint + '60' }}
                thumbColor={soundEnabled ? colors.tint : '#f4f3f4'}
                accessibilityLabel="Sound effects"
              />
            </SettingsRow>
          </SettingsCard>
        </View>

        {/* Leaderboard Section */}
        <View style={styles.section}>
          <SectionHeader
            icon={SECTION_CONFIG.leaderboard.icon}
            title={SECTION_CONFIG.leaderboard.title}
            showDivider
            tintColor={colors.tint}
            borderColor={colors.border}
          />
          <SettingsCard cardColor={colors.card} borderColor={colors.border}>
            <SettingsRow
              label={hasJoinedLeaderboard ? 'Nickname' : 'Join Leaderboard'}
              subtitle={nickname || undefined}
              onPress={handleEditNickname}
              rightIcon={hasJoinedLeaderboard ? 'pencil-outline' : 'add-circle-outline'}
              showChevron
              colors={colors}
              isFirst
              accessibilityLabel={hasJoinedLeaderboard ? `Nickname: ${nickname}` : 'Join Leaderboard'}
              accessibilityHint="Double tap to edit your nickname"
            />
            <SettingsRow
              label="View Leaderboard"
              onPress={handleViewLeaderboard}
              rightIcon="podium-outline"
              showChevron
              colors={colors}
              isLast={!hasJoinedLeaderboard}
              accessibilityHint="Double tap to view the leaderboard"
            />
            {hasJoinedLeaderboard && (
              <View style={[styles.highScoresSection, { borderTopColor: colors.border }]}>
                <ThemedText style={[styles.highScoresSectionTitle, { color: colors.text }]}>
                  Your High Scores
                </ThemedText>
                <View style={styles.highScoresGrid}>
                  <ScoreProgressBar label="Easy" score={localHighScores.easy} maxScore={10} />
                  <ScoreProgressBar label="Medium" score={localHighScores.medium} maxScore={10} />
                  <ScoreProgressBar label="Hard" score={localHighScores.hard} maxScore={10} />
                </View>
              </View>
            )}
          </SettingsCard>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <SectionHeader
            icon={SECTION_CONFIG.account.icon}
            title={SECTION_CONFIG.account.title}
            showDivider
            tintColor={colors.tint}
            borderColor={colors.border}
          />
          <SettingsCard cardColor={colors.card} borderColor={colors.border}>
            <View style={styles.accountStatusRow}>
              <View style={styles.accountStatusContent}>
                <ThemedText style={styles.settingLabel}>Account Status</ThemedText>
                {googleEmail && (authProvider === 'google' || authProvider === 'apple') && (
                  <ThemedText style={[styles.accountEmail, { color: colors.text }]}>
                    {googleEmail}
                  </ThemedText>
                )}
              </View>
              <AccountBadge provider={authProvider} colors={colors} />
            </View>

            {authProvider === 'anonymous' && (
              <>
                <View style={[styles.accountDivider, { backgroundColor: colors.border }]} />
                <ThemedText style={[styles.accountUpgradeHint, { color: colors.text }]}>
                  Sign in to sync your scores across devices
                </ThemedText>
                {Platform.OS === 'ios' && isAppleAvailable && (
                  <TouchableOpacity
                    style={[styles.signInButton, styles.appleSignInButton]}
                    onPress={handleUpgradeToApple}
                    disabled={isAppleLoading || isGoogleLoading}
                    accessibilityLabel="Sign in with Apple"
                    accessibilityRole="button"
                  >
                    <Ionicons name="logo-apple" size={ICON_SIZE} color="#FFFFFF" />
                    <ThemedText style={styles.signInButtonText}>Sign in with Apple</ThemedText>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.signInButton, styles.googleSignInButton]}
                  onPress={handleUpgradeToGoogle}
                  disabled={isGoogleLoading || isAppleLoading}
                  accessibilityLabel="Sign in with Google"
                  accessibilityRole="button"
                >
                  <Ionicons name="logo-google" size={ICON_SIZE} color="#FFFFFF" />
                  <ThemedText style={styles.signInButtonText}>Sign in with Google</ThemedText>
                </TouchableOpacity>
              </>
            )}

            {(authProvider === 'google' || authProvider === 'apple') && (
              <>
                <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                <SettingsRow
                  label="Sign Out"
                  onPress={handleSignOut}
                  rightIcon="log-out-outline"
                  rightIconColor="#DC3545"
                  colors={colors}
                  isLast
                  accessibilityHint="Double tap to sign out of your account"
                >
                  <ThemedText style={[styles.settingLabel, { color: '#DC3545' }]} />
                </SettingsRow>
              </>
            )}
          </SettingsCard>
        </View>

        {/* Resources Section */}
        <View style={styles.section}>
          <SectionHeader
            icon={SECTION_CONFIG.resources.icon}
            title={SECTION_CONFIG.resources.title}
            showDivider
            tintColor={colors.tint}
            borderColor={colors.border}
          />
          <SettingsCard cardColor={colors.card} borderColor={colors.border}>
            <SettingsRow
              label="Learn More"
              subtitle="Study scriptures online"
              onPress={handleLearnMorePress}
              rightIcon="open-outline"
              showChevron
              colors={colors}
              isFirst
              accessibilityHint="Opens the Church scripture study website"
            />
            <SettingsRow
              label="How to Play"
              subtitle="View the tutorial"
              onPress={handleOpenTutorial}
              rightIcon="help-circle-outline"
              showChevron
              colors={colors}
              isLast
              accessibilityHint="Opens the tutorial modal"
            />
          </SettingsCard>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <SectionHeader
            icon={SECTION_CONFIG.about.icon}
            title={SECTION_CONFIG.about.title}
            showDivider
            tintColor={colors.tint}
            borderColor={colors.border}
          />
          <SettingsCard cardColor={colors.card} borderColor={colors.border}>
            <SettingsRow
              label="Version"
              colors={colors}
              isFirst
            >
              <ThemedText style={[styles.versionValue, { color: colors.text }]}>
                {APP_VERSION}
              </ThemedText>
            </SettingsRow>
            <SettingsRow
              label="Contact Us"
              subtitle="Send feedback or report issues"
              onPress={handleContactPress}
              rightIcon="mail-outline"
              showChevron
              colors={colors}
              isLast
              accessibilityHint="Opens email to contact support"
            />
          </SettingsCard>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText style={[styles.footerText, { color: colors.text }]}>
            Scripture Mastery v{APP_VERSION}
          </ThemedText>
        </View>
      </ScrollView>

      <TutorialModal visible={showTutorial} onDismiss={dismissTutorial} />

      <NicknameModal
        visible={showNicknameModal}
        onClose={() => setShowNicknameModal(false)}
        onSubmit={handleNicknameSubmit}
        initialNickname={nickname || ''}
        title={hasJoinedLeaderboard ? 'Edit Nickname' : 'Join Leaderboard'}
        subtitle={hasJoinedLeaderboard ? 'Change your display name' : 'Choose a nickname to compete on the leaderboard'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Section Styles
  section: {
    marginTop: 32,
  },
  sectionHeaderContainer: {
    marginHorizontal: 16,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
  },

  // Settings Card Styles
  settingsCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Settings Row Styles
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  settingsRowFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  settingsRowLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  settingsRowContent: {
    flex: 1,
    marginRight: 12,
  },
  settingsRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  chevronIcon: {
    marginLeft: 8,
  },
  disabledRow: {
    opacity: 0.5,
  },

  // Theme Pill Selector Styles
  themeSettingRow: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  themePillContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginTop: 12,
    position: 'relative',
  },
  themePillIndicator: {
    position: 'absolute',
    width: PILL_WIDTH,
    height: '100%',
    borderRadius: 8,
    top: 4,
    left: 4,
  },
  themePillOption: {
    width: PILL_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    zIndex: 1,
  },
  themePillLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  themePillLabelSelected: {
    color: '#FFFFFF',
  },

  // High Scores Styles
  highScoresSection: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  highScoresSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.6,
    marginBottom: 16,
  },
  highScoresGrid: {
    gap: 12,
  },
  scoreProgressContainer: {
    marginBottom: 4,
  },
  scoreProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scoreProgressLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  scoreProgressValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  scoreProgressTrack: {
    height: 8,
    backgroundColor: 'rgba(128, 128, 128, 0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreProgressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Account Section Styles
  accountStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  accountStatusContent: {
    flex: 1,
  },
  accountEmail: {
    fontSize: 13,
    opacity: 0.5,
    marginTop: 2,
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  accountBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  accountDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  accountUpgradeHint: {
    fontSize: 13,
    opacity: 0.6,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 14,
    borderRadius: 10,
  },
  appleSignInButton: {
    backgroundColor: '#000000',
  },
  googleSignInButton: {
    backgroundColor: '#4285F4',
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
  },

  // Version & Footer Styles
  versionValue: {
    fontSize: 16,
    opacity: 0.5,
  },
  footer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    opacity: 0.4,
  },
});
