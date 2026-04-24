/**
 * FinVision AI — Liabilities & Debt Management Form
 * ============================================================
 * Mounts the full Liabilities tab UI:
 *   • Add / Edit / Delete loan entries
 *   • Auto-computed EMI (editable override)
 *   • Total Debt summary card
 *   • Prepay vs. Invest arbitrage tool with Chart.js bar chart
 *
 * Follows the standard mountXForm(container, state, onUpdate) signature.
 * onUpdate('liabilities', [...]) is the only field emitted.
 */

import { formatRupee } from '@/utils/formatters.js';
import { calculateEMI, generateAmortizationSchedule, calculateArbitrage, sipFutureValue } from '@/utils/financeEngine.js';
import { Chart } from 'chart.js/auto';
import { confirmDelete } from '@/utils/confirmDelete.js';

/* ── Loan types ─────────────────────────────────────────────── */
const LOAN_TYPES = [
  { key: 'home',       label: 'Home Loan',        color: 'bg-blue-400',    rate: 0.085 },
  { key: 'car',        label: 'Car Loan',          color: 'bg-violet-400',  rate: 0.095 },
  { key: 'personal',   label: 'Personal Loan',     color: 'bg-rose-400',    rate: 0.14  },
  { key: 'education',  label: 'Education Loan',    color: 'bg-amber-400',   rate: 0.095 },
  { key: 'creditcard', label: 'Credit Card / BNPL',color: 'bg-red-400',     rate: 0.36  },
  { key: 'business',   label: 'Business Loan',     color: 'bg-emerald-400', rate: 0.12  },
  { key: 'other',      label: 'Other',             color: 'bg-slate-400',   rate: 0.10  },
];

const LOAN_TYPE_MAP = Object.fromEntries(LOAN_TYPES.map(t => [t.key, t]));

/* ── Indian number helpers ──────────────────────────────────── */
function indianFormat(n) {
  if (!n) return '';
  const s = Math.floor(Math.abs(n)).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest  = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}
function parseIndian(str) {
  return parseInt(String(str).replace(/[^\d]/g, ''), 10) || 0;
}
function pct(n) { return `${(n * 100).toFixed(2)}%`; }

