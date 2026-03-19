/**
 * FinVision AI — Cloud Firestore Data Layer (Phase 5)
 * ============================================================
 * Schema:
 *   /Users/{uid}/
 *     Personal_Details  (sub-collection, single doc "profile")
 *     Financial_Plans   (sub-collection, one doc per saved scenario)
 *     AI_Summaries      (sub-collection, cached Gemini responses)
 *
 * All read/write operations require an authenticated UID.
 * Firestore Security Rules (defined in firestore.rules) enforce
 * strict per-user isolation: only the document owner can access it.
 */

import { db, isFirebaseConfigured } from './config.js';
import { FIRESTORE } from '@/utils/constants.js';

/* ─────────────────────────────────────────────────────────────
   HELPER — validate authenticated UID before any operation
───────────────────────────────────────────────────────────── */
function _requireUID(uid) {
  if (!uid) throw new Error('Authentication required. Please sign in.');
  if (!isFirebaseConfigured || !db) throw new Error('Firebase not configured.');
}

/* ─────────────────────────────────────────────────────────────
   PERSONAL DETAILS
───────────────────────────────────────────────────────────── */

/**
 * Save the user's personal details to Firestore.
 * @param {string} uid
 * @param {Object} details
 */
export async function savePersonalDetails(uid, details) {
  _requireUID(uid);
  // Phase 5 — setDoc(doc(db, FIRESTORE.USERS, uid, FIRESTORE.PERSONAL_DETAILS, 'profile'), details, { merge: true })
}

/**
 * Load the user's personal details from Firestore.
 * @param {string} uid
 * @returns {Promise<Object|null>}
 */
export async function loadPersonalDetails(uid) {
  _requireUID(uid);
  // Phase 5 — getDoc
  return null;
}

/* ─────────────────────────────────────────────────────────────
   FINANCIAL PLANS / SCENARIOS
───────────────────────────────────────────────────────────── */

/**
 * Save a financial plan scenario.
 * @param {string} uid
 * @param {string} planId  - Use crypto.randomUUID() for new plans
 * @param {Object} planData
 */
export async function savePlan(uid, planId, planData) {
  _requireUID(uid);
  // Phase 5 — setDoc with serverTimestamp()
}

/**
 * Load all saved plans for the user.
 * @param {string} uid
 * @returns {Promise<Array>}
 */
export async function loadAllPlans(uid) {
  _requireUID(uid);
  // Phase 5 — getDocs(collection(...))
  return [];
}

/**
 * Delete a saved plan.
 * @param {string} uid
 * @param {string} planId
 */
export async function deletePlan(uid, planId) {
  _requireUID(uid);
  // Phase 5 — deleteDoc
}

/* ─────────────────────────────────────────────────────────────
   REAL-TIME SYNC (Firestore listener)
───────────────────────────────────────────────────────────── */

/**
 * Subscribe to real-time updates on a specific plan document.
 * @param {string} uid
 * @param {string} planId
 * @param {Function} onUpdate  - Callback with latest plan data
 * @returns {Function} Unsubscribe function
 */
export function subscribeToPlan(uid, planId, onUpdate) {
  if (!isFirebaseConfigured || !db || !uid) return () => {};
  // Phase 5 — onSnapshot(doc(db, ...), callback)
  return () => {};
}
