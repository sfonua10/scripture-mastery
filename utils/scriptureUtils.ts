// utils/scriptureUtils.ts
import { Scripture, GameMode } from '../types/scripture';
import { allScriptures } from '@/data/scriptureData';

/**
 * Get all available scriptures
 */
export const getAllScriptures = (): Scripture[] => {
  return allScriptures;
};

/**
 * Get a random scripture
 */
export const getRandomScripture = (): Scripture => {
  const randomIndex = Math.floor(Math.random() * allScriptures.length);
  return allScriptures[randomIndex];
};

/**
 * Get a random scripture that is different from the current one
 */
export const getNextRandomScripture = (
  currentScripture: Scripture
): Scripture => {
  let randomScripture: Scripture;
  do {
    randomScripture = getRandomScripture();
  } while (randomScripture.text === currentScripture.text);

  return randomScripture;
};

/**
 * Check if a guess is correct based on the game mode
 */
export const checkGuess = (
  scripture: Scripture,
  guess: string,
  mode: GameMode
): boolean => {
  const { book, chapter, verse } = scripture.reference;
  const normalizedGuess = guess.trim().toLowerCase();

  switch (mode) {
    case "easy":
      return normalizedGuess === book.toLowerCase();
    case "medium":
      return normalizedGuess === `${book.toLowerCase()} ${chapter}`;
    case "hard":
      return normalizedGuess === `${book.toLowerCase()} ${chapter}:${verse}`;
    default:
      return false;
  }
};