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

import { DEFAULTS, APP, INFLATION, almBlendedReturn } from './utils/constants.js';
import { formatRupee, formatCompact } from './utils/formatters.js';
import { buildCorpusTrajectory, calculatePlanHealth, sipFutureValue, computeSIPGoalFunding } from './utils/financeEngine.js';
import { compareTaxRegimes } from './utils/taxEngine.js';
import { Chart } from 'chart.js/auto';
import { renderCorpusChart, renderCorpusPreview, destroyCorpusCharts } from './components/charts/CorpusChart.js';
import { renderAllocationChart, destroyAllocationChart } from './components/charts/AllocationChart.js';
import { renderExpenseChart, destroyExpenseChart } from './components/charts/ExpenseChart.js';
import { renderProjectionTable, filterProjectionTable, nextPage, prevPage, exportCSV } from './components/tables/ProjectionTable.js';
import { mountPersonalDetailsForm } from './components/forms/PersonalDetailsForm.js';
import { mountAssetsForm }         from './components/forms/AssetsForm.js';
import { mountExpensesForm }        from './components/forms/ExpensesForm.js';
import { mountGoalsForm }           from './components/forms/GoalsForm.js';
import { mountSavingsForm }         from './components/forms/SavingsForm.js';
import { generateExecutiveSummary, sendChatMessage } from './ai/aiAdvisor.js';
import { generatePDFReport }       from './components/reports/PDFExport.js';
import { onAuthStateChanged, signInWithGoogle, signInWithEmail, createAccount, signOut as fbSignOut, sendPasswordReset } from './firebase/auth.js';
import { isFirebaseConfigured }    from './firebase/config.js';
import { savePersonalDetails, loadPersonalDetails, savePlan, loadAllPlans, saveAISummary, loadAISummary } from './firebase/firestore.js';

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
  currentAge:        0,
  retirementAge:     60,

  // Income
  monthlyIncome:    0,
  salaryRaiseRate:  0,

  // Expenses
  monthlyExpenses:       0,
  monthlyMedicalPremium: 0,
  monthlyEMI:            0,
  expenseCategories: [
    { id: 'rent',          label: 'Rent / Mortgage',     amount: 0, group: 'home'      },
    { id: 'maintenance',   label: 'Maintenance',         amount: 0, group: 'home'      },
    { id: 'electricity',   label: 'Electricity & Water', amount: 0, group: 'home'      },
    { id: 'broadband',     label: 'Broadband / WiFi',    amount: 0, group: 'home'      },
    { id: 'groceries',     label: 'Groceries',           amount: 0, group: 'food'      },
    { id: 'dining',        label: 'Dining Out',          amount: 0, group: 'food'      },
    { id: 'fuel',          label: 'Fuel',                amount: 0, group: 'transport' },
    { id: 'vehicle',       label: 'Vehicle Maintenance', amount: 0, group: 'transport' },
    { id: 'publictrans',   label: 'Public Transport',    amount: 0, group: 'transport' },
    { id: 'school',        label: 'School / College',    amount: 0, group: 'education' },
    { id: 'tuition',       label: 'Tuition / Coaching',  amount: 0, group: 'education' },
    { id: 'subscriptions', label: 'Subscriptions / OTT', amount: 0, group: 'lifestyle' },
    { id: 'shopping',      label: 'Shopping & Personal', amount: 0, group: 'lifestyle' },
    { id: 'gym',           label: 'Gym / Wellness',      amount: 0, group: 'lifestyle' },
    { id: 'others',        label: 'Miscellaneous',       amount: 0, group: 'other'     },
  ],

  // Portfolio / Assets — ALM 4-group model
  equityPercent:        0,
  debtPercent:          0,
  realAssetsPercent:    0,
  cashPercent:          0,
  currentEquity:        0,
  currentDebt:          0,
  currentEPF:           0,
  currentGold:          0,
  currentRealEstate:    0,
  currentCash:          0,
  currentAlternatives:  0,
  assetAllocation: {
    debt:       { savingsBank: 0, fixedDeposit: 0, recurringDeposit: 0, ppf: 0, epf: 0, nscKvp: 0, scss: 0, debtMutualFunds: 0, govtBonds: 0, companyFD: 0, npsDebt: 0, otherDebt: 0, otherDebtRemarks: '' },
    equity:     { directEquity: 0, equityMutualFunds: 0, npsEquity: 0, pms: 0, aif: 0, ulipEquity: 0, esopRsu: 0, gratuity: 0, superannuation: 0, otherEquity: 0, otherEquityRemarks: '' },
    realAssets: { gold: 0, realEstate: 0 },
    cash:       { liquidFunds: 0, alternatives: 0 },
  },

  // Tax inputs
  taxInputs: {
    grossSalary:          0,
    age:                  0,
    epfContrib:           0,
    ppfContrib:           0,
    elssContrib:          0,
    lifeInsurance:        0,
    homeLoanInterest:     0,
    medicalPremiumSelf:   0,
    medicalPremiumParents: 0,
    npsContrib80CCD1B:    0,
    parentsAbove60:       false,
  },

  // Goals
  goals: [],

  // Active Savings & SIPs
  activeSavings: [],

  // Plan metadata
  planStartYear:   DEFAULTS.PLAN_START_YEAR,

  // Computed output (set by recalculate())
  trajectory:      [],
  taxComparison:   null,
  planHealth:      0,
  goalFunding:     new Map(),
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
      currentAge:           state.currentAge,
      retirementAge:        state.retirementAge,
      annualIncome:         state.monthlyIncome * 12,
      salaryRaiseRate:      state.salaryRaiseRate,
      equityFraction:       state.equityPercent / 100,
      currentEquity:        state.currentEquity,
      currentDebt:          state.currentDebt,
      currentEPF:           state.currentEPF,
      currentGold:          state.currentGold,
      currentRealEstate:    state.currentRealEstate,
      currentCash:          state.currentCash,
      currentAlternatives:  state.currentAlternatives,
      inflationRate:        INFLATION.GENERAL,
      monthlyExpenses:      state.monthlyExpenses,
      monthlyMedicalPremium: state.monthlyMedicalPremium,
      planStartYear:        state.planStartYear,
      goals:                state.goals,
      activeSavings:        state.activeSavings ?? [],
    };

    state.trajectory    = buildCorpusTrajectory(inputs);
    state.taxComparison = compareTaxRegimes({ ...state.taxInputs, grossSalary: inputs.annualIncome });
    state.planHealth    = calculatePlanHealth(state.trajectory, state.goals);
    state.goalFunding   = computeSIPGoalFunding(state.activeSavings, state.goals, state.planStartYear);

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
  updateSidebarSIPsCount();
  updateTaxSection();
  updateGoalsPreview();
  renderGoalTrackingChart();
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
  const totalCorpus = state.currentEquity + state.currentDebt + state.currentEPF
    + (state.currentGold || 0) + (state.currentRealEstate || 0)
    + (state.currentCash || 0) + (state.currentAlternatives || 0);
  const blended = totalCorpus > 0
    ? almBlendedReturn({
        equity:     state.currentEquity / totalCorpus,
        debt:       (state.currentDebt + state.currentEPF) / totalCorpus,
        gold:       (state.currentGold || 0) / totalCorpus,
        realEstate: (state.currentRealEstate || 0) / totalCorpus,
        cash:       (state.currentCash || 0) / totalCorpus,
        alts:       (state.currentAlternatives || 0) / totalCorpus,
      }, INFLATION.GENERAL)
    : 0;
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
  renderAllocationChart('chart-allocation-donut', {
    equityPct:     state.equityPercent,
    debtPct:       state.debtPercent,
    realAssetsPct: state.realAssetsPercent || 0,
    cashPct:       state.cashPercent       || 0,
  }, INFLATION.GENERAL);
  renderExpenseChart('chart-expense-bar', {
    income:     state.monthlyIncome,
    groups:     (state.expenseCategories || []).reduce((acc, c) => {
      const g = c.group || 'other';
      acc[g] = (acc[g] || 0) + (c.amount || 0);
      return acc;
    }, {}),
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

function updateSidebarSIPsCount() {
  const el = document.getElementById('sidebar-sips-count');
  if (el) el.textContent = String((state.activeSavings || []).length);
}

/* ─── Goal Tracking stacked bar chart ─────────────────────── */
let _goalTrackingChart = null;

function renderGoalTrackingChart() {
  const canvas = document.getElementById('chart-goal-tracking');
  if (!canvas) return;
  const funding = state.goalFunding;
  if (!funding || funding.size === 0) {
    if (_goalTrackingChart) { _goalTrackingChart.destroy(); _goalTrackingChart = null; }
    return;
  }

  // Filter out the 'unlinked' synthetic bucket for chart; keep named goals only
  const entries = [...funding.entries()].filter(([k]) => k !== 'unlinked');
  if (entries.length === 0) return;

  const labels      = entries.map(([, v]) => v.name);
  const sipData     = entries.map(([, v]) => Math.round(v.sipContrib));
  const deficitData = entries.map(([, v]) => Math.round(v.deficit));

  // Destroy previous instance
  if (_goalTrackingChart) { _goalTrackingChart.destroy(); _goalTrackingChart = null; }

  _goalTrackingChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'SIP Contributions',
          data: sipData,
          backgroundColor: 'rgba(52, 211, 153, 0.75)',
          borderRadius: 4,
        },
        {
          label: 'Remaining Deficit',
          data: deficitData,
          backgroundColor: 'rgba(248, 113, 113, 0.65)',
          borderRadius: 4,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94A3B8', font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${formatRupee(ctx.parsed.x)}`,
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid:  { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#64748B', font: { size: 10 }, callback: v => formatCompact(v) },
        },
        y: {
          stacked: true,
          grid:  { display: false },
          ticks: { color: '#CBD5E1', font: { size: 11 } },
        },
      },
    },
  });
}

