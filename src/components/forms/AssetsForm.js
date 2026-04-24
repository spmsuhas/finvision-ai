/**
 * FinVision AI — Assets & Portfolio Input Form (ALM Edition)
 * Four asset groups: Debt · Equity · Real Assets · Cash & Alternatives
 * Derives all corpus fields and allocation percentages for the ALM engine.
 */
import { almBlendedReturn, INFLATION } from '@/utils/constants.js';
import { formatRupee } from '@/utils/formatters.js';

/* ── ALM group definitions ──────────────────────────────────── */
const GROUPS = [
  {
    id: 'debt',
    label: 'Debt (Fixed Income)',
    color: 'bg-blue-400',
    colorText: 'text-blue-400',
    hint: 'Low-risk, fixed-income instruments',
    cagrNote: '7% p.a.',
    items: [
      { key: 'savingsBank',      label: 'Savings Bank Account',          info: 'Regular savings accounts in any scheduled bank. Typically earns 2.5–4% p.a. Highly liquid.' },
      { key: 'fixedDeposit',     label: 'Bank Fixed Deposits',           info: 'Term deposits with banks. Lock-in varies from 7 days to 10 years. Earns 5–7.5% p.a. Tax-saver FD has 5-yr lock-in under Sec 80C.' },
      { key: 'recurringDeposit', label: 'Recurring Deposits',            info: 'Monthly fixed instalment deposits with banks/post office. Good for disciplined saving. Interest similar to FDs.' },
      { key: 'ppf',              label: 'PPF (Public Provident Fund)',    info: 'Government-backed 15-year scheme with EEE tax status. Current rate ~7.1% p.a. Max ₹1.5L/year. Best long-term debt instrument.' },
      { key: 'epf',              label: 'EPF / VPF',                     info: 'Employee Provident Fund (12% of basic) + Voluntary PF. Earns ~8.25% p.a. EEE tax status. VPF allows extra contribution up to 100% of basic.' },
      { key: 'nscKvp',           label: 'NSC / KVP',                     info: 'National Savings Certificate (5-yr, ~7.7%) and Kisan Vikas Patra (doubles in ~115 months). Post office small savings instruments.' },
      { key: 'scss',             label: 'SCSS / POMIS',                   info: 'Senior Citizens Savings Scheme (~8.2%, 5-yr, age 60+) and Post Office Monthly Income Scheme (~7.4%). Regular income instruments.' },
      { key: 'debtMutualFunds',  label: 'Debt Mutual Funds',             info: 'SEBI-classified debt MF schemes — liquid, overnight, short/medium/long duration, gilt, corporate bond, etc. Taxed as per slab since Apr 2023.' },
      { key: 'govtBonds',        label: 'Govt Bonds / RBI Bonds / SGBs', info: 'Sovereign Gold Bonds, RBI Floating Rate Bonds (7.15%), State Development Loans. Government-backed, virtually zero credit risk.' },
      { key: 'companyFD',        label: 'Corporate / Company FDs',       info: 'Fixed deposits with NBFCs or corporates. Higher returns (7–9%) but carry credit risk. Not covered by DICGC insurance.' },
      { key: 'npsDebt',          label: 'NPS — Debt Allocation',          info: 'National Pension System Tier-I debt component (Corporate bonds + Govt securities). Extra ₹50K deduction under Sec 80CCD(1B).' },
      { key: 'otherDebt',        label: 'Other Debt',                     info: 'Any other fixed-income holdings: money-back policies, endowment plans, bonds, debentures, etc.', hasRemarks: true },
    ],
  },
  {
    id: 'equity',
    label: 'Equity (Growth)',
    color: 'bg-brand',
    colorText: 'text-brand',
    hint: 'Market-linked, higher-growth instruments',
    cagrNote: '13% p.a.',
    items: [
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
    ],
  },
  {
    id: 'realAssets',
    label: 'Real Assets (Inflation Hedge)',
    color: 'bg-amber-400',
    colorText: 'text-amber-400',
    hint: 'Inflation-linked returns — grows with price levels',
    cagrNote: 'Inflation + spread',
    items: [
      { key: 'gold',       label: 'Gold (SGBs / ETF / Physical)', info: 'Sovereign Gold Bonds (2.5% annual interest + gold price), Gold ETFs, Digital Gold, physical jewellery. Returns = inflation + 1.5% (SGB yield).' },
      { key: 'realEstate', label: 'Real Estate (REITs / Property)',  info: 'REITs, InvITs, rental property current market value, land holdings. Returns = inflation + 3% (rental yield approximation). Exclude primary residence.' },
    ],
  },
  {
    id: 'cash',
    label: 'Cash & Alternatives',
    color: 'bg-slate-400',
    colorText: 'text-slate-400',
    hint: 'Liquidity buffer and non-standard investments',
    cagrNote: '4% / Equity-like',
    items: [
      { key: 'liquidFunds',   label: 'Cash & Liquid Funds',        info: 'Savings accounts, liquid MFs, overnight funds, money market funds. Emergency buffer. Returns ~4% p.a. — loses real value to inflation.' },
      { key: 'alternatives',  label: 'Alternative Investments',    info: 'SEBI Category I/II/III AIFs, unlisted equity, venture capital, pre-IPO funds, crypto. High risk / high reward, modelled at equity return (13%).' },
    ],
  },
];

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
function esc(s) { return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

export function mountAssetsForm(container, state, onUpdate) {
  // Local mutable copy of allocation
  const aa = {};
  for (const g of GROUPS) {
    aa[g.id] = { ...(state.assetAllocation?.[g.id] || {}) };
    for (const it of g.items) {
      if (aa[g.id][it.key] === undefined) aa[g.id][it.key] = 0;
    }
  }

  /* ── helpers ──────────────────────────────────────────────── */
  function sumGroup(gid) {
    return GROUPS.find(g => g.id === gid).items
      .reduce((s, it) => s + (aa[gid]?.[it.key] || 0), 0);
  }

  function deriveAndNotify() {
    const totalDebt       = sumGroup('debt');
    const totalEquity     = sumGroup('equity');
    const totalRealAssets = sumGroup('realAssets');
    const totalCash       = sumGroup('cash');
    const total           = totalDebt + totalEquity + totalRealAssets + totalCash;

    // Derive per-item corpus values — EPF key is `aa.debt.epf` (original key)
    const epfLike  = aa.debt?.epf || 0;
    const debtRest = Math.max(0, totalDebt - epfLike);

    const goldVal   = aa.realAssets?.gold        || 0;
    const reVal     = aa.realAssets?.realEstate   || 0;
    const cashVal   = aa.cash?.liquidFunds        || 0;
    const altsVal   = aa.cash?.alternatives       || 0;

    onUpdate('assetAllocation',      { ...aa });
    onUpdate('equityPercent',        total > 0 ? Math.round((totalEquity     / total) * 100) : 0);
    onUpdate('debtPercent',          total > 0 ? Math.round((totalDebt       / total) * 100) : 0);
    onUpdate('realAssetsPercent',    total > 0 ? Math.round((totalRealAssets / total) * 100) : 0);
    onUpdate('cashPercent',          total > 0 ? Math.round((totalCash       / total) * 100) : 0);
    onUpdate('currentEquity',        totalEquity);
    onUpdate('currentDebt',          debtRest);
    onUpdate('currentEPF',           epfLike);
    onUpdate('currentGold',          goldVal);
    onUpdate('currentRealEstate',    reVal);
    onUpdate('currentCash',          cashVal);
    onUpdate('currentAlternatives',  altsVal);
  }

  function updateSummary() {
    const totals = { debt: sumGroup('debt'), equity: sumGroup('equity'), realAssets: sumGroup('realAssets'), cash: sumGroup('cash') };
    const total  = Object.values(totals).reduce((s, v) => s + v, 0);
    const ir     = INFLATION.GENERAL;

    const blended = total > 0
      ? almBlendedReturn({
          equity:     totals.equity     / total,
          debt:       totals.debt       / total,
          gold:       (aa.realAssets?.gold || 0) / total,
          realEstate: (aa.realAssets?.realEstate || 0) / total,
          cash:       (aa.cash?.liquidFunds || 0) / total,
          alts:       (aa.cash?.alternatives || 0) / total,
        }, ir)
      : 0;

    const q = id => container.querySelector(id);
    for (const g of GROUPS) {
      const badge = q(`#badge-${g.id}`);
      const sumEl = q(`#sum-${g.id}-total`);
      const pctEl = q(`#sum-${g.id}-pct`);
      const pct   = total > 0 ? ((totals[g.id] / total) * 100).toFixed(1) : '0.0';
      if (badge) badge.textContent = formatRupee(totals[g.id]);
      if (sumEl) sumEl.textContent = formatRupee(totals[g.id]);
      if (pctEl) pctEl.textContent = `${pct}%`;
    }
    if (q('#sum-portfolio'))  q('#sum-portfolio').textContent  = formatRupee(total);
    if (q('#sum-blended'))    q('#sum-blended').textContent    = `${(blended * 100).toFixed(1)}%`;
  }

  function buildRows(gid) {
    const g = GROUPS.find(x => x.id === gid);
    return g.items.map(it => `
      <div class="py-2 border-b border-white/5 last:border-0" data-asset-key="${gid}.${it.key}">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="asset-info-wrap" aria-label="Info: ${it.label}">
              <svg class="asset-info-icon" fill="none" viewBox="0 0 20 20" stroke="currentColor" stroke-width="1.8">
                <circle cx="10" cy="10" r="8.5"/>
                <path d="M10 9v4M10 7h.01" stroke-linecap="round"/>
              </svg>
              <span class="asset-info-bubble">${esc(it.info || '')}</span>
            </span>
            <label class="text-[13px] text-slate-300 leading-snug" for="inp-${gid}-${it.key}">${it.label}</label>
          </div>
          <div class="flex flex-col items-end gap-0.5">
            <div class="form-input-prefix-group w-36 flex-shrink-0">
              <span class="form-input-prefix text-xs">₹</span>
              <input id="inp-${gid}-${it.key}" type="text" inputmode="numeric"
                class="form-input text-sm py-1" value="${indianFormat(aa[gid][it.key])}"
                data-group="${gid}" data-key="${it.key}" placeholder="0" />
            </div>
            <span class="asset-sip-badge hidden text-xs text-emerald-400 font-medium pr-1" data-sip-key="${gid}.${it.key}"></span>
          </div>
        </div>
        ${it.hasRemarks ? `
        <input type="text" maxlength="60" placeholder="Remarks (optional)"
          class="form-input text-xs py-1 ml-0 mt-1 text-slate-400"
          value="${esc(aa[gid]?.[it.key + 'Remarks'] || '')}"
          data-group="${gid}" data-remark="${it.key}Remarks" />
        ` : ''}
      </div>
    `).join('');
  }

  /* ── initial totals ──────────────────────────────────────── */
  const initTotals = { debt: sumGroup('debt'), equity: sumGroup('equity'), realAssets: sumGroup('realAssets'), cash: sumGroup('cash') };
  const initTotal  = Object.values(initTotals).reduce((s, v) => s + v, 0);
  const initBlend  = initTotal > 0
    ? almBlendedReturn({
        equity:     initTotals.equity     / initTotal,
        debt:       initTotals.debt       / initTotal,
        gold:       (aa.realAssets?.gold || 0) / initTotal,
        realEstate: (aa.realAssets?.realEstate || 0) / initTotal,
        cash:       (aa.cash?.liquidFunds || 0) / initTotal,
        alts:       (aa.cash?.alternatives || 0) / initTotal,
      }, INFLATION.GENERAL)
    : 0;

  /* ── render ──────────────────────────────────────────────── */
  container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-5">

      <div class="text-center mb-2">
        <h2 class="text-lg font-bold text-white tracking-wide">Net Worth Statement</h2>
        <p class="text-xs text-slate-500 mt-0.5">Enter current market value of each holding in ₹ — all four groups</p>
      </div>

      <!-- ── 2×2 group grid ──────────────────────────────────── -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

        ${GROUPS.map(g => `
        <div class="card">
          <div class="flex items-center justify-between mb-1">
            <h2 class="card-title flex items-center gap-2 text-base">
              <span class="w-2.5 h-2.5 rounded-full ${g.color} inline-block"></span>
              ${g.label}
            </h2>
            <span id="badge-${g.id}" class="text-sm font-semibold ${g.colorText}">${formatRupee(initTotals[g.id])}</span>
          </div>
          <p class="text-[11px] text-slate-500 mb-1">${g.hint} &nbsp;·&nbsp; <span class="${g.colorText}">${g.cagrNote}</span></p>
          <div id="rows-${g.id}">${buildRows(g.id)}</div>
        </div>
        `).join('')}

      </div>

      <!-- ── Share Assets Toggle (shown when a partner is linked) ── -->
      <div id="share-assets-wrap" class="${state.partnerData ? '' : 'hidden'} card bg-surface-3 max-w-2xl mx-auto">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold text-white">Include in Household View</p>
            <p class="text-xs text-slate-400 mt-0.5">When enabled, your asset balances are combined with your partner's in the Household view</p>
          </div>
          <div class="vis-toggle shrink-0" id="share-assets-toggle">
            <button type="button" class="vis-btn ${state.shareAssets !== false ? 'active' : ''}" data-vis="shared">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
              Share
            </button>
            <button type="button" class="vis-btn ${state.shareAssets === false ? 'active' : ''}" data-vis="private">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              Keep Private
            </button>
          </div>
        </div>
      </div>

      <!-- ── Portfolio Summary ────────────────────────────────── -->
      <div class="card bg-surface-3 max-w-2xl mx-auto">
        <h2 class="card-title mb-3 text-center text-base">Portfolio Summary</h2>
        <div class="space-y-1.5">
          ${GROUPS.map(g => `
          <div class="flex justify-between text-sm">
            <span class="text-slate-400 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full ${g.color} inline-block"></span>${g.label.split('(')[0].trim()}
            </span>
            <span id="sum-${g.id}-total" class="font-medium ${g.colorText}">${formatRupee(initTotals[g.id])}</span>
          </div>`).join('')}
          <div class="border-t border-white/10 pt-2 flex justify-between text-sm">
            <span class="text-slate-300 font-medium">Total Portfolio</span>
            <span id="sum-portfolio" class="font-bold text-white">${formatRupee(initTotal)}</span>
          </div>
        </div>
        <div class="grid grid-cols-5 gap-2 mt-3">
          ${GROUPS.map(g => {
            const pct = initTotal > 0 ? ((initTotals[g.id] / initTotal) * 100).toFixed(1) : '0.0';
            return `
            <div class="bg-surface-2 rounded-lg p-2 text-center">
              <p class="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">${g.label.split(' ')[0]}</p>
              <p id="sum-${g.id}-pct" class="text-xs font-bold ${g.colorText}">${pct}%</p>
            </div>`;
          }).join('')}
          <div class="bg-surface-2 rounded-lg p-2 text-center">
            <p class="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Blended CAGR</p>
            <p id="sum-blended" class="text-xs font-bold text-emerald-400">${(initBlend * 100).toFixed(1)}%</p>
          </div>
        </div>
      </div>

    </div>
  `;

  /* ── delegated input events ─────────────────────────────── */
  // Share assets visibility toggle
  container.querySelector('#share-assets-toggle')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.vis-btn[data-vis]');
    if (!btn) return;
    const share = btn.dataset.vis === 'shared';
    container.querySelector('#share-assets-toggle')?.querySelectorAll('.vis-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.vis === btn.dataset.vis),
    );
    onUpdate('shareAssets', share);
  });

  container.addEventListener('input', (e) => {
    const { group, key, remark } = e.target.dataset;

    // Remarks field
    if (group && remark) {
      aa[group] = aa[group] || {};
      aa[group][remark] = e.target.value;
      onUpdate('assetAllocation', { ...aa });
      return;
    }

    // Amount field
    if (!group || !key) return;
    const raw = e.target.value.replace(/[^\d]/g, '');
    aa[group] = aa[group] || {};
    aa[group][key] = parseInt(raw, 10) || 0;

    const badge = container.querySelector(`#badge-${group}`);
    if (badge) badge.textContent = formatRupee(sumGroup(group));

    updateSummary();
    deriveAndNotify();
  });

  // Indian comma focus/blur
  container.addEventListener('focus', (e) => {
    const { group, key } = e.target.dataset;
    if (group && key) e.target.value = aa[group]?.[key] || '';
  }, true);
  container.addEventListener('blur', (e) => {
    const { group, key } = e.target.dataset;
    if (group && key) e.target.value = indianFormat(aa[group]?.[key] || 0);
  }, true);
}

