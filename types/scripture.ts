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

// Daily Challenge types
export interface DailyChallengeResult {
  date: string;
  completed: boolean;
  correct: boolean;
  timestamp: Date;
}

export interface DailyChallengeStats {
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
  totalCorrect: number;
  lastCompletedDate: string | null;
  badges: DailyChallengeBadge[];
}

export interface DailyChallengeBadge {
  id: string;
  name: string;
  description: string;
  earnedAt: Date;
  icon: string;
}

// Multiplayer Challenge types
export type QuestionCount = 3 | 5 | 10;

export type ChallengeStatus = 'pending' | 'accepted' | 'completed' | 'expired';

export interface Challenge {
  id: string;
  challengeCode: string;           // 6-char code for sharing
  difficulty: GameMode;
  questionCount: QuestionCount;
  scriptures: Scripture[];         // Pre-selected scriptures for both players

  // Creator info
  creatorId: string;
  creatorNickname: string;
  creatorPhotoURL?: string | null;
  creatorScore?: number;
  creatorCompletedAt?: Date;

  // Challenger info (set when someone accepts)
  challengerId?: string;
  challengerNickname?: string;
  challengerPhotoURL?: string | null;
  challengerScore?: number;
  challengerCompletedAt?: Date;

  // Challenge state
  status: ChallengeStatus;
  createdAt: Date;
  expiresAt: Date;                 // 7 days after creation
  completedAt?: Date;

  // Winner determination (set by Cloud Function)
  winnerId?: string;
  isTie?: boolean;
}

export interface ChallengeStats {
  created: number;
  won: number;
  lost: number;
  tied: number;
} 