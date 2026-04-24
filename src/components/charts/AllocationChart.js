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

const SEG_COLORS_TARGET = [
  'rgba(96,165,250,0.35)',
  'rgba(52,211,153,0.35)',
  'rgba(251,191,36,0.35)',
  'rgba(148,163,184,0.35)',
];

/**
 * Initialize or update the 4-segment allocation chart.
 * @param {string} canvasId
 * @param {{ equityPct: number, debtPct: number, realAssetsPct: number, cashPct: number }} alloc
 * @param {number} [inflationRate] - decimal, e.g. 0.08
 * @param {{ equity: number, debt: number, realAssets: number, cash: number } | null} [targetAllocation]
 */
export function renderAllocationChart(canvasId, alloc, inflationRate = INFLATION.GENERAL, targetAllocation = null) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const { equityPct = 0, debtPct = 0, realAssetsPct = 0, cashPct = 0 } = alloc;
  const ir = inflationRate ?? INFLATION.GENERAL;

  const cagrs = [
    RETURNS.EQUITY * 100,
    RETURNS.DEBT   * 100,
    (ir + RETURNS.GOLD_SPREAD) * 100,
    RETURNS.CASH   * 100,
  ];

  // Target ring data — zeros when no target set (renders invisibly)
  const targetData   = targetAllocation
    ? [targetAllocation.equity || 0, targetAllocation.debt || 0, targetAllocation.realAssets || 0, targetAllocation.cash || 0]
    : [0, 0, 0, 0];
  const targetColors = targetAllocation ? SEG_COLORS_TARGET : SEG_COLORS_TARGET.map(() => 'rgba(0,0,0,0)');

  if (_allocationChart) {
    _allocationChart.data.datasets[0].data = [equityPct, debtPct, realAssetsPct, cashPct];
    _allocationChart.data.datasets[1].data = targetData;
    _allocationChart.data.datasets[1].backgroundColor = targetColors;
    _allocationChart.options.plugins.tooltip.callbacks.label = (item) => {
      if (item.datasetIndex === 0) {
        return ` Actual ${item.label}: ${item.raw.toFixed(1)}%  (${cagrs[item.dataIndex].toFixed(1)}% CAGR)`;
      }
      return ` Target ${item.label}: ${item.raw.toFixed(1)}%`;
    };
    _allocationChart.update('active');
    return _allocationChart;
  }

  const ctx = canvas.getContext('2d');

  _allocationChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Equity', 'Debt', 'Real Assets', 'Cash & Alts'],
      datasets: [
        {
          label:           'Actual',
          data:            [equityPct, debtPct, realAssetsPct, cashPct],
          backgroundColor: SEG_COLORS,
          borderWidth:     0,
          hoverOffset:     6,
        },
        {
          label:           'Target',
          data:            targetData,
          backgroundColor: targetColors,
          borderWidth:     1,
          borderColor:     'rgba(255,255,255,0.2)',
          hoverOffset:     0,
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout:              '65%',
      plugins: {
        legend: {
          display:  true,
          position: 'bottom',
          labels:   { color: '#94A3B8', boxWidth: 10, font: { size: 10 }, padding: 8,
            filter: item => item.datasetIndex === 0 },
        },
        tooltip: {
          backgroundColor: '#1E293B',
          titleColor:      '#F8FAFC',
          bodyColor:       '#94A3B8',
          borderColor:     'rgba(255,255,255,0.1)',
          borderWidth:     1,
          callbacks: {
            label: (item) => {
              if (item.datasetIndex === 0) {
                return ` Actual ${item.label}: ${item.raw.toFixed(1)}%  (${cagrs[item.dataIndex].toFixed(1)}% CAGR)`;
              }
              return ` Target ${item.label}: ${item.raw.toFixed(1)}%`;
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

