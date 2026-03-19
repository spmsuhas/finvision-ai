/**
 * FinVision AI — Financial Constants
 * ============================================================
 * Single source of truth for all macroeconomic parameters,
 * asset-class returns, tax slabs, and application defaults.
 *
 * Source: ARD v1.0 — verified against Goldman Sachs, Vanguard,
 * J.P. Morgan, and McKinsey institutional projections (2025–2035).
 * All rates are expressed as decimals (e.g., 0.08 = 8%).
 */

/* ─────────────────────────────────────────────────────────────
   INFLATION RATES  (Section 2: Calibrating Inflation Metrics)
───────────────────────────────────────────────────────────── */
export const INFLATION = Object.freeze({
  /** General lifestyle expense inflation — conservative buffer
   *  Institutional range: 4.2%–5.5% · Default: 8.0% */
  GENERAL:   0.08,

  /** Medical / healthcare inflation — India's privatised care premium
   *  Institutional range: 13.0%–14.0% · Default: 13.5% */
  MEDICAL:   0.135,

  /** Higher education inflation — privatisation of premier institutions
   *  Institutional range: 10.0%–12.0% · Default: 11.0% */
  EDUCATION: 0.11,
});

/* ─────────────────────────────────────────────────────────────
   ASSET CLASS RETURNS  (Section 2: Asset Class Returns)
   Based on Vanguard Capital Markets Model (VCMM) 2025–2035
───────────────────────────────────────────────────────────── */
export const RETURNS = Object.freeze({
  /** Domestic Indian equity CAGR — high-growth domestic corporate sector */
  EQUITY:    0.13,

  /** Fixed-income / debt CAGR — normalised domestic interest rates */
  DEBT:      0.06,
});

/**
 * Calculate blended portfolio CAGR from equity fraction.
 * @param {number} equityFraction - 0 to 1 (e.g., 0.6 = 60% equity)
 * @returns {number} Weighted CAGR
 */
export function blendedReturn(equityFraction) {
  const ef = Math.max(0, Math.min(1, equityFraction));
  return ef * RETURNS.EQUITY + (1 - ef) * RETURNS.DEBT;
}

/* ─────────────────────────────────────────────────────────────
   INCOME & CORPUS PARAMETERS  (Section 3: Core Computational Engine)
───────────────────────────────────────────────────────────── */
export const CORPUS = Object.freeze({
  /** Default annual salary increment rate */
  SALARY_RAISE_RATE: 0.04,

  /** End-of-Life age (EOL) — longevity risk buffer */
  EOL_AGE: 100,

  /** Terminal legacy buffer: Closing balance at EOL must equal
   *  this multiple of annual expenditure at that final year */
  LEGACY_BUFFER_MULTIPLIER: 4,
});

/* ─────────────────────────────────────────────────────────────
   INDIA GDP & MACRO  (Section 2: Macroeconomic Foundations)
   Goldman Sachs Research projections
───────────────────────────────────────────────────────────── */
export const MACRO = Object.freeze({
  /** India real GDP CAGR through 2030 (GS consensus) */
  INDIA_GDP_CAGR:          0.065,

  /** Goldman Sachs near-term headline CPI (informational only) */
  HEADLINE_CPI:            0.042,

  /** "Affluent India" cohort growth rate (>$10K p.a. income) */
  AFFLUENT_COHORT_GROWTH:  0.125,
});

/* ─────────────────────────────────────────────────────────────
   CAPITAL GAINS TAX  (Section 3: Capital Gains & Tax Harvesting)
   Finance Act 2024 — effective FY 2024-25 onwards
───────────────────────────────────────────────────────────── */
export const CAPITAL_GAINS = Object.freeze({
  /** LTCG tax rate on domestic equity gains — flat rate, no indexation */
  LTCG_RATE: 0.125,

  /** Annual LTCG exemption threshold (₹) */
  LTCG_EXEMPT_LIMIT: 125000,

  /** Max annual tax saved via LTCG harvesting = LTCG_EXEMPT_LIMIT × LTCG_RATE */
  MAX_ANNUAL_HARVEST_SAVING: 125000 * 0.125, // ₹15,625
});