/**
 * Update the per-row SIP contribution badges in the Assets form after recalculation.
 * Call this from updateAllUI() whenever historicalSIPByAsset changes.
 *
 * @param {HTMLElement} container - The form-assets container element
 * @param {{ byAssetKey: Object }} historicalSIPByAsset
 */
export function updateAssetSIPBadges(container, historicalSIPByAsset) {
  if (!container || !historicalSIPByAsset) return;
  const { byAssetKey = {} } = historicalSIPByAsset;

  // Clear all existing badges first
  container.querySelectorAll('.asset-sip-badge').forEach(el => {
    el.textContent = '';
    el.classList.add('hidden');
  });

  // Set badges for asset keys that have SIP contributions
  for (const [key, value] of Object.entries(byAssetKey)) {
    if (!value || value <= 0) continue;
    const badge = container.querySelector(`[data-sip-key="${key}"]`);
    if (badge) {
      // Format value
      const formatted = value >= 1e7
        ? `+${(value / 1e7).toFixed(2)} Cr from SIPs`
        : value >= 1e5
          ? `+${(value / 1e5).toFixed(2)} L from SIPs`
          : `+₹${Math.round(value).toLocaleString('en-IN')} from SIPs`;
      badge.textContent = formatted;
      badge.classList.remove('hidden');
    }
  }
}
