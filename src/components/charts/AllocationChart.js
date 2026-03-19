/**
 * FinVision AI — Asset Allocation Doughnut Chart (Phase 4)
 * ============================================================
 * Animated doughnut chart showing Equity vs Debt allocation.
 * Updates in real-time as the user moves the allocation slider.
 */

import { Chart } from 'chart.js/auto';
import { CHART_COLORS } from '@/utils/constants.js';
import { blendedReturn } from '@/utils/constants.js';
import { formatPercent } from '@/utils/formatters.js';

let _allocationChart = null;

/**
 * Initialize or update the allocation doughnut chart.
 * @param {string} canvasId
 * @param {number} equityPct   - 0 to 100
 * @param {number} debtPct     - 0 to 100
 */
export function renderAllocationChart(canvasId, equityPct, debtPct) {
  // Phase 4 — full Chart.js implementation
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  if (_allocationChart) {
    // Update existing chart data (triggers animation)
    _allocationChart.data.datasets[0].data = [equityPct, debtPct];
    _allocationChart.update('active');
    return _allocationChart;
  }

  const ctx = canvas.getContext('2d');

  _allocationChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Equity', 'Debt'],
      datasets: [{
        data:            [equityPct, debtPct],
        backgroundColor: [CHART_COLORS.EQUITY, CHART_COLORS.DEBT],
        borderWidth:     0,
        hoverOffset:     6,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout:              '72%',
      plugins: {
        legend:  { display: false },
        tooltip: { enabled: false }, // Custom tooltip in Phase 4
      },
      animation: { animateRotate: true, duration: 600 },
    },
  });

  return _allocationChart;
}

export function destroyAllocationChart() {
  if (_allocationChart) { _allocationChart.destroy(); _allocationChart = null; }
}
