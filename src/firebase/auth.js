/**
 * FinVision AI — Firebase Authentication (Phase 5)
 * ============================================================
 * Provides sign-in / sign-out / session management.
 * Supports: Google OAuth, Email/Password.
 */

// Phase 5 — full implementation.
import { auth, isFirebaseConfigured } from './config.js';

/**
 * Sign in with Google OAuth popup.
 * @returns {Promise<import('firebase/auth').UserCredential | null>}
 */
export async function signInWithGoogle() {
  if (!isFirebaseConfigured || !auth) {
    console.warn('[Auth] Firebase not configured. Skipping Google sign-in.');
    return null;
  }
  // Phase 5 — GoogleAuthProvider + signInWithPopup
  return null;
}

/**
 * Sign in with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('firebase/auth').UserCredential | null>}
 */
export async function signInWithEmail(email, password) {
  if (!isFirebaseConfigured || !auth) return null;
  // Phase 5 — signInWithEmailAndPassword
  return null;
}

/**
 * Create a new account with email and password.
 * @param {string} email
 * @param {string} password
 * @param {string} displayName
 * @returns {Promise<import('firebase/auth').UserCredential | null>}
 */
export async function createAccount(email, password, displayName) {
  if (!isFirebaseConfigured || !auth) return null;
  // Phase 5 — createUserWithEmailAndPassword + updateProfile
  return null;
}

/**
 * Send a password reset email.
 * @param {string} email
 */
export async function sendPasswordReset(email) {
  if (!isFirebaseConfigured || !auth) return;
  // Phase 5 — sendPasswordResetEmail
}

/** Sign out the current user. */
export async function signOut() {
  if (!isFirebaseConfigured || !auth) return;
  // Phase 5 — signOut(auth)
}

/**
 * Subscribe to authentication state changes.
 * @param {(user: import('firebase/auth').User | null) => void} callback
 * @returns {Function} Unsubscribe function
 */
export function onAuthStateChanged(callback) {
  if (!isFirebaseConfigured || !auth) {
    callback(null);
    return () => {};
  }
  // Phase 5 — onAuthStateChanged(auth, callback)
  callback(null);
  return () => {};
}
