/**
 * FinVision AI — Cloud Firestore Data Layer (Phase 5)
 * ============================================================
 * Schema (FinVision-namespaced — never collides with other app data):
 *   /Users/{uid}/FinVision/Personal_Details/profile
 *   /Users/{uid}/FinVision/Financial_Plans/{planId}
 *   /Users/{uid}/FinVision/AI_Summaries/latest
 *
 * All data is scoped under the "FinVision" sub-collection so it
 * never merges with any existing data in the user's Firebase document.
 * All read/write operations require an authenticated UID.
 */

import {
  doc, getDoc, setDoc, getDocs, deleteDoc,
  collection, serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config.js';
import { FIRESTORE } from '@/utils/constants.js';

function _requireUID(uid) {
  if (!uid) throw new Error('Authentication required. Please sign in.');
  if (!isFirebaseConfigured || !db) throw new Error('Firebase not configured.');
}

/**
 * Build a Firestore doc reference scoped under the FinVision namespace.
 * Path: Users/{uid}/FinVision/data/{subCollection}/{docId}  (6 segments — even ✓)
 * "data" is a fixed anchor document so FinVision acts as a true namespace
 * sub-collection without colliding with any other data in the user's tree.
 */
function _fvDoc(uid, subCollection, docId) {
  return doc(db, FIRESTORE.USERS, uid, FIRESTORE.FINVISION_ROOT, 'data', subCollection, docId);
}

/**
 * Build a Firestore collection reference scoped under the FinVision namespace.
 * Path: Users/{uid}/FinVision/data/{subCollection}
 */
function _fvCollection(uid, subCollection) {
  return collection(db, FIRESTORE.USERS, uid, FIRESTORE.FINVISION_ROOT, 'data', subCollection);
}

/* ─── PERSONAL DETAILS ────────────────────────────────────────── */

export async function savePersonalDetails(uid, details) {
  _requireUID(uid);
  const ref = _fvDoc(uid, FIRESTORE.PERSONAL_DETAILS, 'profile');
  await setDoc(ref, { ...details, updatedAt: serverTimestamp() }, { merge: true });
}

export async function loadPersonalDetails(uid) {
  _requireUID(uid);
  const ref  = _fvDoc(uid, FIRESTORE.PERSONAL_DETAILS, 'profile');
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/* ─── FINANCIAL PLANS / SCENARIOS ───────────────────────────────── */

export async function savePlan(uid, planId, planData) {
  _requireUID(uid);
  const ref = _fvDoc(uid, FIRESTORE.FINANCIAL_PLANS, planId);
  await setDoc(ref, {
    ...planData,
    planId,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function loadAllPlans(uid) {
  _requireUID(uid);
  const col  = _fvCollection(uid, FIRESTORE.FINANCIAL_PLANS);
  const snap = await getDocs(col);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deletePlan(uid, planId) {
  _requireUID(uid);
  const ref = _fvDoc(uid, FIRESTORE.FINANCIAL_PLANS, planId);
  await deleteDoc(ref);
}

/* ─── AI SUMMARIES ──────────────────────────────────────────────── */

export async function saveAISummary(uid, summary) {
  _requireUID(uid);
  const ref = _fvDoc(uid, FIRESTORE.AI_SUMMARIES, 'latest');
  await setDoc(ref, { summary, generatedAt: serverTimestamp() });
}

export async function loadAISummary(uid) {
  if (!uid || !isFirebaseConfigured || !db) return null;
  const ref  = _fvDoc(uid, FIRESTORE.AI_SUMMARIES, 'latest');
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().summary : null;
}

/* ─── REAL-TIME SYNC ────────────────────────────────────────────── */

export async function subscribeToPlan(uid, planId, onUpdate) {
  if (!isFirebaseConfigured || !db || !uid) return () => {};
  const ref = _fvDoc(uid, FIRESTORE.FINANCIAL_PLANS, planId);
  return onSnapshot(ref, snap => {
    if (snap.exists()) onUpdate(snap.data());
  });
}

/**
 * Subscribe to real-time updates of a partner's profile document.
 * Returns the Firestore unsubscribe function — caller MUST invoke it
 * when the household view is torn down to prevent memory leaks and
 * unnecessary Firestore reads.
 *
 * The listener fires immediately with the current document value, then
 * on every subsequent write. Visibility filtering is enforced client-side
 * (Firestore rules are document-level; array element filtering is not
 * possible server-side).
 *
 * Security: the Firestore rule for this path requires that the reader's
 * UID appears in the document's `linkedAccountIds` array.
 *
 * @param {string}   partnerUID  — UID of the linked partner
 * @param {Function} onUpdate    — called with the raw doc data on every change
 * @param {Function} [onError]   — called with the Firestore error; optional
 * @returns {Function} unsubscribe — invoke to stop the listener
 */
export function subscribeToPartnerProfile(partnerUID, onUpdate, onError) {
  if (!isFirebaseConfigured || !db || !partnerUID) return () => {};
  const ref = _fvDoc(partnerUID, FIRESTORE.PERSONAL_DETAILS, 'profile');
  return onSnapshot(
    ref,
    snap => { if (snap.exists()) onUpdate(snap.data()); },
    err  => { if (onError) onError(err); },
  );
}

/* ─── FAMILY SYNC CODES ──────────────────────────────────────── */
// Top-level /SyncCodes/{code} collection — not scoped under any user
// so a partner can look up a code without knowing the UID first.
// Readable by any authenticated user; writable only by the code owner.
// Each code expires after 24 hours and must be re-generated.

/**
 * Publish a sync code to Firestore so a partner can discover this user.
 * The `profileSnapshot` contains the full plan state — visibility
 * filtering happens client-side, but all items (shared + private) are
 * stored so the partner can render the correct view.
 *
 * Required Firestore security rule:
 *   match /SyncCodes/{code} {
 *     allow read:   if request.auth != null;
 *     allow create: if request.auth != null && request.auth.uid == request.resource.data.uid;
 *     allow update, delete: if request.auth != null && request.auth.uid == resource.data.uid;
 *   }
 *
 * @param {string} uid
 * @param {string} code
 * @param {Object} profileSnapshot
 */
export async function saveSyncCode(uid, code, profileSnapshot) {
  if (!uid || !isFirebaseConfigured || !db) throw new Error('Firebase not configured.');
  const ref = doc(db, 'SyncCodes', code);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h TTL
  await setDoc(ref, {
    uid,
    ...profileSnapshot,
    createdAt: serverTimestamp(),
    expiresAt: expiresAt.toISOString(),
  });
}

/**
 * Fetch a sync code document and return the partner profile snapshot,
 * or null if the code doesn't exist or has expired.
 *
 * @param {string} code
 * @returns {Promise<Object|null>}
 */
export async function loadSyncCode(code) {
  if (!isFirebaseConfigured || !db) throw new Error('Firebase not configured.');
  const ref  = doc(db, 'SyncCodes', code);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  // Enforce 24 h TTL
  if (data.expiresAt && new Date() > new Date(data.expiresAt)) return null;
  return data;
}

/**
 * Delete a sync code (called after it is consumed or when unlinking).
 * Silently ignored if the code doesn't exist.
 *
 * @param {string} code
 */
export async function deleteSyncCode(code) {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, 'SyncCodes', code));
  } catch (_) {
    // Ignore — cleanup is best-effort
  }
}

/* ─── PARTNER SNAPSHOT (PERSISTENCE) ────────────────────────── */
// Stores a copy of the partner's profile snapshot under the user's own
// Firestore path so it survives page refreshes and re-logins.
// Path: Users/{uid}/FinVision/data/Linked_Account/partner

/**
 * Persist the partner profile snapshot so it can be restored on next login.
 *
 * @param {string} uid          — current user's UID
 * @param {Object} partnerProfile — partner data (metadata already stripped)
 */
export async function savePartnerSnapshot(uid, partnerProfile) {
  _requireUID(uid);
  const ref = _fvDoc(uid, 'Linked_Account', 'partner');
  await setDoc(ref, { ...partnerProfile, savedAt: serverTimestamp() });
}

/**
 * Load the previously saved partner snapshot.
 * Returns null if not found or Firebase is unavailable.
 *
 * @param {string} uid
 * @returns {Promise<Object|null>}
 */
export async function loadPartnerSnapshot(uid) {
  if (!uid || !isFirebaseConfigured || !db) return null;
  try {
    const ref  = _fvDoc(uid, 'Linked_Account', 'partner');
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const { savedAt: _, ...profile } = snap.data();
    return profile;
  } catch (_) {
    return null;
  }
}

/**
 * Remove the saved partner snapshot (called on unlink).
 *
 * @param {string} uid
 */
export async function deletePartnerSnapshot(uid) {
  if (!uid || !isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(_fvDoc(uid, 'Linked_Account', 'partner'));
  } catch (_) {
    // Best-effort cleanup
  }
}

