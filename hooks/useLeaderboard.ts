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
    // Don't fetch leaderboard if user is not authenticated
    if (!user) {
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
        const data: LeaderboardEntry[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          documentId: doc.data().documentId,
          nickname: doc.data().nickname,
          difficulty: doc.data().difficulty,
          score: doc.data().score,
          timestamp: doc.data().timestamp?.toDate() || new Date(),
          photoURL: doc.data().photoURL || null,
        }));

        setEntries(data);
        setIsLoading(false);
      },
      (err) => {
        console.error('Leaderboard fetch error:', err);
        setError('Failed to load leaderboard');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [difficulty, user]);

  // Submit score to leaderboard (only keeps highest score per user per difficulty)
  const submitScore = useCallback(
    async (score: number, nickname: string): Promise<boolean> => {
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

        const photoURL = userProfile?.photoURL || null;

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
      const data: LeaderboardEntry[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        documentId: doc.data().documentId,
        nickname: doc.data().nickname,
        difficulty: doc.data().difficulty,
        score: doc.data().score,
        timestamp: doc.data().timestamp?.toDate() || new Date(),
        photoURL: doc.data().photoURL || null,
      }));

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
