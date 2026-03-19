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

  const rowsHTML = slice.map(r => {
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

    return `<tr class="border-t border-white/5 hover:bg-white/3 transition-colors ${rowClass}">
      <td class="px-3 py-2 text-xs text-slate-400">${r.calendarYear}</td>
      <td class="px-3 py-2 text-xs font-medium">${ageCell}</td>
      <td class="px-3 py-2 text-xs text-right">${formatCompact(r.annualIncome)}</td>
      <td class="px-3 py-2 text-xs text-right text-red-300">${formatCompact(r.lifestyleExpenses)}</td>
      <td class="px-3 py-2 text-xs text-right text-amber-300">${formatCompact(r.medicalExpenses)}</td>
      <td class="px-3 py-2 text-xs text-right ${isGoalYear ? 'text-yellow-300 font-semibold' : 'text-slate-500'}">${r.goalOutlays > 0 ? formatCompact(r.goalOutlays) : '—'}</td>
      <td class="px-3 py-2 text-xs text-right text-slate-400">${formatCompact(r.totalExpenses)}</td>
      <td class="px-3 py-2 text-xs text-right ${surplusClass}">${formatCompact(surplus)}</td>
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
          <th class="px-3 py-2 font-medium text-right">Interest</th>
          <th class="px-3 py-2 font-medium text-right">Closing Balance</th>
        </tr>
      </thead>
      <tbody>${rowsHTML}</tbody>
    </table>
    <p class="text-xs text-slate-600 mt-2 px-1">
      <span class="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1"></span>R = Retired &nbsp;
      <span class="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1"></span>Goal disbursement year &nbsp;
      <span class="inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span>Corpus depleted
    </p>
  `;
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

/**
 * Export current projection data as a CSV download.
 * @param {import('@/utils/financeEngine.js').YearlyRow[]} rows
 */
export function exportCSV(rows) {
  // Phase 3 — full implementation
  const headers = [
    'Year', 'Age', 'Opening Balance (₹)', 'Annual Income (₹)',
    'Lifestyle Expenses (₹)', 'Medical Expenses (₹)', 'Goal Outlays (₹)',
    'Total Expenses (₹)', 'Net Surplus (₹)', 'Interest Accrued (₹)', 'Closing Balance (₹)',
  ];

  const csvContent = [
    headers.join(','),
    ...rows.map(r => [
      r.calendarYear, r.age,
      Math.round(r.openingBalance), Math.round(r.annualIncome),
      Math.round(r.lifestyleExpenses), Math.round(r.medicalExpenses),
      Math.round(r.goalOutlays), Math.round(r.totalExpenses),
      Math.round(r.netSurplus), Math.round(r.interestAccrued),
      Math.round(r.closingBalance),
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'finvision-projection.csv' });
  a.click();
  URL.revokeObjectURL(url);
}
