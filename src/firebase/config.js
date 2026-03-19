/**
 * FinVision AI — Firebase Configuration (Phase 5)
 * ============================================================
 * Initializes the Firebase app and exports all service instances.
 *
 * SECURITY NOTE: Replace the placeholder config values with your
 * actual Firebase project credentials. These values are safe to
 * include in client-side bundles (they are public API keys scoped
 * by Firebase Security Rules, App Check, and auth rules).
 *
 * DO NOT commit actual API keys to public repositories.
 * Use environment variables via Vite's import.meta.env:
 *   VITE_FIREBASE_API_KEY=...  (stored in .env.local — gitignored)
 */

import { initializeApp } from 'firebase/app';
import { getAuth }        from 'firebase/auth';
import { getFirestore }   from 'firebase/firestore';

/**
 * Firebase project configuration.
 * Values are read from Vite environment variables.
 * Set these in your .env.local file.
 */
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || '',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || '',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || '',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || '',
};

/** Whether Firebase is properly configured */
export const isFirebaseConfigured =
  Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

/** Firebase application instance */
export const firebaseApp = isFirebaseConfigured
  ? initializeApp(firebaseConfig)
  : null;

/** Firebase Authentication service */
export const auth = firebaseApp ? getAuth(firebaseApp) : null;

/** Cloud Firestore database instance */
export const db   = firebaseApp ? getFirestore(firebaseApp) : null;

export default firebaseApp;
