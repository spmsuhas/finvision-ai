/**
 * FinVision AI — Projection Data Table (Phase 3)
 * ============================================================
 * Renders the year-by-year corpus projection as a paginated
 * sortable HTML table in the #projection-table-wrapper element.
 */

import { formatRupee, formatCompact } from '@/utils/formatters.js';

const PAGE_SIZE = 20;

let _currentPage = 1;
let _allRows     = [];
let _filteredRows = [];

/**
 * Render the full projection table with pagination.
 * @param {import('@/utils/financeEngine.js').YearlyRow[]} rows
 */
export function renderProjectionTable(rows) {
  // Phase 3 — full implementation
  _allRows      = rows;
  _filteredRows = rows;
  _currentPage  = 1;
  _renderPage(_currentPage);
  _updatePagination();
}

/**
 * Filter table rows by age or year (from search input).
 * @param {string} query
 */
export function filterProjectionTable(query) {
  const q = query.trim().toLowerCase();
  _filteredRows = q
    ? _allRows.filter(r =>
        String(r.age).includes(q) ||
        String(r.calendarYear).includes(q)
      )
    : _allRows;
  _currentPage = 1;
  _renderPage(_currentPage);
  _updatePagination();
}

export function nextPage() {
  const maxPage = Math.ceil(_filteredRows.length / PAGE_SIZE);
  if (_currentPage < maxPage) { _currentPage++; _renderPage(_currentPage); _updatePagination(); }
}

export function prevPage() {
  if (_currentPage > 1) { _currentPage--; _renderPage(_currentPage); _updatePagination(); }
}

function _renderPage(page) {
  const wrapper = document.getElementById('projection-table-wrapper');
  if (!wrapper) return;

  const start = (page - 1) * PAGE_SIZE;
  const slice = _filteredRows.slice(start, start + PAGE_SIZE);

  if (slice.length === 0) {
    wrapper.innerHTML = '<div class="text-center py-8 text-slate-500 text-sm">No data to display. Enter your financial details to generate projections.</div>';
    return;
  }

  const rowsHTML = slice.map((r, idx) => {
    const isNegative  = r.closingBalance < 0;
    const isGoalYear  = r.goalOutlays > 0;
    const rowClass = isNegative
      ? 'bg-red-900/20 text-red-300'
      : isGoalYear
        ? 'bg-amber-900/15'
        : '';

    // Retired marker
    const ageCell = r.annualIncome === 0
      ? `${r.age} <span class="text-xs text-blue-400 font-medium">R</span>`
      : String(r.age);

    const surplus = r.netSurplus ?? 0;
    const surplusClass = surplus < 0 ? 'text-red-400' : 'text-emerald-400';
    const rowDataIdx = start + idx;

    return `<tr data-row-idx="${rowDataIdx}" class="border-t border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${rowClass}" title="Click for detailed breakdown">
      <td class="px-3 py-2 text-xs text-slate-400">${r.calendarYear}</td>
      <td class="px-3 py-2 text-xs font-medium">${ageCell}</td>
      <td class="px-3 py-2 text-xs text-right">${formatCompact(r.annualIncome)}</td>
      <td class="px-3 py-2 text-xs text-right text-red-300">${formatCompact(r.lifestyleExpenses)}</td>
      <td class="px-3 py-2 text-xs text-right text-amber-300">${formatCompact(r.medicalExpenses)}</td>
      <td class="px-3 py-2 text-xs text-right ${isGoalYear ? 'text-yellow-300 font-semibold' : 'text-slate-500'}">${r.goalOutlays > 0 ? formatCompact(r.goalOutlays) : '—'}</td>
      <td class="px-3 py-2 text-xs text-right text-slate-400">${formatCompact(r.totalExpenses)}</td>
      <td class="px-3 py-2 text-xs text-right ${surplusClass}">${formatCompact(surplus)}</td>
      <td class="px-3 py-2 text-xs text-right text-emerald-400 font-medium">${r.sipContributions > 0 ? formatCompact(r.sipContributions) : '<span class="text-slate-600">—</span>'}</td>
      <td class="px-3 py-2 text-xs text-right text-emerald-300">${formatCompact(r.interestAccrued)}</td>
      <td class="px-3 py-2 text-xs text-right font-semibold ${isNegative ? 'text-red-400' : 'text-white'}">${formatRupee(Math.round(r.closingBalance))}</td>
    </tr>`;
  }).join('');

  wrapper.innerHTML = `
    <table class="w-full text-left">
      <thead>
        <tr class="text-slate-500 text-xs uppercase tracking-wider">
          <th class="px-3 py-2 font-medium">Year</th>
          <th class="px-3 py-2 font-medium">Age</th>
          <th class="px-3 py-2 font-medium text-right">Income</th>
          <th class="px-3 py-2 font-medium text-right">Lifestyle Exp</th>
          <th class="px-3 py-2 font-medium text-right">Medical Exp</th>
          <th class="px-3 py-2 font-medium text-right">Goal Outlay</th>
          <th class="px-3 py-2 font-medium text-right">Total Exp</th>
          <th class="px-3 py-2 font-medium text-right">Surplus</th>
          <th class="px-3 py-2 font-medium text-right text-emerald-400">Investment</th>
          <th class="px-3 py-2 font-medium text-right">Interest</th>
          <th class="px-3 py-2 font-medium text-right">Closing Balance</th>
        </tr>
      </thead>
      <tbody>${rowsHTML}</tbody>
    </table>
    <p class="text-xs text-slate-600 mt-2 px-1">
      <span class="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1"></span>R = Retired &nbsp;
      <span class="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1"></span>Goal disbursement year &nbsp;
      <span class="inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span>Corpus depleted &nbsp;
      <span class="text-slate-600">&middot; Click any row for a detailed year breakdown</span>
    </p>
  `;

  // Attach row-click handlers after DOM is updated
  wrapper.querySelectorAll('tbody tr[data-row-idx]').forEach(tr => {
    tr.addEventListener('click', () => {
      const idx = parseInt(tr.dataset.rowIdx, 10);
      const row = _filteredRows[idx];
      if (row) _showRowBreakdown(row);
    });
  });
}

