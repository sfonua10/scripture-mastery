import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  signInAnonymously,
  onAuthStateChanged,
  User,
  linkWithCredential,
  signInWithCredential,
  OAuthProvider,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, GoogleAuthProvider, GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '@/config/firebase';
import { UserProfile, GameMode, HighScores, AuthProvider as AuthProviderType } from '@/types/scripture';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

// Required for Google auth session to complete properly on web
WebBrowser.maybeCompleteAuthSession();

const LOCAL_HIGH_SCORES_KEY = '@scripture_mastery_high_scores';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  nickname: string | null;
  hasJoinedLeaderboard: boolean;
  localHighScores: HighScores;
  setNickname: (nickname: string) => Promise<void>;
  updateHighScore: (difficulty: GameMode, score: number) => Promise<boolean>;
  isNewHighScore: (difficulty: GameMode, score: number) => boolean;
  joinLeaderboard: (nickname: string, difficulty: GameMode, score: number) => Promise<void>;
  // Hybrid auth
  authProvider: AuthProviderType;
  isGoogleLinked: boolean;
  googleDisplayName: string | null;
  googleEmail: string | null;
  isGoogleLoading: boolean;
  promptGoogleSignIn: () => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
  // Apple auth
  isAppleAvailable: boolean;
  isAppleLoading: boolean;
  promptAppleSignIn: () => Promise<void>;
  linkAppleAccount: () => Promise<void>;
  // Sign out
  signOut: () => Promise<void>;
}

