/**
 * FinVision AI — Application Bootstrap & State Manager
 * ============================================================
 * This is the single entry point for the application.
 *
 * Responsibilities:
 *   1. Initialize the global application state object
 *   2. Wire up the SPA router (section navigation)
 *   3. Subscribe to Firebase auth state
 *   4. Mount all form components
 *   5. Orchestrate recalculation → chart update → table update pipeline
 *   6. Provide the global toast notification utility
 */

import { DEFAULTS, APP } from './utils/constants.js';
import { formatRupee, formatCompact } from './utils/formatters.js';
import { buildCorpusTrajectory, calculatePlanHealth } from './utils/financeEngine.js';
import { compareTaxRegimes } from './utils/taxEngine.js';
import { renderCorpusChart, renderCorpusPreview, destroyCorpusCharts } from './components/charts/CorpusChart.js';
import { renderAllocationChart, destroyAllocationChart } from './components/charts/AllocationChart.js';
import { renderExpenseChart, destroyExpenseChart } from './components/charts/ExpenseChart.js';
import { renderProjectionTable, filterProjectionTable, nextPage, prevPage, exportCSV } from './components/tables/ProjectionTable.js';
import { mountPersonalDetailsForm } from './components/forms/PersonalDetailsForm.js';
import { mountAssetsForm }         from './components/forms/AssetsForm.js';
import { mountExpensesForm }        from './components/forms/ExpensesForm.js';
import { mountGoalsForm }           from './components/forms/GoalsForm.js';
import { generateExecutiveSummary, sendChatMessage } from './ai/aiAdvisor.js';
import { generatePDFReport }       from './components/reports/PDFExport.js';
import { onAuthStateChanged, signInWithGoogle, signInWithEmail, createAccount, signOut as fbSignOut } from './firebase/auth.js';
import { isFirebaseConfigured }    from './firebase/config.js';

/* ═════════════════════════════════════════════════════════════
   GLOBAL APPLICATION STATE
   Single source of truth — all components read from this object.
   All mutations go through updateState() to ensure recalculation.
═════════════════════════════════════════════════════════════ */
const state = {
  // User identity
  uid:           null,
  userName:      'Investor',
  userEmail:     null,

  // Personal details
  name:              '',
  dob:               '',
  currentAge:        DEFAULTS.CURRENT_AGE,
  retirementAge:     DEFAULTS.RETIREMENT_AGE,

  // Income
  monthlyIncome:    DEFAULTS.MONTHLY_INCOME,
  salaryRaiseRate:  DEFAULTS.SALARY_RAISE_RATE,

  // Expenses
  monthlyExpenses:       DEFAULTS.MONTHLY_EXPENSES,
  monthlyMedicalPremium: 2000,
  monthlyEMI:            0,

  // Portfolio / Assets
  equityPercent:   DEFAULTS.EQUITY_PERCENT,
  debtPercent:     DEFAULTS.DEBT_PERCENT,
  currentEquity:   DEFAULTS.CURRENT_EQUITY,
  currentDebt:     DEFAULTS.CURRENT_DEBT,
  currentEPF:      DEFAULTS.CURRENT_EPF,

  // Tax inputs
  taxInputs: {
    grossSalary:          DEFAULTS.MONTHLY_INCOME * 12,
    age:                  DEFAULTS.CURRENT_AGE,
    epfContrib:           21600,     // ~12% of base, example
    ppfContrib:           0,
    elssContrib:          0,
    lifeInsurance:        0,
    homeLoanInterest:     0,
    medicalPremiumSelf:   24000,
    medicalPremiumParents: 0,
    npsContrib80CCD1B:    0,
    parentsAbove60:       false,
  },

  // Goals
  goals: [],

  // Plan metadata
  planStartYear:   DEFAULTS.PLAN_START_YEAR,

  // Computed output (set by recalculate())
  trajectory:      [],
  taxComparison:   null,
  planHealth:      0,
};

/* ═════════════════════════════════════════════════════════════
   STATE MUTATION & RECALCULATION PIPELINE
═════════════════════════════════════════════════════════════ */

let _recalcTimer = null;

/**
 * Update one or more state fields and trigger recalculation.
 * @param {Partial<typeof state>} patch
 */
function updateState(patch) {
  Object.assign(state, patch);
  scheduleRecalculation();
}

/**
 * Debounced recalculation — prevents excessive computation
 * when user is actively typing (fires 300ms after last change).
 */
