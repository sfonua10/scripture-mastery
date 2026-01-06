import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { LeaderboardEntry, GameMode } from '@/types/scripture';
import { useAuth } from '@/contexts/AuthContext';

const LEADERBOARD_LIMIT = 100;

// Helper to map Firestore document to LeaderboardEntry
function mapLeaderboardDoc(doc: any): LeaderboardEntry {
  const data = doc.data();
  return {
    id: doc.id,
    documentId: data.documentId,
    nickname: data.nickname,
    difficulty: data.difficulty,
    score: data.score,
    timestamp: data.timestamp?.toDate() || new Date(),
    photoURL: data.photoURL || null,
  };
}

export function useLeaderboard(difficulty: GameMode) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, userProfile } = useAuth();

  // Derived state: calculate userRank during render (not in useEffect)
  const userRank = useMemo(() => {
    if (!user || entries.length === 0) return null;
    const userIndex = entries.findIndex((e) => e.documentId === user.uid);
    return userIndex !== -1 ? userIndex + 1 : null;
  }, [entries, user]);

  // Fetch leaderboard entries with real-time updates
  useEffect(() => {
    // Don't fetch leaderboard if user is not authenticated or is an anonymous user
    // who hasn't joined the leaderboard (e.g., fresh anonymous user after sign-out)
    if (!user || (user.isAnonymous && !userProfile?.hasJoinedLeaderboard)) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const leaderboardRef = collection(db, 'leaderboard');
    const q = query(
      leaderboardRef,
      where('difficulty', '==', difficulty),
      orderBy('score', 'desc'),
      orderBy('timestamp', 'asc'),
      limit(LEADERBOARD_LIMIT)
    );

    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(mapLeaderboardDoc);
        setEntries(data);
        setIsLoading(false);
      },
      (err: any) => {
        // Permission errors during sign-out are expected - the listener's auth
        // is invalidated before React can clean it up. Handle gracefully.
        if (err.code === 'permission-denied') {
          setEntries([]);
          setIsLoading(false);
          return;
        }
        console.error('Leaderboard fetch error:', err);
        setError('Failed to load leaderboard');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [difficulty, user, userProfile?.hasJoinedLeaderboard]);

  // Submit score to leaderboard (only keeps highest score per user per difficulty)
  // photoURL can be passed directly to avoid React state timing issues
  const submitScore = useCallback(
    async (score: number, nickname: string, photoURLOverride?: string | null): Promise<boolean> => {
      if (!user) {
        setError('Not authenticated');
        return false;
      }

      try {
        const leaderboardRef = collection(db, 'leaderboard');

        // Check for existing entry for this user + difficulty
        const existingQuery = query(
          leaderboardRef,
          where('documentId', '==', user.uid),
          where('difficulty', '==', difficulty),
          limit(1)
        );
        const existingDocs = await getDocs(existingQuery);

        // Use passed photoURL if provided, otherwise fall back to userProfile
        const photoURL = photoURLOverride !== undefined ? photoURLOverride : (userProfile?.photoURL || null);

        if (existingDocs.empty) {
          // No existing entry - create new one
          await addDoc(leaderboardRef, {
            documentId: user.uid,
            nickname,
            difficulty,
            score,
            timestamp: serverTimestamp(),
            photoURL,
          });
        } else {
          // Entry exists - only update if new score is higher
          const existingEntry = existingDocs.docs[0];
          const existingScore = existingEntry.data().score;

          if (score > existingScore) {
            await updateDoc(doc(db, 'leaderboard', existingEntry.id), {
              score,
              nickname,
              timestamp: serverTimestamp(),
              photoURL,
            });
          }
          // If score <= existing, silently skip (keep the higher score)
        }

        return true;
      } catch (err) {
        console.error('Submit score error:', err);
        setError('Failed to submit score');
        return false;
      }
    },
    [user, difficulty, userProfile]
  );

  // Refresh leaderboard manually
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const leaderboardRef = collection(db, 'leaderboard');
      const q = query(
        leaderboardRef,
        where('difficulty', '==', difficulty),
        orderBy('score', 'desc'),
        orderBy('timestamp', 'asc'),
        limit(LEADERBOARD_LIMIT)
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(mapLeaderboardDoc);
      setEntries(data);
    } catch (err) {
      console.error('Refresh error:', err);
      setError('Failed to refresh leaderboard');
    } finally {
      setIsLoading(false);
    }
  }, [difficulty]);

  return {
    entries,
    isLoading,
    error,
    userRank,
    submitScore,
    refresh,
  };
}