const defaultHighScores: HighScores = { easy: 0, medium: 0, hard: 0 };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [localHighScores, setLocalHighScores] = useState<HighScores>(defaultHighScores);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  // Check Apple Sign-In availability
  useEffect(() => {
    const checkAppleAvailability = async () => {
      if (Platform.OS === 'ios') {
        const available = await AppleAuthentication.isAvailableAsync();
        setIsAppleAvailable(available);
      }
    };
    checkAppleAvailability();
  }, []);

  // Google OAuth setup
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID, // Used for Firebase token exchange
  });

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleCredential(id_token);
    } else if (response?.type === 'error') {
      console.error('Google sign-in error:', response.error);
      setIsGoogleLoading(false);
    } else if (response?.type === 'dismiss') {
      setIsGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleCredential = async (idToken: string) => {
    try {
      const credential = GoogleAuthProvider.credential(idToken);

      if (user?.isAnonymous) {
        // Link anonymous account to Google - preserves UID and data
        const result = await linkWithCredential(user, credential);
        await updateUserWithProviderInfo(result.user, 'google');
      } else {
        // Fresh sign-in with Google
        const result = await signInWithCredential(auth, credential);
        await updateUserWithProviderInfo(result.user, 'google');
      }
    } catch (error: any) {
      if (error.code === 'auth/credential-already-in-use') {
        // This Google account is already linked to another user
        // Sign in with the existing account instead
        console.warn('Google account already linked to another user');
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
      } else {
        console.error('Error handling Google credential:', error);
        throw error;
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Apple Sign-In handler
  const handleAppleSignIn = async (): Promise<{ success: boolean }> => {
    setIsAppleLoading(true);
    try {
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Create Firebase credential from Apple credential
      const { identityToken } = appleCredential;
      if (!identityToken) {
        throw new Error('No identity token received from Apple');
      }

      const provider = new OAuthProvider('apple.com');
      const credential = provider.credential({
        idToken: identityToken,
      });

      // Get display name from Apple (only provided on first sign-in)
      const fullName = appleCredential.fullName;
      const displayName = fullName
        ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim()
        : null;

      if (user?.isAnonymous) {
        // Link anonymous account to Apple - preserves UID and data
        const result = await linkWithCredential(user, credential);
        await updateUserWithProviderInfo(result.user, 'apple', displayName);
      } else {
        // Fresh sign-in with Apple
        const result = await signInWithCredential(auth, credential);
        await updateUserWithProviderInfo(result.user, 'apple', displayName);
      }
      return { success: true };
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User canceled the sign-in
        console.log('Apple sign-in canceled');
        return { success: false };
      } else if (error.code === 'auth/credential-already-in-use') {
        // This Apple account is already linked to another user
        console.warn('Apple account already linked to another user');
        return { success: false };
      } else {
        console.error('Apple sign-in error:', error);
        throw error;
      }
    } finally {
      setIsAppleLoading(false);
    }
  };

  const updateUserWithProviderInfo = async (
    providerUser: User,
    provider: 'google' | 'apple',
    appleDisplayName?: string | null
  ) => {
    const userRef = doc(db, 'users', providerUser.uid);
    const now = serverTimestamp();

    // For Apple, we might not get email/displayName after the first sign-in
    const displayName = provider === 'apple' && appleDisplayName
      ? appleDisplayName
      : providerUser.displayName;

    try {
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        // Update existing profile with provider info
        const updateData: any = {
          authProvider: provider,
          lastPlayed: now,
        };
        // Only update email/displayName if we have them
        if (providerUser.email) updateData.email = providerUser.email;
        if (displayName) updateData.displayName = displayName;
        if (providerUser.photoURL) updateData.photoURL = providerUser.photoURL;

        await updateDoc(userRef, updateData);
      } else {
        // Create new profile with provider info
        await setDoc(userRef, {
          documentId: providerUser.uid,
          nickname: null,
          createdAt: now,
          lastPlayed: now,
          highScores: localHighScores,
          hasJoinedLeaderboard: false,
          authProvider: provider,
          email: providerUser.email || null,
          displayName: displayName || null,
          photoURL: providerUser.photoURL || null,
        });
      }

      // Reload the user profile
      await loadUserProfile(providerUser.uid);
    } catch (error) {
      console.error('Error updating user with provider info:', error);
      throw error;
    }
  };

  // Load local high scores from AsyncStorage
  useEffect(() => {
    const loadLocalHighScores = async () => {
      try {
        const stored = await AsyncStorage.getItem(LOCAL_HIGH_SCORES_KEY);
        if (stored) {
          setLocalHighScores(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading local high scores:', error);
      }
    };
    loadLocalHighScores();
  }, []);

  // Save local high scores to AsyncStorage
  const saveLocalHighScores = useCallback(async (scores: HighScores) => {
    try {
      await AsyncStorage.setItem(LOCAL_HIGH_SCORES_KEY, JSON.stringify(scores));
      setLocalHighScores(scores);
    } catch (error) {
      console.error('Error saving local high scores:', error);
    }
  }, []);

  // Initialize anonymous auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await loadUserProfile(firebaseUser.uid);
      } else {
        // Sign in anonymously (silent, no user interaction)
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error('Anonymous auth error:', error);
        }
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserProfile({
          documentId: userId,
          nickname: data.nickname || null,
          createdAt: data.createdAt?.toDate() || new Date(),
          lastPlayed: data.lastPlayed?.toDate() || new Date(),
          highScores: data.highScores || defaultHighScores,
          hasJoinedLeaderboard: data.hasJoinedLeaderboard || false,
          authProvider: data.authProvider || 'anonymous',
          email: data.email || null,
          displayName: data.displayName || null,
          photoURL: data.photoURL || null,
        });
      } else {
        // Clear profile for new users (e.g., after sign-out creates new anonymous user)
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const setNickname = useCallback(
    async (nickname: string) => {
      if (!user) return;

      const userRef = doc(db, 'users', user.uid);
      const now = serverTimestamp();

      try {
        if (userProfile) {
          await updateDoc(userRef, { nickname, lastPlayed: now });
          setUserProfile((prev) =>
            prev ? { ...prev, nickname } : null
          );
        } else {
          const provider: AuthProviderType = user.isAnonymous ? 'anonymous' : 'google';
          const newProfile = {
            documentId: user.uid,
            nickname,
            createdAt: now,
            lastPlayed: now,
            highScores: localHighScores,
            hasJoinedLeaderboard: false,
            authProvider: provider,
          };
          await setDoc(userRef, newProfile);
          setUserProfile({
            ...newProfile,
            createdAt: new Date(),
            lastPlayed: new Date(),
            authProvider: provider,
          } as UserProfile);
        }
      } catch (error) {
        console.error('Error setting nickname:', error);
        throw error;
      }
    },
    [user, userProfile, localHighScores]
  );

  const isNewHighScore = useCallback(
    (difficulty: GameMode, score: number): boolean => {
      // Check against local high scores (works whether they've joined leaderboard or not)
      return score > localHighScores[difficulty];
    },
    [localHighScores]
  );

  const updateHighScore = useCallback(
    async (difficulty: GameMode, score: number): Promise<boolean> => {
      const isNew = isNewHighScore(difficulty, score);

      if (isNew) {
        // Always update local high scores
        const newScores = { ...localHighScores, [difficulty]: score };
        await saveLocalHighScores(newScores);

        // If user has a profile in Firestore, update there too
        if (user && userProfile) {
          try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              [`highScores.${difficulty}`]: score,
              lastPlayed: serverTimestamp(),
            });
            setUserProfile((prev) =>
              prev
                ? {
                    ...prev,
                    highScores: { ...prev.highScores, [difficulty]: score },
                  }
                : null
            );
          } catch (error) {
            console.error('Error updating high score in Firestore:', error);
          }
        }
      }

      return isNew;
    },
    [user, userProfile, localHighScores, isNewHighScore, saveLocalHighScores]
  );

  const joinLeaderboard = useCallback(
    async (nickname: string, difficulty: GameMode, score: number) => {
      if (!user) throw new Error('Not authenticated');

      const userRef = doc(db, 'users', user.uid);
      const now = serverTimestamp();

      try {
        // Create or update user profile with nickname
        const profileData = {
          documentId: user.uid,
          nickname,
          highScores: { ...localHighScores, [difficulty]: score },
          hasJoinedLeaderboard: true,
          lastPlayed: now,
          authProvider: userProfile?.authProvider || (user.isAnonymous ? 'anonymous' : 'google'),
          ...(userProfile ? {} : { createdAt: now }),
        };

        if (userProfile) {
          await updateDoc(userRef, profileData);
        } else {
          await setDoc(userRef, { ...profileData, createdAt: now });
        }

        // Update local state
        const newScores = { ...localHighScores, [difficulty]: score };
        await saveLocalHighScores(newScores);

        setUserProfile({
          documentId: user.uid,
          nickname,
          createdAt: userProfile?.createdAt || new Date(),
          lastPlayed: new Date(),
          highScores: newScores,
          hasJoinedLeaderboard: true,
          authProvider: userProfile?.authProvider || (user.isAnonymous ? 'anonymous' : 'google'),
          email: userProfile?.email || null,
          displayName: userProfile?.displayName || null,
          photoURL: userProfile?.photoURL || null,
        });
      } catch (error) {
        console.error('Error joining leaderboard:', error);
        throw error;
      }
    },
    [user, userProfile, localHighScores, saveLocalHighScores]
  );

  const promptGoogleSignIn = useCallback(async () => {
    setIsGoogleLoading(true);
    try {
      return await promptAsync();
    } catch (error) {
      console.error('Error prompting Google sign-in:', error);
      setIsGoogleLoading(false);
      throw error;
    }
  }, [promptAsync]);

  const linkGoogleAccount = useCallback(async () => {
    if (!user?.isAnonymous) {
      console.warn('User is not anonymous, cannot link');
      return;
    }
    await promptGoogleSignIn();
  }, [user, promptGoogleSignIn]);

  const promptAppleSignIn = useCallback(async () => {
    return await handleAppleSignIn();
  }, [user]);

  const linkAppleAccount = useCallback(async () => {
    if (!user?.isAnonymous) {
      console.warn('User is not anonymous, cannot link');
      return;
    }
    await handleAppleSignIn();
  }, [user]);

  const signOut = useCallback(async () => {
    try {
      await auth.signOut();
      // onAuthStateChanged will auto-create new anonymous session
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, []);

  // Derived values
  const authProvider: AuthProviderType = userProfile?.authProvider || (user?.isAnonymous ? 'anonymous' : 'google');
  const isGoogleLinked = authProvider === 'google' || authProvider === 'apple' || !user?.isAnonymous;
  const googleDisplayName = userProfile?.displayName || null;
  const googleEmail = userProfile?.email || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isLoading,
        nickname: userProfile?.nickname ?? null,
        hasJoinedLeaderboard: userProfile?.hasJoinedLeaderboard ?? false,
        localHighScores,
        setNickname,
        updateHighScore,
        isNewHighScore,
        joinLeaderboard,
        // Hybrid auth
        authProvider,
        isGoogleLinked,
        googleDisplayName,
        googleEmail,
        isGoogleLoading,
        promptGoogleSignIn,
        linkGoogleAccount,
        // Apple auth
        isAppleAvailable,
        isAppleLoading,
        promptAppleSignIn,
        linkAppleAccount,
        // Sign out
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
