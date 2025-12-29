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
 * Normalize book names to handle variations
 */
const normalizeBookName = (bookName: string): string => {
  const normalized = bookName.trim().toLowerCase();

  // Handle D&C variations - be lenient with any reasonable attempt
  const noSpaces = normalized.replace(/\s+/g, '');

  if (
    noSpaces === 'd&c' ||
    noSpaces === 'dc' ||
    (noSpaces.includes('doctrine') && noSpaces.includes('covenant')) ||
    normalized.startsWith('d&c') ||
    normalized.startsWith('d & c')
  ) {
    return 'd&c';
  }

  return normalized;
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
  const normalizedBook = normalizeBookName(book);

  switch (mode) {
    case "easy":
      return normalizeBookName(normalizedGuess) === normalizedBook;
    case "medium":
      return normalizeBookName(normalizedGuess) === `${normalizedBook} ${chapter}`;
    case "hard":
      return normalizeBookName(normalizedGuess) === `${normalizedBook} ${chapter}:${verse}`;
    default:
      return false;
  }
};