/**
 * FinVision AI — Tax Calculation Engine
 * ============================================================
 * PHASE 2 FILE — Stub structure defined; full logic in Phase 2.
 *
 * Implements:
 *   • New Tax Regime (Section 115BAC) — FY 2025-26
 *   • Old Tax Regime — FY 2025-26
 *   • Marginal relief algorithm (for income just above ₹12L)
 *   • Surcharge + cess computations
 *   • LTCG tax harvesting simulator
 *   • Regime comparator and recommender
 */

import { NEW_REGIME, OLD_REGIME, SURCHARGE } from './constants.js';

/**
 * @typedef {Object} TaxInputs
 * @property {number} grossSalary      - Annual gross salary (₹)
 * @property {number} age              - User's age (determines exemption limits)
 * @property {number} [epfContrib]     - Employee EPF contribution (₹/year, goes into 80C)
 * @property {number} [ppfContrib]     - PPF contribution (₹/year)
 * @property {number} [elssContrib]    - ELSS mutual fund investment (₹/year)
 * @property {number} [lifeInsurance]  - Life insurance premium (₹/year)
 * @property {number} [homeLoanInterest]  - Home loan interest paid (₹/year, Sec 24b)
 * @property {number} [medicalPremiumSelf] - Health insurance premium — self (₹/year)
 * @property {number} [medicalPremiumParents] - Health insurance premium — parents (₹/year)
 * @property {number} [npsContrib80CCD1B] - NPS contribution for extra deduction (₹/year)
 * @property {boolean} [parentsAbove60] - Whether parents are senior citizens
 */

/**
 * @typedef {Object} TaxResult
 * @property {number} grossSalary
 * @property {number} standardDeduction
 * @property {number} totalDeductions   - Chapter VI-A deductions (old regime only)
 * @property {number} taxableIncome
 * @property {number} taxBeforeRebate
 * @property {number} rebate87A
 * @property {number} taxAfterRebate
 * @property {number} surcharge
 * @property {number} cess
 * @property {number} totalTax
 * @property {number} effectiveRate     - totalTax / grossSalary
 * @property {Object[]} slabBreakdown   - Per-slab calculation details
 */

/**
 * @typedef {Object} TaxComparison
 * @property {TaxResult} newRegime
 * @property {TaxResult} oldRegime
 * @property {'NEW' | 'OLD' | 'EQUAL'} recommended
 * @property {number} saving            - Tax saved by choosing recommended regime (₹)
 */

/**
 * Compute slab-wise tax using an ordered slab array.
 * Pure helper — no regime-specific logic.
 * @param {number} taxableIncome
 * @param {Array<{from: number, to: number, rate: number}>} slabs
 * @returns {{ total: number, breakdown: Array }}
 */
export function computeSlabTax(taxableIncome, slabs) {
  // Phase 2 — full implementation
  let total = 0;
  const breakdown = [];

  for (const slab of slabs) {
    if (taxableIncome <= slab.from) break;
    const upper = slab.to === Infinity ? taxableIncome : Math.min(taxableIncome, slab.to);
    const taxable = upper - slab.from;
    const tax = taxable * slab.rate;
    total += tax;
    breakdown.push({ slab, taxable, tax });
  }

  return { total, breakdown };
}

/**
 * Compute surcharge on base tax amount.
 * @param {number} income    - Gross income (₹)
 * @param {number} baseTax   - Tax before surcharge (₹)
 * @param {'NEW' | 'OLD'} regime
 * @returns {number} Surcharge amount (₹)
 */
export function computeSurcharge(income, baseTax, regime) {
  // Phase 2 — full implementation
  const tiers = [SURCHARGE.TIER_1, SURCHARGE.TIER_2];
  if (regime === 'OLD') tiers.push(SURCHARGE.TIER_3, SURCHARGE.TIER_4_OLD);
  else tiers.push(SURCHARGE.TIER_4_NEW);

  for (let i = tiers.length - 1; i >= 0; i--) {
    const t = tiers[i];
    if (income > t.above) return baseTax * t.rate;
  }
  return 0;
}

/**
 * Calculate tax under the New Tax Regime (Section 115BAC).
 * @param {TaxInputs} inputs
 * @returns {TaxResult}
 */
export function calcNewRegimeTax(inputs) {
  // Phase 2 — full implementation stub
  return {
    grossSalary:       inputs.grossSalary,
    standardDeduction: NEW_REGIME.STANDARD_DEDUCTION,
    totalDeductions:   0,
    taxableIncome:     0,
    taxBeforeRebate:   0,
    rebate87A:         0,
    taxAfterRebate:    0,
    surcharge:         0,
    cess:              0,
    totalTax:          0,
    effectiveRate:     0,
    slabBreakdown:     [],
  };
}

/**
 * Calculate Tax Payable under Old Tax Regime.
 * Accounts for standard deduction, Sections 80C / 80D / 24b / 80CCD(1B).
 * @param {TaxInputs} inputs
 * @returns {TaxResult}
 */
export function calcOldRegimeTax(inputs) {
  // Phase 2 — full implementation stub
  return {
    grossSalary:       inputs.grossSalary,
    standardDeduction: OLD_REGIME.STANDARD_DEDUCTION,
    totalDeductions:   0,
    taxableIncome:     0,
    taxBeforeRebate:   0,
    rebate87A:         0,
    taxAfterRebate:    0,
    surcharge:         0,
    cess:              0,
    totalTax:          0,
    effectiveRate:     0,
    slabBreakdown:     [],
  };
}

/**
 * Compare both regimes and produce a recommendation.
 * @param {TaxInputs} inputs
 * @returns {TaxComparison}
 */
export function compareTaxRegimes(inputs) {
  const newR = calcNewRegimeTax(inputs);
  const oldR = calcOldRegimeTax(inputs);

  let recommended = 'NEW';
  let saving = 0;

  if (oldR.totalTax < newR.totalTax) {
    recommended = 'OLD';
    saving = newR.totalTax - oldR.totalTax;
  } else if (newR.totalTax < oldR.totalTax) {
    recommended = 'NEW';
    saving = oldR.totalTax - newR.totalTax;
  } else {
    recommended = 'EQUAL';
    saving = 0;
  }

  return { newRegime: newR, oldRegime: oldR, recommended, saving };
}

/**
 * LTCG Tax Harvesting Simulator.
 * Simulates annual booking of ₹1.25L gains to reset cost basis.
 *
 * @param {number} equityPortfolioValue - Current equity portfolio value (₹)
 * @param {number} unrealisedGainRate   - Unrealised gain % (e.g., 0.20 = 20%)
 * @param {number} years                - Investment horizon for compounding benefit
 * @returns {{ annualSaving: number, lifetimeSaving: number, strategy: string }}
 */
export function simulateLTCGHarvesting(equityPortfolioValue, unrealisedGainRate, years) {
  // Phase 2 — full implementation stub
  return {
    annualSaving:    0,
    lifetimeSaving:  0,
    strategy:        'Phase 2 implementation pending',
  };
}
