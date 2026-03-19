/**
 * FinVision AI — Corpus Area Chart (Phase 4)
 * ============================================================
 * Renders the lifetime wealth accumulation timeline.
 * Stacked area chart: Contributions vs Compounding Gains.
 * Goal milestones rendered as star scatter points.
 */

import { Chart } from 'chart.js/auto';
import { CHART_COLORS } from '@/utils/constants.js';
import { formatAxis, formatCompact } from '@/utils/formatters.js';

let _corpusChart  = null;
let _corpusPreview = null;

const GRID   = 'rgba(255,255,255,0.05)';
const MUTED  = '#64748B';
const TT_BG  = '#1E293B';
const AMBER  = CHART_COLORS.EQUITY;   // '#FBBF24' golden-amber
const BLUE   = CHART_COLORS.DEBT;     // '#60A5FA' blue
const GREEN  = CHART_COLORS.INTEREST; // '#34D399' emerald

function makeGradient(ctx, top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height || 400);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  return g;
}

/**
 * Build the two stacked series from trajectory rows:
 *   series1 = cumulative contributions (initial corpus + net surpluses)
 *   series2 = compounding gains (closingBalance - contributions)
 */
function buildStackedSeries(rows) {
  if (!rows || rows.length === 0) return { contributions: [], gains: [] };
  const initCorpus = rows[0].openingBalance ?? 0;
  let cumContrib = initCorpus;
  const contributions = [];
  const gains = [];
  for (const r of rows) {
    cumContrib += Math.max(0, r.netSurplus ?? 0);
    const contrib = Math.min(cumContrib, Math.max(0, r.closingBalance));
    const gain    = Math.max(0, r.closingBalance - contrib);
    contributions.push(contrib);
    gains.push(gain);
  }
  return { contributions, gains };
}

/**
 * Initialize or update the main corpus area chart.
 * @param {string} canvasId
 * @param {Array} trajectoryData
 * @param {Array} goals
 * @returns {Chart|null}
 */
export function renderCorpusChart(canvasId, trajectoryData, goals = []) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  if (_corpusChart) { _corpusChart.destroy(); _corpusChart = null; }

  const rows = trajectoryData ?? [];
  if (rows.length === 0) return null;

  const ctx = canvas.getContext('2d');
  const { contributions, gains } = buildStackedSeries(rows);
  const labels = rows.map(r => `Age ${r.age}`);

  // Goal scatter — null everywhere except at goal target years
  const goalData = rows.map(r => {
    const hit = goals.find(g => g.targetYear === r.calendarYear);
    return hit ? Math.max(0, r.closingBalance) : null;
  });
  const hasGoals = goalData.some(v => v !== null);

  // Retirement index for vertical-style color change
  const retireIdx = rows.findIndex(r => r.annualIncome === 0);

  const gradContrib = makeGradient(ctx, 'rgba(96,165,250,0.60)',  'rgba(96,165,250,0.10)');
  const gradGains   = makeGradient(ctx, 'rgba(251,191,36,0.70)',  'rgba(251,191,36,0.05)');

  _corpusChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        // Bottom layer — contributions
        {
          label:              'Your Contributions',
          data:               contributions,
          fill:               'origin',
          backgroundColor:    gradContrib,
          borderColor:        BLUE,
          borderWidth:        2,
          tension:            0.38,
          pointRadius:        0,
          pointHoverRadius:   5,
          pointHoverBackgroundColor: '#fff',
          stack:              'corpus',
          order:              2,
        },
        // Top layer — gains stacked on contributions
        {
          label:              'Compounding Gains',
          data:               gains,
          fill:               '-1',
          backgroundColor:    gradGains,
          borderColor:        AMBER,
          borderWidth:        2,
          tension:            0.38,
          pointRadius:        0,
          pointHoverRadius:   5,
          pointHoverBackgroundColor: '#fff',
          stack:              'corpus',
          order:              1,
        },
        // Goal markers (scatter)
        ...(hasGoals ? [{
          type:               'scatter',
          label:              'Goals',
          data:               goalData,
          pointStyle:         'star',
          pointRadius:        9,
          pointHoverRadius:   12,
          backgroundColor:    '#F59E0B',
          borderColor:        '#fff',
          borderWidth:        1.5,
          showLine:           false,
          fill:               false,
          order:              0,
        }] : []),
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display:  true,
          position: 'top',
          align:    'end',
          labels: {
            color:    MUTED,
            boxWidth: 12,
            font:     { size: 11 },
            filter:   item => item.text !== 'Goals',
          },
        },
        tooltip: {
          backgroundColor: TT_BG,
          titleColor:      '#F8FAFC',
          bodyColor:       '#94A3B8',
          borderColor:     'rgba(255,255,255,0.1)',
          borderWidth:     1,
          padding:         12,
          callbacks: {
            title:  items => {
              const idx = items[0]?.dataIndex;
              const row = rows[idx];
              return row ? `Age ${row.age}  ·  FY ${row.calendarYear}` : '';
            },
            label: item => {
              const val = Array.isArray(item.raw) ? item.raw[1] : item.raw;
              return ` ${item.dataset.label}: ${formatCompact(val ?? 0)}`;
            },
            afterBody: items => {
              const idx = items[0]?.dataIndex;
              if (idx == null) return [];
              const total = (contributions[idx] ?? 0) + (gains[idx] ?? 0);
              const row   = rows[idx];
              const lines = [`  Total Corpus: ${formatCompact(total)}`];
              if (retireIdx > 0 && idx >= retireIdx) lines.push('  ↳ Drawdown phase');
              if (row && row.goalOutlays > 0) lines.push(`  Goal disbursed: ${formatCompact(row.goalOutlays)}`);
              return lines;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid:    { color: GRID },
          border:  { display: false },
          ticks:   { color: MUTED, maxTicksLimit: 12, font: { size: 11 } },
        },
        y: {
          stacked:      true,
          beginAtZero:  true,
          grid:         { color: GRID },
          border:       { display: false },
          ticks:        { color: MUTED, callback: v => formatAxis(v), font: { size: 11 } },
        },
      },
    },
  });

  return _corpusChart;
}

/**
 * Initialize or update the dashboard mini preview chart.
 * @param {string} canvasId
 * @param {Array} trajectoryData
 * @returns {Chart|null}
 */
export function renderCorpusPreview(canvasId, trajectoryData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  if (_corpusPreview) { _corpusPreview.destroy(); _corpusPreview = null; }

  const rows = trajectoryData ?? [];
  if (rows.length === 0) return null;

  const ctx = canvas.getContext('2d');
  const data = rows.map(r => Math.max(0, r.closingBalance));
  const grad = makeGradient(ctx, 'rgba(251,191,36,0.45)', 'rgba(251,191,36,0.02)');

  _corpusPreview = new Chart(ctx, {
    type: 'line',
    data: {
      labels:   rows.map(r => r.age),
      datasets: [{
        data,
        fill:            'origin',
        backgroundColor: grad,
        borderColor:     AMBER,
        borderWidth:     1.5,
        tension:         0.38,
        pointRadius:     0,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation:           false,
      plugins: {
        legend:  { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: { display: false },
        y: { display: false, beginAtZero: true },
      },
    },
  });

  return _corpusPreview;
}

/** Destroy all chart instances (call before re-init or page teardown). */
export function destroyCorpusCharts() {
  if (_corpusChart)   { _corpusChart.destroy();   _corpusChart   = null; }
  if (_corpusPreview) { _corpusPreview.destroy(); _corpusPreview = null; }
}
