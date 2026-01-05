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

export type AuthProvider = 'anonymous' | 'google' | 'apple';

export interface GameStats {
  correct: number;
  incorrect: number;
  totalPlayed: number;
}

export interface GameSettings {
  // Add any future settings here
}

// Leaderboard types
export interface LeaderboardEntry {
  id: string;
  documentId: string;
  nickname: string;
  difficulty: GameMode;
  score: number;
  timestamp: Date;
  photoURL?: string | null;
}

export interface UserProfile {
  documentId: string;
  nickname: string | null;
  createdAt: Date;
  lastPlayed: Date;
  highScores: {
    easy: number;
    medium: number;
    hard: number;
  };
  hasJoinedLeaderboard: boolean;
  authProvider: AuthProvider;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface HighScores {
  easy: number;
  medium: number;
  hard: number;
} 