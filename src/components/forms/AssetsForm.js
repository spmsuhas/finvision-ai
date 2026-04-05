/**
 * FinVision AI — Assets & Portfolio Input Form
 * Detailed Indian financial asset classification with ₹ amounts.
 * Derives equityPercent / debtPercent / currentEquity / currentDebt / currentEPF
 * automatically so financeEngine.js needs zero changes.
 */
import { blendedReturn } from '@/utils/constants.js';
import { formatRupee } from '@/utils/formatters.js';

/* ── asset sub-category definitions ────────────────────────── */
const DEBT_ITEMS = [
  { key: 'savingsBank',    label: 'Savings Bank' },
  { key: 'fixedDeposit',   label: 'Fixed Deposit' },
  { key: 'postOffice',     label: 'Post Office Savings (NSC, PPF etc.)' },
  { key: 'companyFD',      label: 'Company FDs' },
  { key: 'epf',            label: 'EPF (Employee Provident Fund)' },
  { key: 'superannuation', label: 'Superannuation' },
  { key: 'otherDebt',      label: 'Other Debt', hasRemarks: true },
];

const EQUITY_ITEMS = [
  { key: 'directEquity', label: 'Direct Equity (in DMAT)' },
  { key: 'pms',          label: 'Portfolio Management Services (PMS)' },
  { key: 'mutualFunds',  label: 'Mutual Funds' },
  { key: 'gratuity',     label: 'Gratuity' },
  { key: 'otherEquity',  label: 'Other Equity', hasRemarks: true },
];