/* ─── Tax section full UI ─────────────────────────────────── */
function updateTaxSection() {
  if (!state.taxComparison) return;
  const { newRegime, oldRegime, recommended, saving } = state.taxComparison;

  function slabRows(slabs) {
    if (!slabs || slabs.length === 0) return `<tr><td colspan="3" class="text-center text-slate-500 py-2 text-xs">No taxable income</td></tr>`;
    return slabs.map(s => `
      <tr class="border-t border-white/5">
        <td class="py-1.5 text-xs text-slate-400">${formatRupee(s.from)} – ${s.to === Infinity ? '∞' : formatRupee(s.to)}</td>
        <td class="py-1.5 text-xs text-center text-slate-300">${(s.rate * 100).toFixed(0)}%</td>
        <td class="py-1.5 text-xs text-right text-white">${formatRupee(s.tax)}</td>
      </tr>`).join('');
  }

  // New regime breakdown
  const newBreakdown = document.getElementById('tax-new-breakdown');
  if (newBreakdown) {
    newBreakdown.innerHTML = `<table class="w-full">
      <thead><tr>
        <th class="text-left text-xs text-slate-500 pb-1">Slab</th>
        <th class="text-center text-xs text-slate-500 pb-1">Rate</th>
        <th class="text-right text-xs text-slate-500 pb-1">Tax</th>
      </tr></thead>
      <tbody>${slabRows(newRegime.slabDetails)}</tbody>
    </table>`;
  }

  // Old regime breakdown
  const oldBreakdown = document.getElementById('tax-old-breakdown');
  if (oldBreakdown) {
    const dedRows = Object.entries(newRegime.deductions ?? {}).length > 0
      ? Object.entries(oldRegime.deductions ?? {}).filter(([,v]) => v > 0).map(([k, v]) =>
          `<tr class="border-t border-white/5"><td class="py-1 text-xs text-slate-400" colspan="2">${k}</td><td class="py-1 text-xs text-right text-emerald-400">– ${formatRupee(v)}</td></tr>`
        ).join('')
      : '';
    oldBreakdown.innerHTML = `<table class="w-full">
      <thead><tr>
        <th class="text-left text-xs text-slate-500 pb-1">Slab</th>
        <th class="text-center text-xs text-slate-500 pb-1">Rate</th>
        <th class="text-right text-xs text-slate-500 pb-1">Tax</th>
      </tr></thead>
      <tbody>${  dedRows ? `<tr><td colspan="3" class="text-xs text-slate-500 pt-1 pb-0.5 font-medium">Deductions</td></tr>${dedRows}<tr><td colspan="3" class="pt-1"></td></tr>` : '' }${slabRows(oldRegime.slabDetails)}</tbody>
    </table>`;
  }

  setText('tax-new-total',          formatRupee(newRegime.totalTax));
  setText('tax-old-total',          formatRupee(oldRegime.totalTax));
  setText('tax-new-effective-rate', `${newRegime.effectiveRate?.toFixed(2) ?? 0}%`);
  setText('tax-old-effective-rate', `${oldRegime.effectiveRate?.toFixed(2) ?? 0}%`);

  // Winner badge
  const newBadge = document.getElementById('tax-new-badge');
  const oldBadge = document.getElementById('tax-old-badge');
  if (newBadge) newBadge.classList.toggle('hidden', recommended !== 'NEW');
  if (oldBadge) oldBadge.classList.toggle('hidden', recommended !== 'OLD');

  // Recommendation banner
  const banner    = document.getElementById('tax-recommendation-banner');
  const bannerTitle = document.getElementById('tax-banner-title');
  const bannerDesc  = document.getElementById('tax-banner-desc');
  const bannerIcon  = document.getElementById('tax-banner-icon');
  if (banner) {
    banner.classList.remove('hidden');
    const regimeName = recommended === 'NEW' ? 'New Regime' : recommended === 'OLD' ? 'Old Regime' : null;
    if (regimeName && saving > 0) {
      if (bannerTitle) bannerTitle.textContent = `${regimeName} saves you ${formatRupee(saving)}/year`;
      if (bannerDesc)  bannerDesc.textContent  = `Based on your income and deductions, the ${regimeName} results in lower tax.`;
      if (bannerIcon)  bannerIcon.textContent  = recommended === 'NEW' ? '⚡' : '🏛️';
    } else {
      if (bannerTitle) bannerTitle.textContent = 'Both regimes result in equal tax';
      if (bannerDesc)  bannerDesc.textContent  = 'Consider other factors like deduction convenience.';
      if (bannerIcon)  bannerIcon.textContent  = '⚖️';
    }
  }

  // LTCG harvesting result
  const ltcgEl = document.getElementById('ltcg-harvest-result');
  if (ltcgEl && state.taxComparison.ltcgHarvesting) {
    const { taxSaved, recommendHarvest } = state.taxComparison.ltcgHarvesting;
    ltcgEl.innerHTML = recommendHarvest
      ? `<span class="text-emerald-400 font-semibold">Book ₹1.25L gains now → saves ~${formatRupee(taxSaved)}/yr tax-free</span>`
      : `<span class="text-slate-400">No LTCG harvesting benefit at current gain levels.</span>`;
  }
}

