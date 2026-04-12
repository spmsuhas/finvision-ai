/**
 * FinVision AI — Investments Form (formerly Savings & SIPs)
 * ============================================================
 * Lets users log recurring investments (SIPs, RDs, PPF, NPS),
 * set a custom interest rate (or accept the default), link to a
 * life Goal OR an asset category, and choose date ranges.
 *
 * Emits changes via onUpdate(field, value) like all other forms.
 */

import { SIP_TYPES } from '@/utils/constants.js';
import { formatRupee } from '@/utils/formatters.js';

/** Format number with Indian comma system */
function indianFormat(n) {
  if (!n) return '';
  const s = Math.floor(n).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest  = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}
function parseIndian(str) {
  return parseInt(String(str).replace(/[^\d]/g, ''), 10) || 0;
}

// Flat list of all asset categories from the 4 ALM groups
const ASSET_CATEGORIES = [
  // Debt
  { key: 'debt.savingsBank',      label: 'Savings Bank Account',          group: 'Debt' },
  { key: 'debt.fixedDeposit',     label: 'Bank Fixed Deposits',           group: 'Debt' },
  { key: 'debt.recurringDeposit', label: 'Recurring Deposits',            group: 'Debt' },
  { key: 'debt.ppf',              label: 'PPF (Public Provident Fund)',    group: 'Debt' },
  { key: 'debt.epf',              label: 'EPF / VPF',                     group: 'Debt' },
  { key: 'debt.nscKvp',           label: 'NSC / KVP',                     group: 'Debt' },
  { key: 'debt.scss',             label: 'SCSS / POMIS',                   group: 'Debt' },
  { key: 'debt.debtMutualFunds',  label: 'Debt Mutual Funds',             group: 'Debt' },
  { key: 'debt.govtBonds',        label: 'Govt Bonds / RBI Bonds / SGBs', group: 'Debt' },
  { key: 'debt.companyFD',        label: 'Corporate / Company FDs',       group: 'Debt' },
  { key: 'debt.npsDebt',          label: 'NPS — Debt Allocation',          group: 'Debt' },
  { key: 'debt.otherDebt',        label: 'Other Debt',                     group: 'Debt' },
  // Equity
  { key: 'equity.directEquity',      label: 'Direct Equity (Demat)',               group: 'Equity' },
  { key: 'equity.equityMutualFunds', label: 'Equity Mutual Funds (incl. ELSS)',    group: 'Equity' },
  { key: 'equity.npsEquity',         label: 'NPS — Equity Allocation',             group: 'Equity' },
  { key: 'equity.pms',               label: 'PMS (Portfolio Mgmt Services)',       group: 'Equity' },
  { key: 'equity.aif',               label: 'AIF (Alternative Investment Funds)',   group: 'Equity' },
  { key: 'equity.ulipEquity',        label: 'ULIP — Equity Portion',               group: 'Equity' },
  { key: 'equity.esopRsu',           label: 'ESOPs / RSUs',                        group: 'Equity' },
  { key: 'equity.gratuity',          label: 'Gratuity',                            group: 'Equity' },
  { key: 'equity.superannuation',    label: 'Superannuation / Pension Funds',      group: 'Equity' },
  { key: 'equity.otherEquity',       label: 'Other Equity',                        group: 'Equity' },
  // Real Assets
  { key: 'realAssets.gold',       label: 'Gold (SGBs / ETF / Physical)',   group: 'Real Assets' },
  { key: 'realAssets.realEstate', label: 'Real Estate (REITs / Property)', group: 'Real Assets' },
  // Cash
  { key: 'cash.liquidFunds',   label: 'Cash & Liquid Funds',     group: 'Cash & Alts' },
  { key: 'cash.alternatives',  label: 'Alternative Investments', group: 'Cash & Alts' },
];

function goalOptions(goals) {
  const base = `<option value="">— Select Goal —</option>`;
  if (!goals || goals.length === 0) return base;
  return base + goals.map(g =>
    `<option value="${g.id}">${g.name} (${g.targetYear ?? '–'})</option>`
  ).join('');
}

function assetOptions() {
  const groups = [...new Set(ASSET_CATEGORIES.map(a => a.group))];
  return `<option value="">— Select Category —</option>` +
    groups.map(grp => {
      const cats = ASSET_CATEGORIES.filter(a => a.group === grp);
      return `<optgroup label="${grp}">${cats.map(a =>
        `<option value="${a.key}">${a.label}</option>`
      ).join('')}</optgroup>`;
    }).join('');
}

