/**
 * FinVision AI — Indian Number System Formatters
 * ============================================================
 * All monetary display follows the Indian numbering system:
 *   • 1,00,000     = 1 Lakh
 *   • 10,00,000    = 10 Lakhs
 *   • 1,00,00,000  = 1 Crore
 *   • 100,00,00,000 = 100 Crores
 *
 * Uses browser-native Intl.NumberFormat with 'en-IN' locale
 * for correct comma placement, falling back to manual grouping.
 */

import { APP } from './constants.js';

/* ─────────────────────────────────────────────────────────────
   CORE NUMBER FORMATTERS
───────────────────────────────────────────────────────────── */

/** Intl formatter for Indian locale, 0 decimal places */
const _intlRupee = new Intl.NumberFormat(APP.LOCALE, {
  style:                 'currency',
  currency:              'INR',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** Intl formatter for Indian locale, 2 decimal places */
const _intlRupee2 = new Intl.NumberFormat(APP.LOCALE, {
  style:                 'currency',
  currency:              'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

/** Intl formatter for plain numbers (no ₹ symbol) */
const _intlNum = new Intl.NumberFormat(APP.LOCALE, {
  maximumFractionDigits: 0,
});

/**
 * Format a number as Indian Rupees with ₹ symbol.
 * @param {number} amount - The amount in rupees
 * @param {number} [decimals=0] - Number of decimal places (0 or 2)
 * @returns {string}  e.g. "₹12,50,000" or "₹12,50,000.50"
 */
export function formatRupee(amount, decimals = 0) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹–';
  const formatter = decimals > 0 ? _intlRupee2 : _intlRupee;
  return formatter.format(Math.round(amount));
}

/**
 * Format a number with Indian grouping (no ₹ symbol).
 * @param {number} n
 * @returns {string}  e.g. "12,50,000"
 */
export function formatNumber(n) {
  if (n === null || n === undefined || isNaN(n)) return '–';
  return _intlNum.format(Math.round(n));
}

/* ─────────────────────────────────────────────────────────────
   COMPACT / ABBREVIATED DISPLAY
   Used for KPI cards, chart axis labels, and tooltips where
   full rupee strings would be too wide.
───────────────────────────────────────────────────────────── */

/**
 * Convert rupee amount to compact Indian notation.
 * @param {number} amount
 * @param {number} [precision=2] - Decimal places in abbreviated form
 * @returns {string} e.g. "₹1.25 Cr", "₹45.5 L", "₹9,500"
 */
export function formatCompact(amount, precision = 2) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹–';

  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1e7) {
    // Crore (1,00,00,000)
    return `${sign}₹${+(abs / 1e7).toFixed(precision)} Cr`;
  }
  if (abs >= 1e5) {
    // Lakh (1,00,000)
    return `${sign}₹${+(abs / 1e5).toFixed(precision)} L`;
  }
  if (abs >= 1000) {
    // Thousands — keep plain
    return `${sign}₹${+(abs / 1000).toFixed(1)}K`;
  }
  return `${sign}₹${Math.round(abs)}`;
}

/**
 * Compact form without precision rounding (strips trailing zeros).
 * Good for chart axis labels.
 * @param {number} amount
 * @returns {string} e.g. "₹5 Cr", "₹20 L"
 */
export function formatAxis(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1e7)  return `${sign}₹${(abs / 1e7).toFixed(1).replace(/\.0$/, '')} Cr`;
  if (abs >= 1e5)  return `${sign}₹${(abs / 1e5).toFixed(1).replace(/\.0$/, '')} L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(0)}K`;
  return `${sign}₹${abs}`;
}

/* ─────────────────────────────────────────────────────────────
   PERCENTAGE FORMATTERS
───────────────────────────────────────────────────────────── */