function scheduleRecalculation() {
  clearTimeout(_recalcTimer);
  _recalcTimer = setTimeout(recalculate, 300);
}

/**
 * Core recalculation pipeline:
 *   buildCorpusTrajectory → compareTaxRegimes → updateAllUI
 */
function recalculate() {
  showRecalcIndicator(true);

  setTimeout(() => {
    const inputs = {
      currentAge:          state.currentAge,
      retirementAge:       state.retirementAge,
      annualIncome:        state.monthlyIncome * 12,
      salaryRaiseRate:     state.salaryRaiseRate,
      equityFraction:      state.equityPercent / 100,
      currentEquity:       state.currentEquity,
      currentDebt:         state.currentDebt,
      currentEPF:          state.currentEPF,
      monthlyExpenses:     state.monthlyExpenses,
      monthlyMedicalPremium: state.monthlyMedicalPremium,
      planStartYear:       state.planStartYear,
      goals:               state.goals,
    };

    state.trajectory    = buildCorpusTrajectory(inputs);
    state.taxComparison = compareTaxRegimes({ ...state.taxInputs, grossSalary: inputs.annualIncome });
    state.planHealth    = calculatePlanHealth(state.trajectory, state.goals);

    updateAllUI();
    showRecalcIndicator(false);
  }, 0);
}

/* ═════════════════════════════════════════════════════════════
   UI UPDATE ORCHESTRATOR
═════════════════════════════════════════════════════════════ */

function updateAllUI() {
  updateDashboardKPIs();
  updateDashboardTaxSummary();
  updateHealthBar();
  updateCharts();
  renderProjectionTable(state.trajectory);
  updateProjectionStats();
  updateSidebarGoalsCount();
}

function updateDashboardKPIs() {
  const corpus = state.currentEquity + state.currentDebt + state.currentEPF;
  const surplus = state.monthlyIncome - state.monthlyExpenses - state.monthlyMedicalPremium - state.monthlyEMI;
  const yearsToRetire = state.retirementAge - state.currentAge;

  setText('kpi-current-corpus',  formatRupee(corpus));
  setText('kpi-monthly-surplus', formatRupee(Math.max(0, surplus)));
  setText('kpi-retirement-age',  String(state.retirementAge));
  setText('kpi-years-to-retire', yearsToRetire > 0 ? `${yearsToRetire} years to go` : 'Retired');

  // Required corpus — last row of trajectory at retirement age
  const retireRow = state.trajectory.find(r => r.age === state.retirementAge);
  if (retireRow) {
    setText('kpi-required-corpus', formatRupee(retireRow.closingBalance));
    const gap = retireRow.closingBalance - corpus;
    const gapEl = document.getElementById('kpi-corpus-gap');
    if (gapEl) {
      gapEl.textContent  = gap > 0
        ? `Need ${formatCompact(gap)} more`
        : 'Corpus sufficient ✓';
      gapEl.className    = `kpi-change ${gap > 0 ? 'text-amber-400' : 'text-emerald-400'}`;
    }
  } else {
    setText('kpi-required-corpus', '₹–');
  }

  // Allocation displays
  setText('alloc-equity-pct', `${state.equityPercent}%`);
  setText('alloc-debt-pct',   `${state.debtPercent}%`);
  const blended = (state.equityPercent / 100) * 0.13 + (state.debtPercent / 100) * 0.06;
  setText('blended-cagr', `${(blended * 100).toFixed(1)}%`);
}

function updateDashboardTaxSummary() {
  if (!state.taxComparison) return;
  const { newRegime, oldRegime, recommended, saving } = state.taxComparison;

  setText('tax-new-regime-dash', formatRupee(newRegime.totalTax));
  setText('tax-old-regime-dash', formatRupee(oldRegime.totalTax));
  setText('tax-recommended-regime-dash', recommended === 'NEW' ? 'New Regime' : recommended === 'OLD' ? 'Old Regime' : 'Both Equal');
  setText('tax-saving-dash', saving > 0 ? `Save ${formatRupee(saving)}/year` : 'No difference');
}

function updateHealthBar() {
  const bar   = document.getElementById('health-bar');
  const label = document.getElementById('health-score-label');
  const msg   = document.getElementById('health-score-message');
  if (!bar) return;

  bar.style.width = `${state.planHealth}%`;

  if (label) {
    label.textContent = `${state.planHealth}/100`;
    label.className   = state.planHealth >= 70
      ? 'text-xs font-bold text-emerald-400'
      : state.planHealth >= 40
        ? 'text-xs font-bold text-amber-400'
        : 'text-xs font-bold text-red-400';
  }

  if (msg) {
    msg.textContent = state.planHealth >= 70
      ? 'Your plan looks strong! 🎉'
      : state.planHealth >= 40
        ? 'Plan has gaps — review goals'
        : 'Significant shortfalls detected';
  }
}

