import { useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type { Audio as AudioType } from 'expo-av';

// Type for expo-av Sound object
type SoundObject = AudioType.Sound;

// Conditionally import expo-av - it crashes in Expo Go
let Audio: typeof import('expo-av').Audio | null = null;
try {
  Audio = require('expo-av').Audio;
} catch (e) {
  console.log('Audio not available in this environment');
}

export function useSound() {
  const { soundEnabled } = useTheme();
  const correctSoundRef = useRef<SoundObject | null>(null);
  const wrongSoundRef = useRef<SoundObject | null>(null);

  useEffect(() => {
    if (!Audio) return;

    let isMounted = true;
    let loadedCorrectSound: SoundObject | null = null;
    let loadedWrongSound: SoundObject | null = null;

    const loadSounds = async () => {
      try {
        // Configure audio mode for playback
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        // Load correct sound
        const { sound: correctSound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/correct.wav')
        );

        if (!isMounted) {
          await correctSound.unloadAsync();
          return;
        }
        loadedCorrectSound = correctSound;
        correctSoundRef.current = correctSound;

        // Load wrong sound
        const { sound: wrongSound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/wrong.wav')
        );

        if (!isMounted) {
          await wrongSound.unloadAsync();
          await correctSound.unloadAsync();
          return;
        }
        loadedWrongSound = wrongSound;
        wrongSoundRef.current = wrongSound;
      } catch (error) {
        console.warn('Failed to load sounds:', error);
      }
    };

    loadSounds();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      loadedCorrectSound?.unloadAsync();
      loadedWrongSound?.unloadAsync();
    };
  }, []);

  const playCorrect = useCallback(async (force?: boolean) => {
    if ((!soundEnabled && !force) || !correctSoundRef.current) return;

    try {
      await correctSoundRef.current.replayAsync();
    } catch (error) {
      console.warn('Failed to play correct sound:', error);
    }
  }, [soundEnabled]);

  const playWrong = useCallback(async () => {
    if (!soundEnabled || !wrongSoundRef.current) return;

    try {
      await wrongSoundRef.current.replayAsync();
    } catch (error) {
      console.warn('Failed to play wrong sound:', error);
    }
  }, [soundEnabled]);

  return { playCorrect, playWrong };
}
