import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, Linking, View, Alert, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TutorialModal } from '@/components/TutorialModal';
import { NicknameModal } from '@/components/NicknameModal';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTutorial } from '@/hooks/useTutorial';
import { useTheme, ThemePreference } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const { showTutorial, dismissTutorial, openTutorial } = useTutorial();
  const { preference, setPreference } = useTheme();
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

  const handleUpgradeToGoogle = async () => {
    try {
      await linkGoogleAccount();
    } catch (error) {
      Alert.alert('Error', 'Failed to sign in with Google. Please try again.');
    }
  };

  const handleUpgradeToApple = async () => {
    try {
      await linkAppleAccount();
    } catch (error) {
      Alert.alert('Error', 'Failed to sign in with Apple. Please try again.');
    }
  };

  const handleSignOut = () => {
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

  const themeOptions: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'light', label: 'Light', icon: 'sunny-outline' },
    { value: 'dark', label: 'Dark', icon: 'moon-outline' },
    { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
  ];

  const handleLearnMorePress = () => {
    Linking.openURL('https://www.churchofjesuschrist.org/study/scriptures?lang=eng');
  };
  
  const handleContactPress = async () => {
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

  const handleNicknameSubmit = async (newNickname: string) => {
    await setNickname(newNickname);
    setShowNicknameModal(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: "Settings",
          headerStyle: {
            backgroundColor: Colors[colorScheme ?? "light"].background,
          },
          headerTintColor: Colors[colorScheme ?? "light"].tint,
          headerShadowVisible: false,
        }}
      />

      <ScrollView>
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Appearance</ThemedText>

        <ThemedView
          style={[
            styles.themeContainer,
            {
              borderColor: Colors[colorScheme ?? 'light'].border,
              backgroundColor: Colors[colorScheme ?? 'light'].card
            }
          ]}
        >
          {themeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.themeOption,
                preference === option.value && {
                  backgroundColor: Colors[colorScheme ?? 'light'].tint + '20',
                  borderColor: Colors[colorScheme ?? 'light'].tint,
                },
              ]}
              onPress={() => setPreference(option.value)}
            >
              <Ionicons
                name={option.icon}
                size={24}
                color={preference === option.value
                  ? Colors[colorScheme ?? 'light'].tint
                  : Colors[colorScheme ?? 'light'].icon}
              />
              <ThemedText
                style={[
                  styles.themeLabel,
                  preference === option.value && { color: Colors[colorScheme ?? 'light'].tint }
                ]}
              >
                {option.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Leaderboard</ThemedText>

        <TouchableOpacity
          style={[
            styles.settingContainer,
            {
              borderColor: Colors[colorScheme ?? 'light'].border,
              backgroundColor: Colors[colorScheme ?? 'light'].card
            }
          ]}
          onPress={() => setShowNicknameModal(true)}
        >
          <View>
            <ThemedText style={styles.settingLabel}>
              {hasJoinedLeaderboard ? 'Nickname' : 'Join Leaderboard'}
            </ThemedText>
            {nickname && (
              <ThemedText style={[styles.nicknameValue, { opacity: 0.6 }]}>
                {nickname}
              </ThemedText>
            )}
          </View>
          <View style={styles.iconContainer}>
            <Ionicons
              name={hasJoinedLeaderboard ? 'pencil-outline' : 'trophy-outline'}
              size={20}
              color={Colors[colorScheme ?? 'light'].tint}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.settingContainer,
            {
              borderColor: Colors[colorScheme ?? 'light'].border,
              backgroundColor: Colors[colorScheme ?? 'light'].card
            }
          ]}
          onPress={() => router.push('/(tabs)/leaderboard')}
        >
          <ThemedText style={styles.settingLabel}>View Leaderboard</ThemedText>
          <View style={styles.iconContainer}>
            <Ionicons
              name="podium-outline"
              size={20}
              color={Colors[colorScheme ?? 'light'].tint}
            />
          </View>
        </TouchableOpacity>

        {hasJoinedLeaderboard && (
          <ThemedView
            style={[
              styles.highScoresContainer,
              {
                borderColor: Colors[colorScheme ?? 'light'].border,
                backgroundColor: Colors[colorScheme ?? 'light'].card
              }
            ]}
          >
            <ThemedText style={styles.highScoresTitle}>Your High Scores</ThemedText>
            <View style={styles.highScoresRow}>
              <View style={styles.highScoreItem}>
                <ThemedText style={styles.highScoreLabel}>Easy</ThemedText>
                <ThemedText style={styles.highScoreValue}>{localHighScores.easy}/10</ThemedText>
              </View>
              <View style={styles.highScoreItem}>
                <ThemedText style={styles.highScoreLabel}>Medium</ThemedText>
                <ThemedText style={styles.highScoreValue}>{localHighScores.medium}/10</ThemedText>
              </View>
              <View style={styles.highScoreItem}>
                <ThemedText style={styles.highScoreLabel}>Hard</ThemedText>
                <ThemedText style={styles.highScoreValue}>{localHighScores.hard}/10</ThemedText>
              </View>
            </View>
          </ThemedView>
        )}
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Account</ThemedText>

        <ThemedView
          style={[
            styles.infoContainer,
            {
              borderColor: Colors[colorScheme ?? 'light'].border,
              backgroundColor: Colors[colorScheme ?? 'light'].card
            }
          ]}
        >
          <View>
            <ThemedText style={styles.settingLabel}>Account Type</ThemedText>
            <ThemedText style={[styles.nicknameValue, { opacity: 0.6 }]}>
              {authProvider === 'google' ? 'Google Account' : authProvider === 'apple' ? 'Apple Account' : 'Guest'}
            </ThemedText>
          </View>
          {(authProvider === 'google' || authProvider === 'apple') && googleEmail && (
            <ThemedText style={[styles.infoValue, { opacity: 0.5, fontSize: 12 }]}>
              {googleEmail}
            </ThemedText>
          )}
          {(authProvider === 'google' || authProvider === 'apple') && (
            <Ionicons
              name="checkmark-circle"
              size={20}
              color="#4CAF50"
            />
          )}
        </ThemedView>

        {authProvider === 'anonymous' && (
          <>
            {Platform.OS === 'ios' && isAppleAvailable && (
              <TouchableOpacity
                style={[
                  styles.settingContainer,
                  {
                    borderColor: Colors[colorScheme ?? 'light'].border,
                    backgroundColor: Colors[colorScheme ?? 'light'].card
                  }
                ]}
                onPress={handleUpgradeToApple}
                disabled={isAppleLoading || isGoogleLoading}
              >
                <View>
                  <ThemedText style={styles.settingLabel}>Sign in with Apple</ThemedText>
                  <ThemedText style={[styles.nicknameValue, { opacity: 0.6 }]}>
                    Sync scores across devices
                  </ThemedText>
                </View>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="logo-apple"
                    size={20}
                    color={Colors[colorScheme ?? 'light'].text}
                  />
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.settingContainer,
                {
                  borderColor: Colors[colorScheme ?? 'light'].border,
                  backgroundColor: Colors[colorScheme ?? 'light'].card
                }
              ]}
              onPress={handleUpgradeToGoogle}
              disabled={isGoogleLoading || isAppleLoading}
            >
              <View>
                <ThemedText style={styles.settingLabel}>Sign in with Google</ThemedText>
                <ThemedText style={[styles.nicknameValue, { opacity: 0.6 }]}>
                  Sync scores across devices
                </ThemedText>
              </View>
              <View style={styles.iconContainer}>
                <Ionicons
                  name="logo-google"
                  size={20}
                  color="#DB4437"
                />
              </View>
            </TouchableOpacity>
          </>
        )}

        {(authProvider === 'google' || authProvider === 'apple') && (
          <TouchableOpacity
            style={[
              styles.settingContainer,
              {
                borderColor: Colors[colorScheme ?? 'light'].border,
                backgroundColor: Colors[colorScheme ?? 'light'].card
              }
            ]}
            onPress={handleSignOut}
          >
            <ThemedText style={[styles.settingLabel, { color: '#DC3545' }]}>Sign Out</ThemedText>
            <View style={styles.iconContainer}>
              <Ionicons
                name="log-out-outline"
                size={20}
                color="#DC3545"
              />
            </View>
          </TouchableOpacity>
        )}
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Resources</ThemedText>

        <TouchableOpacity
          style={[
            styles.settingContainer,
            {
              borderColor: Colors[colorScheme ?? 'light'].border,
              backgroundColor: Colors[colorScheme ?? 'light'].card
            }
          ]}
          onPress={handleLearnMorePress}
        >
          <ThemedText style={styles.settingLabel}>Learn More</ThemedText>
          <View style={styles.iconContainer}>
            <Ionicons
              name="open-outline"
              size={20}
              color={Colors[colorScheme ?? 'light'].tint}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.settingContainer,
            {
              borderColor: Colors[colorScheme ?? 'light'].border,
              backgroundColor: Colors[colorScheme ?? 'light'].card
            }
          ]}
          onPress={openTutorial}
        >
          <ThemedText style={styles.settingLabel}>How to Play</ThemedText>
          <View style={styles.iconContainer}>
            <Ionicons
              name="help-circle-outline"
              size={20}
              color={Colors[colorScheme ?? 'light'].tint}
            />
          </View>
        </TouchableOpacity>
      </ThemedView>
      
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>About</ThemedText>
        
        <ThemedView 
          style={[
            styles.infoContainer, 
            { 
              borderColor: Colors[colorScheme ?? 'light'].border,
              backgroundColor: Colors[colorScheme ?? 'light'].card 
            }
          ]}
        >
          <ThemedText style={styles.infoLabel}>Version</ThemedText>
          <ThemedText style={[styles.infoValue, { opacity: 0.6 }]}>1.0.0</ThemedText>
        </ThemedView>
        
        <TouchableOpacity 
          style={[
            styles.settingContainer, 
            { 
              borderColor: Colors[colorScheme ?? 'light'].border,
              backgroundColor: Colors[colorScheme ?? 'light'].card 
            }
          ]} 
          onPress={handleContactPress}
        >
          <ThemedText style={styles.settingLabel}>Contact</ThemedText>
          <View style={styles.iconContainer}>
            <Ionicons 
              name="information-circle-outline" 
              size={20} 
              color={Colors[colorScheme ?? 'light'].tint} 
            />
          </View>
        </TouchableOpacity>
      </ThemedView>
      
      <ThemedView style={styles.versionContainer}>
        <ThemedText style={[styles.versionText, { opacity: 0.6 }]}>Scripture Mastery v1.0.0</ThemedText>
      </ThemedView>
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
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
    marginBottom: 12,
  },
  settingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    marginBottom: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    marginBottom: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
  },
  versionContainer: {
    padding: 16,
    paddingBottom: 100,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
  },
  themeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  themeOption: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 6,
  },
  nicknameValue: {
    fontSize: 14,
    marginTop: 2,
  },
  highScoresContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    marginBottom: 1,
  },
  highScoresTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    opacity: 0.7,
  },
  highScoresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  highScoreItem: {
    alignItems: 'center',
  },
  highScoreLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 4,
  },
  highScoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 