function sipTypeOptions() {
  return SIP_TYPES.map(t =>
    `<option value="${t.key}">${t.label} — ${(t.rate * 100).toFixed(1)}% p.a. (default)</option>`
  ).join('');
}

function linkLabel(sip, goals) {
  if (sip.linkType === 'goal' && sip.linkedGoalId) {
    const g = goals.find(g => g.id === sip.linkedGoalId);
    return g
      ? `<span class="text-brand">${g.name}</span>`
      : '<span class="text-slate-500">—</span>';
  }
  if (sip.linkType === 'asset' && sip.linkedAssetKey) {
    const a = ASSET_CATEGORIES.find(a => a.key === sip.linkedAssetKey);
    return a
      ? `<span class="text-blue-400">${a.label}</span>`
      : '<span class="text-slate-500">—</span>';
  }
  return '<span class="text-slate-500">Unlinked</span>';
}

function endDateDisplay(sip, goals) {
  if (sip.endDate) return sip.endDate;
  if (sip.linkType === 'goal' && sip.linkedGoalId) {
    const g = goals.find(g => g.id === sip.linkedGoalId);
    if (g?.targetYear) return `${g.targetYear}-12`;
  }
  return '—';
}

function renderTable(container, savings, goals) {
  const tableWrap = container.querySelector('#sip-table-wrap');
  if (!tableWrap) return;

  if (!savings || savings.length === 0) {
    tableWrap.innerHTML = `<div class="text-center py-10 text-slate-500">
      <p class="text-3xl mb-2">💰</p>
      <p class="text-sm">No active investments yet — add your first one above</p>
    </div>`;
    return;
  }

  tableWrap.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs text-slate-500 border-b border-white/10">
            <th class="pb-2 pr-3 font-medium">Type</th>
            <th class="pb-2 pr-3 font-medium">Name</th>
            <th class="pb-2 pr-3 font-medium text-right">₹/mo</th>
            <th class="pb-2 pr-3 font-medium text-right">Rate</th>
            <th class="pb-2 pr-3 font-medium">Linked To</th>
            <th class="pb-2 pr-3 font-medium">End</th>
            <th class="pb-2 font-medium"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          ${savings.map(s => {
            const typeLabel = SIP_TYPES.find(t => t.key === s.type)?.label ?? s.type;
            const defaultRate = SIP_TYPES.find(t => t.key === s.type)?.rate ?? 0.10;
            const rate = s.annualRate ?? defaultRate;
            return `<tr data-sip-id="${s.id}">
              <td class="py-2.5 pr-3">
                <span class="inline-block text-xs px-2 py-0.5 rounded-full bg-surface-3 text-brand font-medium">${typeLabel.split(' ')[0]}</span>
              </td>
              <td class="py-2.5 pr-3 text-white font-medium truncate max-w-[120px]">${s.name || '—'}</td>
              <td class="py-2.5 pr-3 text-right text-emerald-400 font-semibold">${formatRupee(s.monthlyAmount)}</td>
              <td class="py-2.5 pr-3 text-right text-slate-300">${(rate * 100).toFixed(1)}%</td>
              <td class="py-2.5 pr-3 text-xs">${linkLabel(s, goals)}</td>
              <td class="py-2.5 pr-3 text-xs text-slate-400">${endDateDisplay(s, goals)}</td>
              <td class="py-2.5 text-right">
                <button class="btn-delete-sip icon-btn text-slate-500 hover:text-red-400" data-id="${s.id}" aria-label="Remove">
                  <svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;

  tableWrap.querySelectorAll('.btn-delete-sip').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const updated = savings.filter(s => s.id !== id);
      savings.splice(0, savings.length, ...updated);
      renderTable(container, savings, goals);
      updateSummary(container, savings);
    });
  });
}

function updateSummary(container, savings) {
  const total = (savings || []).reduce((s, e) => s + (e.monthlyAmount || 0), 0);
  const el = container.querySelector('#sip-total-monthly');
  if (el) el.textContent = formatRupee(total);
}

export function mountSavingsForm(container, state, onUpdate) {
  if (!container) return;
  const goals   = state.goals ?? [];
  const savings = state.activeSavings ?? [];
  const today   = new Date();
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const defaultRate = SIP_TYPES[0].rate; // MF_SIP default

  container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-5">

      <div class="text-center mb-2">
        <h2 class="text-lg font-bold text-white tracking-wide">Investments</h2>
        <p class="text-xs text-slate-500 mt-0.5">Track recurring investments and link them to goals or asset categories</p>
      </div>

      <!-- Summary banner -->
      <div class="card bg-surface-3 max-w-2xl mx-auto flex items-center justify-between gap-4 py-3 px-5">
        <div class="flex items-center gap-2 text-slate-400 text-sm">
          <svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Total Monthly Investments
        </div>
        <p class="text-xl font-bold text-emerald-400" id="sip-total-monthly">${formatRupee(savings.reduce((s, e) => s + (e.monthlyAmount || 0), 0))}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

        <!-- Add Investment Form -->
        <div class="card">
          <h3 class="card-title flex items-center gap-2 text-base mb-3">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
            Add Investment
          </h3>
          <form id="sip-add-form" class="space-y-3">

            <div class="form-group">
              <label for="sip-type" class="form-label">Investment Type</label>
              <select id="sip-type" class="form-input">${sipTypeOptions()}</select>
            </div>

            <div class="form-group">
              <label for="sip-name" class="form-label">Name / Description</label>
              <input id="sip-name" type="text" class="form-input" required maxlength="60"
                placeholder="e.g. Axis Bluechip SIP" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label for="sip-amount" class="form-label">Monthly Amount</label>
                <div class="form-input-prefix-group">
                  <span class="form-input-prefix">₹</span>
                  <input id="sip-amount" type="text" inputmode="numeric" class="form-input"
                    placeholder="5,000" data-rupee />
                </div>
              </div>
              <div class="form-group">
                <label for="sip-rate" class="form-label">
                  Interest Rate
                  <span class="text-slate-500 text-xs">(% p.a.)</span>
                </label>
                <input id="sip-rate" type="number" class="form-input" min="0" max="50" step="0.1"
                  value="${(defaultRate * 100).toFixed(1)}" placeholder="${(defaultRate * 100).toFixed(1)}" />
                <p id="sip-rate-hint" class="form-hint">Default: ${(defaultRate * 100).toFixed(1)}% for this type</p>
              </div>
            </div>

            <!-- Link Type selector -->
            <div class="form-group">
              <label for="sip-link-type" class="form-label">Link To</label>
              <select id="sip-link-type" class="form-input">
                <option value="">Unlinked (Wealth Building)</option>
                <option value="goal">Life Goal</option>
                <option value="asset">Asset Category</option>
              </select>
            </div>

            <!-- Goal target (shown when link-type = goal) -->
            <div id="sip-goal-wrap" class="form-group hidden">
              <label for="sip-goal" class="form-label">Select Goal</label>
              <select id="sip-goal" class="form-input">${goalOptions(goals)}</select>
              <p id="sip-end-hint" class="form-hint">End date will default to goal's target year</p>
            </div>

            <!-- Asset target (shown when link-type = asset) -->
            <div id="sip-asset-wrap" class="form-group hidden">
              <label for="sip-asset" class="form-label">Select Asset Category</label>
              <select id="sip-asset" class="form-input">${assetOptions()}</select>
              <p class="form-hint">Monthly amount will be added to this category's corpus</p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label for="sip-start" class="form-label">Start Date</label>
                <input id="sip-start" type="month" class="form-input" value="${thisMonth}" />
              </div>
              <div class="form-group">
                <label for="sip-end" class="form-label">End Date <span class="text-slate-500 text-xs">(optional)</span></label>
                <input id="sip-end" type="month" class="form-input" />
              </div>
            </div>

            <div class="flex justify-end">
              <button type="submit" class="btn-primary flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                Add Investment
              </button>
            </div>
          </form>
        </div>

        <!-- Investment Table Card -->
        <div class="card overflow-hidden">
          <h3 class="card-title flex items-center gap-2 text-base mb-3">
            <span class="w-2.5 h-2.5 rounded-full bg-brand inline-block"></span>
            Active Investments
            <span id="sip-count-badge" class="text-sm text-slate-400 font-normal">(${savings.length})</span>
          </h3>
          <div id="sip-table-wrap"></div>
        </div>

      </div>
    </div>
  `;

  // Initial table render
  renderTable(container, savings, goals);

  // Indian comma formatting on amount input
  const amtEl  = container.querySelector('#sip-amount');
  const rateEl = container.querySelector('#sip-rate');
  amtEl.addEventListener('focus', () => { const n = parseIndian(amtEl.value); amtEl.value = n || ''; });
  amtEl.addEventListener('blur',  () => { const n = parseIndian(amtEl.value); amtEl.value = indianFormat(n); });

  // Auto-fill rate when type changes
  const typeSel = container.querySelector('#sip-type');
  const rateHint = container.querySelector('#sip-rate-hint');
  typeSel.addEventListener('change', () => {
    const t = SIP_TYPES.find(t => t.key === typeSel.value);
    if (t) {
      rateEl.value = (t.rate * 100).toFixed(1);
      rateHint.textContent = `Default: ${(t.rate * 100).toFixed(1)}% for this type`;
    }
  });

  // Show/hide goal or asset selector based on link-type
  const linkTypeSel  = container.querySelector('#sip-link-type');
  const goalWrap     = container.querySelector('#sip-goal-wrap');
  const assetWrap    = container.querySelector('#sip-asset-wrap');
  const goalSel      = container.querySelector('#sip-goal');
  const endHint      = container.querySelector('#sip-end-hint');

  linkTypeSel.addEventListener('change', () => {
    const v = linkTypeSel.value;
    goalWrap.classList.toggle('hidden',  v !== 'goal');
    assetWrap.classList.toggle('hidden', v !== 'asset');
  });

  // Update end-date hint when goal selection changes
  goalSel.addEventListener('change', () => {
    if (!endHint) return;
    const g = goals.find(g => g.id === goalSel.value);
    endHint.textContent = g?.targetYear
      ? `End date defaults to ${g.targetYear}-12`
      : 'End date will default to goal\'s target year';
  });

  // Calendar popup on click for month inputs
  const startEl = container.querySelector('#sip-start');
  const endEl   = container.querySelector('#sip-end');
  [startEl, endEl].forEach(el => {
    if (!el) return;
    el.addEventListener('click', () => {
      try { el.showPicker(); } catch (_) { /* unsupported browser */ }
    });
  });

  // Submit handler
  container.querySelector('#sip-add-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const type          = typeSel.value;
    const name          = container.querySelector('#sip-name').value.trim();
    const monthlyAmount = parseIndian(amtEl.value);
    const rateInput     = parseFloat(rateEl.value);
    const annualRate    = isNaN(rateInput) || rateInput <= 0
      ? (SIP_TYPES.find(t => t.key === type)?.rate ?? 0.10)
      : rateInput / 100;
    const linkType      = linkTypeSel.value || null;
    const linkedGoalId  = linkType === 'goal'  ? (goalSel.value || null)                                    : null;
    const linkedAssetKey= linkType === 'asset' ? (container.querySelector('#sip-asset').value || null) : null;
    const startDate     = startEl.value;
    const endDate       = endEl.value || '';

    if (!name || !monthlyAmount) return;

    const newSip = {
      id: crypto.randomUUID(),
      type,
      name,
      monthlyAmount,
      annualRate,
      linkType,
      linkedGoalId,
      linkedAssetKey,
      startDate,
      endDate,
    };

    savings.push(newSip);
    onUpdate('activeSavings', [...savings]);

    renderTable(container, savings, goals);
    updateSummary(container, savings);

    const badge = container.querySelector('#sip-count-badge');
    if (badge) badge.textContent = `(${savings.length})`;

    e.target.reset();
    amtEl.value  = '';
    startEl.value = thisMonth;
    // Reset link UI
    goalWrap.classList.add('hidden');
    assetWrap.classList.add('hidden');
    // Restore default rate for first type
    const firstType = SIP_TYPES[0];
    rateEl.value = (firstType.rate * 100).toFixed(1);
    rateHint.textContent = `Default: ${(firstType.rate * 100).toFixed(1)}% for this type`;
  });

  // Proxy delete events: after renderTable re-renders, also fire onUpdate
  container.addEventListener('click', (e) => {
    if (e.target.closest('.btn-delete-sip')) {
      setTimeout(() => {
        onUpdate('activeSavings', [...savings]);
        const badge = container.querySelector('#sip-count-badge');
        if (badge) badge.textContent = `(${savings.length})`;
      }, 0);
    }
  });
}

