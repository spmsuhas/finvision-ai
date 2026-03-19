/**
 * FinVision AI — Firebase Authentication (Phase 5)
 * ============================================================
 * Provides sign-in / sign-out / session management.
 * Supports: Google OAuth, Email/Password.
 */

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from 'firebase/auth';
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
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, provider);
}

/**
 * Sign in with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('firebase/auth').UserCredential | null>}
 */
export async function signInWithEmail(email, password) {
  if (!isFirebaseConfigured || !auth) return null;
  return signInWithEmailAndPassword(auth, email, password);
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
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && credential.user) {
    await updateProfile(credential.user, { displayName });
  }
  return credential;
}

/**
 * Send a password reset email.
 * @param {string} email
 */
export async function sendPasswordReset(email) {
  if (!isFirebaseConfigured || !auth) return;
  return sendPasswordResetEmail(auth, email);
}

/** Sign out the current user. */
export async function signOut() {
  if (!isFirebaseConfigured || !auth) return;
  return firebaseSignOut(auth);
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
  return firebaseOnAuthStateChanged(auth, callback);
}


