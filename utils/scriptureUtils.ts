// utils/scriptureUtils.ts
import { Scripture, GameMode, QuestionCount } from '../types/scripture';
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
 * @param currentScripture - The current scripture to avoid
 * @param maxAttempts - Maximum attempts before returning any scripture (prevents infinite loop)
 */
export const getNextRandomScripture = (
  currentScripture: Scripture,
  maxAttempts: number = 100
): Scripture => {
  // Guard against single scripture or empty array
  if (allScriptures.length <= 1) {
    return allScriptures[0] ?? currentScripture;
  }

  let randomScripture: Scripture;
  let attempts = 0;

  do {
    randomScripture = getRandomScripture();
    attempts++;
  } while (randomScripture.text === currentScripture.text && attempts < maxAttempts);

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

  // Handle Joseph Smith—History variations
  const noDashes = noSpaces.replace(/[-—–]/g, ''); // Remove all dash types
  if (
    noDashes === 'jsh' ||
    noDashes === 'jshistory' ||
    noDashes === 'josephsmithhistory' ||
    noSpaces.startsWith('js-h') ||
    noSpaces.startsWith('js—h') ||
    (noDashes.includes('josephsmith') && noDashes.includes('history'))
  ) {
    return 'joseph smith—history';
  }

  return normalized;
};

/**
 * Get the daily challenge scripture for a given date.
 * Uses a deterministic seed based on the date to ensure all users
 * get the same scripture on the same day.
 */
export const getDailyScripture = (date: Date = new Date()): Scripture => {
  const dateString = date.toISOString().split('T')[0];
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % allScriptures.length;
  return allScriptures[index];
};

/**
 * Get today's date string in YYYY-MM-DD format
 */
export const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Parse a guess into book and reference parts for proper comparison
 * Handles formats like "John 3", "Alma 32:21", "D&C 76", "1 Nephi 3:7"
 */
const parseGuess = (guess: string): { book: string; chapter?: string; verse?: string } => {
  const trimmed = guess.trim();

  // Match patterns like "Book Chapter:Verse", "Book Chapter", or just "Book"
  // Handles numbered books like "1 Nephi", "2 Kings", etc.
  const match = trimmed.match(/^(.+?)\s+(\d+)(?::(\d+(?:-\d+)?))?$/);

  if (match) {
    return {
      book: match[1],
      chapter: match[2],
      verse: match[3],
    };
  }

  // No chapter/verse found, entire guess is the book name
  return { book: trimmed };
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
  const normalizedBook = normalizeBookName(book);
  const parsed = parseGuess(guess);
  const guessedBook = normalizeBookName(parsed.book);

  switch (mode) {
    case "easy":
      // Just check the book name
      return guessedBook === normalizedBook;
    case "medium":
      // Check book and chapter
      return guessedBook === normalizedBook && parsed.chapter === String(chapter);
    case "hard":
      // Check book, chapter, and verse
      return (
        guessedBook === normalizedBook &&
        parsed.chapter === String(chapter) &&
        parsed.verse === String(verse)
      );
    default:
      return false;
  }
};

/**
 * Simple seeded random number generator (mulberry32)
 * Ensures deterministic random selection based on seed
 */
const seededRandom = (seed: number): () => number => {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Generate a numeric seed from a string
 */
const stringToSeed = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

/**
 * Get scriptures for a multiplayer challenge using a deterministic seed.
 * Both players will get the exact same scriptures in the same order.
 *
 * @param seed - Unique identifier (e.g., challenge ID or code)
 * @param count - Number of scriptures to select (3, 5, or 10)
 * @returns Array of unique scriptures
 */
export const getScripturesForChallenge = (
  seed: string,
  count: QuestionCount
): Scripture[] => {
  const numericSeed = stringToSeed(seed);
  const random = seededRandom(numericSeed);

  // Create a copy of indices and shuffle using seeded random
  const indices = Array.from({ length: allScriptures.length }, (_, i) => i);

  // Fisher-Yates shuffle with seeded random
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // Take the first 'count' scriptures
  return indices.slice(0, count).map(index => allScriptures[index]);
};

/**
 * Generate a unique 6-character challenge code
 * Uses uppercase letters and numbers, excluding confusing characters (0, O, I, L, 1)
 */
export const generateChallengeCode = (): string => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};