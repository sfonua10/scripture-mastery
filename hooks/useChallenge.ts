import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  getDoc,
  FieldValue,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  Challenge,
  GameMode,
  QuestionCount,
  ChallengeStatus,
} from '@/types/scripture';
import { useAuth } from '@/contexts/AuthContext';
import {
  getScripturesForChallenge,
  generateChallengeCode,
} from '@/utils/scriptureUtils';

const CHALLENGE_EXPIRY_DAYS = 7;

// Helper to map Firestore document/snapshot to Challenge
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
  };
}

/**
 * Hook for managing multiplayer challenges
 */
export function useChallenge(challengeId?: string) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, userProfile } = useAuth();

  // Listen to challenge updates in real-time
  useEffect(() => {
    if (!challengeId || !user) {
      setChallenge(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const challengeRef = doc(db, 'challenges', challengeId);
    const unsubscribe: Unsubscribe = onSnapshot(
      challengeRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setChallenge(mapChallengeDoc(snapshot.id, snapshot.data()));
        } else {
          setChallenge(null);
          setError('Challenge not found');
        }
        setIsLoading(false);
      },
      (err: any) => {
        if (err.code === 'permission-denied') {
          setChallenge(null);
          setIsLoading(false);
          return;
        }
        console.error('Challenge fetch error:', err);
        setError('Failed to load challenge');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [challengeId, user]);

  /**
   * Create a new challenge
   */
  const createChallenge = useCallback(
    async (
      difficulty: GameMode,
      questionCount: QuestionCount
    ): Promise<Challenge | null> => {
      if (!user || !userProfile?.nickname) {
        setError('You must have a nickname to create challenges');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Generate unique challenge code
        let challengeCode = generateChallengeCode();
        let codeExists = true;
        let attempts = 0;

        // Ensure code is unique (with max attempts to prevent infinite loop)
        while (codeExists && attempts < 10) {
          const existingQuery = query(
            collection(db, 'challenges'),
            where('challengeCode', '==', challengeCode),
            where('status', 'in', ['pending', 'accepted'])
          );
          const existing = await getDocs(existingQuery);
          codeExists = !existing.empty;
          if (codeExists) {
            challengeCode = generateChallengeCode();
            attempts++;
          }
        }

        // Generate scriptures using the challenge code as seed
        const scriptures = getScripturesForChallenge(challengeCode, questionCount);

        // Calculate expiry date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + CHALLENGE_EXPIRY_DAYS);

        const challengeData = {
          challengeCode,
          difficulty,
          questionCount,
          scriptures,
          creatorId: user.uid,
          creatorNickname: userProfile.nickname,
          creatorPhotoURL: userProfile.photoURL || null,
          status: 'pending' as ChallengeStatus,
          createdAt: serverTimestamp(),
          expiresAt: Timestamp.fromDate(expiresAt),
        };

        const docRef = await addDoc(collection(db, 'challenges'), challengeData);

        const newChallenge: Challenge = {
          id: docRef.id,
          ...challengeData,
          createdAt: new Date(),
          expiresAt,
        };

        setChallenge(newChallenge);
        setIsLoading(false);
        return newChallenge;
      } catch (err) {
        console.error('Create challenge error:', err);
        setError('Failed to create challenge');
        setIsLoading(false);
        return null;
      }
    },
    [user, userProfile]
  );

  /**
   * Get a challenge by its code
   */
  const getChallengeByCode = useCallback(
    async (code: string): Promise<Challenge | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const q = query(
          collection(db, 'challenges'),
          where('challengeCode', '==', code.toUpperCase()),
          where('status', 'in', ['pending', 'accepted'])
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError('Challenge not found or has expired');
          setIsLoading(false);
          return null;
        }

        const docData = snapshot.docs[0];
        const foundChallenge = mapChallengeDoc(docData.id, docData.data());

        setIsLoading(false);
        return foundChallenge;
      } catch (err) {
        console.error('Get challenge error:', err);
        setError('Failed to find challenge');
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  /**
   * Join an existing challenge
   */
  const joinChallenge = useCallback(
    async (challengeToJoin: Challenge): Promise<boolean> => {
      if (!user || !userProfile?.nickname) {
        setError('You must have a nickname to join challenges');
        return false;
      }

      if (challengeToJoin.creatorId === user.uid) {
        setError("You can't join your own challenge");
        return false;
      }

      if (challengeToJoin.status !== 'pending') {
        setError('This challenge is no longer available');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        await updateDoc(doc(db, 'challenges', challengeToJoin.id), {
          challengerId: user.uid,
          challengerNickname: userProfile.nickname,
          challengerPhotoURL: userProfile.photoURL || null,
          status: 'accepted',
        });

        setIsLoading(false);
        return true;
      } catch (err) {
        console.error('Join challenge error:', err);
        setError('Failed to join challenge');
        setIsLoading(false);
        return false;
      }
    },
    [user, userProfile]
  );

  /**
   * Submit score for creator
   */
  const submitCreatorScore = useCallback(
    async (challengeIdToUpdate: string, score: number): Promise<boolean> => {
      if (!user) {
        setError('Not authenticated');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        await updateDoc(doc(db, 'challenges', challengeIdToUpdate), {
          creatorScore: score,
          creatorCompletedAt: serverTimestamp(),
        });

        setIsLoading(false);
        return true;
      } catch (err) {
        console.error('Submit creator score error:', err);
        setError('Failed to submit score');
        setIsLoading(false);
        return false;
      }
    },
    [user]
  );

  /**
   * Submit score for challenger
   */
  const submitChallengerScore = useCallback(
    async (challengeIdToUpdate: string, score: number): Promise<boolean> => {
      if (!user) {
        setError('Not authenticated');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Get current challenge state to check if both scores are now complete
        const challengeRef = doc(db, 'challenges', challengeIdToUpdate);
        const challengeSnap = await getDoc(challengeRef);

        if (!challengeSnap.exists()) {
          setError('Challenge not found');
          setIsLoading(false);
          return false;
        }

        const challengeData = challengeSnap.data();

        // Update challenger score
        const updateData: {
          challengerScore: number;
          challengerCompletedAt: FieldValue;
          status?: 'completed';
          completedAt?: FieldValue;
        } = {
          challengerScore: score,
          challengerCompletedAt: serverTimestamp(),
        };

        // If creator has already completed, mark challenge as completed
        // (Cloud Function will determine winner and send notifications)
        if (challengeData.creatorScore !== undefined) {
          updateData.status = 'completed';
          updateData.completedAt = serverTimestamp();
        }

        await updateDoc(challengeRef, updateData);

        setIsLoading(false);
        return true;
      } catch (err) {
        console.error('Submit challenger score error:', err);
        setError('Failed to submit score');
        setIsLoading(false);
        return false;
      }
    },
    [user]
  );

  /**
   * Get the deep link URL for a challenge
   */
  const getChallengeDeepLink = useCallback((code: string): string => {
    return `scripture-mastery://challenge/${code}`;
  }, []);

  /**
   * Get share text for a challenge
   */
  const getChallengeShareText = useCallback(
    (challengeToShare: Challenge): string => {
      const difficultyLabel =
        challengeToShare.difficulty.charAt(0).toUpperCase() +
        challengeToShare.difficulty.slice(1);

      return `I challenge you to Scripture Mastery Pro!\n\n` +
        `Difficulty: ${difficultyLabel}\n` +
        `Questions: ${challengeToShare.questionCount}\n\n` +
        `Enter code: ${challengeToShare.challengeCode}\n\n` +
        `Or tap this link:\n${getChallengeDeepLink(challengeToShare.challengeCode)}`;
    },
    [getChallengeDeepLink]
  );

  return {
    challenge,
    isLoading,
    error,
    createChallenge,
    getChallengeByCode,
    joinChallenge,
    submitCreatorScore,
    submitChallengerScore,
    getChallengeDeepLink,
    getChallengeShareText,
  };
}
