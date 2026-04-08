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

export function subscribeToPlan(uid, planId, onUpdate) {
  if (!isFirebaseConfigured || !db || !uid) return () => {};
  const ref = _fvDoc(uid, FIRESTORE.FINANCIAL_PLANS, planId);
  return onSnapshot(ref, snap => {
    if (snap.exists()) onUpdate(snap.data());
  });
}

