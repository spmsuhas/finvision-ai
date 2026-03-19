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
  // Phase 3 — build table HTML
  const wrapper = document.getElementById('projection-table-wrapper');
  if (!wrapper) return;

  const start = (page - 1) * PAGE_SIZE;
  const slice = _filteredRows.slice(start, start + PAGE_SIZE);

  if (slice.length === 0) {
    wrapper.innerHTML = '<div class="text-center py-8 text-slate-500 text-sm">No data to display. Enter your financial details to generate projections.</div>';
    return;
  }

  // Phase 3 will build full HTML table here.
  wrapper.innerHTML = `<p class="text-slate-400 text-sm p-4">Phase 3: Table rendering for ${_filteredRows.length} rows (page ${page})</p>`;
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
