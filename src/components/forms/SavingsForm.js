/**
 * FinVision AI - Investments Form
 * Keeps recurring investment inputs dynamic and state-driven.
 */

import { INFLATION, RETURNS, SIP_TYPES } from '@/utils/constants.js';
import { formatRupee } from '@/utils/formatters.js';

function indianFormat(n) {
  if (!n) return '';
  const s = Math.floor(n).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}

function parseIndian(str) {
  return parseInt(String(str).replace(/[^\d]/g, ''), 10) || 0;
}

const ASSET_CATEGORIES = [
  { key: 'debt.savingsBank', label: 'Savings Bank Account', group: 'Debt' },
  { key: 'debt.fixedDeposit', label: 'Bank Fixed Deposits', group: 'Debt' },
  { key: 'debt.recurringDeposit', label: 'Recurring Deposits', group: 'Debt' },
  { key: 'debt.ppf', label: 'PPF (Public Provident Fund)', group: 'Debt' },
  { key: 'debt.epf', label: 'EPF / VPF', group: 'Debt' },
  { key: 'debt.nscKvp', label: 'NSC / KVP', group: 'Debt' },
  { key: 'debt.scss', label: 'SCSS / POMIS', group: 'Debt' },
  { key: 'debt.debtMutualFunds', label: 'Debt Mutual Funds', group: 'Debt' },
  { key: 'debt.govtBonds', label: 'Govt Bonds / RBI Bonds / SGBs', group: 'Debt' },
  { key: 'debt.companyFD', label: 'Corporate / Company FDs', group: 'Debt' },
  { key: 'debt.npsDebt', label: 'NPS - Debt Allocation', group: 'Debt' },
  { key: 'debt.otherDebt', label: 'Other Debt', group: 'Debt' },
  { key: 'equity.directEquity', label: 'Direct Equity (Demat)', group: 'Equity' },
  { key: 'equity.equityMutualFunds', label: 'Equity Mutual Funds (incl. ELSS)', group: 'Equity' },
  { key: 'equity.npsEquity', label: 'NPS - Equity Allocation', group: 'Equity' },
  { key: 'equity.pms', label: 'PMS (Portfolio Mgmt Services)', group: 'Equity' },
  { key: 'equity.aif', label: 'AIF (Alternative Investment Funds)', group: 'Equity' },
  { key: 'equity.ulipEquity', label: 'ULIP - Equity Portion', group: 'Equity' },
  { key: 'equity.esopRsu', label: 'ESOPs / RSUs', group: 'Equity' },
  { key: 'equity.gratuity', label: 'Gratuity', group: 'Equity' },
  { key: 'equity.superannuation', label: 'Superannuation / Pension Funds', group: 'Equity' },
  { key: 'equity.otherEquity', label: 'Other Equity', group: 'Equity' },
  { key: 'realAssets.gold', label: 'Gold (SGBs / ETF / Physical)', group: 'Real Assets' },
  { key: 'realAssets.realEstate', label: 'Real Estate (REITs / Property)', group: 'Real Assets' },
  { key: 'cash.liquidFunds', label: 'Cash & Liquid Funds', group: 'Cash & Alts' },
  { key: 'cash.alternatives', label: 'Alternative Investments', group: 'Cash & Alts' },
];