function updateCharts() {
  renderCorpusPreview('chart-corpus-preview', state.trajectory);
  renderCorpusChart('chart-corpus-main', state.trajectory, state.goals);
  renderAllocationChart('chart-allocation-donut', state.equityPercent, state.debtPercent);
  renderExpenseChart('chart-expense-bar', {
    income:     state.monthlyIncome,
    lifestyle:  state.monthlyExpenses,
    medical:    state.monthlyMedicalPremium,
    emi:        state.monthlyEMI,
    taxes:      state.taxComparison
      ? Math.round(state.taxComparison.newRegime.totalTax / 12)
      : 0,
    investable: Math.max(0, state.monthlyIncome - state.monthlyExpenses - state.monthlyMedicalPremium - state.monthlyEMI),
  });
}

function updateProjectionStats() {
  if (!state.trajectory || state.trajectory.length === 0) return;

  let peakCorpus = 0, peakAge = 0;
  state.trajectory.forEach(r => {
    if (r.closingBalance > peakCorpus) {
      peakCorpus = r.closingBalance;
      peakAge    = r.age;
    }
  });

  const retireRow  = state.trajectory.find(r => r.age === state.retirementAge);
  const finalRow   = state.trajectory[state.trajectory.length - 1];

  setText('stat-peak-corpus',   formatCompact(peakCorpus));
  setText('stat-peak-age',      `Age ${peakAge}`);
  setText('stat-retire-corpus', retireRow ? formatCompact(retireRow.closingBalance) : '₹–');
  setText('stat-legacy-corpus', finalRow  ? formatCompact(finalRow.closingBalance)  : '₹–');

  const startYear = state.planStartYear;
  const endYear   = startYear + (100 - state.currentAge);
  setText('proj-start-year', `${state.currentAge} (${startYear})`);
  setText('proj-end-year',   `100 (${endYear})`);
}

function updateSidebarGoalsCount() {
  const el = document.getElementById('sidebar-goals-count');
  if (el) el.textContent = String(state.goals.length);
}

/* ═════════════════════════════════════════════════════════════
   SPA ROUTER
   Manages which #section-* div is visible.
═════════════════════════════════════════════════════════════ */

const SECTIONS = ['dashboard', 'inputs', 'projections', 'tax', 'ai', 'reports'];

function navigateTo(sectionId, subSection = null) {
  // Hide all sections
  SECTIONS.forEach(id => {
    const el = document.getElementById(`section-${id}`);
    if (el) el.classList.add('hidden');
  });

  // Show target section
  const target = document.getElementById(`section-${sectionId}`);
  if (target) target.classList.remove('hidden');

  // Update all nav-tab active states
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === sectionId);
  });
  document.querySelectorAll('.sidebar-link').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === sectionId);
  });

  // Handle sub-section inside "inputs"
  if (sectionId === 'inputs' && subSection) {
    switchInputSubSection(subSection);
  }

  // Close mobile sidebar on navigation
  closeMobileSidebar();

  // Scroll to top of main content
  const main = document.getElementById('main-content');
  if (main) main.scrollTop = 0;
}

function switchInputSubSection(subId) {
  const subs = ['personal', 'assets', 'expenses', 'goals'];
  subs.forEach(id => {
    const panel = document.getElementById(`inputs-sub-${id}`);
    const tab   = document.querySelector(`.input-tab[data-sub="${id}"]`);
    if (panel) panel.classList.toggle('hidden', id !== subId);
    if (tab)   tab.classList.toggle('active', id === subId);
  });
}

/* ═════════════════════════════════════════════════════════════
   MOBILE SIDEBAR
═════════════════════════════════════════════════════════════ */

function openMobileSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  sidebar?.classList.remove('-translate-x-full');
  overlay?.classList.remove('hidden');
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (window.innerWidth < 768) {
    sidebar?.classList.add('-translate-x-full');
  }
  overlay?.classList.add('hidden');
}

/* ═════════════════════════════════════════════════════════════
   AUTH MODAL
═════════════════════════════════════════════════════════════ */

function openAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = '';
  }
}