/* ─────────────────────────────────────────────────────────────
   NEW TAX REGIME — Section 115BAC  (Section 3: Indian Tax Optimization)
   FY 2025-26 (AY 2026-27)
───────────────────────────────────────────────────────────── */
export const NEW_REGIME = Object.freeze({
  /** Standard deduction available to salaried individuals */
  STANDARD_DEDUCTION: 75000,

  /** Section 87A rebate: negates tax if NTI ≤ this limit */
  REBATE_87A_INCOME_LIMIT: 1200000,

  /** Section 87A rebate amount (full tax wiped for eligible income) */
  REBATE_87A_MAX: 60000,

  /** Effective tax-free threshold for salaried (after std deduction) */
  EFFECTIVE_TAX_FREE_GROSS: 1275000,

  /**
   * Tax slabs (sorted ascending by lower bound).
   * Each slab: { from, to (Infinity for last), rate }
   * Income is in rupees.
   */
  SLABS: [
    { from: 0,        to: 400000,   rate: 0     },
    { from: 400000,   to: 800000,   rate: 0.05  },
    { from: 800000,   to: 1200000,  rate: 0.10  },
    { from: 1200000,  to: 1600000,  rate: 0.15  },
    { from: 1600000,  to: 2000000,  rate: 0.20  },
    { from: 2000000,  to: 2400000,  rate: 0.25  },
    { from: 2400000,  to: Infinity, rate: 0.30  },
  ],
});

/* ─────────────────────────────────────────────────────────────
   OLD TAX REGIME  (Section 3: Old Tax Regime Optimization Logic)
   FY 2025-26 (AY 2026-27)
───────────────────────────────────────────────────────────── */
export const OLD_REGIME = Object.freeze({
  /** Standard deduction for salaried */
  STANDARD_DEDUCTION: 50000,

  /** Section 80C umbrella limit (EPF, ELSS, PPF, SSY, LIC, etc.) */
  SEC_80C_LIMIT: 150000,

  /** Section 80D — health insurance premium deduction limits */
  SEC_80D: Object.freeze({
    SELF_BELOW_60:  25000, // Self + spouse + children (below 60)
    SELF_ABOVE_60:  50000, // Self + spouse + children (senior citizen)
    PARENTS_BELOW_60: 25000,
    PARENTS_ABOVE_60: 50000,
  }),

  /** Section 24b — Home loan interest deduction limit (self-occupied) */
  SEC_24B_LIMIT: 200000,

  /** Section 80CCD(1B) — Additional NPS contribution deduction */
  SEC_80CCD_1B_LIMIT: 50000,

  /** Basic exemption limits (age-based) */
  BASIC_EXEMPTION: Object.freeze({
    BELOW_60:   250000,
    SENIOR:     300000,  // 60 to 79 years
    SUPER_SENIOR: 500000, // 80 years and above
  }),

  /**
   * Tax slabs for individuals below 60 years.
   * Above basic exemption limit to ₹5L: 5%, ₹5L–₹10L: 20%, above ₹10L: 30%
   */
  SLABS_BELOW_60: [
    { from: 0,       to: 250000,   rate: 0     },
    { from: 250000,  to: 500000,   rate: 0.05  },
    { from: 500000,  to: 1000000,  rate: 0.20  },
    { from: 1000000, to: Infinity, rate: 0.30  },
  ],

  SLABS_SENIOR: [
    { from: 0,       to: 300000,   rate: 0     },
    { from: 300000,  to: 500000,   rate: 0.05  },
    { from: 500000,  to: 1000000,  rate: 0.20  },
    { from: 1000000, to: Infinity, rate: 0.30  },
  ],

  SLABS_SUPER_SENIOR: [
    { from: 0,       to: 500000,   rate: 0     },
    { from: 500000,  to: 1000000,  rate: 0.20  },
    { from: 1000000, to: Infinity, rate: 0.30  },
  ],

  /** Section 87A rebate for old regime (income ≤ ₹5L) */
  REBATE_87A_INCOME_LIMIT: 500000,
  REBATE_87A_MAX: 12500,

  /** Education + Health cess on computed tax */
  CESS_RATE: 0.04,
});

/* ─────────────────────────────────────────────────────────────
   SURCHARGE RATES (both regimes)
   Applied on income tax before cess
───────────────────────────────────────────────────────────── */
export const SURCHARGE = Object.freeze({
  /** Income ₹50L – ₹1Cr: 10% surcharge */
  TIER_1: { above: 5000000,  below: 10000000, rate: 0.10 },
  /** Income ₹1Cr – ₹2Cr: 15% surcharge */
  TIER_2: { above: 10000000, below: 20000000, rate: 0.15 },
  /** Income ₹2Cr – ₹5Cr: 25% surcharge (old regime only) */
  TIER_3: { above: 20000000, below: 50000000, rate: 0.25 },
  /** Income above ₹5Cr: 37% surcharge (old regime) / 25% (new regime) */
  TIER_4_OLD: { above: 50000000, rate: 0.37 },
  TIER_4_NEW: { above: 50000000, rate: 0.25 },

  /** Education + Health Cess (applied after surcharge) */
  CESS_RATE: 0.04,
});