/* ── Chart instance (module-level so we can destroy on re-render) ── */
let _arbitrageChart = null;

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════════════ */
export function mountLiabilitiesForm(container, state, onUpdate) {
  if (!container) return;

  // Abort any listeners registered by a previous mount on the same container
  if (container._libAbort) container._libAbort.abort();
  const _ac = new AbortController();
  container._libAbort = _ac;
  const { signal } = _ac;

  let loans     = (state.liabilities ?? []).map(l => ({ ...l }));
  let editingId = null;   // loan id being edited, null = add mode

  /* ── Notify parent ─────────────────────────────────────────── */
  function notifyUpdate() {
    onUpdate('liabilities', loans.map(l => ({ ...l })));
  }

  /* ── Derived totals ─────────────────────────────────────────── */
  function totalOutstanding() { return loans.reduce((s, l) => s + (l.outstandingBalance || 0), 0); }
  function totalEMI()         { return loans.reduce((s, l) => s + (l.currentEMI || 0), 0); }

  /* ── Render ─────────────────────────────────────────────────── */
  function render() {
    container.innerHTML = buildHTML();
    bindEvents();
    updateArbitrageChart();
  }

  /* ── HTML builder ──────────────────────────────────────────── */
  function buildHTML() {
    return `
      <div class="max-w-5xl mx-auto space-y-5">

        <!-- Header -->
        <div class="text-center mb-2">
          <h2 class="text-lg font-bold text-white tracking-wide">Liabilities & Debt</h2>
          <p class="text-xs text-slate-500 mt-0.5">Track all loans — EMI is auto-synced to Expenses</p>
        </div>

        <!-- Summary + Add button row -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

          <!-- Total Outstanding -->
          <div class="card text-center">
            <p class="text-xs text-slate-500 uppercase tracking-widest mb-1">Total Outstanding Debt</p>
            <p class="text-2xl font-bold text-white">${formatRupee(totalOutstanding())}</p>
            <p class="text-xs text-slate-400 mt-0.5">${loans.length} active loan${loans.length !== 1 ? 's' : ''}</p>
          </div>

          <!-- Total EMI -->
          <div class="card text-center">
            <p class="text-xs text-slate-500 uppercase tracking-widest mb-1">Total Monthly EMI</p>
            <p class="text-2xl font-bold text-rose-400">${formatRupee(totalEMI())}</p>
            <p class="text-xs text-slate-500 mt-0.5">Auto-synced to Expenses tab</p>
          </div>

          <!-- Add Loan card -->
          <div class="card flex flex-col items-center justify-center gap-3">
            <p class="text-xs text-slate-400 text-center">Add a new loan to track principal, interest and repayment</p>
            <button id="lib-btn-open-modal"
              class="btn-primary flex items-center gap-2 text-sm">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Add Loan
            </button>
          </div>
        </div>

        <!-- Loans table -->
        ${buildLoansTable()}

        <!-- Prepay vs Invest -->
        ${loans.length > 0 ? buildArbitrageSection() : ''}

      </div>

      <!-- Add/Edit Modal -->
      ${buildModal()}
    `;
  }

  /* ── Loans table ──────────────────────────────────────────── */
  function buildLoansTable() {
    if (loans.length === 0) {
      return `
        <div class="card text-center py-10">
          <p class="text-4xl mb-3">🏦</p>
          <p class="text-sm text-slate-400">No loans added yet.</p>
          <p class="text-xs text-slate-500 mt-1">Add a loan above to start tracking debt and explore prepayment options.</p>
        </div>`;
    }

    const rows = loans.map(l => {
      const typeMeta = LOAN_TYPE_MAP[l.type] || LOAN_TYPE_MAP.other;
      const schedule = generateAmortizationSchedule(l.outstandingBalance, l.annualRate, l.tenureMonths);
      const yearsLeft = Math.floor(l.tenureMonths / 12);
      const moLeft    = l.tenureMonths % 12;
      return `
        <tr class="border-t border-white/5 hover:bg-white/3 transition-colors">
          <td class="px-3 py-3">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full ${typeMeta.color} shrink-0"></span>
              <div>
                <p class="text-sm text-white font-medium">${l.name}</p>
                <p class="text-xs text-slate-500">${typeMeta.label}</p>
              </div>
            </div>
          </td>
          <td class="px-3 py-3 text-right">
            <p class="text-sm text-white">${formatRupee(l.outstandingBalance)}</p>
          </td>
          <td class="px-3 py-3 text-right">
            <p class="text-sm text-amber-300">${pct(l.annualRate)}</p>
          </td>
          <td class="px-3 py-3 text-right text-xs text-slate-400">
            ${yearsLeft > 0 ? `${yearsLeft}y ` : ''}${moLeft > 0 ? `${moLeft}m` : ''}
          </td>
          <td class="px-3 py-3 text-right">
            <p class="text-sm text-rose-400 font-semibold">${formatRupee(l.currentEMI)}</p>
          </td>
          <td class="px-3 py-3 text-right text-xs text-slate-500">
            ${formatRupee(schedule.baselineInterest)}
          </td>
          <td class="px-3 py-3 text-right">
            <div class="flex items-center justify-end gap-2">
              <button class="icon-btn text-slate-400 hover:text-brand lib-btn-edit" data-id="${l.id}" title="Edit">
                <svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button class="icon-btn text-slate-400 hover:text-red-400 lib-btn-delete" data-id="${l.id}" title="Delete">
                <svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');

    return `
      <div class="card overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="text-slate-500 text-xs uppercase tracking-wider">
              <th class="px-3 py-2 font-medium">Loan</th>
              <th class="px-3 py-2 font-medium text-right">Outstanding</th>
              <th class="px-3 py-2 font-medium text-right">Rate</th>
              <th class="px-3 py-2 font-medium text-right">Tenure Left</th>
              <th class="px-3 py-2 font-medium text-right">EMI / mo</th>
              <th class="px-3 py-2 font-medium text-right">Total Interest</th>
              <th class="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  /* ── Prepay vs Invest section ──────────────────────────────── */
  function buildArbitrageSection() {
    const loanOptions = loans.map(l =>
      `<option value="${l.id}">${l.name} (${formatRupee(l.outstandingBalance)} @ ${pct(l.annualRate)})</option>`
    ).join('');

    return `
      <div class="card">
        <h3 class="card-title flex items-center gap-2 text-base mb-1">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
          Prepay vs. Invest Resolver
        </h3>
        <p class="text-xs text-slate-500 mb-4">Should you use your monthly surplus to pay off debt faster, or invest it for higher returns?</p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <!-- Loan selector -->
          <div class="form-group">
            <label class="form-label text-xs">Select Loan</label>
            <div class="select-wrapper">
              <select id="arb-loan-select" class="form-input text-sm" style="color-scheme:dark;background-color:oklch(0.17 0.008 252);color:#fff">${loanOptions}</select>
            </div>
          </div>

          <!-- Surplus input -->
          <div class="form-group">
            <label class="form-label text-xs">Monthly Surplus Cash</label>
            <div class="form-input-prefix-group">
              <span class="form-input-prefix text-xs">₹</span>
              <input id="arb-surplus" type="text" inputmode="numeric" class="form-input text-sm"
                value="5,000" placeholder="5,000" />
            </div>
          </div>

          <!-- Return slider -->
          <div class="form-group">
            <label class="form-label text-xs">Expected Investment Return: <span id="arb-rate-label" class="text-brand font-semibold">12.0%</span></label>
            <input id="arb-rate-slider" type="range" min="6" max="20" step="0.5" value="12"
              class="w-full accent-amber-400 mt-2" />
            <div class="flex justify-between text-xs text-slate-500 mt-1"><span>6%</span><span>20%</span></div>
          </div>
        </div>

        <!-- Chart -->
        <div class="bg-black/20 rounded-xl p-4 mb-4" style="height:220px">
          <canvas id="chart-arbitrage"></canvas>
        </div>

        <!-- Result cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4" id="arb-result-cards">
          <div class="rounded-xl border border-rose-500/30 bg-rose-500/8 p-4 text-center">
            <p class="text-xs text-slate-400 uppercase tracking-widest mb-1">Prepay — Interest Saved</p>
            <p id="arb-interest-saved" class="text-2xl font-bold text-rose-300">—</p>
            <p id="arb-months-saved" class="text-xs text-slate-500 mt-1">—</p>
          </div>
          <div class="rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-4 text-center">
            <p class="text-xs text-slate-400 uppercase tracking-widest mb-1">Invest — Wealth Created</p>
            <p id="arb-wealth-created" class="text-2xl font-bold text-emerald-300">—</p>
            <p id="arb-invest-fv" class="text-xs text-slate-500 mt-1">—</p>
          </div>
        </div>

        <!-- AI Insight -->
        <div id="arb-insight" class="rounded-xl border border-white/8 bg-white/3 p-4 text-sm text-slate-300 leading-relaxed hidden"></div>
      </div>`;
  }

  /* ── Add/Edit Modal ────────────────────────────────────────── */
  function buildModal() {
    const typeOptions = LOAN_TYPES.map(t =>
      `<option value="${t.key}">${t.label}</option>`
    ).join('');

    return `
      <div id="lib-modal" class="modal-overlay hidden" style="z-index:60">
        <div class="modal-card w-full" style="max-width:480px">
          <div class="flex items-center justify-between mb-4">
            <h3 id="lib-modal-title" class="text-sm font-bold text-white">Add Loan</h3>
            <button id="lib-modal-close" class="text-slate-400 hover:text-white text-xl leading-none">&times;</button>
          </div>

          <div class="space-y-3">
            <!-- Type -->
            <div class="form-group">
              <label class="form-label text-xs">Loan Type</label>
              <div class="select-wrapper">
                <select id="lib-inp-type" class="form-input text-sm" style="color-scheme:dark;background-color:oklch(0.17 0.008 252);color:#fff">${typeOptions}</select>
              </div>
            </div>

            <!-- Name -->
            <div class="form-group">
              <label class="form-label text-xs">Loan Name / Description</label>
              <input id="lib-inp-name" type="text" class="form-input text-sm" placeholder="e.g. SBI Home Loan" maxlength="50" />
            </div>

            <!-- Balance + Rate (side by side) -->
            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label class="form-label text-xs">Outstanding Balance</label>
                <div class="form-input-prefix-group">
                  <span class="form-input-prefix text-xs">₹</span>
                  <input id="lib-inp-balance" type="text" inputmode="numeric" class="form-input text-sm" placeholder="30,00,000" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label text-xs">Annual Interest Rate %</label>
                <div class="form-input-prefix-group">
                  <span class="form-input-prefix text-xs">%</span>
                  <input id="lib-inp-rate" type="number" class="form-input text-sm" step="0.1" min="0" max="50" placeholder="8.5" />
                </div>
              </div>
            </div>

            <!-- Tenure + EMI (side by side) -->
            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label class="form-label text-xs">Remaining Tenure (months)</label>
                <input id="lib-inp-tenure" type="number" class="form-input text-sm" min="1" max="360" placeholder="180" />
              </div>
              <div class="form-group">
                <label class="form-label text-xs">Current EMI
                  <span class="text-slate-500 font-normal">(auto-calculated)</span>
                </label>
                <div class="form-input-prefix-group">
                  <span class="form-input-prefix text-xs">₹</span>
                  <input id="lib-inp-emi" type="text" inputmode="numeric" class="form-input text-sm" placeholder="0" />
                </div>
                <p class="form-hint text-xs">Override if actual EMI differs from calculated</p>
              </div>
            </div>

            <!-- EMI preview hint -->
            <div id="lib-emi-hint" class="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-xs text-blue-300 hidden">
              Calculated EMI: <strong id="lib-emi-calc"></strong>
            </div>

            <!-- Visibility -->
            <div class="form-group">
              <label class="form-label text-xs">Visibility</label>
              <div class="vis-toggle" id="lib-inp-visibility">
                <button type="button" class="vis-btn active" data-vis="shared">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                  Shared
                </button>
                <button type="button" class="vis-btn" data-vis="private">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  Private
                </button>
              </div>
              <p class="form-hint text-xs">Private loans only appear in Individual view</p>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-5">
            <button id="lib-modal-cancel" class="btn-ghost text-sm">Cancel</button>
            <button id="lib-modal-save" class="btn-primary text-sm">Save Loan</button>
          </div>
        </div>
      </div>`;
  }

  /* ── Event binding ─────────────────────────────────────────── */
  function bindEvents() {
    const q = id => container.querySelector(id);

    /* ── Modal open / close ─── */
    q('#lib-btn-open-modal')?.addEventListener('click', () => openModal(null));

    const closeModal = () => {
      q('#lib-modal')?.classList.add('hidden');
      editingId = null;
    };
    q('#lib-modal-close')?.addEventListener('click', closeModal);
    q('#lib-modal-cancel')?.addEventListener('click', closeModal);
    q('#lib-modal')?.addEventListener('click', e => { if (e.target === q('#lib-modal')) closeModal(); });

    // Visibility toggle
    q('#lib-inp-visibility')?.addEventListener('click', e => {
      const btn = e.target.closest('.vis-btn[data-vis]');
      if (!btn) return;
      const vis = btn.dataset.vis;
      q('#lib-inp-visibility').querySelectorAll('.vis-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.vis === vis),
      );
    });

    /* ── Auto-calculate EMI when balance/rate/tenure changes ─── */
    const recalcModalEMI = () => {
      const bal    = parseIndian(q('#lib-inp-balance')?.value);
      const rate   = parseFloat(q('#lib-inp-rate')?.value) / 100 || 0;
      const tenure = parseInt(q('#lib-inp-tenure')?.value, 10) || 0;
      if (bal > 0 && rate > 0 && tenure > 0) {
        const emi = calculateEMI(bal, rate, tenure);
        const hint = q('#lib-emi-hint');
        const calc = q('#lib-emi-calc');
        if (hint) hint.classList.remove('hidden');
        if (calc) calc.textContent = formatRupee(Math.round(emi));
        const emiInput = q('#lib-inp-emi');
        // Only auto-fill if user hasn't manually overridden
        if (emiInput && !emiInput.dataset.manualOverride) {
          emiInput.value = indianFormat(Math.round(emi));
        }
      }
    };

    ['#lib-inp-balance', '#lib-inp-rate', '#lib-inp-tenure'].forEach(sel => {
      q(sel)?.addEventListener('input', recalcModalEMI);
    });

    // Mark as manual override if user types directly into EMI field
    q('#lib-inp-emi')?.addEventListener('input', () => {
      if (q('#lib-inp-emi')) q('#lib-inp-emi').dataset.manualOverride = '1';
    });

    // Default rate from loan type
    q('#lib-inp-type')?.addEventListener('change', () => {
      const typeKey = q('#lib-inp-type')?.value;
      const meta = LOAN_TYPE_MAP[typeKey];
      if (meta && q('#lib-inp-rate') && !q('#lib-inp-rate').value) {
        q('#lib-inp-rate').value = (meta.rate * 100).toFixed(1);
        recalcModalEMI();
      }
    });

    /* ── Indian format focus/blur for balance input ─── */
    q('#lib-inp-balance')?.addEventListener('focus', e => {
      e.target.value = parseIndian(e.target.value) || '';
    });
    q('#lib-inp-balance')?.addEventListener('blur', e => {
      e.target.value = indianFormat(parseIndian(e.target.value));
    });
    q('#lib-inp-emi')?.addEventListener('focus', e => {
      e.target.value = parseIndian(e.target.value) || '';
    });
    q('#lib-inp-emi')?.addEventListener('blur', e => {
      e.target.value = indianFormat(parseIndian(e.target.value));
    });

    /* ── Save loan ─── */
    q('#lib-modal-save')?.addEventListener('click', () => {
      const name    = q('#lib-inp-name')?.value.trim();
      const type    = q('#lib-inp-type')?.value;
      const balance = parseIndian(q('#lib-inp-balance')?.value);
      const rateVal = parseFloat(q('#lib-inp-rate')?.value);
      const tenure  = parseInt(q('#lib-inp-tenure')?.value, 10);
      const emiRaw  = parseIndian(q('#lib-inp-emi')?.value);

      if (!name)         { q('#lib-inp-name')?.focus();    return; }
      if (!balance)      { q('#lib-inp-balance')?.focus(); return; }
      if (!rateVal || isNaN(rateVal)) { q('#lib-inp-rate')?.focus(); return; }
      if (!tenure)       { q('#lib-inp-tenure')?.focus();  return; }

      const annualRate = rateVal / 100;
      const currentEMI = emiRaw || Math.round(calculateEMI(balance, annualRate, tenure));
      const visEl = q('#lib-inp-visibility');
      const visibility = visEl?.querySelector('.vis-btn.active')?.dataset.vis || 'shared';

      if (editingId) {
        const idx = loans.findIndex(l => l.id === editingId);
        if (idx !== -1) {
          loans[idx] = { ...loans[idx], name, type, outstandingBalance: balance, annualRate, tenureMonths: tenure, currentEMI, visibility };
        }
      } else {
        loans.push({ id: crypto.randomUUID(), name, type, outstandingBalance: balance, annualRate, tenureMonths: tenure, currentEMI, visibility });
      }

      notifyUpdate();
      closeModal();
      render();
    });

    /* ── Arbitrage tool ─── */
    const arbInputs = ['#arb-loan-select', '#arb-surplus', '#arb-rate-slider'];
    arbInputs.forEach(sel => {
      const el = container.querySelector(sel);
      el?.addEventListener('input', updateArbitrageChart);
      el?.addEventListener('change', updateArbitrageChart);
    });

    // Indian formatting for surplus
    container.querySelector('#arb-surplus')?.addEventListener('focus', e => {
      e.target.value = parseIndian(e.target.value) || '';
    });
    container.querySelector('#arb-surplus')?.addEventListener('blur', e => {
      e.target.value = indianFormat(parseIndian(e.target.value));
    });

    // Slider live label
    container.querySelector('#arb-rate-slider')?.addEventListener('input', e => {
      const lbl = container.querySelector('#arb-rate-label');
      if (lbl) lbl.textContent = `${parseFloat(e.target.value).toFixed(1)}%`;
    });
  }

  /* ── Open modal ─────────────────────────────────────────────── */
  function openModal(loan) {
    const q = id => container.querySelector(id);
    editingId = loan?.id ?? null;

    const titleEl = q('#lib-modal-title');
    if (titleEl) titleEl.textContent = loan ? 'Edit Loan' : 'Add Loan';

    // Pre-fill or clear
    if (q('#lib-inp-type'))    q('#lib-inp-type').value    = loan?.type ?? 'home';
    if (q('#lib-inp-name'))    q('#lib-inp-name').value    = loan?.name ?? '';
    if (q('#lib-inp-balance')) q('#lib-inp-balance').value = loan ? indianFormat(loan.outstandingBalance) : '';
    if (q('#lib-inp-rate'))    q('#lib-inp-rate').value    = loan ? (loan.annualRate * 100).toFixed(2) : '';
    if (q('#lib-inp-tenure'))  q('#lib-inp-tenure').value  = loan?.tenureMonths ?? '';
    if (q('#lib-inp-emi')) {
      q('#lib-inp-emi').value = loan ? indianFormat(loan.currentEMI) : '';
      delete q('#lib-inp-emi').dataset.manualOverride;
    }
    // Pre-fill visibility toggle
    const savedVis = loan?.visibility || 'shared';
    const visToggle = q('#lib-inp-visibility');
    if (visToggle) {
      visToggle.querySelectorAll('.vis-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.vis === savedVis),
      );
    }
    q('#lib-emi-hint')?.classList.add('hidden');

    q('#lib-modal')?.classList.remove('hidden');
    setTimeout(() => q('#lib-inp-name')?.focus(), 50);
  }

  /* ── Arbitrage chart & insight ──────────────────────────────── */
  function updateArbitrageChart() {
    const q = id => container.querySelector(id);

    const loanId  = q('#arb-loan-select')?.value;
    const surplus = parseIndian(q('#arb-surplus')?.value) || 0;
    const rate    = (parseFloat(q('#arb-rate-slider')?.value) || 12) / 100;

    const loan = loans.find(l => l.id === loanId);
    if (!loan || surplus <= 0) {
      _destroyArbitrageChart();
      _clearArbitrageResults();
      return;
    }

    const result = calculateArbitrage(loan, surplus, rate);

    // Update result cards
    const intEl  = q('#arb-interest-saved');
    const mthEl  = q('#arb-months-saved');
    const wlthEl = q('#arb-wealth-created');
    const fvEl   = q('#arb-invest-fv');

    if (intEl)  intEl.textContent  = formatRupee(result.interestSaved);
    if (mthEl)  mthEl.textContent  = `Loan cleared ${result.monthsSaved} month${result.monthsSaved !== 1 ? 's' : ''} earlier`;
    if (wlthEl) wlthEl.textContent = formatRupee(result.wealthCreated);
    if (fvEl)   fvEl.textContent   = `Future value of SIP: ${formatRupee(Math.round(result.investFV))}`;

    // Highlight the winning card
    const prepayCard  = q('#arb-result-cards')?.children[0];
    const investCard  = q('#arb-result-cards')?.children[1];
    if (prepayCard && investCard) {
      prepayCard.classList.toggle('ring-2',       result.recommendation === 'PREPAY');
      prepayCard.classList.toggle('ring-rose-400',result.recommendation === 'PREPAY');
      investCard.classList.toggle('ring-2',        result.recommendation === 'INVEST');
      investCard.classList.toggle('ring-emerald-400', result.recommendation === 'INVEST');
    }

    // Chart
    const canvas = q('#chart-arbitrage');
    if (canvas) {
      _destroyArbitrageChart();
      _arbitrageChart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: ['Prepay — Interest Saved', 'Invest — Wealth Created'],
          datasets: [{
            label: '₹ Benefit',
            data:  [result.interestSaved, result.wealthCreated],
            backgroundColor: ['rgba(248,113,113,0.75)', 'rgba(52,211,153,0.75)'],
            borderColor:     ['rgba(248,113,113,1)',    'rgba(52,211,153,1)'],
            borderWidth: 1,
            borderRadius: 8,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ` ${formatRupee(Math.round(ctx.raw))}`,
              },
            },
          },
          scales: {
            x: {
              ticks: { color: '#94a3b8', font: { size: 11 },
                callback: v => formatRupee(v) },
              grid: { color: 'rgba(255,255,255,0.05)' },
            },
            y: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { display: false } },
          },
        },
      });
    }

    // AI Insight text
    const insightEl = q('#arb-insight');
    if (insightEl) {
      insightEl.classList.remove('hidden');
      const surplusStr = formatRupee(surplus);
      const rateStr    = `${(rate * 100).toFixed(1)}%`;
      if (result.recommendation === 'INVEST') {
        insightEl.innerHTML = `
          <span class="text-emerald-400 font-semibold">📈 Invest the surplus.</span>
          Investing ₹${surplus.toLocaleString('en-IN')}/month at ${rateStr} creates
          <strong class="text-emerald-300">${formatRupee(result.wealthCreated)}</strong> in net wealth —
          <strong class="text-emerald-300">${formatRupee(result.wealthCreated - result.interestSaved)}</strong> more than prepaying.
          Your loan rate (${pct(loan.annualRate)}) is lower than your expected investment return, so compounding wins.`;
      } else if (result.recommendation === 'PREPAY') {
        insightEl.innerHTML = `
          <span class="text-rose-400 font-semibold">🏦 Prepay the loan.</span>
          Paying down principal saves <strong class="text-rose-300">${formatRupee(result.interestSaved)}</strong> in interest
          and clears the loan ${result.monthsSaved} months early —
          <strong class="text-rose-300">${formatRupee(result.interestSaved - result.wealthCreated)}</strong> more valuable
          than investing at ${rateStr}. Your loan rate (${pct(loan.annualRate)}) is higher than your expected return.`;
      } else {
        insightEl.innerHTML = `
          <span class="text-amber-400 font-semibold">⚖️ Toss-up.</span>
          Both options are nearly equivalent at these numbers. Consider your liquidity needs —
          investing gives access to funds in emergencies, while prepaying permanently reduces debt.`;
      }
    }
  }

  function _destroyArbitrageChart() {
    if (_arbitrageChart) { _arbitrageChart.destroy(); _arbitrageChart = null; }
  }

  function _clearArbitrageResults() {
    const q = id => container.querySelector(id);
    ['#arb-interest-saved','#arb-months-saved','#arb-wealth-created','#arb-invest-fv'].forEach(sel => {
      const el = q(sel);
      if (el) el.textContent = '—';
    });
    q('#arb-insight')?.classList.add('hidden');
  }

  /* ── Edit / Delete delegated click — registered ONCE at mount time ─────── */
  container.addEventListener('click', e => {
    const editBtn   = e.target.closest('.lib-btn-edit');
    const deleteBtn = e.target.closest('.lib-btn-delete');

    if (editBtn) {
      const id   = editBtn.dataset.id;
      const loan = loans.find(l => l.id === id);
      if (loan) openModal(loan);
      return;
    }

    if (deleteBtn) {
      const id   = deleteBtn.dataset.id;
      const loan = loans.find(l => l.id === id);
      const label = loan?.name || 'this loan';
      confirmDelete({
        title: 'Delete Loan?',
        message: `"${label}" and all its data will be permanently removed.`,
      }).then(confirmed => {
        if (!confirmed) return;
        loans = loans.filter(l => l.id !== id);
        notifyUpdate();
        render();
      });
      return;
    }
  }, { signal });

  /* ── Initial render ─────────────────────────────────────────── */
  render();
}
