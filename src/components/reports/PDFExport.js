/**
 * FinVision AI — PDF Report Export (Phase 5)
 * ============================================================
 * Multi-page professional PDF using jsPDF + html2canvas.
 * Pages: Cover → KPI Summary → Tax Comparison → Goals → Corpus Chart → Data Table
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { formatRupee, formatCompact } from '@/utils/formatters.js';

/* ─── Layout constants ─────────────────────────────────────── */
const PAGE_W      = 210;   // A4 mm width
const PAGE_H      = 297;   // A4 mm height
const MARGIN      = 16;
const CONTENT_W   = PAGE_W - MARGIN * 2;
const TOP_BAND    = 28;    // dark header band height

/* ─── Colour helpers ───────────────────────────────────────── */
const HEX = {
  BRAND:   [250, 204,  21],   // amber-400 #FACC15
  BG:      [ 15,  23,  42],   // slate-900
  CARD:    [ 30,  41,  59],   // slate-800
  WHITE:   [248, 250, 252],
  MUTED:   [100, 116, 135],
  GREEN:   [ 52, 211, 153],
  RED:     [248, 113, 113],
  BLUE:    [ 96, 165, 250],
};

function setFill(doc, [r, g, b]) { doc.setFillColor(r, g, b); }
function setDraw(doc, [r, g, b]) { doc.setDrawColor(r, g, b); }
function setTxt(doc, [r, g, b])  { doc.setTextColor(r, g, b); }

/* ─── Header / Footer ──────────────────────────────────────── */
function addPageHeader(doc, title, pageNum) {
  setFill(doc, HEX.BG);
  doc.rect(0, 0, PAGE_W, TOP_BAND, 'F');

  // Amber accent strip
  setFill(doc, HEX.BRAND);
  doc.rect(0, TOP_BAND - 2, PAGE_W, 2, 'F');

  setTxt(doc, HEX.BRAND);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('FinVision AI', MARGIN, 12);

  setTxt(doc, HEX.WHITE);
  doc.setFontSize(13);
  doc.text(title, MARGIN, 22);

  setTxt(doc, HEX.MUTED);
  doc.setFontSize(8);
  doc.text(`Page ${pageNum}`, PAGE_W - MARGIN, 22, { align: 'right' });
}