const _intlPct = new Intl.NumberFormat(APP.LOCALE, {
  style:                 'percent',
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

/**
 * Format a decimal as a percentage.
 * @param {number} rate - e.g. 0.085
 * @returns {string}  e.g. "8.5%"
 */
export function formatPercent(rate) {
  if (rate === null || rate === undefined || isNaN(rate)) return '–%';
  return _intlPct.format(rate);
}

/**
 * Format an integer percentage (e.g., from slider value 60 → "60%").
 * @param {number} val - e.g. 60
 * @returns {string} "60%"
 */
export function formatPctInt(val) {
  if (val === null || val === undefined || isNaN(val)) return '–%';
  return `${val}%`;
}

/* ─────────────────────────────────────────────────────────────
   WORD FORMS (for labels and descriptions)
───────────────────────────────────────────────────────────── */

/**
 * Convert rupee amount to Indian word form.
 * @param {number} amount
 * @returns {string}  e.g. "1 Crore 25 Lakhs"
 */
export function toIndianWords(amount) {
  if (!amount || isNaN(amount)) return 'Zero';
  const abs = Math.abs(amount);
  const parts = [];

  const crore = Math.floor(abs / 1e7);
  const lakh  = Math.floor((abs % 1e7) / 1e5);
  const thou  = Math.floor((abs % 1e5) / 1e3);
  const rem   = Math.round(abs % 1e3);

  if (crore > 0) parts.push(`${formatNumber(crore)} Crore${crore > 1 ? 's' : ''}`);
  if (lakh  > 0) parts.push(`${lakh} Lakh${lakh > 1 ? 's' : ''}`);
  if (thou  > 0) parts.push(`${thou} Thousand`);
  if (rem   > 0 && crore === 0 && lakh === 0) parts.push(`${rem}`);

  return (amount < 0 ? 'Minus ' : '') + (parts.join(' ') || 'Zero');
}

/* ─────────────────────────────────────────────────────────────
   DATE / YEAR FORMATTERS
───────────────────────────────────────────────────────────── */

/**
 * Given a base year (e.g., 2026) and an age offset, return the calendar year.
 * @param {number} baseYear
 * @param {number} currentAge
 * @param {number} targetAge
 * @returns {number}
 */
export function ageToYear(baseYear, currentAge, targetAge) {
  return baseYear + (targetAge - currentAge);
}

/**
 * Format a calendar year as a financial year label.
 * @param {number} year - Calendar year (Jan–Dec)
 * @returns {string}  e.g. 2026 → "FY 2025-26"
 */
export function toFY(year) {
  return `FY ${year - 1}-${String(year).slice(2)}`;
}

/* ─────────────────────────────────────────────────────────────
   INPUT PARSING HELPERS
   Used to normalise user-typed values (handles "10L", "1.5Cr")
───────────────────────────────────────────────────────────── */

/**
 * Parse a potentially abbreviated rupee string into a number.
 * Supports: "1.5Cr", "50L", "1,50,000", "150000"
 * @param {string} str
 * @returns {number}  NaN if unparseable
 */
export function parseRupee(str) {
  if (!str) return NaN;
  const s = String(str).replace(/[₹,\s]/g, '').trim().toUpperCase();
  if (s.endsWith('CR')) return parseFloat(s) * 1e7;
  if (s.endsWith('L'))  return parseFloat(s) * 1e5;
  if (s.endsWith('K'))  return parseFloat(s) * 1e3;
  return parseFloat(s);
}

/* ─────────────────────────────────────────────────────────────
   CHANGE INDICATORS
───────────────────────────────────────────────────────────── */

/**
 * Return a colour class name and arrow based on sign.
 * @param {number} value
 * @returns {{ cls: string, arrow: string }}
 */
export function changeIndicator(value) {
  if (value > 0)  return { cls: 'text-emerald-400', arrow: '↑' };
  if (value < 0)  return { cls: 'text-red-400',     arrow: '↓' };
  return             { cls: 'text-slate-400',    arrow: '→' };
}