function switchAuthTab(tab) {
  ['signin', 'signup'].forEach(t => {
    const btn   = document.getElementById(`auth-tab-${t}`);
    const panel = document.getElementById(`auth-panel-${t}`);
    btn?.classList.toggle('active', t === tab);
    panel?.classList.toggle('hidden', t !== tab);
  });
}

/* ═════════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
═════════════════════════════════════════════════════════════ */

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success' | 'error' | 'info'} [type='info']
 * @param {number} [duration=4000]
 */
export function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    success: '✓',
    error:   '✕',
    info:    'ℹ',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="font-bold">${icons[type] || icons.info}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Auto-dismiss
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'opacity 300ms, transform 300ms';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ═════════════════════════════════════════════════════════════
   RECALCULATION LOADING INDICATOR
═════════════════════════════════════════════════════════════ */

function showRecalcIndicator(visible) {
  const el = document.getElementById('recalc-indicator');
  if (el) el.classList.toggle('hidden', !visible);
}

/* ═════════════════════════════════════════════════════════════
   DOM UTILITY HELPERS
═════════════════════════════════════════════════════════════ */

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* ═════════════════════════════════════════════════════════════
   AUTH STATE HANDLER
═════════════════════════════════════════════════════════════ */

function handleAuthStateChange(user) {
  const guestArea = document.getElementById('auth-guest-area');
  const userArea  = document.getElementById('auth-user-area');
  const saveBtn   = document.getElementById('btn-save-scenario');

  if (user) {
    state.uid       = user.uid;
    state.userName  = user.displayName || user.email?.split('@')[0] || 'Investor';
    state.userEmail = user.email;

    setText('user-initial', state.userName[0].toUpperCase());
    setText('dash-user-name', state.userName);

    guestArea?.classList.add('hidden');
    userArea?.classList.remove('hidden');
    saveBtn?.classList.remove('hidden');

    closeAuthModal();
    showToast(`Welcome back, ${state.userName}!`, 'success');
  } else {
    state.uid       = null;
    state.userName  = 'Investor';
    state.userEmail = null;

    setText('user-initial', 'U');
    setText('dash-user-name', 'Investor');

    guestArea?.classList.remove('hidden');
    userArea?.classList.add('hidden');
    saveBtn?.classList.add('hidden');
  }
}

/* ═════════════════════════════════════════════════════════════
   FORM MOUNTS
═════════════════════════════════════════════════════════════ */

function mountAllForms() {
  const container = (id) => document.getElementById(id);

  mountPersonalDetailsForm(container('form-personal-details'), state, (field, value) => {
    updateState({ [field]: value });
  });

  mountAssetsForm(container('form-assets'), state, (field, value) => {
    updateState({ [field]: value });
  });

  mountExpensesForm(container('form-expenses'), state, (field, value) => {
    updateState({ [field]: value });
  });

  mountGoalsForm(container('form-goals'), state, (field, value) => {
    updateState({ [field]: value });
  });
}

/* ═════════════════════════════════════════════════════════════
   EVENT LISTENERS
═════════════════════════════════════════════════════════════ */

