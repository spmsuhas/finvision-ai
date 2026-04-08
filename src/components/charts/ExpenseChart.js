/**
 * FinVision AI — Monthly Cash Flow Bar Chart (Phase 4)
 * ============================================================
 * Horizontal stacked bar chart visualizing monthly income breakdown
 * with grouped expense categories.
 */

import { Chart } from 'chart.js/auto';
import { CHART_COLORS } from '@/utils/constants.js';
import { formatCompact } from '@/utils/formatters.js';

let _expenseChart = null;

const GROUP_COLORS = {
  home:      'rgba(96,165,250,0.85)',   // blue-400
  food:      'rgba(251,191,36,0.85)',   // amber-400
  transport: 'rgba(167,139,250,0.85)',  // violet-400
  education: 'rgba(34,211,238,0.85)',   // cyan-400
  lifestyle: 'rgba(251,113,133,0.85)',  // rose-400
  other:     'rgba(52,211,153,0.85)',   // emerald-400
};

const GROUP_LABELS = {
  home:      'Home',
  food:      'Food',
  transport: 'Transport',
  education: 'Education',
  lifestyle: 'Lifestyle',
  other:     'Other',
};

/**
 * @param {string} canvasId
 * @param {Object} data
 * @param {number} data.income
 * @param {Object} data.groups - { home, food, transport, education, lifestyle, other }
 * @param {number} data.medical
 * @param {number} data.emi
 * @param {number} data.taxes
 * @param {number} data.investable
 */
export function renderExpenseChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const { groups = {}, medical = 0, emi = 0, taxes = 0, investable = 0 } = data;

  // Build datasets: one per group + medical + EMI + tax + investable
  const groupKeys = ['home', 'food', 'transport', 'education', 'lifestyle', 'other'];
  const dsData = [
    ...groupKeys.map(k => ({ label: GROUP_LABELS[k], data: [groups[k] || 0], bg: GROUP_COLORS[k] })),
    { label: 'Medical',    data: [medical],    bg: 'rgba(244,114,182,0.85)' },
    { label: 'EMI',        data: [emi],        bg: 'rgba(167,243,208,0.85)' },
    { label: 'Tax',        data: [taxes],      bg: 'rgba(148,163,184,0.75)' },
    { label: 'Investable', data: [investable], bg: 'rgba(52,211,153,0.85)'  },
  ];

  if (_expenseChart) {
    dsData.forEach((d, i) => {
      if (_expenseChart.data.datasets[i]) {
        _expenseChart.data.datasets[i].data = d.data;
      }
    });
    _expenseChart.update('active');
    return _expenseChart;
  }

  const ctx = canvas.getContext('2d');

  _expenseChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Monthly Income'],
      datasets: dsData.map(d => ({
        label: d.label,
        data: d.data,
        backgroundColor: d.bg,
      })),
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      indexAxis:           'y',
      plugins: {
        legend: {
          display:  true,
          position: 'bottom',
          labels:   { color: '#94A3B8', boxWidth: 10, font: { size: 10 }, padding: 8 },
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