function _updatePagination() {
  const maxPage = Math.ceil(_filteredRows.length / PAGE_SIZE) || 1;
  const countEl  = document.getElementById('table-row-count');
  const infoEl   = document.getElementById('table-page-info');
  const prevBtn  = document.getElementById('table-prev-page');
  const nextBtn  = document.getElementById('table-next-page');

  if (countEl)  countEl.textContent  = `${_filteredRows.length} year${_filteredRows.length !== 1 ? 's' : ''} of data`;
  if (infoEl)   infoEl.textContent   = `Page ${_currentPage} of ${maxPage}`;
  if (prevBtn)  prevBtn.disabled     = _currentPage <= 1;
  if (nextBtn)  nextBtn.disabled     = _currentPage >= maxPage;
}

// ─── Row Breakdown Popup ────────────────────────────────────────────────────

const CHAR_DELAY  = 5;   // ms per character while typing
const LINE_PAUSE  = 20;  // ms pause after finishing a line

function _delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Build the ordered list of text lines for the breakdown panel.
 * Each line has: text (plain), cls (Tailwind classes), instant (skip typing).
 */
function _buildBreakdownLines(row) {
  const fmt  = n => formatRupee(Math.round(Math.abs(n)));
  const pct  = n => `${(n * 100).toFixed(2)}%`;
  const sign = n => n >= 0 ? '+' : '\u2212';  // − unicode minus

  const sipFV        = row.sipFutureValue ?? 0;
  const sipPrincipal = row.sipContributions ?? 0;
  const sipGrowth    = Math.max(0, sipFV - sipPrincipal);
  const openInt      = row.interestAccrued - sipGrowth;
  const cagr         = row.openingBalance > 0 ? openInt / row.openingBalance : 0;

  const L  = (text, cls, instant = false) => ({ text, cls, instant });
  const SEP = L('\u2500'.repeat(50), 'text-slate-700 text-xs font-mono', true);
  const GAP = L('', 'h-1', true);

  const lines = [];

  // Header
  lines.push(L(
    `  FY ${row.calendarYear}   \u00b7   Age ${row.age}${row.isRetired ? '   \u00b7   Retired \uD83C\uDFE6' : ''}`,
    'text-amber-400 font-bold text-sm font-mono tracking-wide',
    true
  ));
  lines.push(SEP);
  lines.push(GAP);

  // ── Section 1: Income & Expenses ──────────────────────────────────────────
  lines.push(L('  INCOME & EXPENSES', 'text-slate-400 text-xs font-semibold tracking-widest font-mono'));
  lines.push(GAP);
  lines.push(L(`  Opening Balance          \u2192  ${fmt(row.openingBalance)}`, 'text-white font-mono text-xs'));

  if (!row.isRetired) {
    lines.push(L(`  Annual Income            +  ${fmt(row.annualIncome)}`, 'text-emerald-400 font-mono text-xs'));
  } else {
    lines.push(L('  Annual Income            +  \u20b90  (Retired \u2014 no salary)', 'text-slate-500 font-mono text-xs'));
  }

  lines.push(L(`  Lifestyle Expenses       \u2212  ${fmt(row.lifestyleExpenses)}`, 'text-red-300 font-mono text-xs'));

  if (row.medicalExpenses > 0) {
    lines.push(L(`  Medical Expenses         \u2212  ${fmt(row.medicalExpenses)}`, 'text-amber-300 font-mono text-xs'));
  }

  if (row.goalOutlays > 0) {
    const goalNames = (row.goalsThisYear || []).map(g => g.name).filter(Boolean).join(', ');
    lines.push(L(
      `  Goal Outlay              \u2212  ${fmt(row.goalOutlays)}${goalNames ? `  (${goalNames})` : ''}`,
      'text-yellow-300 font-mono text-xs'
    ));
  }

  lines.push(GAP);
  lines.push(L(
    `  Net Surplus              ${sign(row.netSurplus)}  ${fmt(row.netSurplus)}`,
    `font-mono text-xs font-semibold ${row.netSurplus >= 0 ? 'text-emerald-400' : 'text-red-400'}`
  ));
  lines.push(GAP);
  lines.push(SEP);
  lines.push(GAP);

  // ── Section 2: Corpus Growth ───────────────────────────────────────────────
  lines.push(L('  CORPUS GROWTH  (HOW INTEREST IS EARNED)', 'text-slate-400 text-xs font-semibold tracking-widest font-mono'));
  lines.push(GAP);
  lines.push(L(`  Blended Portfolio CAGR       ${pct(cagr)}`, 'text-blue-300 font-mono text-xs'));
  lines.push(L(`  Opening Balance \u00d7 CAGR    =  ${fmt(openInt)}`, 'text-slate-200 font-mono text-xs'));

  if (sipPrincipal > 0) {
    lines.push(GAP);
    lines.push(L(`  New SIPs paid this year       ${fmt(sipPrincipal)}  (principal)`, 'text-slate-400 font-mono text-xs'));
    lines.push(L(`  SIP year-end value (FV)    =  ${fmt(sipFV)}`, 'text-slate-300 font-mono text-xs'));
    lines.push(L(`  SIP in-year growth         =  ${fmt(sipGrowth)}  (FV \u2212 principal)`, 'text-emerald-300 font-mono text-xs'));
  }

  lines.push(GAP);
  lines.push(L(
    `  Total Interest Accrued     =  ${fmt(row.interestAccrued)}`,
    'text-emerald-300 font-mono text-xs font-bold'
  ));
  lines.push(GAP);
  lines.push(SEP);
  lines.push(GAP);

  // ── Section 3: Closing Balance ─────────────────────────────────────────────
  lines.push(L('  CLOSING BALANCE', 'text-slate-400 text-xs font-semibold tracking-widest font-mono'));
  lines.push(GAP);
  lines.push(L(`    Opening Balance             ${fmt(row.openingBalance)}`, 'text-slate-300 font-mono text-xs'));
  lines.push(L(
    `  ${sign(row.netSurplus)} Net Surplus              ${fmt(row.netSurplus)}`,
    `font-mono text-xs ${row.netSurplus >= 0 ? 'text-emerald-400' : 'text-red-400'}`
  ));
  if (sipPrincipal > 0) {
    lines.push(L(`  + SIP Principal              ${fmt(sipPrincipal)}`, 'text-emerald-400 font-mono text-xs'));
  }
  lines.push(L(`  + Interest Accrued           ${fmt(row.interestAccrued)}`, 'text-emerald-300 font-mono text-xs'));
  lines.push(L('  ' + '\u2500'.repeat(38), 'text-slate-600 font-mono text-xs', true));
  lines.push(L(
    `  = Closing Balance            ${formatRupee(Math.round(row.closingBalance))}`,
    `font-mono text-sm font-bold ${row.closingBalance < 0 ? 'text-red-400' : 'text-white'}`
  ));

  return lines;
}