const INVESTMENT_FAMILIES = [
  {
    key: 'mutual-funds',
    label: 'Mutual Funds',
    instruments: [
      { key: 'MF_SIP', label: 'Mutual Fund SIP', rate: SIP_TYPES.find((item) => item.key === 'MF_SIP')?.rate ?? RETURNS.EQUITY, assetClass: 'equity' },
      { key: 'ELSS_SIP', label: 'ELSS SIP', rate: 0.12, assetClass: 'equity' },
      { key: 'INDEX_FUND_SIP', label: 'Index Fund SIP', rate: 0.12, assetClass: 'equity' },
      { key: 'ETF_SIP', label: 'ETF SIP', rate: 0.11, assetClass: 'equity' },
    ],
  },
  {
    key: 'deposits',
    label: 'Deposits',
    instruments: [
      { key: 'RD', label: 'Recurring Deposit', rate: SIP_TYPES.find((item) => item.key === 'RD')?.rate ?? RETURNS.DEBT, assetClass: 'debt' },
      { key: 'PPF', label: 'PPF Contribution', rate: SIP_TYPES.find((item) => item.key === 'PPF')?.rate ?? 0.071, assetClass: 'debt' },
      { key: 'EPF_VPF', label: 'EPF / VPF', rate: 0.081, assetClass: 'debt' },
      { key: 'DEBT_FUND_SIP', label: 'Debt Fund SIP', rate: RETURNS.DEBT, assetClass: 'debt' },
    ],
  },
  {
    key: 'retirement',
    label: 'Retirement',
    instruments: [
      { key: 'NPS', label: 'NPS Contribution', rate: SIP_TYPES.find((item) => item.key === 'NPS')?.rate ?? 0.10, assetClass: 'equity' },
      { key: 'PENSION_FUND', label: 'Pension Fund Contribution', rate: 0.09, assetClass: 'debt' },
    ],
  },
  {
    key: 'market-linked',
    label: 'Market Linked',
    instruments: [
      { key: 'STOCK_SIP', label: 'Stock SIP / Monthly Equity Buy', rate: RETURNS.EQUITY, assetClass: 'equity' },
      { key: 'REIT_SIP', label: 'REIT SIP', rate: INFLATION.GENERAL + RETURNS.REAL_ESTATE_SPREAD, assetClass: 'realAssets' },
      { key: 'GOLD_SIP', label: 'Gold SIP', rate: INFLATION.GENERAL + RETURNS.GOLD_SPREAD, assetClass: 'realAssets' },
    ],
  },
  {
    key: 'cash-management',
    label: 'Cash Management',
    instruments: [
      { key: 'LIQUID_FUND_SIP', label: 'Liquid Fund Sweep', rate: RETURNS.CASH, assetClass: 'cash' },
    ],
  },
  {
    key: 'other',
    label: 'Other Monthly Investment',
    instruments: [
      { key: 'CUSTOM', label: 'Custom Instrument', rate: 0.10, assetClass: 'equity' },
    ],
  },
];

const INSTRUMENT_LOOKUP = INVESTMENT_FAMILIES
  .flatMap((family) => family.instruments.map((instrument) => ([
    instrument.key,
    { ...instrument, familyKey: family.key, familyLabel: family.label },
  ])))
  .reduce((lookup, [key, value]) => {
    lookup[key] = value;
    return lookup;
  }, {});

function goalOptions(goals) {
  const base = '<option value="">&mdash; Select Goal &mdash;</option>';
  if (!goals || goals.length === 0) return base;
  return base + goals.map((goal) => (
    `<option value="${goal.id}">${goal.name} (${goal.targetYear ?? '&ndash;'})</option>`
  )).join('');
}

function assetOptions() {
  const groups = [...new Set(ASSET_CATEGORIES.map((asset) => asset.group))];
  return '<option value="">&mdash; Select Category &mdash;</option>' + groups.map((group) => {
    const categories = ASSET_CATEGORIES.filter((asset) => asset.group === group);
    return `<optgroup label="${group}">${categories.map((asset) => (
      `<option value="${asset.key}">${asset.label}</option>`
    )).join('')}</optgroup>`;
  }).join('');
}

function familyOptions() {
  return INVESTMENT_FAMILIES.map((family) => (
    `<option value="${family.key}">${family.label}</option>`
  )).join('');
}

function instrumentOptions(familyKey) {
  const family = INVESTMENT_FAMILIES.find((item) => item.key === familyKey);
  const base = '<option value="">&mdash; Select Instrument &mdash;</option>';
  if (!family) return base;
  return base + family.instruments.map((instrument) => (
    `<option value="${instrument.key}">${instrument.label}</option>`
  )).join('');
}

function getInstrumentConfig(typeKey) {
  return INSTRUMENT_LOOKUP[typeKey] ?? null;
}