/* ─────────────────────────────────────────────────────────────
   APPLICATION DEFAULTS  (initial state for new users)
───────────────────────────────────────────────────────────── */
export const DEFAULTS = Object.freeze({
  CURRENT_AGE:        30,
  RETIREMENT_AGE:     60,
  MONTHLY_INCOME:     150000,      // ₹1.5L/month
  MONTHLY_EXPENSES:   60000,       // ₹60K/month
  MEDICAL_PREMIUM:    2000,        // ₹2K/month insurance premium
  EQUITY_PERCENT:     60,          // 60% equity allocation
  DEBT_PERCENT:       40,          // 40% debt allocation
  CURRENT_EQUITY:     500000,      // ₹5L existing equity portfolio
  CURRENT_DEBT:       200000,      // ₹2L FD / debt
  CURRENT_EPF:        300000,      // ₹3L EPF balance
  SALARY_RAISE_RATE:  CORPUS.SALARY_RAISE_RATE,
  PLAN_START_YEAR:    new Date().getFullYear(),
});

/* ─────────────────────────────────────────────────────────────
   GOAL TYPES  (for categorisation and inflation rate assignment)
───────────────────────────────────────────────────────────── */
export const GOAL_TYPES = Object.freeze({
  EDUCATION:   { label: 'Higher Education',    inflation: INFLATION.EDUCATION, icon: '🎓', color: '#60A5FA' },
  MARRIAGE:    { label: 'Marriage / Wedding',  inflation: INFLATION.GENERAL,   icon: '💍', color: '#F472B6' },
  PROPERTY:    { label: 'Property Purchase',   inflation: 0.07,                icon: '🏠', color: '#34D399' },
  VEHICLE:     { label: 'Vehicle Purchase',    inflation: 0.05,                icon: '🚗', color: '#A78BFA' },
  TRAVEL:      { label: 'International Travel',inflation: 0.06,                icon: '✈️', color: '#FBBF24' },
  RETIREMENT:  { label: 'Retirement Corpus',   inflation: INFLATION.GENERAL,   icon: '🏖️', color: '#F97316' },
  OTHER:       { label: 'Other Goal',          inflation: INFLATION.GENERAL,   icon: '🎯', color: '#94A3B8' },
});

/* ─────────────────────────────────────────────────────────────
   CHART COLORS  (consistent palette across all Chart.js instances)
───────────────────────────────────────────────────────────── */
export const CHART_COLORS = Object.freeze({
  EQUITY:          'rgba(251, 191, 36, 0.85)',   // Amber — equity corpus
  DEBT:            'rgba(96, 165, 250, 0.85)',   // Blue  — debt corpus
  INTEREST:        'rgba(52, 211, 153, 0.85)',   // Green — compounding interest
  EXPENSES:        'rgba(248, 113, 113, 0.70)',  // Red   — expenses
  INCOME:          'rgba(167, 243, 208, 0.85)',  // Mint  — income
  GOAL_ON_TRACK:   '#34D399',
  GOAL_AT_RISK:    '#F59E0B',
  GOAL_SHORTFALL:  '#F87171',
  GRID_LINE:       'rgba(255, 255, 255, 0.05)',
  TOOLTIP_BG:      '#1E293B',
  TEXT_MUTED:      '#64748B',
});

/* ─────────────────────────────────────────────────────────────
   FIRESTORE COLLECTION NAMES
───────────────────────────────────────────────────────────── */
export const FIRESTORE = Object.freeze({
  USERS:           'Users',
  PERSONAL_DETAILS: 'Personal_Details',
  FINANCIAL_PLANS: 'Financial_Plans',
  AI_SUMMARIES:    'AI_Summaries',
});

/* ─────────────────────────────────────────────────────────────
   APP METADATA
───────────────────────────────────────────────────────────── */
export const APP = Object.freeze({
  NAME:         'FinVision AI',
  VERSION:      '1.0.0',
  PLAN_YEAR:    'FY 2025-26',
  CURRENCY:     '₹',
  LOCALE:       'en-IN',
});
