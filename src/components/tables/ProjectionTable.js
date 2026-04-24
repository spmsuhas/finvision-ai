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

    return `<tr data-row-idx="${rowDataIdx}" class="hover:bg-white/5 cursor-pointer transition-colors ${rowClass}" title="Click for detailed breakdown">
      <td class="px-3 py-2 text-xs text-slate-400 border-t border-white/5">${r.calendarYear}</td>
      <td class="px-3 py-2 text-xs font-medium border-t border-white/5">${ageCell}</td>
      <td class="px-3 py-2 text-xs text-right border-t border-white/5">${formatCompact(r.annualIncome)}</td>
      <td class="px-3 py-2 text-xs text-right text-red-300 border-l-2 border-red-500/20 bg-red-500/5 border-t border-white/5">${formatCompact(r.lifestyleExpenses)}</td>
      <td class="px-3 py-2 text-xs text-right text-amber-300 bg-red-500/5 border-t border-white/5">${formatCompact(r.medicalExpenses)}</td>
      <td class="px-3 py-2 text-xs text-right text-rose-400 bg-red-500/5 border-t border-white/5">${(r.emiExpenses || 0) > 0 ? formatCompact(r.emiExpenses) : '<span class="text-slate-600">—</span>'}</td>
      <td class="px-3 py-2 text-xs text-right bg-red-500/5 border-t border-white/5 ${isGoalYear ? 'text-yellow-300 font-semibold' : 'text-slate-500'}">${r.goalOutlays > 0 ? formatCompact(r.goalOutlays) : '—'}</td>
      <td class="px-3 py-2 text-xs text-right text-slate-400 bg-red-500/5 border-r-2 border-red-500/20 border-t border-white/5">${formatCompact(r.totalExpenses)}</td>
      <td class="w-4 border-t border-white/5"></td>
      <td class="px-3 py-2 text-xs text-right border-l-2 border-emerald-500/20 bg-emerald-500/5 border-t border-white/5 ${surplusClass}">${formatCompact(surplus)}</td>
      <td class="px-3 py-2 text-xs text-right text-emerald-400 font-medium bg-emerald-500/5 border-t border-white/5">${r.sipContributions > 0 ? formatCompact(r.sipContributions) : '<span class="text-slate-600">—</span>'}</td>
      <td class="px-3 py-2 text-xs text-right text-emerald-300 bg-emerald-500/5 border-r-2 border-emerald-500/20 border-t border-white/5">${formatCompact(r.interestAccrued)}</td>
      <td class="px-3 py-2 text-xs text-right font-semibold border-t border-white/5 ${isNegative ? 'text-red-400' : 'text-white'}">${formatRupee(Math.round(r.closingBalance))}</td>
    </tr>`;
  }).join('');

  wrapper.innerHTML = `
    <table class="w-full text-left border-separate border-spacing-0">
      <thead>
        <!-- Column-group labels -->
        <tr class="text-[10px] font-semibold uppercase tracking-widest">
          <th colspan="3" class="pb-0 pt-1"></th>
          <th colspan="5" class="text-center text-red-400/80 py-1 border-l-2 border-t-2 border-r-2 border-red-500/20 bg-red-500/5 rounded-t-lg">—— Expenses ——</th>
          <th class="w-4 pb-0 pt-1"></th>
          <th colspan="3" class="text-center text-emerald-400/80 py-1 border-l-2 border-t-2 border-r-2 border-emerald-500/20 bg-emerald-500/5 rounded-t-lg">—— Portfolio ——</th>
          <th class="pb-0 pt-1"></th>
        </tr>
        <!-- Column names -->
        <tr class="text-slate-500 text-xs uppercase tracking-wider">
          <th class="px-3 py-2 font-medium">Year</th>
          <th class="px-3 py-2 font-medium">Age</th>
          <th class="px-3 py-2 font-medium text-right">Income</th>
          <th class="px-3 py-2 font-medium text-right border-l-2 border-b-2 border-red-500/20 bg-red-500/5">Lifestyle Exp</th>
          <th class="px-3 py-2 font-medium text-right border-b-2 border-red-500/20 bg-red-500/5">Medical Exp</th>
          <th class="px-3 py-2 font-medium text-right text-rose-400 border-b-2 border-red-500/20 bg-red-500/5">Debt EMI</th>
          <th class="px-3 py-2 font-medium text-right border-b-2 border-red-500/20 bg-red-500/5">Goal Outlay</th>
          <th class="px-3 py-2 font-medium text-right border-r-2 border-b-2 border-red-500/20 bg-red-500/5">Total Exp</th>
          <th class="w-4"></th>
          <th class="px-3 py-2 font-medium text-right border-l-2 border-b-2 border-emerald-500/20 bg-emerald-500/5">Surplus</th>
          <th class="px-3 py-2 font-medium text-right text-emerald-400 border-b-2 border-emerald-500/20 bg-emerald-500/5">Investment</th>
          <th class="px-3 py-2 font-medium text-right border-r-2 border-b-2 border-emerald-500/20 bg-emerald-500/5">Interest</th>
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

const CHAR_DELAY = 18;   // ms per character while typing
const LINE_PAUSE = 30;   // ms pause after finishing a line

function _delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Typewriter sound (Web Audio API — no external files) ─────────────────────
// Modelled after a mechanical typewriter key strike:
//   Layer 1 — broadband noise burst  (the physical "clack" of the key / type-bar impact)
//   Layer 2 — short square-wave tone (metallic resonance of the carriage / platen spring)
// Both layers decay very rapidly so the sound stays crisp and non-fatiguing.

let _audioCtx    = null;
let _noiseBuffer = null;   // 0.08 s mono white-noise buffer, created once and reused

function _getAudioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
  }
  return _audioCtx;
}

/** Build a short white-noise AudioBuffer (created once, reused for every keystroke). */
function _getNoiseBuffer(ctx) {
  if (_noiseBuffer) return _noiseBuffer;
  const sampleRate = ctx.sampleRate;
  const length     = Math.floor(sampleRate * 0.08);   // 80 ms of noise
  const buf = ctx.createBuffer(1, length, sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  _noiseBuffer = buf;
  return buf;
}

function _playClick() {
  const ctx = _getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();

  const t   = ctx.currentTime;
  const buf = _getNoiseBuffer(ctx);

  // ── Layer 1: low mechanical thump (heavy typebar arm — the hallmark of vintage machines) ──
  const thump = ctx.createBufferSource();
  thump.buffer = buf;
  const bp1 = ctx.createBiquadFilter();
  bp1.type = 'bandpass';
  bp1.frequency.setValueAtTime(250 + Math.random() * 120, t);   // 250–370 Hz — that deep, chunky thunk
  bp1.Q.value = 0.85;
  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(0.55, t);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  thump.connect(bp1);
  bp1.connect(thumpGain);
  thumpGain.connect(ctx.destination);
  thump.start(t);
  thump.stop(t + 0.06);

  // ── Layer 2: mid clack (metal typebar striking the platen) ────────────────
  const clack = ctx.createBufferSource();
  clack.buffer = buf;
  const bp2 = ctx.createBiquadFilter();
  bp2.type = 'bandpass';
  bp2.frequency.setValueAtTime(900 + Math.random() * 500, t);   // 900–1400 Hz — metallic bite
  bp2.Q.value = 1.3;
  const clackGain = ctx.createGain();
  clackGain.gain.setValueAtTime(0.28, t);
  clackGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
  clack.connect(bp2);
  bp2.connect(clackGain);
  clackGain.connect(ctx.destination);
  clack.start(t);
  clack.stop(t + 0.06);

  // ── Layer 3: platen ring (low triangle resonance — the vintage "ting") ─────
  const ring = ctx.createOscillator();
  ring.type = 'triangle';
  ring.frequency.setValueAtTime(130 + Math.random() * 55, t);   // 130–185 Hz — warm body resonance
  const ringGain = ctx.createGain();
  ringGain.gain.setValueAtTime(0.09, t);
  ringGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  ring.connect(ringGain);
  ringGain.connect(ctx.destination);
  ring.start(t);
  ring.stop(t + 0.055);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const _fmt  = n => formatRupee(Math.round(Math.abs(n)));
const _pct  = n => `${(n * 100).toFixed(1)}%`;

/** Animate a bar's width from 0 → targetPct over durationMs */
function _animateBar(el, targetPct, durationMs) {
  el.style.transition = `width ${durationMs}ms cubic-bezier(0.4,0,0.2,1)`;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { el.style.width = `${targetPct}%`; });
  });
}

/**
 * Type text into el character by character, playing a click sound each char.
 * Respects skipRef.skip to flush instantly.
 */
async function _typeInto(el, text, skipRef) {
  if (!el?.isConnected) return;
  if (skipRef.skip) { el.textContent = text; return; }
  for (const char of text) {
    if (!el.isConnected || skipRef.skip) { el.textContent = text; return; }
    el.textContent += char;
    if (char.trim()) _playClick();
    await _delay(CHAR_DELAY);
  }
  if (el.isConnected && !skipRef.skip) await _delay(LINE_PAUSE);
}

/** Append a section card to content and return its body element */
function _appendCard(content, titleText, dotColor) {
  const card = document.createElement('div');
  card.className = 'rounded-xl border border-white/8 bg-white/3 p-4 mb-3';
  card.innerHTML = `
    <div class="flex items-center gap-2 mb-3">
      <span class="w-2 h-2 rounded-full ${dotColor}"></span>
      <span class="bd-card-title text-xs font-semibold tracking-widest text-slate-400 uppercase"></span>
    </div>
    <div class="bd-card-body space-y-2"></div>
  `;
  content.appendChild(card);
  return { titleEl: card.querySelector('.bd-card-title'), bodyEl: card.querySelector('.bd-card-body') };
}

/** Create a flow row: label | bar | amount */
function _flowRow(label, amount, maxVal, color, prefix = '', note = '') {
  const pct = maxVal > 0 ? Math.min(100, (Math.abs(amount) / maxVal) * 100) : 0;
  const row = document.createElement('div');
  row.innerHTML = `
    <div class="flex items-center gap-2 mb-0.5">
      <span class="text-xs text-slate-400 w-32 shrink-0">${label}</span>
      <div class="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div class="bd-bar h-full rounded-full ${color}" style="width:0%"></div>
      </div>
      <span class="bd-amount text-xs font-mono font-semibold text-right w-24 shrink-0 ${color.replace('bg-', 'text-')}"></span>
    </div>
    ${note ? `<div class="text-xs text-slate-600 pl-34 ml-[8.5rem]">${note}</div>` : ''}
  `;
  return { row, pct, amount, prefix };
}

// ── Main show function ────────────────────────────────────────────────────────
function _showRowBreakdown(row) {
  document.getElementById('row-breakdown-modal')?.remove();
  const skipRef = { skip: false };

  // Pre-compute values
  const sipFV        = row.sipFutureValue ?? 0;
  const sipPrincipal = row.sipContributions ?? 0;
  const sipGrowth    = Math.max(0, sipFV - sipPrincipal);
  const openInt      = row.interestAccrued - sipGrowth;
  const cagr         = row.openingBalance > 0 ? openInt / row.openingBalance : 0;
  const surplus      = row.netSurplus ?? 0;
  const isNegSurplus = surplus < 0;
  const goalNames    = (row.goalsThisYear || []).map(g => g.name).filter(Boolean).join(', ');

  // Waterfall components for stacked bar
  const totalIn    = row.openingBalance + (row.isRetired ? 0 : row.annualIncome) + row.interestAccrued + sipPrincipal;
  const totalOut   = row.lifestyleExpenses + (row.medicalExpenses || 0) + (row.emiExpenses || 0) + (row.goalOutlays || 0);
  const stackMax   = Math.max(totalIn, row.closingBalance, 1);

  // Build overlay
  const overlay = document.createElement('div');
  overlay.id = 'row-breakdown-modal';
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '60';
  overlay.innerHTML = `
    <div class="modal-card w-full" style="max-width:600px;padding:1.25rem">
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-base font-bold text-white">FY ${row.calendarYear}</span>
            <span class="text-slate-500 text-sm">·</span>
            <span class="text-sm text-slate-300">Age <strong class="text-white">${row.age}</strong></span>
            ${row.isRetired
              ? '<span class="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full px-2 py-0.5">🏦 Retired</span>'
              : '<span class="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full px-2 py-0.5">💼 Working</span>'
            }
            ${row.goalOutlays > 0
              ? `<span class="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full px-2 py-0.5">🎯 Goal Year</span>`
              : ''
            }
          </div>
          <p class="text-xs text-slate-500 mt-1">Click any row · detailed year breakdown</p>
        </div>
        <div class="flex items-center gap-2 shrink-0 ml-4">
          <button id="bd-skip-btn"
            class="text-xs text-slate-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors">
            Skip ▶
          </button>
          <button id="bd-close-btn"
            class="text-slate-400 hover:text-white text-xl leading-none w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">&times;</button>
        </div>
      </div>

      <!-- Scrollable content -->
      <div id="bd-content" class="overflow-y-auto space-y-3" style="max-height:72vh"></div>
    </div>
  `;

  document.body.appendChild(overlay);
  const content = overlay.querySelector('#bd-content');

  overlay.querySelector('#bd-close-btn').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#bd-skip-btn').addEventListener('click',  () => { skipRef.skip = true; });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // ── Animate sections sequentially ──────────────────────────────────────────
  (async () => {

    // ── STACKED BALANCE BAR ───────────────────────────────────────────────────
    const summaryCard = document.createElement('div');
    summaryCard.className = 'rounded-xl border border-white/8 bg-white/3 p-4 mb-1';
    summaryCard.innerHTML = `
      <div class="flex justify-between items-end mb-2">
        <span class="text-xs text-slate-400 uppercase tracking-widest font-semibold">Balance Flow</span>
        <span class="text-xs text-slate-500">Opening → Closing</span>
      </div>
      <!-- stacked horizontal bar -->
      <div class="h-6 rounded-lg overflow-hidden flex bg-white/5 mb-2" id="bd-stack-bar">
        <div id="bd-bar-corpus"  class="h-full bg-blue-500/70 transition-all duration-700" style="width:0%" title="Opening Balance"></div>
        <div id="bd-bar-income"  class="h-full bg-emerald-500/70 transition-all duration-700" style="width:0%" title="Income"></div>
        <div id="bd-bar-interest" class="h-full bg-purple-400/70 transition-all duration-700" style="width:0%" title="Interest"></div>
        <div id="bd-bar-sip"     class="h-full bg-teal-400/70 transition-all duration-700" style="width:0%" title="SIP Principal"></div>
        <div id="bd-bar-out"     class="h-full bg-red-500/60 transition-all duration-700" style="width:0%" title="Outflows"></div>
      </div>
      <!-- legend -->
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500" id="bd-legend"></div>
      <!-- closing balance big number -->
      <div class="mt-3 pt-3 border-t border-white/8 flex items-center justify-between">
        <span class="text-xs text-slate-400">Closing Balance</span>
        <span id="bd-closing-num" class="text-lg font-bold font-mono ${row.closingBalance < 0 ? 'text-red-400' : 'text-white'}"></span>
      </div>
    `;
    content.appendChild(summaryCard);

    // Animate stacked bar
    await _delay(100);
    const corpusPct   = (row.openingBalance / stackMax) * 100;
    const incomePct   = ((row.isRetired ? 0 : row.annualIncome) / stackMax) * 100;
    const interestPct = (row.interestAccrued / stackMax) * 100;
    const sipPct      = (sipPrincipal / stackMax) * 100;
    const outPct      = (totalOut / stackMax) * 100;

    if (!skipRef.skip) {
      overlay.querySelector('#bd-bar-corpus').style.width   = `${corpusPct}%`;
      overlay.querySelector('#bd-bar-income').style.width   = `${incomePct}%`;
      overlay.querySelector('#bd-bar-interest').style.width = `${interestPct}%`;
      overlay.querySelector('#bd-bar-sip').style.width      = `${sipPct}%`;
      await _delay(400);
      overlay.querySelector('#bd-bar-out').style.width      = `${outPct}%`;
    } else {
      overlay.querySelector('#bd-bar-corpus').style.width   = `${corpusPct}%`;
      overlay.querySelector('#bd-bar-income').style.width   = `${incomePct}%`;
      overlay.querySelector('#bd-bar-interest').style.width = `${interestPct}%`;
      overlay.querySelector('#bd-bar-sip').style.width      = `${sipPct}%`;
      overlay.querySelector('#bd-bar-out').style.width      = `${outPct}%`;
    }

    // Legend
    const legendEl = overlay.querySelector('#bd-legend');
    const legendItems = [
      { color: 'bg-blue-500/70',    label: `Opening ${_fmt(row.openingBalance)}` },
      ...(row.isRetired ? [] : [{ color: 'bg-emerald-500/70', label: `Income ${_fmt(row.annualIncome)}` }]),
      { color: 'bg-purple-400/70',  label: `Interest ${_fmt(row.interestAccrued)}` },
      ...(sipPrincipal > 0 ? [{ color: 'bg-teal-400/70', label: `SIPs ${_fmt(sipPrincipal)}` }] : []),
      { color: 'bg-red-500/60',     label: `Outflows ${_fmt(totalOut)}` },
    ];
    legendItems.forEach(({ color, label }) => {
      const span = document.createElement('span');
      span.className = 'flex items-center gap-1';
      span.innerHTML = `<span class="w-2 h-2 rounded-sm ${color} inline-block"></span>${label}`;
      legendEl.appendChild(span);
    });

    // Type closing balance
    await _typeInto(overlay.querySelector('#bd-closing-num'), formatRupee(Math.round(row.closingBalance)), skipRef);
    await _delay(skipRef.skip ? 0 : 200);

    // ── SECTION 1 — INCOME & EXPENSES ────────────────────────────────────────
    if (!content.isConnected) return;
    const { titleEl: t1, bodyEl: b1 } = _appendCard(content, '', 'bg-emerald-400');
    await _typeInto(t1, 'Income & Expenses', skipRef);

    const cashItems = [
      { label: 'Opening Balance', amount: row.openingBalance,    color: 'bg-blue-400',    prefix: '→' },
      { label: 'Annual Income',   amount: row.isRetired ? 0 : row.annualIncome, color: 'bg-emerald-400', prefix: '+' },
      { label: 'Lifestyle Exp',   amount: row.lifestyleExpenses, color: 'bg-red-400',     prefix: '−' },
      ...(row.medicalExpenses > 0
          ? [{ label: 'Medical Exp', amount: row.medicalExpenses, color: 'bg-amber-400',  prefix: '−' }] : []),
      ...((row.emiExpenses || 0) > 0
          ? [{ label: 'Debt EMI',    amount: row.emiExpenses,    color: 'bg-rose-500',   prefix: '−' }] : []),
      ...(row.goalOutlays > 0
          ? [{ label: goalNames ? `Goal: ${goalNames}` : 'Goal Outlay', amount: row.goalOutlays, color: 'bg-yellow-400', prefix: '−', note: goalNames }] : []),
    ];
    const cashMax = Math.max(...cashItems.map(i => Math.abs(i.amount)), 1);

    for (const item of cashItems) {
      if (!b1.isConnected) return;
      const pct = Math.min(100, (Math.abs(item.amount) / cashMax) * 100);
      const rowEl = document.createElement('div');
      rowEl.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400 w-28 shrink-0">${item.label}</span>
          <div class="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div class="bd-bar h-full rounded-full ${item.color}" style="width:0%;transition:width 600ms cubic-bezier(0.4,0,0.2,1)"></div>
          </div>
          <span class="bd-amount text-xs font-mono font-semibold w-28 text-right shrink-0 ${item.color.replace('bg-', 'text-')}"></span>
        </div>
      `;
      b1.appendChild(rowEl);
      const barEl = rowEl.querySelector('.bd-bar');
      const numEl = rowEl.querySelector('.bd-amount');
      if (!skipRef.skip) {
        requestAnimationFrame(() => requestAnimationFrame(() => { barEl.style.width = `${pct}%`; }));
        await _delay(300);
        await _typeInto(numEl, `${item.prefix} ${_fmt(item.amount)}`, skipRef);
      } else {
        barEl.style.width = `${pct}%`;
        numEl.textContent = `${item.prefix} ${_fmt(item.amount)}`;
      }
    }

    // Net surplus row
    if (b1.isConnected) {
      const divider = document.createElement('div');
      divider.className = 'border-t border-white/8 pt-2 mt-1 flex items-center justify-between';
      divider.innerHTML = `
        <span class="text-xs font-semibold text-slate-300">Net Surplus</span>
        <span class="bd-surplus text-sm font-bold font-mono ${isNegSurplus ? 'text-red-400' : 'text-emerald-400'}"></span>
      `;
      b1.appendChild(divider);
      await _typeInto(divider.querySelector('.bd-surplus'), `${isNegSurplus ? '−' : '+'} ${_fmt(surplus)}`, skipRef);
    }
    await _delay(skipRef.skip ? 0 : 200);

    // ── SECTION 2 — CORPUS GROWTH ─────────────────────────────────────────────
    if (!content.isConnected) return;
    const { titleEl: t2, bodyEl: b2 } = _appendCard(content, '', 'bg-purple-400');
    await _typeInto(t2, 'Corpus Growth', skipRef);

    // CAGR badge + explanation
    const cagrRow = document.createElement('div');
    cagrRow.className = 'flex items-center gap-3 mb-3';
    cagrRow.innerHTML = `
      <div class="rounded-lg bg-purple-500/15 border border-purple-500/30 px-3 py-2 text-center shrink-0">
        <div class="bd-cagr text-lg font-bold text-purple-300 font-mono"></div>
        <div class="text-xs text-slate-500 mt-0.5">Blended CAGR</div>
      </div>
      <div class="text-xs text-slate-400 leading-relaxed">
        Weighted average of your portfolio's asset class returns, adjusted by the rates
        declared in your Investments tab.
      </div>
    `;
    b2.appendChild(cagrRow);
    await _typeInto(cagrRow.querySelector('.bd-cagr'), _pct(cagr), skipRef);

    // Interest split bars
    const growthItems = [
      { label: 'Corpus Growth', amount: openInt,   color: 'bg-purple-400', note: `Opening Balance × ${_pct(cagr)}` },
      ...(sipPrincipal > 0 ? [
        { label: 'SIP Principal',  amount: sipPrincipal, color: 'bg-teal-400',   note: 'New SIP instalments this year' },
        { label: 'SIP Growth',     amount: sipGrowth,    color: 'bg-cyan-400',   note: `FV of SIPs − Principal` },
      ] : []),
    ];
    const growthMax = Math.max(...growthItems.map(i => i.amount), 1);

    for (const item of growthItems) {
      if (!b2.isConnected) return;
      const pct = Math.min(100, (item.amount / growthMax) * 100);
      const rowEl = document.createElement('div');
      rowEl.innerHTML = `
        <div class="flex items-center gap-2 mb-0.5">
          <span class="text-xs text-slate-400 w-28 shrink-0">${item.label}</span>
          <div class="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div class="bd-bar h-full rounded-full ${item.color}" style="width:0%;transition:width 600ms cubic-bezier(0.4,0,0.2,1)"></div>
          </div>
          <span class="bd-amount text-xs font-mono font-semibold w-28 text-right shrink-0 ${item.color.replace('bg-', 'text-')}"></span>
        </div>
        <div class="text-xs text-slate-600 ml-[7.5rem] mb-1">${item.note}</div>
      `;
      b2.appendChild(rowEl);
      const barEl = rowEl.querySelector('.bd-bar');
      const numEl = rowEl.querySelector('.bd-amount');
      if (!skipRef.skip) {
        requestAnimationFrame(() => requestAnimationFrame(() => { barEl.style.width = `${pct}%`; }));
        await _delay(300);
        await _typeInto(numEl, `+ ${_fmt(item.amount)}`, skipRef);
      } else {
        barEl.style.width = `${pct}%`;
        numEl.textContent = `+ ${_fmt(item.amount)}`;
      }
    }

    // Total interest
    if (b2.isConnected) {
      const totEl = document.createElement('div');
      totEl.className = 'border-t border-white/8 pt-2 mt-1 flex items-center justify-between';
      totEl.innerHTML = `
        <span class="text-xs font-semibold text-slate-300">Total Interest Earned</span>
        <span class="bd-total-int text-sm font-bold font-mono text-emerald-300"></span>
      `;
      b2.appendChild(totEl);
      await _typeInto(totEl.querySelector('.bd-total-int'), `+ ${_fmt(row.interestAccrued)}`, skipRef);
    }
    await _delay(skipRef.skip ? 0 : 200);

    // ── SECTION 3 — CLOSING BALANCE WATERFALL ────────────────────────────────
    if (!content.isConnected) return;
    const { titleEl: t3, bodyEl: b3 } = _appendCard(content, '', 'bg-amber-400');
    await _typeInto(t3, 'How Closing Balance is Derived', skipRef);

    const waterfallItems = [
      { label: 'Opening Balance', amount: row.openingBalance,    color: 'text-blue-300',    sign: '' },
      ...(row.isRetired ? [] : [{ label: 'Income',    amount: row.annualIncome,    color: 'text-emerald-400', sign: '+' }]),
      { label: 'Total Expenses',  amount: -totalOut,             color: 'text-red-400',     sign: '−' },
      { label: 'Interest Earned', amount: row.interestAccrued,   color: 'text-purple-300',  sign: '+' },
      ...(sipPrincipal > 0 ? [{ label: 'SIP Principal', amount: sipPrincipal, color: 'text-teal-300', sign: '+' }] : []),
    ];

    for (const item of waterfallItems) {
      if (!b3.isConnected) return;
      const rowEl = document.createElement('div');
      rowEl.className = 'flex items-center justify-between py-1 border-b border-white/5';
      rowEl.innerHTML = `
        <span class="text-xs text-slate-400">${item.label}</span>
        <span class="bd-wf text-xs font-mono font-semibold ${item.color}"></span>
      `;
      b3.appendChild(rowEl);
      const displayVal = `${item.sign} ${_fmt(Math.abs(item.amount))}`.trim();
      await _typeInto(rowEl.querySelector('.bd-wf'), displayVal, skipRef);
    }

    // Final closing balance
    if (b3.isConnected) {
      const finalEl = document.createElement('div');
      finalEl.className = 'flex items-center justify-between pt-2 mt-1';
      finalEl.innerHTML = `
        <span class="text-xs font-bold text-slate-200">= Closing Balance</span>
        <span class="bd-final text-base font-bold font-mono ${row.closingBalance < 0 ? 'text-red-400' : 'text-white'}"></span>
      `;
      b3.appendChild(finalEl);
      await _typeInto(finalEl.querySelector('.bd-final'), formatRupee(Math.round(row.closingBalance)), skipRef);
    }

    // ── Done ──────────────────────────────────────────────────────────────────
    const skipBtn = document.getElementById('bd-skip-btn');
    if (skipBtn) { skipBtn.textContent = '✓ Done'; skipBtn.disabled = true; }

  })();
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
