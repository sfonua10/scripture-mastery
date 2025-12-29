import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface TutorialModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const modalWidth = Math.min(screenWidth * 0.85, 340);

export function TutorialModal({ visible, onDismiss }: TutorialModalProps) {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <ThemedView
          style={[
            styles.modalContent,
            {
              backgroundColor: Colors[colorScheme].card,
              borderColor: Colors[colorScheme].border,
            }
          ]}
        >
          <ThemedText style={styles.title}>How to Play</ThemedText>

          <ThemedText style={styles.body}>
            A scripture will appear. Guess where it's from!
          </ThemedText>

          <ThemedView style={styles.modesContainer}>
            <ThemedText style={[styles.modeText, { opacity: 0.8 }]}>
              Easy: Guess the book
            </ThemedText>
            <ThemedText style={[styles.modeText, { opacity: 0.8 }]}>
              Medium: Guess book and chapter
            </ThemedText>
            <ThemedText style={[styles.modeText, { opacity: 0.8 }]}>
              Hard: Guess book, chapter, and verse
            </ThemedText>
          </ThemedView>

          <TouchableOpacity
            style={styles.buttonContainer}
            onPress={onDismiss}
          >
            <LinearGradient
              colors={
                colorScheme === 'dark'
                  ? ['#1a5d7e', '#0a3d5e']
                  : [Colors.light.tint, '#085d7a']
              }
              style={styles.button}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <ThemedText style={styles.buttonText}>Got it</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: modalWidth,
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Times New Roman',
    marginBottom: 20,
    lineHeight: 24,
  },
  modesContainer: {
    marginBottom: 24,
  },
  modeText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  buttonContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  button: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
