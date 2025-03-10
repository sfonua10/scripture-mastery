import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// Import images using ES6 imports
const darkIcon = require('@/assets/icons/ios-dark.png');
const lightIcon = require('@/assets/icons/ios-light.png');

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  
  const handleModeSelect = (mode: 'easy' | 'medium' | 'hard') => {
    router.push({
      pathname: '/game',
      params: { mode }
    });
  };

  const getGradientColors = (mode: 'easy' | 'medium' | 'hard'): readonly [string, string] => {
    const baseColor = Colors[colorScheme ?? 'light'].tint;
    
    if (colorScheme === 'dark') {
      switch (mode) {
        case 'easy':
          return ['#1a5d7e', '#0a3d5e'] as const;
        case 'medium':
          return ['#1a6e7e', '#0a4e5e'] as const;
        case 'hard':
          return ['#1a7e7e', '#0a5e5e'] as const;
        default:
          return [baseColor, baseColor] as const;
      }
    } else {
      switch (mode) {
        case 'easy':
          return ['#0a7ea4', '#085d7a'] as const;
        case 'medium':
          return ['#0a8ea4', '#086d7a'] as const;
        case 'hard':
          return ['#0a9ea4', '#087d7a'] as const;
        default:
          return [baseColor, baseColor] as const;
      }
    }
  };

  // Get the icon based on the color scheme
  const iconSource = colorScheme === 'dark' ? darkIcon : lightIcon;

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>Scripture Mastery</ThemedText>
        
        {/* Icon below the title - larger size */}
        <View style={styles.iconContainer}>
          <Image 
            source={iconSource}
            style={styles.icon}
            contentFit="contain"
            transition={300}
          />
        </View>
        
        {/* Decorative line under icon */}
        <View style={styles.separator} />
      </ThemedView>
      
      <ThemedView style={styles.content}>
        <ThemedText style={styles.subtitle}>Select Difficulty</ThemedText>
        
        <TouchableOpacity 
          style={styles.buttonContainer} 
          onPress={() => handleModeSelect('easy')}
        >
          <LinearGradient
            colors={getGradientColors('easy')}
            style={styles.modeButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <ThemedText style={styles.modeButtonText}>Easy</ThemedText>
            <ThemedText style={styles.modeDescription}>Guess the book</ThemedText>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.buttonContainer} 
          onPress={() => handleModeSelect('medium')}
        >
          <LinearGradient
            colors={getGradientColors('medium')}
            style={styles.modeButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <ThemedText style={styles.modeButtonText}>Medium</ThemedText>
            <ThemedText style={styles.modeDescription}>Guess the book and chapter</ThemedText>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.buttonContainer} 
          onPress={() => handleModeSelect('hard')}
        >
          <LinearGradient
            colors={getGradientColors('hard')}
            style={styles.modeButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <ThemedText style={styles.modeButtonText}>Hard</ThemedText>
            <ThemedText style={styles.modeDescription}>Guess the book, chapter, and verse</ThemedText>
          </LinearGradient>
        </TouchableOpacity>
      </ThemedView>
      
      <ThemedView style={styles.footer}>
        <ThemedText style={styles.versionText}>v1.0.0</ThemedText>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    paddingTop: 20,
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'Times New Roman',
  },
  iconContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 15,
  },
  icon: {
    width: 80,
    height: 80,
  },
  separator: {
    height: 2,
    width: 180,
    backgroundColor: '#dbd0c0',
    marginBottom: 15,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 24,
    marginBottom: 40,
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 20,
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
    marginBottom: 8,
  },
  modeDescription: {
    color: 'white',
    fontSize: 16,
    opacity: 0.9,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    opacity: 0.6,
  },
});