/**
 * Sequentially type each line into container.
 * skipRef.skip can be set to true to flush remaining lines instantly.
 */
async function _typeLines(container, lines, skipRef) {
  for (const { text, cls, instant } of lines) {
    if (!container.isConnected) return;
    const div = document.createElement('div');
    div.className = cls;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;

    if (instant || skipRef.skip) {
      div.textContent = text;
      continue;
    }

    for (const char of text) {
      if (!container.isConnected) return;
      if (skipRef.skip) { div.textContent = text; break; }
      div.textContent += char;
      await _delay(CHAR_DELAY);
    }
    if (container.isConnected && !skipRef.skip) await _delay(LINE_PAUSE);
  }

  // Typing done — hide skip button
  const skipBtn = document.getElementById('bd-skip-btn');
  if (skipBtn) { skipBtn.textContent = '\u2713 Done'; skipBtn.disabled = true; }
}

/**
 * Show the breakdown modal for a single projection row.
 */
function _showRowBreakdown(row) {
  document.getElementById('row-breakdown-modal')?.remove();
  const skipRef = { skip: false };

  const overlay = document.createElement('div');
  overlay.id = 'row-breakdown-modal';
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '60';
  overlay.innerHTML = `
    <div class="modal-card w-full" style="max-width:540px">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-bold text-white">
          Year Breakdown &mdash; ${row.calendarYear}
        </h3>
        <div class="flex items-center gap-2">
          <button id="bd-skip-btn"
            class="text-xs text-slate-400 hover:text-white border border-white/10 rounded px-2 py-1 transition-colors">
            Skip &#9654;
          </button>
          <button id="bd-close-btn"
            class="text-slate-400 hover:text-white text-xl leading-none px-1 transition-colors">&times;</button>
        </div>
      </div>
      <div id="bd-content"
        class="overflow-y-auto rounded bg-black/20 p-3"
        style="max-height:68vh; min-height:160px">
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#bd-close-btn').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#bd-skip-btn').addEventListener('click', () => { skipRef.skip = true; });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  _typeLines(overlay.querySelector('#bd-content'), _buildBreakdownLines(row), skipRef);
}

// ─── CSV Export ──────────────────────────────────────────────────────────────

/**
 * Export current projection data as a CSV download.
 * @param {import('@/utils/financeEngine.js').YearlyRow[]} rows
 */
export function exportCSV(rows) {
  // Phase 3 — full implementation
  const headers = [
    'Year', 'Age', 'Opening Balance (₹)',
    'Annual Income (₹)', 'Lifestyle Expenses (₹)', 'Medical Expenses (₹)',
    'Goal Outlays (₹)', 'Total Expenses (₹)', 'Net Surplus (₹)',
    'SIP Contributions (₹)', 'Interest Accrued (₹)', 'Closing Balance (₹)',
  ];

  const csvContent = [
    headers.join(','),
    ...rows.map(r => [
      r.calendarYear, r.age,
      Math.round(r.openingBalance), Math.round(r.annualIncome),
      Math.round(r.lifestyleExpenses), Math.round(r.medicalExpenses),
      Math.round(r.goalOutlays), Math.round(r.totalExpenses),
      Math.round(r.netSurplus), Math.round(r.sipContributions ?? 0),
      Math.round(r.interestAccrued), Math.round(r.closingBalance),
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'finvision-projection.csv' });
  a.click();
  URL.revokeObjectURL(url);
}
