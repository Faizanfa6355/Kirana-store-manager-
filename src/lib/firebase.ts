import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfigFallback from '../../firebase-applet-config.json';

/**
 * Safely strips any accidental leading/trailing quotes (single or double) and whitespace
 * that can occur when environment variables are injected into the environment.
 */
function cleanEnvValue(value: unknown, fallback = ''): string {
  const sanitize = (raw: unknown): string => {
    if (raw === undefined || raw === null) return '';
    let str = String(raw).trim();
    while (
      (str.startsWith('"') && str.endsWith('"') && str.length >= 2) ||
      (str.startsWith("'") && str.endsWith("'") && str.length >= 2)
    ) {
      str = str.slice(1, -1).trim();
    }
    return str;
  };

  const cleaned = sanitize(value);
  if (cleaned) {
    return cleaned;
  }
  return sanitize(fallback);
}

const metaEnv = (import.meta as any).env || {};

export const firebaseConfig = {
  apiKey: cleanEnvValue(metaEnv.VITE_FIREBASE_API_KEY, firebaseConfigFallback.apiKey),
  authDomain: cleanEnvValue(metaEnv.VITE_FIREBASE_AUTH_DOMAIN, firebaseConfigFallback.authDomain),
  projectId: cleanEnvValue(metaEnv.VITE_FIREBASE_PROJECT_ID, firebaseConfigFallback.projectId),
  storageBucket: cleanEnvValue(metaEnv.VITE_FIREBASE_STORAGE_BUCKET, firebaseConfigFallback.storageBucket),
  messagingSenderId: cleanEnvValue(metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID, firebaseConfigFallback.messagingSenderId),
  appId: cleanEnvValue(metaEnv.VITE_FIREBASE_APP_ID, firebaseConfigFallback.appId),
  ...(cleanEnvValue(metaEnv.VITE_FIREBASE_MEASUREMENT_ID, (firebaseConfigFallback as any).measurementId)
    ? { measurementId: cleanEnvValue(metaEnv.VITE_FIREBASE_MEASUREMENT_ID, (firebaseConfigFallback as any).measurementId) }
    : {}),
};

// Ensure Firebase is initialized only once across the application lifecycle
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const firestoreDatabaseId = cleanEnvValue(
  metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
  (firebaseConfigFallback as any).firestoreDatabaseId || '(default)'
);

export const db = getFirestore(app, firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export function getFirebaseErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred.';
  const code = error.code || '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Incorrect email or password. Please check your credentials and try again.';
    case 'auth/user-not-found':
      return 'No account found with this email address. Please sign up first.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/popup-closed-by-user':
      return 'Google Sign-In was cancelled.';
    case 'auth/cancelled-popup-request':
      return 'Google Sign-In request was cancelled.';
    case 'auth/popup-blocked':
      return 'Sign-in pop-up was blocked by your browser. Please allow pop-ups for this site.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Please try again after a few minutes.';
    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact support.';
    case 'auth/api-key-not-valid.please-pass-a-valid-api-key':
    case 'auth/api-key-not-valid-please-pass-a-valid-api-key':
      return 'Firebase API key is invalid. Please check your API key configuration.';
    default:
      return error.message || 'Authentication operation failed. Please try again.';
  }
}
