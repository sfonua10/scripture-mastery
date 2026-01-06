import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ThemedText';
import { GradientButton } from '@/components/GradientButton';
import { BaseModal } from '@/components/BaseModal';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface TutorialModalProps {
  visible: boolean;
  onDismiss: () => void;
}

interface ModeCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  colorScheme: 'light' | 'dark';
}

function ModeCard({ icon, iconColor, title, description, colorScheme }: ModeCardProps) {
  return (
    <View
      style={[
        styles.modeCard,
        { backgroundColor: Colors[colorScheme].background },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${title}: ${description}`}
    >
      <View style={[styles.iconCircle, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.modeTextContainer}>
        <ThemedText style={styles.modeTitle}>{title}</ThemedText>
        <ThemedText style={styles.modeDescription}>{description}</ThemedText>
      </View>
    </View>
  );
}

export function TutorialModal({ visible, onDismiss }: TutorialModalProps) {
  const colorScheme = useColorScheme() ?? 'light';

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  return (
    <BaseModal
      visible={visible}
      onClose={onDismiss}
      animationType="smooth"
      testID="tutorial-modal"
      accessibilityLabel="How to Play tutorial"
    >
      <View style={styles.content}>
        {/* Header Icon */}
        <View style={styles.headerIcon}>
          <Ionicons
            name="book-outline"
            size={40}
            color={Colors[colorScheme].tint}
          />
        </View>

        <ThemedText style={styles.title} accessibilityRole="header">
          How to Play
        </ThemedText>

        <ThemedText style={styles.body}>
          A scripture will appear. Guess where it's from!
        </ThemedText>

        {/* Mode Cards */}
        <View style={styles.modesContainer}>
          <ModeCard
            icon="star-outline"
            iconColor="#4CAF50"
            title="Easy"
            description="Guess the book"
            colorScheme={colorScheme}
          />
          <ModeCard
            icon="star-half-outline"
            iconColor="#FF9800"
            title="Medium"
            description="Guess book and chapter"
            colorScheme={colorScheme}
          />
          <ModeCard
            icon="star"
            iconColor="#F44336"
            title="Hard"
            description="Guess book, chapter, and verse"
            colorScheme={colorScheme}
          />
        </View>

        {/* Action Button */}
        <View style={styles.buttonContainer}>
          <GradientButton
            onPress={handleDismiss}
            label="Got it!"
            variant="primary"
          />
        </View>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    width: '100%',
  },
  headerIcon: {
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
    opacity: 0.8,
  },
  modesContainer: {
    width: '100%',
    gap: 10,
    marginBottom: 24,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeTextContainer: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  modeDescription: {
    fontSize: 13,
    opacity: 0.7,
  },
  buttonContainer: {
    width: '100%',
  },
});