/* ─── Goals preview on dashboard ─────────────────────────── */
function updateGoalsPreview() {
  const list = document.getElementById('goals-preview-list');
  if (!list) return;
  const currentYear = state.planStartYear ?? new Date().getFullYear();

  if (!state.goals || state.goals.length === 0) {
    list.innerHTML = `<div class="text-center py-6 text-slate-500 text-sm">
      <p class="text-2xl mb-1">🎯</p>No goals yet — add them in the Inputs section.
    </div>`;
    return;
  }

  const ICONS = { EDUCATION: '🎓', MARRIAGE: '💍', PROPERTY: '🏠', VEHICLE: '🚗', TRAVEL: '✈️', RETIREMENT: '🏖️', OTHER: '🎯' };
  list.innerHTML = state.goals.map(g => {
    const years = g.targetYear ? Math.max(0, g.targetYear - currentYear) : 0;
    const inflated = g.todayValue * Math.pow(1 + (g.inflationRate ?? 0.08), years);
    return `
    <div class="goal-preview-item flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <span class="text-xl">${ICONS[g.type] ?? '🎯'}</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-white truncate">${g.name}</p>
        <p class="text-xs text-slate-400">${g.targetYear ? `${g.targetYear} · ${years}y away` : '–'}</p>
      </div>
      <div class="text-right shrink-0">
        <p class="text-sm font-semibold text-brand">${formatRupee(inflated)}</p>
        <p class="text-xs text-slate-500">inflated</p>
      </div>
    </div>`;
  }).join('');
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
  const subs = ['personal', 'assets', 'expenses', 'goals', 'savings'];
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

async function handleAuthStateChange(user) {
  const guestArea = document.getElementById('auth-guest-area');
  const userArea  = document.getElementById('auth-user-area');

  if (user) {
    state.uid       = user.uid;
    state.userName  = user.displayName || user.email?.split('@')[0] || 'Investor';
    state.userEmail = user.email;

    setText('user-initial', state.userName[0].toUpperCase());
    setText('dash-user-name', state.userName);
    setText('user-dropdown-name', state.userName);
    setText('user-dropdown-email', user.email || '');

    guestArea?.classList.add('hidden');
    userArea?.classList.remove('hidden');

    closeAuthModal();
    showToast(`Welcome back, ${state.userName}!`, 'success');

    // Load previously saved plan data from Firestore
    try {
      const details = await loadPersonalDetails(user.uid);
      if (details) {
        // Restore state fields from saved profile (excluding uid/computed fields)
        const { updatedAt, ...saved } = details;
        Object.assign(state, saved);
        // Re-render all forms so inputs reflect the loaded values
        mountAllForms();
        recalculate();
        showToast('Your saved plan has been loaded.', 'success');
      }
    } catch (err) {
      console.warn('[Firestore] Could not load plan:', err.message);
    }

    // Auto-fill Full Name from account display name if not set by saved plan
    if (!state.name && user.displayName) {
      state.name = user.displayName;
      const nameInput = document.getElementById('inp-name');
      if (nameInput) nameInput.value = user.displayName;
    }

    // Load cached AI summary
    try {
      const cachedSummary = await loadAISummary(user.uid);
      if (cachedSummary) {
        const el = document.getElementById('ai-summary-text');
        if (el) el.textContent = cachedSummary;
      }
    } catch { /* non-critical */ }
  } else {
    state.uid       = null;
    state.userName  = 'Investor';
    state.userEmail = null;

    setText('user-initial', 'U');
    setText('dash-user-name', 'Investor');

    guestArea?.classList.remove('hidden');
    userArea?.classList.add('hidden');

    openAuthModal();
  }
}

/* ═════════════════════════════════════════════════════════════
   TAX INPUTS FORM
   Renders deduction fields inside #tax-inputs-container
═════════════════════════════════════════════════════════════ */
function mountTaxInputsForm(container) {
  if (!container) return;
  const ti = state.taxInputs;

  container.innerHTML = `
    <div class="card">
      <h2 class="card-title mb-4">Income &amp; Tax Deductions</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div class="form-group">
          <label for="tax-gross-salary" class="form-label">Gross Annual Salary</label>
          <div class="form-input-prefix-group">
            <span class="form-input-prefix">₹</span>
            <input id="tax-gross-salary" type="number" class="form-input" min="0" step="10000"
              value="${ti.grossSalary ?? state.monthlyIncome * 12 ?? 0}" />
          </div>
          <p class="form-hint">Pre-tax CTC / total income before deductions</p>
        </div>

        <div class="form-group">
          <label for="tax-epf" class="form-label">EPF Contribution (annual)</label>
          <div class="form-input-prefix-group">
            <span class="form-input-prefix">₹</span>
            <input id="tax-epf" type="number" class="form-input" min="0" step="1000"
              value="${ti.epfContrib ?? 0}" />
          </div>
          <p class="form-hint">Employee share only — counts toward 80C</p>
        </div>

        <div class="form-group">
          <label for="tax-ppf" class="form-label">PPF Contribution (annual)</label>
          <div class="form-input-prefix-group">
            <span class="form-input-prefix">₹</span>
            <input id="tax-ppf" type="number" class="form-input" min="0" max="150000" step="1000"
              value="${ti.ppfContrib ?? 0}" />
          </div>
          <p class="form-hint">Max ₹1.5L/yr under 80C</p>
        </div>

        <div class="form-group">
          <label for="tax-elss" class="form-label">ELSS Investment (annual)</label>
          <div class="form-input-prefix-group">
            <span class="form-input-prefix">₹</span>
            <input id="tax-elss" type="number" class="form-input" min="0" step="5000"
              value="${ti.elssContrib ?? 0}" />
          </div>
          <p class="form-hint">Equity Linked Savings Scheme — 80C</p>
        </div>

        <div class="form-group">
          <label for="tax-life-insurance" class="form-label">Life Insurance Premium (annual)</label>
          <div class="form-input-prefix-group">
            <span class="form-input-prefix">₹</span>
            <input id="tax-life-insurance" type="number" class="form-input" min="0" step="1000"
              value="${ti.lifeInsurance ?? 0}" />
          </div>
          <p class="form-hint">Term / endowment premiums — 80C</p>
        </div>

        <div class="form-group">
          <label for="tax-home-loan" class="form-label">Home Loan Interest (annual)</label>
          <div class="form-input-prefix-group">
            <span class="form-input-prefix">₹</span>
            <input id="tax-home-loan" type="number" class="form-input" min="0" max="200000" step="1000"
              value="${ti.homeLoanInterest ?? 0}" />
          </div>
          <p class="form-hint">Section 24(b) — max ₹2L for self-occupied</p>
        </div>

        <div class="form-group">
          <label for="tax-medical-self" class="form-label">Medical Premium — Self &amp; Family</label>
          <div class="form-input-prefix-group">
            <span class="form-input-prefix">₹</span>
            <input id="tax-medical-self" type="number" class="form-input" min="0" step="500"
              value="${ti.medicalPremiumSelf ?? 0}" />
          </div>
          <p class="form-hint">Section 80D — max ₹25,000 (self below 60)</p>
        </div>

        <div class="form-group">
          <label for="tax-medical-parents" class="form-label">Medical Premium — Parents</label>
          <div class="form-input-prefix-group">
            <span class="form-input-prefix">₹</span>
            <input id="tax-medical-parents" type="number" class="form-input" min="0" step="500"
              value="${ti.medicalPremiumParents ?? 0}" />
          </div>
          <p class="form-hint">80D — extra ₹25K or ₹50K if parents 60+</p>
        </div>

        <div class="form-group">
          <label for="tax-nps" class="form-label">NPS Contribution — 80CCD(1B) (annual)</label>
          <div class="form-input-prefix-group">
            <span class="form-input-prefix">₹</span>
            <input id="tax-nps" type="number" class="form-input" min="0" max="50000" step="5000"
              value="${ti.npsContrib80CCD1B ?? 0}" />
          </div>
          <p class="form-hint">Additional ₹50K deduction over and above 80C</p>
        </div>

        <div class="form-group">
          <label class="form-label flex items-center gap-2">
            <input id="tax-parents-senior" type="checkbox" class="form-checkbox" ${ti.parentsAbove60 ? 'checked' : ''} />
            Parents are Senior Citizens (60+)
          </label>
          <p class="form-hint">Increases 80D parents limit from ₹25K → ₹50K</p>
        </div>
      </div>
    </div>
  `;

  function onTaxInput(fieldSuffix, stateKey, transform) {
    const el = container.querySelector(`#tax-${fieldSuffix}`);
    if (!el) return;
    const evt = el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(evt, () => {
      const raw = el.type === 'checkbox' ? el.checked : el.value;
      const val = transform ? transform(raw) : raw;
      state.taxInputs = { ...state.taxInputs, [stateKey]: val };
      // Re-run tax comparison and refresh section
      state.taxComparison = compareTaxRegimes({
        ...state.taxInputs,
        grossSalary: state.taxInputs.grossSalary ?? state.monthlyIncome * 12,
      });
      updateDashboardTaxSummary();
      updateTaxSection();
    });
  }

  // Wire all fields: [htmlFieldSuffix, taxInputs key, optional transform]
  const num = v => parseFloat(v) || 0;
  [
    ['gross-salary',    'grossSalary',          num],
    ['epf',             'epfContrib',            num],
    ['ppf',             'ppfContrib',            num],
    ['elss',            'elssContrib',           num],
    ['life-insurance',  'lifeInsurance',         num],
    ['home-loan',       'homeLoanInterest',      num],
    ['medical-self',    'medicalPremiumSelf',    num],
    ['medical-parents', 'medicalPremiumParents', num],
    ['nps',             'npsContrib80CCD1B',     num],
    ['parents-senior',  'parentsAbove60',        v => Boolean(v)],
  ].forEach(([f, k, t]) => onTaxInput(f, k, t));
}

/* ═════════════════════════════════════════════════════════════
   FORM MOUNTS
═════════════════════════════════════════════════════════════ */

function mountAllForms() {
  const container = (id) => document.getElementById(id);

  mountPersonalDetailsForm(container('form-personal-details'), state, (field, value) => {
    updateState({ [field]: value });
  });

  // Tax deductions form
  mountTaxInputsForm(container('tax-inputs-container'));

  mountAssetsForm(container('form-assets'), state, (field, value) => {
    updateState({ [field]: value });
  });

  mountExpensesForm(container('form-expenses'), state, (field, value) => {
    updateState({ [field]: value });
  });

  mountGoalsForm(container('form-goals'), state, (field, value) => {
    updateState({ [field]: value });
  });

  mountSavingsForm(container('form-savings'), state, (field, value) => {
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
  document.getElementById('btn-forgot-password')?.addEventListener('click', async () => {
    const email = document.getElementById('signin-email')?.value.trim();
    if (!email) {
      showToast('Enter your email address above, then click Forgot Password.', 'info');
      return;
    }
    try {
      await sendPasswordReset(email);
      showToast(`Password reset email sent to ${email}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Password show/hide toggles
  document.addEventListener('click', (e) => {
    const toggleBtn = e.target.closest('.password-toggle');
    if (!toggleBtn) return;
    const targetId = toggleBtn.dataset.target;
    const input    = document.getElementById(targetId);
    if (input) input.type = input.type === 'password' ? 'text' : 'password';
  });

  // ── User avatar dropdown ───────────────────────────────────
  const userAvatar   = document.getElementById('user-avatar');
  const userDropdown = document.getElementById('user-dropdown');

  userAvatar?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !userDropdown.classList.contains('hidden');
    userDropdown?.classList.toggle('hidden', isOpen);
    userAvatar.setAttribute('aria-expanded', String(!isOpen));
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    userDropdown?.classList.add('hidden');
    userAvatar?.setAttribute('aria-expanded', 'false');
  });

  // Logout button
  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    userDropdown?.classList.add('hidden');
    try {
      await fbSignOut();
      showToast('You have been signed out.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
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
      // Cache to Firestore if signed in
      if (state.uid) {
        saveAISummary(state.uid, summary).catch(() => {});
      }
    } catch (err) {
      textEl.textContent = 'Failed to generate summary. Please ensure Firebase AI is configured.';
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Regenerate Summary';
    }
  });

  // ── Save Plan button (My Plan tab) ───────────────────────
  document.getElementById('btn-save-plan')?.addEventListener('click', async () => {
    if (!state.uid) {
      showToast('Sign in to save your plan to the cloud', 'info');
      openAuthModal();
      return;
    }
    const btn = document.getElementById('btn-save-plan');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      await savePersonalDetails(state.uid, {
        name: state.name, dob: state.dob, currentAge: state.currentAge,
        retirementAge: state.retirementAge, monthlyIncome: state.monthlyIncome,
        salaryRaiseRate: state.salaryRaiseRate,
        equityPercent: state.equityPercent, debtPercent: state.debtPercent,
        realAssetsPercent: state.realAssetsPercent, cashPercent: state.cashPercent,
        currentEquity: state.currentEquity, currentDebt: state.currentDebt,
        currentEPF: state.currentEPF, currentGold: state.currentGold,
        currentRealEstate: state.currentRealEstate, currentCash: state.currentCash,
        currentAlternatives: state.currentAlternatives,
        assetAllocation: state.assetAllocation,
        monthlyExpenses: state.monthlyExpenses,
        monthlyMedicalPremium: state.monthlyMedicalPremium,
        monthlyEMI: state.monthlyEMI,
        expenseCategories: state.expenseCategories,
        goals: state.goals,
        taxInputs: state.taxInputs,
        planHealth: state.planHealth,
      });
      showToast('Plan saved ✓', 'success');
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg> Save Plan`;
    }
  });

  document.getElementById('btn-save-cloud')?.addEventListener('click', async () => {
    if (!state.uid) {
      showToast('Sign in to save to the cloud', 'info');
      openAuthModal();
      return;
    }
    try {
      const planId = state.activePlanId ?? crypto.randomUUID();
      state.activePlanId = planId;
      await savePlan(state.uid, planId, {
        name: state.name, monthlyIncome: state.monthlyIncome,
        equityPercent: state.equityPercent, debtPercent: state.debtPercent,
        currentEquity: state.currentEquity, currentDebt: state.currentDebt,
        currentEPF: state.currentEPF, monthlyExpenses: state.monthlyExpenses,
        monthlyMedicalPremium: state.monthlyMedicalPremium, monthlyEMI: state.monthlyEMI,
        retirementAge: state.retirementAge, goals: state.goals,
        taxInputs: state.taxInputs, planHealth: state.planHealth,
      });
      showToast('Plan saved to cloud ✓', 'success');
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    }
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
