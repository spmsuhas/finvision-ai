/**
 * FinVision AI — PDF Report Export (Phase 5)
 * ============================================================
 * Generates a multi-page PDF dossier using jsPDF + html2canvas.
 * Sections: AI Summary, Tax Comparison, Charts, Projection Table.
 */

// Phase 5 — full implementation.
// Stub prevents import errors during Phases 1–4.

/**
 * @typedef {Object} ReportOptions
 * @property {string} title        - Report title
 * @property {string} preparedFor  - Person's name
 * @property {string} date         - Report date string
 * @property {boolean} includeSummary
 * @property {boolean} includeTax
 * @property {boolean} includeCharts
 * @property {boolean} includeTable
 * @property {boolean} includeGoals
 */

/**
 * Generate and download the full PDF financial plan.
 * @param {Object} appState              - Complete application state
 * @param {ReportOptions} options
 * @returns {Promise<void>}
 */
export async function generatePDFReport(appState, options) {
  // Phase 5 — will use jsPDF + html2canvas
  console.info('[PDFExport] Phase 5: PDF generation not yet implemented.');
  alert('PDF export will be available in Phase 5.');
}

/**
 * Show a toast notification while PDF is generating.
 * @param {Function} showToast - toast utility from main.js
 */
export function downloadWithProgress(appState, options, showToast) {
  showToast('PDF generation coming in Phase 5!', 'info');
}
