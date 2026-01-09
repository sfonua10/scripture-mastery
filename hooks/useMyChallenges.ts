import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Challenge } from '@/types/scripture';
import { useAuth } from '@/contexts/AuthContext';

// Helper to map Firestore document to Challenge (same as useChallenge.ts)
function mapChallengeDoc(docId: string, data: any): Challenge {
  return {
    id: docId,
    challengeCode: data.challengeCode,
    difficulty: data.difficulty,
    questionCount: data.questionCount,
    scriptures: data.scriptures,
    creatorId: data.creatorId,
    creatorNickname: data.creatorNickname,
    creatorPhotoURL: data.creatorPhotoURL,
    creatorScore: data.creatorScore,
    creatorCompletedAt: data.creatorCompletedAt?.toDate(),
    challengerId: data.challengerId,
    challengerNickname: data.challengerNickname,
    challengerPhotoURL: data.challengerPhotoURL,
    challengerScore: data.challengerScore,
    challengerCompletedAt: data.challengerCompletedAt?.toDate(),
    status: data.status,
    createdAt: data.createdAt?.toDate() || new Date(),
    expiresAt: data.expiresAt?.toDate() || new Date(),
    completedAt: data.completedAt?.toDate(),
    winnerId: data.winnerId,
    isTie: data.isTie,
    winnerDetermined: data.winnerDetermined,
  };
}

interface UseMyChallengesReturn {
  activeChallenges: Challenge[];
  completedChallenges: Challenge[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook for fetching user's challenges (both created and joined)
 * Uses real-time listeners for live updates
 */
export function useMyChallenges(): UseMyChallengesReturn {
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setActiveChallenges([]);
      setCompletedChallenges([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Firestore doesn't support OR queries across different fields,
    // so we need two separate queries and merge results
    const creatorQuery = query(
      collection(db, 'challenges'),
      where('creatorId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const challengerQuery = query(
      collection(db, 'challenges'),
      where('challengerId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    let creatorChallenges: Challenge[] = [];
    let challengerChallenges: Challenge[] = [];
    let creatorLoaded = false;
    let challengerLoaded = false;

    const mergeChallenges = () => {
      if (!creatorLoaded || !challengerLoaded) return;

      // Merge and dedupe (in case of edge cases)
      const allChallenges = [...creatorChallenges, ...challengerChallenges];
      const uniqueChallenges = allChallenges.filter(
        (challenge, index, self) =>
          index === self.findIndex((c) => c.id === challenge.id)
      );

      // Sort by createdAt descending
      uniqueChallenges.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Separate into active and completed (expired goes to completed)
      const active = uniqueChallenges.filter(
        (c) => c.status === 'pending' || c.status === 'accepted'
      );
      const completed = uniqueChallenges.filter(
        (c) => c.status === 'completed' || c.status === 'expired'
      );

      setActiveChallenges(active);
      setCompletedChallenges(completed);
      setIsLoading(false);
    };

    const unsubscribeCreator: Unsubscribe = onSnapshot(
      creatorQuery,
      (snapshot) => {
        creatorChallenges = snapshot.docs.map((doc) =>
          mapChallengeDoc(doc.id, doc.data())
        );
        creatorLoaded = true;
        mergeChallenges();
      },
      (err: any) => {
        console.error('Creator challenges fetch error:', err);
        // Don't show error for permission-denied or missing index
        if (err.code !== 'permission-denied' && !err.message?.includes('index')) {
          setError('Failed to load challenges');
        }
        creatorLoaded = true;
        mergeChallenges();
      }
    );

    const unsubscribeChallenger: Unsubscribe = onSnapshot(
      challengerQuery,
      (snapshot) => {
        challengerChallenges = snapshot.docs.map((doc) =>
          mapChallengeDoc(doc.id, doc.data())
        );
        challengerLoaded = true;
        mergeChallenges();
      },
      (err: any) => {
        console.error('Challenger challenges fetch error:', err);
        // Don't show error for permission-denied or missing index (user may not have joined any challenges yet)
        if (err.code !== 'permission-denied' && !err.message?.includes('index')) {
          setError('Failed to load challenges');
        }
        challengerLoaded = true;
        mergeChallenges();
      }
    );

    return () => {
      unsubscribeCreator();
      unsubscribeChallenger();
    };
  }, [user, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return {
    activeChallenges,
    completedChallenges,
    isLoading,
    error,
    refresh,
  };
}