function bindEvents() {
  // ── Section navigation via nav-tabs and sidebar-links ────────
  document.addEventListener('click', (e) => {
    const navBtn = e.target.closest('[data-section]');
    if (navBtn) {
      const section = navBtn.dataset.section;
      const sub     = navBtn.dataset.sub || null;
      navigateTo(section, sub);
      return;
    }

    // ── Input sub-tabs ──────────────────────────────────────────
    const inputTab = e.target.closest('.input-tab[data-sub]');
    if (inputTab) {
      switchInputSubSection(inputTab.dataset.sub);
      return;
    }
  });

  // ── Mobile sidebar ─────────────────────────────────────────
  document.getElementById('mobile-menu-toggle')?.addEventListener('click', openMobileSidebar);
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeMobileSidebar);

  // ── Auth modal ─────────────────────────────────────────────
  document.getElementById('btn-open-auth')?.addEventListener('click', openAuthModal);
  document.getElementById('auth-modal-close')?.addEventListener('click', closeAuthModal);
  document.getElementById('auth-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAuthModal();
  });

  // Auth tab switch
  document.getElementById('auth-tab-signin')?.addEventListener('click', () => switchAuthTab('signin'));
  document.getElementById('auth-tab-signup')?.addEventListener('click', () => switchAuthTab('signup'));

  // Google sign-in buttons
  ['btn-google-signin', 'btn-google-signup'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', async () => {
      if (!isFirebaseConfigured) {
        showToast('Firebase not configured. Add credentials to .env.local', 'error');
        return;
      }
      try {
        await signInWithGoogle();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // Sign-in form
  document.getElementById('form-signin')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('signin-email')?.value.trim();
    const password = document.getElementById('signin-password')?.value;
    const errEl    = document.getElementById('signin-error');

    if (!isFirebaseConfigured) {
      showToast('Firebase not configured. Add credentials to .env.local', 'error');
      return;
    }

    try {
      await signInWithEmail(email, password);
    } catch (err) {
      if (errEl) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
    }
  });

  // Sign-up form
  document.getElementById('form-signup')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name     = document.getElementById('signup-name')?.value.trim();
    const email    = document.getElementById('signup-email')?.value.trim();
    const password = document.getElementById('signup-password')?.value;
    const errEl    = document.getElementById('signup-error');

    if (!isFirebaseConfigured) {
      showToast('Firebase not configured. Add credentials to .env.local', 'error');
      return;
    }

    try {
      await createAccount(email, password, name);
    } catch (err) {
      if (errEl) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
    }
  });

  // Forgot password
  document.getElementById('btn-forgot-password')?.addEventListener('click', () => {
    showToast('Password reset available after Firebase Auth setup (Phase 5)', 'info');
  });

  // Password show/hide toggles
  document.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('.password-toggle');
    if (!toggleBtn) return;
    const targetId = toggleBtn.dataset.target;
    const input    = document.getElementById(targetId);
    if (input) input.type = input.type === 'password' ? 'text' : 'password';
  });

  // ── Projection table search & pagination ──────────────────
  document.getElementById('table-search')?.addEventListener('input', (e) => {
    filterProjectionTable(e.target.value);
  });
  document.getElementById('table-prev-page')?.addEventListener('click', prevPage);
  document.getElementById('table-next-page')?.addEventListener('click', nextPage);

  // ── CSV Export ─────────────────────────────────────────────
  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    if (state.trajectory.length > 0) {
      exportCSV(state.trajectory);
    } else {
      showToast('No projection data to export. Enter your financial details first.', 'info');
    }
  });

  // ── PDF Download ───────────────────────────────────────────
  document.getElementById('btn-download-pdf')?.addEventListener('click', async () => {
    const options = {
      title:          document.getElementById('report-title')?.value || APP.NAME,
      preparedFor:    document.getElementById('report-name')?.value || state.userName,
      date:           document.getElementById('report-date')?.value || new Date().toLocaleDateString('en-IN'),
      includeSummary: document.querySelector('[name="include-summary"]')?.checked ?? true,
      includeTax:     document.querySelector('[name="include-tax"]')?.checked ?? true,
      includeCharts:  document.querySelector('[name="include-charts"]')?.checked ?? true,
      includeTable:   document.querySelector('[name="include-table"]')?.checked ?? true,
      includeGoals:   document.querySelector('[name="include-goals"]')?.checked ?? true,
    };
    await generatePDFReport(state, options);
  });

  // ── AI chat ────────────────────────────────────────────────
  const chatHistory = [];

  document.getElementById('btn-send-ai')?.addEventListener('click', async () => {
    await sendAIMessage();
  });

  document.getElementById('ai-chat-input')?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await sendAIMessage();
    }
  });

  // Suggested prompts
  document.addEventListener('click', (e) => {
    const promptBtn = e.target.closest('.suggested-prompt-btn');
    if (!promptBtn) return;
    const input = document.getElementById('ai-chat-input');
    if (input) {
      input.value = promptBtn.dataset.prompt;
      input.focus();
    }
  });

  async function sendAIMessage() {
    const input = document.getElementById('ai-chat-input');
    const msg   = input?.value.trim();
    if (!msg) return;

    appendChatMessage('user', msg);
    input.value = '';

    // Show typing indicator
    const typingId = 'typing-' + Date.now();
    appendTypingIndicator(typingId);

    try {
      const reply = await sendChatMessage(msg, chatHistory, state);
      removeTypingIndicator(typingId);
      appendChatMessage('ai', reply);
      chatHistory.push({ role: 'user', content: msg });
      chatHistory.push({ role: 'model', content: reply });
    } catch (err) {
      removeTypingIndicator(typingId);
      appendChatMessage('ai', 'Sorry, I encountered an error. Please try again.');
    }
  }

  // Clear chat
  document.getElementById('btn-clear-chat')?.addEventListener('click', () => {
    const messages = document.getElementById('ai-chat-messages');
    if (messages) {
      // Keep only the first welcome message
      const welcome = messages.querySelector('.chat-message-ai');
      messages.innerHTML = '';
      if (welcome) messages.appendChild(welcome.cloneNode(true));
    }
    chatHistory.length = 0;
  });

  // Generate AI Summary
  document.getElementById('btn-generate-ai-summary')?.addEventListener('click', async () => {
    const btn     = document.getElementById('btn-generate-ai-summary');
    const textEl  = document.getElementById('ai-summary-text');
    if (!btn || !textEl) return;

    btn.disabled    = true;
    btn.textContent = 'Generating…';

    try {
      const summary = await generateExecutiveSummary(state);
      textEl.textContent = summary;
    } catch (err) {
      textEl.textContent = 'Failed to generate summary. Please ensure Firebase AI is configured.';
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Regenerate Summary';
    }
  });

  // ── Save scenario ──────────────────────────────────────────
  document.getElementById('btn-save-scenario')?.addEventListener('click', () => {
    if (!state.uid) {
      showToast('Sign in to save your scenario to the cloud', 'info');
      openAuthModal();
      return;
    }
    showToast('Scenario saved! (Full Firestore sync in Phase 5)', 'success');
  });

  document.getElementById('btn-save-cloud')?.addEventListener('click', () => {
    if (!state.uid) {
      showToast('Sign in to save to the cloud', 'info');
      openAuthModal();
      return;
    }
    showToast('Cloud save available fully in Phase 5', 'info');
  });

  // ── Report date default ────────────────────────────────────
  const reportDateInput = document.getElementById('report-date');
  if (reportDateInput) {
    reportDateInput.value = new Date().toISOString().split('T')[0];
  }
  // Pre-fill report name with user name
  const reportNameInput = document.getElementById('report-name');
  if (reportNameInput && !reportNameInput.value) {
    reportNameInput.value = state.userName;
  }
}