export function mountAssetsForm(container, state, onUpdate) {
  const aa = state.assetAllocation || { debt: {}, equity: {} };

  /* ── helpers ─────────────────────────────────────────────── */
  function val(group, key) { return aa[group]?.[key] || 0; }
  function remarks(group, key) { return aa[group]?.[key + 'Remarks'] || ''; }

  function sumGroup(items, group) {
    return items.reduce((s, it) => s + (aa[group]?.[it.key] || 0), 0);
  }

  function deriveAndNotify() {
    const totalDebt   = sumGroup(DEBT_ITEMS, 'debt');
    const totalEquity = sumGroup(EQUITY_ITEMS, 'equity');
    const total       = totalDebt + totalEquity;
    const eqPct       = total > 0 ? Math.round((totalEquity / total) * 100) : 0;
    const dtPct       = 100 - eqPct;
    const epfVal      = aa.debt?.epf || 0;

    // Notify all derived fields — keeps financeEngine / charts in sync
    onUpdate('assetAllocation', { ...aa });
    onUpdate('equityPercent', eqPct);
    onUpdate('debtPercent', dtPct);
    onUpdate('currentEquity', totalEquity);
    onUpdate('currentDebt', Math.max(0, totalDebt - epfVal));
    onUpdate('currentEPF', epfVal);
  }

  function updateSummary() {
    const totalDebt   = sumGroup(DEBT_ITEMS, 'debt');
    const totalEquity = sumGroup(EQUITY_ITEMS, 'equity');
    const total       = totalDebt + totalEquity;
    const eqPct       = total > 0 ? ((totalEquity / total) * 100).toFixed(1) : '0.0';
    const dtPct       = total > 0 ? ((totalDebt / total) * 100).toFixed(1) : '0.0';
    const blended     = total > 0
      ? blendedReturn(totalEquity / total)
      : 0;

    const q = id => container.querySelector(id);
    if (q('#sum-debt-total'))    q('#sum-debt-total').textContent    = formatRupee(totalDebt);
    if (q('#sum-equity-total'))  q('#sum-equity-total').textContent  = formatRupee(totalEquity);
    if (q('#sum-portfolio'))     q('#sum-portfolio').textContent     = formatRupee(total);
    if (q('#sum-equity-pct'))    q('#sum-equity-pct').textContent    = `${eqPct}%`;
    if (q('#sum-debt-pct'))      q('#sum-debt-pct').textContent      = `${dtPct}%`;
    if (q('#sum-blended'))       q('#sum-blended').textContent       = `${(blended * 100).toFixed(1)}%`;
  }

  function buildRows(items, group) {
    return items.map(it => `
      <div class="flex flex-col gap-1.5 py-2.5 border-b border-white/5 last:border-0">
        <div class="flex items-center gap-3">
          <label class="flex-1 text-sm text-slate-200" for="inp-${group}-${it.key}">${it.label}</label>
          <div class="form-input-prefix-group w-44 flex-shrink-0">
            <span class="form-input-prefix text-xs">₹</span>
            <input id="inp-${group}-${it.key}" type="number" min="0" step="1000"
              class="form-input text-sm py-1.5" value="${val(group, it.key)}"
              data-group="${group}" data-key="${it.key}" placeholder="0" />
          </div>
        </div>
        ${it.hasRemarks ? `
        <input type="text" maxlength="60" placeholder="Remarks (optional)"
          class="form-input text-xs py-1 ml-0 mt-0.5 text-slate-400"
          value="${remarks(group, it.key)}"
          data-group="${group}" data-remark="${it.key}Remarks" />
        ` : ''}
      </div>
    `).join('');
  }

  /* ── initial values ──────────────────────────────────────── */
  const initDebt   = sumGroup(DEBT_ITEMS, 'debt');
  const initEquity = sumGroup(EQUITY_ITEMS, 'equity');
  const initTotal  = initDebt + initEquity;
  const initEqPct  = initTotal > 0 ? ((initEquity / initTotal) * 100).toFixed(1) : '0.0';
  const initDtPct  = initTotal > 0 ? ((initDebt / initTotal) * 100).toFixed(1) : '0.0';
  const initBlend  = initTotal > 0 ? blendedReturn(initEquity / initTotal) : 0;

  /* ── render ──────────────────────────────────────────────── */
  container.innerHTML = `
    <div class="space-y-4">

      <!-- ── Debt Assets ─────────────────────────────────── -->
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h2 class="card-title flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block"></span>
            Debt Assets
          </h2>
          <span id="badge-debt" class="text-sm font-semibold text-blue-400">${formatRupee(initDebt)}</span>
        </div>
        <p class="text-xs text-slate-500 mb-2">Low-risk, fixed-income instruments</p>
        <div id="rows-debt">${buildRows(DEBT_ITEMS, 'debt')}</div>
      </div>

      <!-- ── Equity Assets ───────────────────────────────── -->
      <div class="card">
        <div class="flex items-center justify-between mb-3">
          <h2 class="card-title flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-brand inline-block"></span>
            Equity Assets
          </h2>
          <span id="badge-equity" class="text-sm font-semibold text-brand">${formatRupee(initEquity)}</span>
        </div>
        <p class="text-xs text-slate-500 mb-2">Market-linked, higher-growth instruments</p>
        <div id="rows-equity">${buildRows(EQUITY_ITEMS, 'equity')}</div>
      </div>

      <!-- ── Portfolio Summary ────────────────────────────── -->
      <div class="card bg-surface-3">
        <h2 class="card-title mb-3">Portfolio Summary</h2>
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">Total Debt</span>
            <span id="sum-debt-total" class="font-medium text-blue-400">${formatRupee(initDebt)}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">Total Equity</span>
            <span id="sum-equity-total" class="font-medium text-brand">${formatRupee(initEquity)}</span>
          </div>
          <div class="border-t border-white/10 pt-2 flex justify-between text-sm">
            <span class="text-slate-300 font-medium">Total Portfolio</span>
            <span id="sum-portfolio" class="font-bold text-white">${formatRupee(initTotal)}</span>
          </div>
          <div class="grid grid-cols-3 gap-3 mt-3">
            <div class="bg-surface-2 rounded-lg p-2.5 text-center">
              <p class="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Equity</p>
              <p id="sum-equity-pct" class="text-sm font-bold text-brand">${initEqPct}%</p>
            </div>
            <div class="bg-surface-2 rounded-lg p-2.5 text-center">
              <p class="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Debt</p>
              <p id="sum-debt-pct" class="text-sm font-bold text-blue-400">${initDtPct}%</p>
            </div>
            <div class="bg-surface-2 rounded-lg p-2.5 text-center">
              <p class="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Blended CAGR</p>
              <p id="sum-blended" class="text-sm font-bold text-emerald-400">${(initBlend * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  `;

  /* ── delegated events for amount inputs ─────────────────── */
  container.addEventListener('input', (e) => {
    const { group, key } = e.target.dataset;

    // Amount input
    if (group && key) {
      aa[group] = aa[group] || {};
      aa[group][key] = parseFloat(e.target.value) || 0;

      // Update group badge
      const items    = group === 'debt' ? DEBT_ITEMS : EQUITY_ITEMS;
      const badgeId  = group === 'debt' ? '#badge-debt' : '#badge-equity';
      const badgeEl  = container.querySelector(badgeId);
      if (badgeEl) badgeEl.textContent = formatRupee(sumGroup(items, group));

      updateSummary();
      deriveAndNotify();
      return;
    }

    // Remarks input
    const { remark } = e.target.dataset;
    if (e.target.dataset.group && remark) {
      const g = e.target.dataset.group;
      aa[g] = aa[g] || {};
      aa[g][remark] = e.target.value;
      onUpdate('assetAllocation', { ...aa });
    }
  });
}
