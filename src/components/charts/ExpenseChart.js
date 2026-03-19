/**
 * FinVision AI — Monthly Expense Bar Chart (Phase 4)
 * ============================================================
 * Horizontal bar chart showing the breakdown of monthly expenses
 * vs. the total monthly income (cash flow visualization).
 */

import { Chart } from 'chart.js/auto';
import { CHART_COLORS } from '@/utils/constants.js';
import { formatCompact } from '@/utils/formatters.js';

let _expenseChart = null;

/**
 * @typedef {Object} CashFlowData
 * @property {number} income        - Monthly gross income (₹)
 * @property {number} lifestyle     - Lifestyle expenses (₹)
 * @property {number} medical       - Medical / insurance (₹)
 * @property {number} emi           - EMI / loan payments (₹)
 * @property {number} taxes         - Monthly tax provision (₹)
 * @property {number} investable    - Remaining investable surplus (₹)
 */

/**
 * Initialize or update the expense bar chart.
 * @param {string} canvasId
 * @param {CashFlowData} data
 */
export function renderExpenseChart(canvasId, data) {
  // Phase 4 — full Chart.js implementation
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  if (_expenseChart) {
    _expenseChart.destroy();
    _expenseChart = null;
  }

  const ctx = canvas.getContext('2d');

  _expenseChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      indexAxis:           'y',
      plugins:             { legend: { display: false } },
    },
  });

  return _expenseChart;
}

export function destroyExpenseChart() {
  if (_expenseChart) { _expenseChart.destroy(); _expenseChart = null; }
}