/* ═════════════════════════════════════════════════════════════
   CHAT MESSAGE RENDERING
═════════════════════════════════════════════════════════════ */

function appendChatMessage(role, text) {
  const container = document.getElementById('ai-chat-messages');
  if (!container) return;

  const el = document.createElement('div');
  if (role === 'ai') {
    el.className = 'chat-message-ai';
    el.innerHTML = `
      <div class="chat-avatar-ai">
        <svg class="w-3.5 h-3.5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3
               m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547
               A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531
               c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
        </svg>
      </div>
      <div class="chat-bubble-ai">${escapeHTML(text)}</div>
    `;
  } else {
    el.className = 'chat-message-user';
    el.innerHTML = `<div class="chat-bubble-user">${escapeHTML(text)}</div>`;
  }

  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function appendTypingIndicator(id) {
  const container = document.getElementById('ai-chat-messages');
  if (!container) return;

  const el = document.createElement('div');
  el.id        = id;
  el.className = 'chat-message-ai';
  el.innerHTML = `
    <div class="chat-avatar-ai">
      <svg class="w-3.5 h-3.5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3
             m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547
             A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531
             c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
      </svg>
    </div>
    <div class="chat-bubble-ai">
      <div class="chat-typing-indicator">
        <div class="chat-typing-dot"></div>
        <div class="chat-typing-dot"></div>
        <div class="chat-typing-dot"></div>
      </div>
    </div>
  `;

  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator(id) {
  document.getElementById(id)?.remove();
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

/* ═════════════════════════════════════════════════════════════
   APPLICATION BOOT
═════════════════════════════════════════════════════════════ */

function initApp() {
  // Set current FY in header
  setText('dash-plan-year', APP.PLAN_YEAR);
  setText('dash-user-name', state.userName);

  // Mount all form components
  mountAllForms();

  // Bind all event listeners
  bindEvents();

  // Subscribe to Firebase auth state
  onAuthStateChanged(handleAuthStateChange);

  // Run initial calculation with defaults
  recalculate();

  // Show Firebase config warning if not set
  if (!isFirebaseConfigured) {
    console.warn(
      '[FinVision AI] Firebase is not configured.\n' +
      'Create src/.env.local with your Firebase project credentials.\n' +
      'The app works fully offline; Auth + Firestore features require Firebase.'
    );
  }

  console.info(`%c FinVision AI v${APP.VERSION} `, 'background:#FBBF24;color:#000;font-weight:bold;border-radius:4px;padding:2px 6px;');
  console.info('Phase 1 complete — architecture initialized.');
}

// Boot when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
