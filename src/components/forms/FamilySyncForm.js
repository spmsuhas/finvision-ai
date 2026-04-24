/**
 * FinVision AI — Family Sync Module
 * ============================================================
 * Decentralised Linked Accounts architecture.
 *
 * Each user owns their own independent dashboard.
 * Linking is done via a Sync Code handshake:
 *
 *   STEP 1 — Generate code
 *     Derives a 16-char code from the user's UID; writes a profile snapshot
 *     to /SyncCodes/{code} in Firestore with a 24-h TTL.
 *     User shares this code out-of-band.
 *
 *   STEP 2 — Enter partner code
 *     Reads /SyncCodes/{partnerCode}. Validates expiry + not own code.
 *     Stores profile snapshot in state.partnerData AND saves it to the
 *     user's own Firestore for persistence across refreshes.
 *
 * Bidirectional flow:
 *     Even after linking, Step 1 ("Share Your Code") remains visible so
 *     the other user can link back.
 *
 * Offline / Firebase not configured:
 *     Shows informational message + "Load demo data" button.
 */

import { formatRupee } from '@/utils/formatters.js';
import { isFirebaseConfigured } from '@/firebase/config.js';
import {
  saveSyncCode, loadSyncCode,
  savePartnerSnapshot, deletePartnerSnapshot,
} from '@/firebase/firestore.js';
import { confirmDelete } from '@/utils/confirmDelete.js';

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */

function generateCode(uid) {
  const raw = `fv:${uid || 'local-' + Date.now()}`;
  return btoa(raw).replace(/[+/=]/g, '').substring(0, 16).toUpperCase();
}

function isValidCode(code) {
  return typeof code === 'string' && /^[A-Z0-9]{8,20}$/.test(code.trim());
}

/** Maps raw Firebase / network errors to readable user messages */
function friendlyLinkError(err) {
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('permission') || msg.includes('permission-denied'))
    return 'Permission denied. Make sure you are signed in and try again.';
  if (msg.includes('network') || msg.includes('offline') || msg.includes('unavailable') || msg.includes('failed to fetch'))
    return 'Network error. Check your internet connection and try again.';
  if (msg.includes('not-found'))
    return 'Code not found. It may have expired \u2014 ask your partner to generate a new one.';
  return 'Could not link. Please try again, or ask your partner to generate a fresh code.';
}

function buildProfileSnapshot(state) {
  return {
    name:                  state.name                 || 'Partner',
    monthlyIncome:         state.monthlyIncome         || 0,
    retirementAge:         state.retirementAge         || 60,
    currentAge:            state.currentAge            || 30,
    salaryRaiseRate:       state.salaryRaiseRate        || 0.07,
    currentEquity:         state.currentEquity          || 0,
    currentDebt:           state.currentDebt            || 0,
    currentEPF:            state.currentEPF             || 0,
    currentGold:           state.currentGold            || 0,
    currentRealEstate:     state.currentRealEstate      || 0,
    currentCash:           state.currentCash            || 0,
    currentAlternatives:   state.currentAlternatives    || 0,
    monthlyExpenses:       state.monthlyExpenses         || 0,
    monthlyMedicalPremium: state.monthlyMedicalPremium   || 0,
    shareAssets:           state.shareAssets !== false,
    goals:                 (state.goals        || []).map(g => ({ ...g })),
    activeSavings:         (state.activeSavings || []).map(s => ({ ...s })),
    liabilities:           (state.liabilities  || []).map(l => ({ ...l })),
  };
}

