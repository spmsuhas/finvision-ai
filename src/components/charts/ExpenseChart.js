/**
 * FinVision AI — Monthly Cash Flow Bar Chart (Phase 4)
 * ============================================================
 * Horizontal stacked bar chart visualizing monthly income breakdown:
 * Lifestyle | Medical | EMI | Tax Provision | Investable Surplus
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
 * @returns {Chart|null}
 */
export function renderExpenseChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const { lifestyle = 0, medical = 0, emi = 0, taxes = 0, investable = 0 } = data;

  if (_expenseChart) {
    // Update data in place for smooth animation
    const ds = _expenseChart.data.datasets;
    ds[0].data = [lifestyle];
    ds[1].data = [medical];
    ds[2].data = [emi];
    ds[3].data = [taxes];
    ds[4].data = [investable];
    _expenseChart.update('active');
    return _expenseChart;
  }

  const ctx = canvas.getContext('2d');

  _expenseChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Monthly Income'],
      datasets: [
        { label: 'Lifestyle',  data: [lifestyle],  backgroundColor: 'rgba(248,113,113,0.85)' },
        { label: 'Medical',    data: [medical],    backgroundColor: 'rgba(251,191,36,0.85)'  },
        { label: 'EMI',        data: [emi],        backgroundColor: 'rgba(167,243,208,0.85)' },
        { label: 'Tax',        data: [taxes],      backgroundColor: 'rgba(148,163,184,0.75)' },
        { label: 'Investable', data: [investable], backgroundColor: 'rgba(52,211,153,0.85)'  },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      indexAxis:           'y',
      plugins: {
        legend: {
          display:  true,
          position: 'bottom',
          labels:   { color: '#94A3B8', boxWidth: 12, font: { size: 11 } },
        },
        tooltip: {
          backgroundColor: '#1E293B',
          titleColor:      '#F8FAFC',
          bodyColor:       '#94A3B8',
          borderColor:     'rgba(255,255,255,0.1)',
          borderWidth:     1,
          callbacks: {
            title:  () => 'Monthly Cash Flow',
            label:  item => ` ${item.dataset.label}: ${formatCompact(item.raw)}`,
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid:    { color: 'rgba(255,255,255,0.05)' },
          border:  { display: false },
          ticks:   { color: '#64748B', callback: v => formatCompact(v), font: { size: 10 } },
        },
        y: {
          stacked: true,
          display: false,
        },
      },
      animation: { duration: 400 },
    },
  });

  return _expenseChart;
}

export function destroyExpenseChart() {
  if (_expenseChart) { _expenseChart.destroy(); _expenseChart = null; }
}