function getDefaultInstrument(familyKey) {
  return INVESTMENT_FAMILIES.find((family) => family.key === familyKey)?.instruments[0] ?? null;
}

function normalizeInvestmentMeta(sip) {
  const config = getInstrumentConfig(sip.type);
  const familyKey = sip.investmentFamily || config?.familyKey || 'mutual-funds';
  const familyLabel = sip.investmentFamilyLabel || config?.familyLabel || 'Mutual Funds';
  const typeLabel = sip.instrumentLabel || config?.label || sip.customInstrument || sip.type;
  const assetClass = sip.assetClass || config?.assetClass || 'equity';

  return { familyKey, familyLabel, typeLabel, assetClass, rate: sip.annualRate ?? config?.rate ?? 0.10 };
}

function linkLabel(sip, goals) {
  if (sip.linkType === 'goal' && sip.linkedGoalId) {
    const goal = goals.find((item) => item.id === sip.linkedGoalId);
    return goal
      ? `<span class="text-brand">${goal.name}</span>`
      : '<span class="text-slate-500">Unlinked</span>';
  }

  if (sip.linkType === 'asset' && sip.linkedAssetKey) {
    const asset = ASSET_CATEGORIES.find((item) => item.key === sip.linkedAssetKey);
    return asset
      ? `<span class="text-blue-400">${asset.label}</span>`
      : '<span class="text-slate-500">Unlinked</span>';
  }

  return '<span class="text-slate-500">Unlinked</span>';
}

function endDateDisplay(sip, goals) {
  if (sip.endDate) return sip.endDate;
  if (sip.linkType === 'goal' && sip.linkedGoalId) {
    const goal = goals.find((item) => item.id === sip.linkedGoalId);
    if (goal?.targetYear) return `${goal.targetYear}-12`;
  }
  return '&mdash;';
}

