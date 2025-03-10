export interface ScriptureReference {
  book: string;
  chapter: number;
  verse: number | string;
}

export interface Scripture {
  text: string;
  reference: ScriptureReference;
}

export type GameMode = 'easy' | 'medium' | 'hard';

export interface GameStats {
  correct: number;
  incorrect: number;
  totalPlayed: number;
}

export interface GameSettings {
  // Add any future settings here
} 