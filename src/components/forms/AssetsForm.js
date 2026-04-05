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
  { key: 'savingsBank',      label: 'Savings Bank Account',          info: 'Regular savings accounts in any scheduled bank. Typically earns 2.5–4% p.a. Highly liquid.' },
  { key: 'fixedDeposit',     label: 'Bank Fixed Deposits',           info: 'Term deposits with banks. Lock-in varies from 7 days to 10 years. Earns 5–7.5% p.a. Tax-saver FD has 5-yr lock-in under Sec 80C.' },
  { key: 'recurringDeposit', label: 'Recurring Deposits',            info: 'Monthly fixed instalment deposits with banks/post office. Good for disciplined saving. Interest similar to FDs.' },
  { key: 'ppf',              label: 'PPF (Public Provident Fund)',    info: 'Government-backed 15-year scheme with EEE tax status. Current rate ~7.1% p.a. Max ₹1.5L/year. Best long-term debt instrument.' },
  { key: 'epf',              label: 'EPF / VPF',                     info: 'Employee Provident Fund (12% of basic) + Voluntary PF. Earns ~8.25% p.a. EEE tax status. VPF allows extra contribution up to 100% of basic.' },
  { key: 'nscKvp',           label: 'NSC / KVP',                     info: 'National Savings Certificate (5-yr, ~7.7%) and Kisan Vikas Patra (doubles in ~115 months). Post office small savings instruments.' },
  { key: 'scss',             label: 'SCSS / POMIS',                   info: 'Senior Citizens Savings Scheme (~8.2%, 5-yr, age 60+) and Post Office Monthly Income Scheme (~7.4%). Regular income instruments.' },
  { key: 'debtMutualFunds',  label: 'Debt Mutual Funds',             info: 'SEBI-classified debt MF schemes — liquid, overnight, short/medium/long duration, gilt, corporate bond, etc. Taxed as per slab since Apr 2023.' },
  { key: 'govtBonds',        label: 'Govt Bonds / RBI Bonds / SGBs', info: 'Sovereign Gold Bonds, RBI Floating Rate Bonds (7.15%), State Development Loans. Government-backed, virtually zero credit risk.' },
  { key: 'companyFD',        label: 'Corporate / Company FDs',        info: 'Fixed deposits with NBFCs or corporates. Higher returns (7–9%) but carry credit risk. Not covered by DICGC insurance.' },
  { key: 'npsDebt',          label: 'NPS — Debt Allocation',          info: 'National Pension System Tier-I debt component (Corporate bonds + Govt securities). Extra ₹50K deduction under Sec 80CCD(1B).' },
  { key: 'otherDebt',        label: 'Other Debt',                     info: 'Any other fixed-income holdings: money-back policies, endowment plans, bonds, debentures, etc.', hasRemarks: true },
];