function renderTable(container, savings, goals, onEdit) {
  const tableWrap = container.querySelector('#sip-table-wrap');
  if (!tableWrap) return;

  if (!savings || savings.length === 0) {
    tableWrap.innerHTML = `<div class="text-center py-12 text-slate-500">
      <p class="text-3xl mb-2">&#x1F4B0;</p>
      <p class="text-sm">No active investments yet &mdash; click <strong class="text-slate-400">Add Investment</strong> to get started</p>
    </div>`;
    return;
  }

  tableWrap.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs text-slate-500 border-b border-white/10">
            <th class="pb-2 pr-3 font-medium">Instrument</th>
            <th class="pb-2 pr-3 font-medium">Name</th>
            <th class="pb-2 pr-3 font-medium text-right">&#8377;/mo</th>
            <th class="pb-2 pr-3 font-medium text-right">Rate</th>
            <th class="pb-2 pr-3 font-medium">Start</th>
            <th class="pb-2 pr-3 font-medium">End</th>
            <th class="pb-2 pr-3 font-medium">Linked To</th>
            <th class="pb-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          ${savings.map((sip) => {
            const meta = normalizeInvestmentMeta(sip);
            return `<tr data-sip-id="${sip.id}">
              <td class="py-2.5 pr-3">
                <div class="text-white font-medium whitespace-nowrap">${meta.typeLabel}</div>
                <div class="text-xs text-slate-500 whitespace-nowrap">${sip.investmentFamilyLabel || meta.familyLabel}</div>
              </td>
              <td class="py-2.5 pr-3 text-white font-medium">${sip.name || '&mdash;'}</td>
              <td class="py-2.5 pr-3 text-right text-emerald-400 font-semibold whitespace-nowrap">${formatRupee(sip.monthlyAmount)}</td>
              <td class="py-2.5 pr-3 text-right text-slate-300 whitespace-nowrap">${(meta.rate * 100).toFixed(1)}%</td>
              <td class="py-2.5 pr-3 text-xs text-slate-400 whitespace-nowrap">${sip.startDate || '&mdash;'}</td>
              <td class="py-2.5 pr-3 text-xs text-slate-400 whitespace-nowrap">${endDateDisplay(sip, goals)}</td>
              <td class="py-2.5 pr-3 text-xs">${linkLabel(sip, goals)}</td>
              <td class="py-2.5 text-right whitespace-nowrap">
                <button class="btn-edit-sip icon-btn text-slate-500 hover:text-brand" data-id="${sip.id}" aria-label="Edit">
                  <svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button class="btn-delete-sip icon-btn text-slate-500 hover:text-red-400" data-id="${sip.id}" aria-label="Remove">
                  <svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;

  tableWrap.querySelectorAll('.btn-delete-sip').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      const updated = savings.filter((sip) => sip.id !== id);
      savings.splice(0, savings.length, ...updated);
      renderTable(container, savings, goals, onEdit);
      updateSummary(container, savings);
    });
  });

  tableWrap.querySelectorAll('.btn-edit-sip').forEach((button) => {
    button.addEventListener('click', () => {
      const sip = savings.find((item) => item.id === button.dataset.id);
      if (sip && onEdit) onEdit(sip);
    });
  });
}

function updateSummary(container, savings) {
  const total = (savings || []).reduce((sum, entry) => sum + (entry.monthlyAmount || 0), 0);
  const summaryEl = container.querySelector('#sip-total-monthly');
  if (summaryEl) summaryEl.textContent = formatRupee(total);
}

export function mountSavingsForm(container, state, onUpdate) {
  if (!container) return;

  const savings = state.activeSavings ?? [];
  const getGoals = () => state.goals ?? [];
  const today = new Date();
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const defaultFamily = INVESTMENT_FAMILIES[0].key;
  const defaultInstrument = getDefaultInstrument(defaultFamily);
  const defaultRate = defaultInstrument?.rate ?? SIP_TYPES[0].rate;

  container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-white tracking-wide">Investments</h2>
          <p class="text-xs text-slate-500 mt-0.5">Track recurring monthly investments and link them to goals or asset categories</p>
        </div>
        <button id="btn-open-sip-modal" class="btn-primary flex items-center gap-2 text-sm">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Add Investment
        </button>
      </div>

      <div class="card bg-surface-3 flex items-center justify-between gap-4 py-3 px-5">
        <div class="flex items-center gap-2 text-slate-400 text-sm">
          <svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Total Monthly Investments
        </div>
        <div class="flex items-center gap-4">
          <p class="text-xl font-bold text-emerald-400" id="sip-total-monthly">${formatRupee(savings.reduce((sum, entry) => sum + (entry.monthlyAmount || 0), 0))}</p>
          <span id="sip-count-badge" class="text-xs text-slate-500">${savings.length} active</span>
        </div>
      </div>

      <div class="card overflow-hidden">
        <h3 class="card-title flex items-center gap-2 text-base mb-4">
          <span class="w-2.5 h-2.5 rounded-full bg-brand inline-block"></span>
          Active Investments
        </h3>
        <div id="sip-table-wrap"></div>
      </div>
    </div>

    <div id="sip-modal" class="fixed inset-0 z-50 hidden items-center justify-center p-4">
      <div id="sip-modal-backdrop" class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      <div class="relative z-10 w-full max-w-lg bg-surface-2 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 id="sip-modal-title" class="text-base font-semibold text-white flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
            Add Investment
          </h3>
          <button id="sip-modal-close" class="icon-btn text-slate-400 hover:text-white" aria-label="Close">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="px-6 py-5 overflow-y-auto max-h-[calc(100vh-12rem)]">
          <form id="sip-add-form" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="form-group">
                <label for="sip-family" class="form-label">Investment Family</label>
                <select id="sip-family" class="form-input">${familyOptions()}</select>
              </div>
              <div class="form-group">
                <label for="sip-instrument" class="form-label">Instrument</label>
                <select id="sip-instrument" class="form-input">${instrumentOptions(defaultFamily)}</select>
              </div>
            </div>

            <div id="sip-custom-family-wrap" class="form-group hidden">
              <label for="sip-custom-family" class="form-label">Custom Category</label>
              <input id="sip-custom-family" type="text" class="form-input" maxlength="40" placeholder="e.g. Chit Fund" />
            </div>

            <div id="sip-custom-instrument-wrap" class="form-group hidden">
              <label for="sip-custom-instrument" class="form-label">Custom Instrument</label>
              <input id="sip-custom-instrument" type="text" class="form-input" maxlength="60" placeholder="e.g. Family Co-op Monthly Plan" />
            </div>

            <div class="form-group">
              <label for="sip-name" class="form-label">Name / Description</label>
              <input id="sip-name" type="text" class="form-input" required maxlength="60" placeholder="e.g. Long-term Wealth SIP" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="form-group">
                <label for="sip-amount" class="form-label">Monthly Amount</label>
                <div class="form-input-prefix-group">
                  <span class="form-input-prefix">&#8377;</span>
                  <input id="sip-amount" type="text" inputmode="numeric" class="form-input" placeholder="5,000" />
                </div>
              </div>
              <div class="form-group">
                <label for="sip-rate" class="form-label">Rate <span class="text-slate-500 text-xs">(% p.a.)</span></label>
                <input id="sip-rate" type="number" class="form-input" min="0" max="50" step="0.1" value="${(defaultRate * 100).toFixed(1)}" />
                <p id="sip-rate-hint" class="form-hint">Default: ${(defaultRate * 100).toFixed(1)}% for ${defaultInstrument?.label ?? 'this instrument'}</p>
              </div>
            </div>

            <div class="form-group">
              <label for="sip-link-type" class="form-label">Link To</label>
              <select id="sip-link-type" class="form-input">
                <option value="">Unlinked (General Wealth)</option>
                <option value="goal">Life Goal</option>
                <option value="asset">Asset Category</option>
              </select>
            </div>

            <div id="sip-goal-wrap" class="form-group hidden">
              <label for="sip-goal" class="form-label">Select Goal</label>
              <select id="sip-goal" class="form-input">${goalOptions(getGoals())}</select>
              <p id="sip-end-hint" class="form-hint">End date will default to the linked goal's target year</p>
            </div>

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

            <div class="flex justify-end gap-3 pt-2">
              <button type="button" id="sip-form-cancel" class="btn-secondary text-sm">Cancel</button>
              <button type="submit" id="sip-form-submit" class="btn-primary flex items-center gap-2 text-sm">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                Add Investment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  const modal = container.querySelector('#sip-modal');
  const modalTitle = container.querySelector('#sip-modal-title');
  const submitBtn = container.querySelector('#sip-form-submit');
  const form = container.querySelector('#sip-add-form');
  const familySel = container.querySelector('#sip-family');
  const instrumentSel = container.querySelector('#sip-instrument');
  const customFamilyWrap = container.querySelector('#sip-custom-family-wrap');
  const customFamilyEl = container.querySelector('#sip-custom-family');
  const customInstrumentWrap = container.querySelector('#sip-custom-instrument-wrap');
  const customInstrumentEl = container.querySelector('#sip-custom-instrument');
  const nameEl = container.querySelector('#sip-name');
  const amtEl = container.querySelector('#sip-amount');
  const rateEl = container.querySelector('#sip-rate');
  const rateHint = container.querySelector('#sip-rate-hint');
  const linkTypeSel = container.querySelector('#sip-link-type');
  const goalWrap = container.querySelector('#sip-goal-wrap');
  const assetWrap = container.querySelector('#sip-asset-wrap');
  const goalSel = container.querySelector('#sip-goal');
  const assetSel = container.querySelector('#sip-asset');
  const endHint = container.querySelector('#sip-end-hint');
  const startEl = container.querySelector('#sip-start');
  const endEl = container.querySelector('#sip-end');

  let editingId = null;

  function refreshRateHint(config) {
    if (!rateHint) return;
    if (!config) {
      rateHint.textContent = 'Set a return rate for this instrument';
      return;
    }
    rateHint.textContent = `Default: ${(config.rate * 100).toFixed(1)}% for ${config.label}`;
  }

  function refreshGoalHint() {
    if (!endHint) return;
    const goal = getGoals().find((item) => item.id === goalSel.value);
    endHint.textContent = goal?.targetYear
      ? `End date defaults to ${goal.targetYear}-12`
      : 'End date will default to the linked goal\'s target year';
  }

  function populateGoalOptions(selectedGoalId = '') {
    const goals = getGoals();
    goalSel.innerHTML = goalOptions(goals);
    if (selectedGoalId && goals.some((goal) => goal.id === selectedGoalId)) {
      goalSel.value = selectedGoalId;
    } else {
      goalSel.value = '';
    }
    refreshGoalHint();
  }

  function syncRateWithInstrument() {
    const config = getInstrumentConfig(instrumentSel.value);
    if (!config) return;
    rateEl.value = (config.rate * 100).toFixed(1);
    refreshRateHint(config);
  }

  function toggleCustomInputs() {
    const isOtherFamily = familySel.value === 'other';
    const isCustomInstrument = instrumentSel.value === 'CUSTOM' || isOtherFamily;
    customFamilyWrap.classList.toggle('hidden', !isOtherFamily);
    customInstrumentWrap.classList.toggle('hidden', !isCustomInstrument);
  }

  function populateInstrumentOptions(familyKey, selectedInstrument = '') {
    instrumentSel.innerHTML = instrumentOptions(familyKey);
    const defaultSelection = getDefaultInstrument(familyKey)?.key ?? '';
    const selectedConfig = getInstrumentConfig(selectedInstrument);

    if (selectedInstrument && selectedConfig?.familyKey === familyKey) {
      instrumentSel.value = selectedInstrument;
    } else {
      instrumentSel.value = defaultSelection;
    }

    toggleCustomInputs();
    syncRateWithInstrument();
  }

  function toggleLinkInputs() {
    const selectedLink = linkTypeSel.value;
    goalWrap.classList.toggle('hidden', selectedLink !== 'goal');
    assetWrap.classList.toggle('hidden', selectedLink !== 'asset');
    if (selectedLink === 'goal') populateGoalOptions(goalSel.value);
  }

  function openModal() {
    populateGoalOptions(goalSel.value);
    if (!familySel.value) familySel.value = defaultFamily;
    if (!instrumentSel.value || getInstrumentConfig(instrumentSel.value)?.familyKey !== familySel.value) {
      populateInstrumentOptions(familySel.value);
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
  }

  function exitEditMode() {
    editingId = null;
    modalTitle.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span> Add Investment';
    submitBtn.innerHTML = '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> Add Investment';
    form.reset();
    amtEl.value = '';
    familySel.value = defaultFamily;
    populateInstrumentOptions(defaultFamily, defaultInstrument?.key ?? '');
    populateGoalOptions();
    linkTypeSel.value = '';
    goalWrap.classList.add('hidden');
    assetWrap.classList.add('hidden');
    customFamilyEl.value = '';
    customInstrumentEl.value = '';
    startEl.value = thisMonth;
    endEl.value = '';
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
    exitEditMode();
  }

  function enterEditMode(sip) {
    const meta = normalizeInvestmentMeta(sip);

    editingId = sip.id;
    modalTitle.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-brand inline-block"></span> Edit Investment';
    submitBtn.innerHTML = '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Update Investment';

    familySel.value = sip.investmentFamily || meta.familyKey;
    populateInstrumentOptions(familySel.value, sip.type);
    customFamilyEl.value = sip.customFamily || '';
    customInstrumentEl.value = sip.customInstrument || '';
    nameEl.value = sip.name || '';
    amtEl.value = indianFormat(sip.monthlyAmount);
    rateEl.value = ((sip.annualRate ?? meta.rate) * 100).toFixed(1);
    refreshRateHint(getInstrumentConfig(instrumentSel.value) ?? meta);
    linkTypeSel.value = sip.linkType || '';
    toggleLinkInputs();
    if (sip.linkType === 'goal') populateGoalOptions(sip.linkedGoalId || '');
    if (sip.linkType === 'asset') assetSel.value = sip.linkedAssetKey || '';
    startEl.value = sip.startDate || thisMonth;
    endEl.value = sip.endDate || '';
    openModal();
  }

  renderTable(container, savings, getGoals(), enterEditMode);
  populateInstrumentOptions(defaultFamily, defaultInstrument?.key ?? '');
  populateGoalOptions();

  container.querySelector('#btn-open-sip-modal').addEventListener('click', openModal);
  container.querySelector('#sip-modal-close').addEventListener('click', closeModal);
  container.querySelector('#sip-form-cancel').addEventListener('click', closeModal);
  container.querySelector('#sip-modal-backdrop').addEventListener('click', closeModal);

  amtEl.addEventListener('focus', () => {
    const value = parseIndian(amtEl.value);
    amtEl.value = value || '';
  });
  amtEl.addEventListener('blur', () => {
    const value = parseIndian(amtEl.value);
    amtEl.value = indianFormat(value);
  });

  familySel.addEventListener('change', () => {
    populateInstrumentOptions(familySel.value);
  });
  instrumentSel.addEventListener('change', () => {
    toggleCustomInputs();
    syncRateWithInstrument();
  });
  linkTypeSel.addEventListener('change', toggleLinkInputs);
  goalSel.addEventListener('change', refreshGoalHint);

  [startEl, endEl].forEach((input) => {
    input.addEventListener('click', () => {
      try { input.showPicker(); } catch (_) {}
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const config = getInstrumentConfig(instrumentSel.value);
    if (!config) return;

    const isCustom = instrumentSel.value === 'CUSTOM' || familySel.value === 'other';
    const customFamily = customFamilyEl.value.trim();
    const customInstrument = customInstrumentEl.value.trim();
    const instrumentLabel = isCustom ? (customInstrument || 'Custom Instrument') : config.label;
    const familyLabel = familySel.value === 'other'
      ? (customFamily || 'Other Monthly Investment')
      : (INVESTMENT_FAMILIES.find((family) => family.key === familySel.value)?.label ?? config.familyLabel);

    const name = nameEl.value.trim();
    const monthlyAmount = parseIndian(amtEl.value);
    const rateInput = parseFloat(rateEl.value);
    const annualRate = Number.isFinite(rateInput) && rateInput > 0 ? rateInput / 100 : config.rate;
    const linkType = linkTypeSel.value || null;
    const linkedGoalId = linkType === 'goal' ? (goalSel.value || null) : null;
    const linkedAssetKey = linkType === 'asset' ? (assetSel.value || null) : null;
    const startDate = startEl.value;
    const endDate = endEl.value || '';

    if (!name || !monthlyAmount) return;
    if (isCustom && !customInstrument) return;

    const payload = {
      type: instrumentSel.value,
      investmentFamily: familySel.value,
      investmentFamilyLabel: familyLabel,
      instrumentLabel,
      customFamily: familySel.value === 'other' ? customFamily : '',
      customInstrument: isCustom ? customInstrument : '',
      assetClass: config.assetClass,
      name,
      monthlyAmount,
      annualRate,
      linkType,
      linkedGoalId,
      linkedAssetKey,
      startDate,
      endDate,
    };

    if (editingId) {
      const index = savings.findIndex((sip) => sip.id === editingId);
      if (index !== -1) savings[index] = { ...savings[index], ...payload };
    } else {
      savings.push({ id: crypto.randomUUID(), ...payload });
    }

    onUpdate('activeSavings', [...savings]);
    renderTable(container, savings, getGoals(), enterEditMode);
    updateSummary(container, savings);
    const badge = container.querySelector('#sip-count-badge');
    if (badge) badge.textContent = `${savings.length} active`;
    closeModal();
  });

  container.addEventListener('click', (event) => {
    if (event.target.closest('.btn-delete-sip')) {
      setTimeout(() => {
        onUpdate('activeSavings', [...savings]);
        const badge = container.querySelector('#sip-count-badge');
        if (badge) badge.textContent = `${savings.length} active`;
      }, 0);
    }
  });
}