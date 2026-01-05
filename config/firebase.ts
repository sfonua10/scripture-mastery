import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  initializeAuth,
  // @ts-ignore - getReactNativePersistence exists but missing from TS types (known Firebase issue)
  getReactNativePersistence,
  GoogleAuthProvider,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Google OAuth Client IDs - get these from Google Cloud Console
// Go to: console.cloud.google.com > APIs & Services > Credentials > OAuth 2.0 Client IDs
export const GOOGLE_WEB_CLIENT_ID = '464060100805-4c5808tsmu9t6li9j2p3nnsau0t7o6kq.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID = '379124255608-h3cd86tp5eglgcrjivo5p4hjk3kt91b0.apps.googleusercontent.com';

const firebaseConfig = {
  apiKey: 'AIzaSyDgdNH1EX_OgYkeMI2-QZNm2-BIFdBsjaw',
  authDomain: 'scripture-mastery-pro.firebaseapp.com',
  projectId: 'scripture-mastery-pro',
  storageBucket: 'scripture-mastery-pro.firebasestorage.app',
  messagingSenderId: '379124255608',
  appId: '1:379124255608:web:b88f214478c8227d0ad68d',
};

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth with AsyncStorage persistence for React Native
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider, GoogleAuthProvider };
