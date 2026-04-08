/**
 * FinVision AI — Asset Allocation Doughnut Chart (ALM Edition)
 * ============================================================
 * 4-segment doughnut: Equity (blue) · Debt (green) · Real Assets (amber) · Cash (slate)
 */

import { Chart } from 'chart.js/auto';
import { INFLATION, RETURNS } from '@/utils/constants.js';
import { formatPercent } from '@/utils/formatters.js';

let _allocationChart = null;

const SEG_COLORS = [
  'rgba(96,165,250,0.9)',   // blue-400  — Equity
  'rgba(52,211,153,0.9)',   // emerald-400 — Debt
  'rgba(251,191,36,0.9)',   // amber-400 — Real Assets
  'rgba(148,163,184,0.9)',  // slate-400 — Cash & Alts
];

/**
 * Initialize or update the 4-segment allocation chart.
 * @param {string} canvasId
 * @param {{ equityPct: number, debtPct: number, realAssetsPct: number, cashPct: number }} alloc
 * @param {number} [inflationRate] - decimal, e.g. 0.08
 */
export function renderAllocationChart(canvasId, alloc, inflationRate = INFLATION.GENERAL) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const { equityPct = 0, debtPct = 0, realAssetsPct = 0, cashPct = 0 } = alloc;
  const ir = inflationRate ?? INFLATION.GENERAL;

  const cagrs = [
    RETURNS.EQUITY * 100,                         // Equity: 13%
    RETURNS.DEBT   * 100,                         // Debt:   7%
    (ir + RETURNS.GOLD_SPREAD) * 100,             // Real Assets: inflation + 1.5%
    RETURNS.CASH   * 100,                         // Cash:   4%
  ];

  if (_allocationChart) {
    _allocationChart.data.datasets[0].data = [equityPct, debtPct, realAssetsPct, cashPct];
    _allocationChart.options.plugins.tooltip.callbacks.label = item => {
      return ` ${item.label}: ${item.raw}%  (${cagrs[item.dataIndex].toFixed(1)}% CAGR)`;
    };
    _allocationChart.update('active');
    return _allocationChart;
  }

  const ctx = canvas.getContext('2d');

  _allocationChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Equity', 'Debt', 'Real Assets', 'Cash & Alts'],
      datasets: [{
        data:            [equityPct, debtPct, realAssetsPct, cashPct],
        backgroundColor: SEG_COLORS,
        borderWidth:     0,
        hoverOffset:     6,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout:              '72%',
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
            label: item => {
              return ` ${item.label}: ${item.raw}%  (${cagrs[item.dataIndex].toFixed(1)}% CAGR)`;
            },
          },
        },
      },
      animation: { animateRotate: true, duration: 600 },
    },
  });

  return _allocationChart;
}

export function destroyAllocationChart() {
  if (_allocationChart) { _allocationChart.destroy(); _allocationChart = null; }
}

