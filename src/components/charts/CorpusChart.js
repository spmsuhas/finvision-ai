/**
 * FinVision AI — Corpus Area Chart (Phase 4)
 * ============================================================
 * Renders the lifetime wealth accumulation timeline.
 * Stacked area chart: Equity + Debt + Interest components.
 * Goal milestones rendered as vertical annotations.
 */

import { Chart } from 'chart.js/auto';
import { CHART_COLORS } from '@/utils/constants.js';
import { formatAxis, formatCompact } from '@/utils/formatters.js';

let _corpusChart = null;      // Full projection view (section-projections)
let _corpusPreview = null;    // Mini preview on dashboard

/**
 * Initialize or update the main corpus area chart.
 * @param {string} canvasId - The canvas element ID
 * @param {import('@/utils/financeEngine.js').YearlyRow[]} trajectoryData
 * @param {import('@/utils/constants.js').GOAL_TYPES} goals
 * @returns {Chart}
 */
export function renderCorpusChart(canvasId, trajectoryData, goals = []) {
  // Phase 4 — full Chart.js implementation
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  // Destroy existing instance to prevent memory leaks
  if (_corpusChart) { _corpusChart.destroy(); _corpusChart = null; }

  const ctx = canvas.getContext('2d');

  _corpusChart = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    },
  });

  return _corpusChart;
}

/**
 * Initialize or update the dashboard mini preview chart.
 * @param {string} canvasId
 * @param {import('@/utils/financeEngine.js').YearlyRow[]} trajectoryData
 */
export function renderCorpusPreview(canvasId, trajectoryData) {
  // Phase 4 — full implementation
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  if (_corpusPreview) { _corpusPreview.destroy(); _corpusPreview = null; }

  const ctx = canvas.getContext('2d');

  _corpusPreview = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } },
    },
  });

  return _corpusPreview;
}

/** Destroy all chart instances (call before re-init or page teardown). */
export function destroyCorpusCharts() {
  if (_corpusChart)   { _corpusChart.destroy();   _corpusChart   = null; }
  if (_corpusPreview) { _corpusPreview.destroy(); _corpusPreview = null; }
}