const EQUITY_ITEMS = [
  { key: 'directEquity',      label: 'Direct Equity (Demat)',               info: 'Listed shares held in your Demat account. Returns depend on stock selection. LTCG >₹1.25L taxed at 12.5% (holding >1 yr).' },
  { key: 'equityMutualFunds', label: 'Equity Mutual Funds (incl. ELSS)',    info: 'SEBI equity MF schemes — large/mid/small/multi-cap, flexi-cap, sectoral, ELSS (3-yr lock-in, Sec 80C). Most popular equity vehicle.' },
  { key: 'npsEquity',         label: 'NPS — Equity Allocation',             info: 'National Pension System Tier-I equity component (up to 75% in Active Choice). Low-cost, long-term retirement instrument.' },
  { key: 'pms',               label: 'PMS (Portfolio Mgmt Services)',       info: 'SEBI-registered portfolio management. Min investment ₹50 lakh. Professional stock-picking with customised portfolios.' },
  { key: 'aif',               label: 'AIF (Alternative Investment Funds)',   info: 'SEBI Category I/II/III funds — venture capital, PE, hedge funds. Min ₹1 crore. Sophisticated, illiquid investments.' },
  { key: 'ulipEquity',        label: 'ULIP — Equity Portion',               info: 'Unit Linked Insurance Plans\' equity component. Combines insurance + investment. 5-yr lock-in. Tax-free maturity under Sec 10(10D).' },
  { key: 'esopRsu',           label: 'ESOPs / RSUs',                        info: 'Employee Stock Options and Restricted Stock Units granted by employer. Taxed at exercise (perquisite) + sale (capital gains).' },
  { key: 'gratuity',          label: 'Gratuity',                            info: 'Statutory payment after 5+ years of service. Tax-exempt up to ₹20 lakh. Formula: Last salary × 15/26 × years of service.' },
  { key: 'superannuation',    label: 'Superannuation / Pension Funds',      info: 'Employer-sponsored pension/retirement funds. Typically invested in balanced or equity-oriented strategies.' },
  { key: 'otherEquity',       label: 'Other Equity',                        info: 'Any other equity holdings: unlisted shares, REITs, InvITs, foreign equities, crypto, etc.', hasRemarks: true },
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

  function esc(s) { return s.replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

  /** Format number with Indian comma system (e.g. 12,34,567) */
  function indianFormat(n) {
    if (!n) return '';
    const s = Math.floor(n).toString();
    if (s.length <= 3) return s;
    const last3 = s.slice(-3);
    const rest  = s.slice(0, -3);
    return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  }

  /** Parse Indian-formatted string back to number */
  function parseIndian(str) {
    return parseInt(str.replace(/,/g, ''), 10) || 0;
  }

  function buildRows(items, group) {
    return items.map(it => `
      <div class="py-2 border-b border-white/5 last:border-0">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="asset-info-wrap" aria-label="Info: ${it.label}">
              <svg class="asset-info-icon" fill="none" viewBox="0 0 20 20"
                stroke="currentColor" stroke-width="1.8">
                <circle cx="10" cy="10" r="8.5"/>
                <path d="M10 9v4M10 7h.01" stroke-linecap="round"/>
              </svg>
              <span class="asset-info-bubble">${esc(it.info || '')}</span>
            </span>
            <label class="text-[13px] text-slate-300 leading-snug" for="inp-${group}-${it.key}">${it.label}</label>
          </div>
          <div class="form-input-prefix-group w-32 flex-shrink-0">
            <span class="form-input-prefix text-xs">₹</span>
            <input id="inp-${group}-${it.key}" type="text" inputmode="numeric"
              class="form-input text-sm py-1" value="${indianFormat(val(group, it.key))}"
              data-group="${group}" data-key="${it.key}" placeholder="0" />
          </div>
        </div>
        ${it.hasRemarks ? `
        <input type="text" maxlength="60" placeholder="Remarks (optional)"
          class="form-input text-xs py-1 ml-0 mt-1 text-slate-400"
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
    <div class="max-w-5xl mx-auto space-y-5">

      <!-- ── Balance Sheet Header ────────────────────────── -->
      <div class="text-center mb-2">
        <h2 class="text-lg font-bold text-white tracking-wide">Net Worth Statement</h2>
        <p class="text-xs text-slate-500 mt-0.5">Enter current value of each holding in ₹</p>
      </div>

      <!-- ── Two-column: Debt | Equity ───────────────────── -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

        <!-- Debt Column -->
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <h2 class="card-title flex items-center gap-2 text-base">
              <span class="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block"></span>
              Debt Assets
            </h2>
            <span id="badge-debt" class="text-sm font-semibold text-blue-400">${formatRupee(initDebt)}</span>
          </div>
          <p class="text-[11px] text-slate-500 mb-2">Low-risk, fixed-income instruments</p>
          <div id="rows-debt">${buildRows(DEBT_ITEMS, 'debt')}</div>
        </div>

        <!-- Equity Column -->
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <h2 class="card-title flex items-center gap-2 text-base">
              <span class="w-2.5 h-2.5 rounded-full bg-brand inline-block"></span>
              Equity Assets
            </h2>
            <span id="badge-equity" class="text-sm font-semibold text-brand">${formatRupee(initEquity)}</span>
          </div>
          <p class="text-[11px] text-slate-500 mb-2">Market-linked, higher-growth instruments</p>
          <div id="rows-equity">${buildRows(EQUITY_ITEMS, 'equity')}</div>
        </div>

      </div>

      <!-- ── Portfolio Summary (centered footer) ─────────── -->
      <div class="card bg-surface-3 max-w-2xl mx-auto">
        <h2 class="card-title mb-3 text-center text-base">Portfolio Summary</h2>
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
      // Strip non-digits, parse, store
      const raw = e.target.value.replace(/[^\d]/g, '');
      const num = parseInt(raw, 10) || 0;
      aa[group] = aa[group] || {};
      aa[group][key] = num;

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

  // Format with Indian commas on blur, show raw number on focus
  container.addEventListener('focus', (e) => {
    const { group, key } = e.target.dataset;
    if (group && key) {
      const num = aa[group]?.[key] || 0;
      e.target.value = num || '';
    }
  }, true);
  container.addEventListener('blur', (e) => {
    const { group, key } = e.target.dataset;
    if (group && key) {
      const num = aa[group]?.[key] || 0;
      e.target.value = indianFormat(num);
    }
  }, true);

}