function addPageFooter(doc, preparedFor, date) {
  const y = PAGE_H - 8;
  setTxt(doc, HEX.MUTED);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Prepared for ${preparedFor}  ·  ${date}  ·  FinVision AI — For informational purposes only`, PAGE_W / 2, y, { align: 'center' });
}

/* ─── KPI row helper ───────────────────────────────────────── */
function addKPIGrid(doc, kpis, startY) {
  const cols = 3;
  const cellW = CONTENT_W / cols;
  const cellH = 24;

  kpis.forEach((kpi, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x   = MARGIN + col * cellW;
    const y   = startY + row * (cellH + 4);

    setFill(doc, HEX.CARD);
    doc.roundedRect(x, y, cellW - 2, cellH, 2, 2, 'F');

    setTxt(doc, HEX.MUTED);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(kpi.label, x + 6, y + 8);

    setTxt(doc, kpi.accent ?? HEX.WHITE);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.value, x + 6, y + 18);
  });

  return startY + Math.ceil(kpis.length / cols) * (cellH + 4) + 4;
}

/* ─── Section heading ──────────────────────────────────────── */
function addSectionHeading(doc, text, y) {
  setTxt(doc, HEX.BRAND);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(text, MARGIN, y);

  setDraw(doc, HEX.BRAND);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y + 2, PAGE_W - MARGIN, y + 2);

  return y + 8;
}

/* ─── Capture canvas as image ──────────────────────────────── */
async function captureCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  // Render chart canvas to a new canvas via html2canvas for clean background
  try {
    const snap = await html2canvas(canvas.parentElement ?? canvas, {
      backgroundColor: '#1E293B',
      scale:           2,
      logging:         false,
      useCORS:         true,
    });
    return snap.toDataURL('image/png');
  } catch {
    return null;
  }
}

/* ─── Main export function ─────────────────────────────────── */
/**
 * Generate and download the full PDF financial plan.
 * @param {Object} appState
 * @param {Object} options
 */
export async function generatePDFReport(appState, options = {}) {
  const {
    title        = 'FinVision AI — Financial Plan',
    preparedFor  = appState.userName || 'Investor',
    date         = new Date().toLocaleDateString('en-IN'),
    includeSummary = true,
    includeTax     = true,
    includeCharts  = true,
    includeTable   = true,
    includeGoals   = true,
  } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let pageNum = 1;

  /* ── Page 1: Cover ─────────────────────────────────────── */
  setFill(doc, HEX.BG);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Amber decorative circle
  setFill(doc, [40, 34, 3]);
  doc.circle(PAGE_W - 20, 60, 80, 'F');

  setTxt(doc, HEX.BRAND);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('FinVision AI', MARGIN, 60);

  setTxt(doc, HEX.WHITE);
  doc.setFontSize(24);
  doc.text('Financial Planning', MARGIN, 80);
  doc.text('Report', MARGIN, 92);

  setFill(doc, HEX.BRAND);
  doc.rect(MARGIN, 97, 40, 1.5, 'F');

  setTxt(doc, HEX.MUTED);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Prepared for: ${preparedFor}`, MARGIN, 110);
  doc.text(`Date: ${date}`, MARGIN, 118);
  doc.text(`Health Score: ${appState.planHealth ?? 0} / 100`, MARGIN, 126);

  setTxt(doc, HEX.MUTED);
  doc.setFontSize(7.5);
  doc.text('This report is generated by FinVision AI for informational purposes only.', MARGIN, PAGE_H - 20);
  doc.text('It does not constitute investment advice. Please consult a SEBI-registered advisor.', MARGIN, PAGE_H - 15);

  /* ── Page 2: Financial Summary ─────────────────────────── */
  doc.addPage();
  pageNum++;
  setFill(doc, HEX.BG);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  addPageHeader(doc, 'Financial Summary', pageNum);
  addPageFooter(doc, preparedFor, date);

  const corpus = appState.currentEquity + appState.currentDebt + appState.currentEPF;
  const retireRow = appState.trajectory?.find(r => r.age === appState.retirementAge);
  const termRow   = appState.trajectory?.[appState.trajectory.length - 1];
  const depletion = appState.trajectory?.find(r => r.closingBalance < 0)?.age ?? 'Never';

  let y = TOP_BAND + 8;
  y = addSectionHeading(doc, 'Key Performance Indicators', y);
  y = addKPIGrid(doc, [
    { label: 'Current Corpus',       value: formatCompact(corpus),                       accent: HEX.WHITE },
    { label: 'Monthly Income',       value: formatCompact(appState.monthlyIncome),        accent: HEX.GREEN },
    { label: 'Monthly Surplus',      value: formatCompact(Math.max(0, appState.monthlyIncome - appState.monthlyExpenses - appState.monthlyMedicalPremium - appState.monthlyEMI)), accent: HEX.GREEN },
    { label: 'Corpus at Retirement', value: retireRow ? formatCompact(retireRow.closingBalance) : '—', accent: HEX.BRAND },
    { label: 'Terminal Corpus',      value: termRow   ? formatCompact(termRow.closingBalance)   : '—', accent: termRow?.closingBalance > 0 ? HEX.GREEN : HEX.RED },
    { label: 'Depletion Age',        value: String(depletion), accent: depletion === 'Never' ? HEX.GREEN : HEX.RED },
    { label: 'Retirement Age',       value: String(appState.retirementAge),               accent: HEX.WHITE },
    { label: 'Equity Allocation',    value: `${appState.equityPercent}%`,                 accent: HEX.BRAND },
    { label: 'Plan Health Score',    value: `${appState.planHealth ?? 0} / 100`,          accent: (appState.planHealth ?? 0) >= 70 ? HEX.GREEN : HEX.RED },
  ], y);

  /* ── Tax section (optional) ─────────────────────────────── */
  if (includeTax && appState.taxComparison) {
    y += 4;
    y = addSectionHeading(doc, 'Tax Regime Comparison', y);
    const { newRegime, oldRegime, recommended, saving } = appState.taxComparison;

    const taxRows = [
      ['Gross Income', formatRupee(newRegime.grossIncome ?? 0), formatRupee(oldRegime.grossIncome ?? 0)],
      ['Total Tax',    formatRupee(newRegime.totalTax),         formatRupee(oldRegime.totalTax)],
      ['Effective Rate', `${newRegime.effectiveRate?.toFixed(2) ?? 0}%`, `${oldRegime.effectiveRate?.toFixed(2) ?? 0}%`],
    ];

    // Header
    setFill(doc, HEX.CARD);
    doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
    setTxt(doc, HEX.MUTED);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('', MARGIN + 4, y + 5.5);
    doc.text('New Regime', MARGIN + CONTENT_W * 0.4, y + 5.5);
    doc.text('Old Regime', MARGIN + CONTENT_W * 0.7, y + 5.5);
    y += 8;

    taxRows.forEach((row, i) => {
      setFill(doc, i % 2 === 0 ? HEX.BG : HEX.CARD);
      doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
      setTxt(doc, HEX.MUTED);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(row[0], MARGIN + 4, y + 5);
      setTxt(doc, HEX.WHITE);
      doc.text(row[1], MARGIN + CONTENT_W * 0.4, y + 5);
      doc.text(row[2], MARGIN + CONTENT_W * 0.7, y + 5);
      y += 7;
    });

    y += 4;
    setFill(doc, recommended === 'NEW' ? [20, 60, 30] : [20, 30, 60]);
    doc.roundedRect(MARGIN, y, CONTENT_W, 10, 2, 2, 'F');
    setTxt(doc, HEX.GREEN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(
      `★ Recommended: ${recommended === 'NEW' ? 'New Regime' : 'Old Regime'}  ·  Annual saving: ${formatRupee(saving)}`,
      MARGIN + 4, y + 6.5
    );
    y += 14;
  }

  /* ── Goals section ──────────────────────────────────────── */
  if (includeGoals && appState.goals?.length > 0) {
    if (y + 60 > PAGE_H - 20) { doc.addPage(); pageNum++; setFill(doc, HEX.BG); doc.rect(0,0,PAGE_W,PAGE_H,'F'); addPageHeader(doc, 'Life Goals', pageNum); addPageFooter(doc, preparedFor, date); y = TOP_BAND + 8; }
    y = addSectionHeading(doc, 'Life Goals', y);

    appState.goals.forEach(g => {
      const yrs      = g.targetYear ? Math.max(0, g.targetYear - (appState.planStartYear ?? new Date().getFullYear())) : 0;
      const inflated = g.todayValue * Math.pow(1 + (g.inflationRate ?? 0.08), yrs);

      setFill(doc, HEX.CARD);
      doc.roundedRect(MARGIN, y, CONTENT_W, 14, 2, 2, 'F');

      setTxt(doc, HEX.WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(g.name, MARGIN + 4, y + 6);

      setTxt(doc, HEX.MUTED);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`${g.type}  ·  Target: ${g.targetYear ?? '—'}  ·  Today's value: ${formatRupee(g.todayValue)}  ·  Inflated cost: ${formatRupee(inflated)}`, MARGIN + 4, y + 11);
      y += 17;

      if (y > PAGE_H - 20) { doc.addPage(); pageNum++; setFill(doc, HEX.BG); doc.rect(0,0,PAGE_W,PAGE_H,'F'); addPageHeader(doc, 'Life Goals (cont.)', pageNum); addPageFooter(doc, preparedFor, date); y = TOP_BAND + 8; }
    });
  }

  /* ── Chart page ─────────────────────────────────────────── */
  if (includeCharts) {
    const imgData = await captureCanvas('chart-corpus-main');
    if (imgData) {
      doc.addPage();
      pageNum++;
      setFill(doc, HEX.BG);
      doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
      addPageHeader(doc, 'Wealth Accumulation Timeline', pageNum);
      addPageFooter(doc, preparedFor, date);

      doc.addImage(imgData, 'PNG', MARGIN, TOP_BAND + 6, CONTENT_W, 120);
    }
  }

  /* ── Projection table pages ─────────────────────────────── */
  if (includeTable && appState.trajectory?.length > 0) {
    doc.addPage();
    pageNum++;
    setFill(doc, HEX.BG);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
    addPageHeader(doc, 'Year-by-Year Projection', pageNum);
    addPageFooter(doc, preparedFor, date);

    y = TOP_BAND + 6;

    // Table header
    const cols = [
      { label: 'Year',    x: MARGIN,          w: 16 },
      { label: 'Age',     x: MARGIN + 16,      w: 12 },
      { label: 'Income',  x: MARGIN + 28,      w: 30 },
      { label: 'Expenses',x: MARGIN + 58,      w: 30 },
      { label: 'Surplus', x: MARGIN + 88,      w: 28 },
      { label: 'Interest',x: MARGIN + 116,     w: 28 },
      { label: 'Balance', x: MARGIN + 144,     w: 34 },
    ];

    const drawTableHeader = () => {
      setFill(doc, HEX.CARD);
      doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
      setTxt(doc, HEX.MUTED);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      cols.forEach(c => doc.text(c.label, c.x + 1, y + 5));
      return y + 7;
    };

    y = drawTableHeader();

    appState.trajectory.forEach((r, i) => {
      if (y > PAGE_H - 14) {
        doc.addPage();
        pageNum++;
        setFill(doc, HEX.BG);
        doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
        addPageHeader(doc, 'Year-by-Year Projection (cont.)', pageNum);
        addPageFooter(doc, preparedFor, date);
        y = TOP_BAND + 6;
        y = drawTableHeader();
      }

      const isNeg = r.closingBalance < 0;
      const isGoal = r.goalOutlays > 0;
      setFill(doc, isNeg ? [60, 20, 20] : isGoal ? [50, 40, 10] : i % 2 === 0 ? HEX.BG : HEX.CARD);
      doc.rect(MARGIN, y, CONTENT_W, 5.5, 'F');

      setTxt(doc, isNeg ? HEX.RED : HEX.WHITE);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      const surplus = r.netSurplus ?? 0;
      const vals = [
        String(r.calendarYear),
        String(r.age) + (r.annualIncome === 0 ? 'R' : ''),
        formatCompact(r.annualIncome),
        formatCompact(r.totalExpenses),
        formatCompact(surplus),
        formatCompact(r.interestAccrued),
        formatCompact(r.closingBalance),
      ];
      cols.forEach((c, ci) => doc.text(vals[ci], c.x + 1, y + 4));
      y += 5.5;
    });
  }

  /* ── AI Summary page (if available) ────────────────────── */
  if (includeSummary) {
    const summaryEl = document.getElementById('ai-summary-text');
    const summaryText = summaryEl?.textContent?.trim();
    if (summaryText && !summaryText.startsWith('Complete your') && !summaryText.startsWith('AI summary')) {
      doc.addPage();
      pageNum++;
      setFill(doc, HEX.BG);
      doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
      addPageHeader(doc, 'AI Executive Summary', pageNum);
      addPageFooter(doc, preparedFor, date);

      y = TOP_BAND + 8;
      setFill(doc, HEX.CARD);
      doc.roundedRect(MARGIN, y, CONTENT_W, PAGE_H - y - 20, 3, 3, 'F');

      y += 8;
      setTxt(doc, HEX.WHITE);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(summaryText, CONTENT_W - 10);
      doc.text(lines, MARGIN + 5, y);
    }
  }

  doc.save(`FinVision-AI-Report-${preparedFor.replace(/\s+/g, '-')}-${new Date().getFullYear()}.pdf`);
}

/**
 * Show a toast notification while PDF is generating.
 */
export function downloadWithProgress(appState, options, showToast) {
  showToast('Generating PDF report…', 'info');
  generatePDFReport(appState, options)
    .then(() => showToast('PDF downloaded successfully!', 'success'))
    .catch(err => showToast(`PDF error: ${err.message}`, 'error'));
}

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