const DEMO_PARTNER = {
  name: 'Demo Partner',
  monthlyIncome: 80000,
  retirementAge: 58,
  currentAge: 34,
  salaryRaiseRate: 0.06,
  currentEquity: 850000,
  currentDebt: 450000,
  currentEPF: 280000,
  currentGold: 120000,
  currentRealEstate: 0,
  currentCash: 200000,
  currentAlternatives: 0,
  monthlyExpenses: 20000,
  monthlyMedicalPremium: 2000,
  shareAssets: true,
  goals: [
    { id: 'dg1', name: 'Demo Retirement Fund', type: 'RETIREMENT', targetYear: 2050, todayValue: 8000000, inflationRate: 0.06, visibility: 'shared' },
    { id: 'dg2', name: 'Demo Private Goal',    type: 'OTHER',      targetYear: 2028, todayValue:  300000, inflationRate: 0.06, visibility: 'private' },
  ],
  activeSavings: [
    { id: 'ds1', type: 'MF_SIP', name: 'Demo Equity SIP', monthlyAmount: 20000, annualRate: 0.12, assetClass: 'equity', visibility: 'shared',  startDate: '2022-04', endDate: null, linkType: 'goal', linkedGoalId: 'dg1', linkedAssetKey: null, investmentFamily: 'mutual-funds', instrumentLabel: 'Mutual Fund SIP',  investmentFamilyLabel: 'Mutual Funds' },
    { id: 'ds2', type: 'NPS',    name: 'Demo NPS',        monthlyAmount: 10000, annualRate: 0.10, assetClass: 'equity', visibility: 'shared',  startDate: '2023-01', endDate: null, linkType: null,   linkedGoalId: null,  linkedAssetKey: null, investmentFamily: 'retirement',   instrumentLabel: 'NPS Contribution', investmentFamilyLabel: 'Retirement'   },
  ],
  liabilities: [
    { id: 'dl1', name: 'Demo Car Loan', type: 'car', outstandingBalance: 450000, annualRate: 0.095, tenureMonths: 36, currentEMI: 14300, visibility: 'shared' },
  ],
};

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════════════ */
export function mountFamilySyncForm(container, state, { updateState, showToast, scheduleRecalculation }) {
  if (!container) return;

  if (container._famSyncAbort) container._famSyncAbort.abort();
  const _ac = new AbortController();
  container._famSyncAbort = _ac;
  const { signal } = _ac;

  let _generatedCode = null;
  let _isGenerating  = false;
  let _isLinking     = false;
  let _linkErrorMsg  = null;   // persists across renders; cleared on success or new input

  /* ─────────────────── HTML: GENERATE CODE SECTION ──────────── */
  // Shared between linked and unlinked states.
  function htmlGenerateCodeSection() {
    return `
      <div class="card">
        <h3 class="card-title flex items-center gap-2 text-base mb-1">
          <span class="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block"></span>
          Share Your Sync Code
        </h3>
        <p class="text-xs text-slate-400 mb-4">Publish your code and share it with your partner so they can link your account on their device.</p>
        <div class="flex items-center gap-3 mb-3">
          <div class="flex-1 bg-surface-3 rounded-xl border border-white/10 px-4 py-3 font-mono text-lg font-bold text-brand tracking-widest text-center select-all min-h-[3rem] flex items-center justify-center" id="my-sync-code-display">
            ${_generatedCode
              ? _generatedCode
              : '<span class="text-slate-500 text-sm font-normal font-sans">Not published yet</span>'}
          </div>
          ${_generatedCode ? `<button id="btn-copy-code" class="btn-secondary text-sm flex items-center gap-2 shrink-0">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</button>` : ''}
        </div>
        <button id="btn-generate-code" class="btn-secondary text-sm w-full flex items-center justify-center gap-2" ${_isGenerating ? 'disabled' : ''}>
          ${_isGenerating
            ? '<span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Publishing\u2026'
            : `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>${_generatedCode ? 'Re-generate Code' : 'Generate &amp; Publish Code'}`}
        </button>
        ${_generatedCode ? '<p class="text-xs text-slate-500 mt-2 text-center">Expires in 24 hours \u2014 share before it expires.</p>' : ''}
      </div>`;
  }

  /* ─────────────────── RENDER ───────────────────────────────── */
  function render() {
    const isLinked    = !!state.partnerData;
    const hasFirebase = !!(isFirebaseConfigured && state.uid);
    const partnerName = state.partnerData?.name || 'Partner';

    const sharedSavings     = (state.partnerData?.activeSavings || []).filter(s => (s.visibility ?? 'shared') === 'shared');
    const sharedLiabilities = (state.partnerData?.liabilities   || []).filter(l => (l.visibility ?? 'shared') === 'shared');
    const sharedGoals       = (state.partnerData?.goals         || []).filter(g => (g.visibility ?? 'shared') === 'shared');
    const partnerMonthlyEMI = sharedLiabilities.reduce((sum, l) => sum + (l.currentEMI || 0), 0);

    container.innerHTML = `
      <div class="max-w-3xl mx-auto space-y-5">
        <div class="text-center mb-2">
          <h2 class="text-lg font-bold text-white tracking-wide">Family Sync</h2>
          <p class="text-xs text-slate-500 mt-0.5">Link with a partner to see a combined Household view</p>
        </div>

        ${isLinked
          ? htmlLinkedState(partnerName, sharedSavings, sharedLiabilities, sharedGoals, partnerMonthlyEMI, hasFirebase)
          : htmlUnlinkedState(hasFirebase)}

        <div class="card bg-surface-3/60 border border-white/5">
          <div class="flex items-start gap-3">
            <span class="text-xl mt-0.5">\uD83D\uDD10</span>
            <div>
              <p class="text-xs font-semibold text-white mb-1">Privacy Architecture</p>
              <p class="text-xs text-slate-400 leading-relaxed">Each user's data stays in their own Firebase account.
                Only items marked <span class="text-emerald-400 font-medium">Shared</span> appear in Household view.
                Items marked <span class="text-rose-400 font-medium">Private</span> are never shown to your partner.
                Unlinking immediately removes all partner data from your dashboard.</p>
            </div>
          </div>
        </div>
      </div>`;

    wireEvents(isLinked, hasFirebase);
  }

  /* ─────────────────── HTML BUILDERS ────────────────────────── */
  function htmlUnlinkedState(hasFirebase) {
    if (!hasFirebase) {
      return `<div class="card bg-amber-500/8 border border-amber-500/25">
        <div class="flex items-start gap-3">
          <span class="text-2xl">\u26A1</span>
          <div>
            <p class="text-sm font-semibold text-amber-300 mb-1">Sign in required for live sync</p>
            <p class="text-xs text-slate-400 leading-relaxed mb-3">Sign in with your Firebase account to generate a real Sync Code and link with a partner. You can still explore the Household view with demo data.</p>
            <button id="btn-load-demo" class="btn-secondary text-xs">Load demo partner data</button>
          </div>
        </div>
      </div>`;
    }

    return `
      ${htmlGenerateCodeSection()}

      <div class="card">
        <h3 class="card-title flex items-center gap-2 text-base mb-1">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
          Enter Partner's Sync Code
        </h3>
        <p class="text-xs text-slate-400 mb-4">Ask your partner for their Sync Code and paste it below.</p>
        <div class="flex items-center gap-3">
          <input id="partner-code-input" type="text"
            class="form-input flex-1 font-mono tracking-widest uppercase transition-colors ${_linkErrorMsg ? 'border-rose-500/60 ring-1 ring-rose-500/20' : ''}"
            placeholder="e.g. FV2A3B4C5D6E7F8G" maxlength="20" autocomplete="off" autocorrect="off" spellcheck="false" />
          <button id="btn-link-account" class="btn-primary text-sm flex items-center gap-2 shrink-0" ${_isLinking ? 'disabled' : ''}>
            ${_isLinking
              ? '<span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Linking\u2026'
              : `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>Link`}
          </button>
        </div>
        ${_linkErrorMsg ? `
        <div id="link-error-banner" class="flex items-start gap-2.5 mt-3 p-3 rounded-xl border border-rose-500/30 bg-rose-500/8">
          <svg class="w-4 h-4 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
          </svg>
          <p class="text-xs text-rose-300 leading-relaxed">${_linkErrorMsg}</p>
        </div>` : ''}
      </div>`;
  }

  function htmlLinkedState(partnerName, sharedSavings, sharedLiabilities, sharedGoals, partnerMonthlyEMI, hasFirebase) {
    return `
      <div class="card bg-emerald-500/8 border border-emerald-500/20">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-lg font-bold shrink-0">${partnerName[0].toUpperCase()}</div>
            <div>
              <p class="text-sm font-semibold text-white">${partnerName}</p>
              <p class="text-xs text-emerald-400 flex items-center gap-1">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Linked \u2014 Household view available
              </p>
            </div>
          </div>
          <button id="btn-unlink-account" class="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-500/40 bg-rose-500/10 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/60 transition-colors shrink-0">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/><line x1="4" y1="4" x2="20" y2="20" stroke-linecap="round"/></svg>
            Unlink
          </button>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title flex items-center gap-2 text-base mb-4">
          <span class="w-2.5 h-2.5 rounded-full bg-brand inline-block"></span>
          Shared Data Summary
        </h3>
        <p class="text-xs text-slate-400 mb-4">Items from ${partnerName}'s account included in <strong class="text-white">Household view</strong>. Private items are excluded.</p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="bg-surface-3 rounded-xl p-3 text-center">
            <p class="text-xs text-slate-500 mb-1">Partner Income</p>
            <p class="text-sm font-bold text-white">${formatRupee(state.partnerData?.monthlyIncome || 0)}/mo</p>
          </div>
          <div class="bg-surface-3 rounded-xl p-3 text-center">
            <p class="text-xs text-slate-500 mb-1">Shared SIPs</p>
            <p class="text-sm font-bold text-emerald-400">${sharedSavings.length} of ${(state.partnerData?.activeSavings || []).length}</p>
          </div>
          <div class="bg-surface-3 rounded-xl p-3 text-center">
            <p class="text-xs text-slate-500 mb-1">Shared EMI</p>
            <p class="text-sm font-bold text-rose-400">${formatRupee(partnerMonthlyEMI)}/mo</p>
          </div>
          <div class="bg-surface-3 rounded-xl p-3 text-center">
            <p class="text-xs text-slate-500 mb-1">Shared Goals</p>
            <p class="text-sm font-bold text-brand">${sharedGoals.length}</p>
          </div>
        </div>
      </div>

      ${sharedSavings.length > 0 ? `<div class="card">
        <h3 class="text-sm font-semibold text-slate-400 mb-3">${partnerName}'s Shared Investments</h3>
        <div class="divide-y divide-white/5">
          ${sharedSavings.map(s => `
          <div class="flex items-center justify-between py-2.5">
            <div>
              <p class="text-sm text-white">${s.name || s.type}</p>
              <p class="text-xs text-slate-500">${s.instrumentLabel || s.type} \u00B7 ${((s.annualRate || 0.10) * 100).toFixed(1)}% p.a.</p>
            </div>
            <p class="text-sm font-semibold text-emerald-400">${formatRupee(s.monthlyAmount)}/mo</p>
          </div>`).join('')}
        </div>
      </div>` : ''}

      ${hasFirebase ? htmlGenerateCodeSection() : ''}`;
  }

  /* ─────────────────── EVENT WIRING ─────────────────────────── */
  function wireEvents(isLinked, hasFirebase) {

    /* Generate & copy — present in both linked and unlinked states */
    function wireGenerateAndCopy() {
      container.querySelector('#btn-generate-code')?.addEventListener('click', async () => {
        if (_isGenerating) return;
        _isGenerating = true;
        render();
        try {
          const code     = generateCode(state.uid);
          const snapshot = buildProfileSnapshot(state);
          await saveSyncCode(state.uid, code, snapshot);
          _generatedCode = code;
          showToast('Sync code published! Share it with your partner.', 'success');
        } catch (err) {
          showToast('Could not publish code: ' + err.message, 'error');
        } finally {
          _isGenerating = false;
          render();
        }
      }, { signal });

      container.querySelector('#btn-copy-code')?.addEventListener('click', () => {
        if (_generatedCode) {
          navigator.clipboard.writeText(_generatedCode)
            .then(() => showToast('Sync code copied!', 'success'))
            .catch(() => showToast('Copy failed \u2014 select and copy manually.', 'error'));
        }
      }, { signal });
    }

    if (isLinked) {
      container.querySelector('#btn-unlink-account')?.addEventListener('click', async () => {
        const confirmed = await confirmDelete({
          title:        'Unlink Partner Account?',
          message:      `This will remove ${state.partnerData?.name || 'your partner'}'s data from your Household view. You can re-link at any time using a new Sync Code.`,
          confirmLabel: 'Unlink',
        });
        if (!confirmed) return;
        state.partnerData      = null;
        state.linkedAccountIds = [];
        state.viewMode         = 'individual';
        if (state.uid) deletePartnerSnapshot(state.uid).catch(() => {});
        scheduleRecalculation();
        showToast('Partner account unlinked.', 'info');
        render();
      }, { signal });
      if (hasFirebase) wireGenerateAndCopy();
      return;
    }

    if (!hasFirebase) {
      container.querySelector('#btn-load-demo')?.addEventListener('click', () => {
        state.partnerData      = { ...DEMO_PARTNER };
        state.linkedAccountIds = ['demo-partner'];
        state.viewMode         = 'household';
        scheduleRecalculation();
        showToast('Demo partner data loaded \u2014 switched to Household view.', 'success');
        render();
      }, { signal });
      return;
    }

    wireGenerateAndCopy();

    /* Link with partner code */
    // NOTE: linkBtn/codeInput are captured here (live at wireEvents time).
    // showErr / hideErr manipulate _linkErrorMsg then call render() so the
    // error banner is re-generated from fresh DOM — avoids stale-ref bug.
    const linkBtn   = container.querySelector('#btn-link-account');
    const codeInput = container.querySelector('#partner-code-input');

    async function doLink() {
      if (_isLinking) return;
      // Read value from live DOM in case input was typed into after last render
      const inputEl = container.querySelector('#partner-code-input');
      const code    = (inputEl?.value || '').trim().toUpperCase();

      if (!isValidCode(code)) {
        _linkErrorMsg = 'Enter a valid Sync Code (8\u201320 uppercase letters/digits).';
        render(); return;
      }
      if (code === generateCode(state.uid)) {
        _linkErrorMsg = "That is your own Sync Code \u2014 enter your partner's code, not yours.";
        render(); return;
      }

      _linkErrorMsg = null;
      _isLinking = true;
      render(); // shows spinner

      try {
        const doc = await loadSyncCode(code);
        if (!doc) {
          _linkErrorMsg = 'Sync code not found or has expired. Ask your partner to click \u201cGenerate & Publish Code\u201d again to get a fresh one.';
          _isLinking = false; render(); return;
        }
        if (doc.uid === state.uid) {
          _linkErrorMsg = "That is your own Sync Code \u2014 enter your partner's code, not yours.";
          _isLinking = false; render(); return;
        }

        // Strip Firestore metadata before storing
        const { uid: partnerUID, createdAt: _c, expiresAt: _e, ...partnerProfile } = doc;
        state.partnerData      = partnerProfile;
        state.linkedAccountIds = [partnerUID];
        state.viewMode         = 'household';
        _linkErrorMsg          = null;
        _isLinking             = false;
        if (state.uid) savePartnerSnapshot(state.uid, partnerProfile).catch(() => {});
        scheduleRecalculation();
        showToast('Linked with ' + (partnerProfile.name || 'partner') + ' \u2713 Household view activated', 'success');
        render();
      } catch (err) {
        _linkErrorMsg = friendlyLinkError(err);
        _isLinking    = false;
        render();
      }
    }

    linkBtn?.addEventListener('click', doLink, { signal });
    codeInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLink(); }, { signal });

    /* Auto-uppercase + strip non-alphanumeric; hide error banner as user types */
    codeInput?.addEventListener('input', () => {
      const pos = codeInput.selectionStart;
      codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      try { codeInput.setSelectionRange(pos, pos); } catch (_) {}
      // Clear error in-place without full re-render (avoids losing cursor)
      if (_linkErrorMsg) {
        _linkErrorMsg = null;
        container.querySelector('#link-error-banner')?.remove();
        codeInput.classList.remove('border-rose-500/60', 'ring-1', 'ring-rose-500/20');
      }
    }, { signal });
  }

  render();
}
