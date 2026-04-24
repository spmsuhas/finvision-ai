/**
 * FinVision AI — Core Financial Engine
 * ============================================================
 * PHASE 2 FILE — Stub structure defined; full logic implemented in Phase 2.
 *
 * This module is the mathematical brain of the application.
 * It is intentionally decoupled from all UI code and can be
 * unit-tested independently.
 *
 * Implemented in Phase 2:
 *   • futureValue(pv, rate, periods)
 *   • presentValue(fv, rate, periods)
 *   • goalFutureValue(todayValue, inflationRate, yearsUntilGoal)
 *   • buildCorpusTrajectory(inputs) — the main annual loop
 *   • calculateRequiredSIP(targetCorpus, rate, years)
 *   • calculatePlanHealth(trajectory, goals) → 0–100 score
 */

import { INFLATION, CORPUS, GOAL_TYPES, RETURNS, blendedReturn, sipRate } from './constants.js';

/**
 * @typedef {Object} PersonalInputs
 * @property {number} currentAge
 * @property {number} retirementAge
 * @property {number} annualIncome          - Gross annual salary (₹)
 * @property {number} salaryRaiseRate       - e.g. 0.04
 * @property {number} equityFraction        - 0 to 1
 * @property {number} currentEquity         - Existing equity portfolio (₹)
 * @property {number} currentDebt           - Existing debt portfolio (₹)
 * @property {number} currentEPF            - EPF balance (₹)
 * @property {number} monthlyExpenses       - Base monthly lifestyle cost (₹)
 * @property {number} monthlyMedicalPremium - Medical insurance premium (₹/month)
 * @property {number} planStartYear         - Calendar year of plan start
 * @property {Goal[]} goals                 - List of life goals
 */

/**
 * @typedef {Object} Goal
 * @property {string} id
 * @property {string} name
 * @property {string} type            - GOAL_TYPES key
 * @property {number} targetYear      - Calendar year of disbursement
 * @property {number} todayValue      - Cost in today's rupees (₹)
 * @property {number} inflationRate   - Override; defaults to GOAL_TYPES[type].inflation
 */

/**
 * @typedef {Object} YearlyRow
 * @property {number} calendarYear
 * @property {number} age
 * @property {number} openingBalance    - Corpus at start of year (₹)
 * @property {number} annualIncome      - Inflated salary (₹)
 * @property {number} lifestyleExpenses - Inflated expenses (₹)
 * @property {number} medicalExpenses   - Inflated medical costs (₹)
 * @property {number} emiExpenses        - Fixed EMI / debt-servicing outflow (₹)
 * @property {number} goalOutlays        - One-time goal disbursements (₹)
 * @property {number} totalExpenses      - Sum of all outflows (₹)
 * @property {number} netSurplus        - annualIncome - totalExpenses (₹)
 * @property {number} sipContributions  - Principal invested via SIPs this year (₹)
 * @property {number} sipFutureValue    - Compounded value of this year's SIPs at year-end (₹)
 * @property {number} interestAccrued   - openingBalance × blendedCAGR (₹)
 * @property {number} closingBalance    - openingBalance + interest + surplus (₹)
 * @property {boolean} isRetired        - True if age >= retirementAge
 * @property {Goal[]} goalsThisYear     - Goals paid out this year
 */

/**
 * Calculate Future Value using compound interest formula.
 * FV = PV × (1 + r)^n
 * @param {number} pv      - Present value (₹)
 * @param {number} rate    - Annual rate (decimal, e.g., 0.13)
 * @param {number} periods - Number of years
 * @returns {number}
 */
export function futureValue(pv, rate, periods) {
  // Phase 2 — full implementation
  return pv * Math.pow(1 + rate, periods);
}

/**
 * Calculate Present Value (discount future amount to today's rupees).
 * PV = FV / (1 + r)^n
 * @param {number} fv      - Future value (₹)
 * @param {number} rate    - Discount rate (decimal)
 * @param {number} periods - Number of years
 * @returns {number}
 */
export function presentValue(fv, rate, periods) {
  // Phase 2 — full implementation
  if (periods <= 0) return fv;
  return fv / Math.pow(1 + rate, periods);
}

/**
 * Inflate a today-value goal to its nominal cost at a future year.
 * @param {number} todayValue      - Cost in today's rupees (₹)
 * @param {number} inflationRate   - Annual inflation rate (decimal)
 * @param {number} yearsUntilGoal  - Years until goal materialises
 * @returns {number} Inflated nominal cost (₹)
 */
export function goalFutureValue(todayValue, inflationRate, yearsUntilGoal) {
  // Phase 2 — full implementation
  return futureValue(todayValue, inflationRate, yearsUntilGoal);
}

/**
 * Compute a weighted-average annualRate per asset class from activeSavings.
 * Weight = monthlyAmount of each investment entry.
 * Falls back to RETURNS defaults for asset classes with no declared investments.
 *
 * This lets user-declared investment rates (PPF at 6%, NPS at 10%, etc.) drive
 * the CAGR calculation instead of hardcoded constants.
 *
 * @param {Object[]} activeSavings   - Declared monthly investments
 * @param {number}   inflationRate   - Used for realAssets fallback
 * @returns {{ equity: number, debt: number, realAssets: number, cash: number }}
 */
function computeEffectiveRatesByAssetClass(activeSavings, inflationRate) {
  const acc = {
    equity:     { weightedSum: 0, totalWeight: 0 },
    debt:       { weightedSum: 0, totalWeight: 0 },
    realAssets: { weightedSum: 0, totalWeight: 0 },
    cash:       { weightedSum: 0, totalWeight: 0 },
  };

  for (const sip of activeSavings) {
    const cls    = sip.assetClass;
    if (!cls || !acc[cls]) continue;
    const weight = sip.monthlyAmount > 0 ? sip.monthlyAmount : 0;
    const rate   = (sip.annualRate && sip.annualRate > 0)
      ? sip.annualRate
      : sipRate(sip.type);
    acc[cls].weightedSum += rate * weight;
    acc[cls].totalWeight += weight;
  }

  return {
    equity:     acc.equity.totalWeight > 0
                  ? acc.equity.weightedSum / acc.equity.totalWeight
                  : RETURNS.EQUITY,
    debt:       acc.debt.totalWeight > 0
                  ? acc.debt.weightedSum / acc.debt.totalWeight
                  : RETURNS.DEBT,
    realAssets: acc.realAssets.totalWeight > 0
                  ? acc.realAssets.weightedSum / acc.realAssets.totalWeight
                  : inflationRate + (RETURNS.GOLD_SPREAD + RETURNS.REAL_ESTATE_SPREAD) / 2,
    cash:       acc.cash.totalWeight > 0
                  ? acc.cash.weightedSum / acc.cash.totalWeight
                  : RETURNS.CASH,
  };
}

/**
 * Build the complete year-by-year corpus trajectory.
 * This is the primary engine function — loops annually from
 * currentAge to EOL_AGE (100), applying all income, expense,
 * goal, and compounding logic per the ARD Section 3 algorithm.
 *
 * @param {PersonalInputs} inputs
 * @returns {YearlyRow[]} Array of 70+ rows (age to 100)
 */
export function buildCorpusTrajectory(inputs) {
  const {
    currentAge,
    retirementAge,
    annualIncome,
    salaryRaiseRate,
    equityFraction,
    currentEquity       = 0,
    currentDebt         = 0,
    currentEPF          = 0,
    currentGold         = 0,
    currentRealEstate   = 0,
    currentCash         = 0,
    currentAlternatives = 0,
    inflationRate       = INFLATION.GENERAL,
    monthlyExpenses,
    monthlyMedicalPremium,
    monthlyEMI          = 0,
    planStartYear,
    goals         = [],
    activeSavings = [],
  } = inputs;

  // Starting corpus = sum of ALL asset buckets across all 4 groups
  const manualCorpus = (currentEquity || 0) + (currentDebt || 0) + (currentEPF || 0)
    + (currentGold || 0) + (currentRealEstate || 0) + (currentCash || 0) + (currentAlternatives || 0);

  // Add accumulated value of historical SIP contributions (past periods)
  // so the projection starts from a corpus that already reflects past investing.
  const historicalSIP = computeHistoricalSIPByAsset(activeSavings);
  let openingBalance  = manualCorpus + historicalSIP.total;

  // Derive per-asset-class rates from declared investments so user-set rates
  // (e.g. PPF at 6%, NPS at 10%) propagate into the corpus growth calculation.
  const effectiveRates = computeEffectiveRatesByAssetClass(activeSavings, inflationRate);

  const manualWeightedReturn = currentEquity * effectiveRates.equity
    + (currentDebt + currentEPF) * effectiveRates.debt
    + currentGold * effectiveRates.realAssets
    + currentRealEstate * effectiveRates.realAssets
    + currentCash * effectiveRates.cash
    + currentAlternatives * effectiveRates.equity;

  // Blend manual assets with historical SIP corpus so previously invested SIPs earn returns.
  const cagr = openingBalance > 0
    ? (manualWeightedReturn + historicalSIP.weightedAnnualReturn) / openingBalance
    : blendedReturn(equityFraction);

  const rows = [];
  const totalYears = CORPUS.EOL_AGE - currentAge;

  for (let i = 0; i <= totalYears; i++) {
    const age         = currentAge + i;
    const calendarYear = planStartYear + i;
    const isRetired   = age >= retirementAge;

    // Salary with raise each pre-retirement year; zero post-retirement
    const annualIncomeThisYear = isRetired
      ? 0
      : annualIncome * Math.pow(1 + salaryRaiseRate, i);

    // Expenses grow by their respective inflation rates from year 0
    const lifestyleExpenses = monthlyExpenses * 12 * Math.pow(1 + INFLATION.GENERAL, i);
    const medicalExpenses   = monthlyMedicalPremium * 12 * Math.pow(1 + INFLATION.MEDICAL, i);
    // EMI is a fixed contractual obligation — no inflation applied.
    // Pre-retirement only: after tenure ends loans should be cleared, but we
    // model it conservatively as running until retirement.
    const emiExpenses       = isRetired ? 0 : (monthlyEMI || 0) * 12;

    // One-time goal disbursements scheduled for this calendar year
    const goalsThisYear = goals.filter(g => g.targetYear === calendarYear);
    const goalOutlays = goalsThisYear.reduce((sum, g) => {
      const yearsUntilGoal = g.targetYear - planStartYear;
      const inflRate = g.inflationRate != null
        ? g.inflationRate
        : (GOAL_TYPES[g.type]?.inflation ?? INFLATION.GENERAL);
      return sum + goalFutureValue(g.todayValue, inflRate, Math.max(0, yearsUntilGoal));
    }, 0);

    const totalExpenses = lifestyleExpenses + medicalExpenses + emiExpenses + goalOutlays;
    const netSurplus    = annualIncomeThisYear - totalExpenses;

    // Track principal invested this year and the year-end value of those SIPs separately.
    const sipRollup = activeSavings.reduce((acc, sip) => {
      if (!sip.monthlyAmount || sip.monthlyAmount <= 0) return acc;
      const [sy, sm] = (sip.startDate || `${planStartYear}-01`).split('-').map(Number);
      let endYYYYMM = sip.endDate;
      if (!endYYYYMM && sip.linkType === 'goal' && sip.linkedGoalId) {
        const linked = goals.find(g => g.id === sip.linkedGoalId);
        if (linked?.targetYear) endYYYYMM = `${linked.targetYear}-12`;
      }

        const yearStart = calendarYear * 12 + 1;
        const yearEnd   = calendarYear * 12 + 12;
        const sipStart  = sy * 12 + sm;

        // Hasn't started yet in this calendar year
        if (sipStart > yearEnd) return acc;

        if (endYYYYMM) {
          const [ey, em] = endYYYYMM.split('-').map(Number);
          const sipEnd   = ey * 12 + em;
          if (sipEnd < yearStart) return acc; // already ended
          const activeMonths = Math.min(sipEnd, yearEnd) - Math.max(sipStart, yearStart) + 1;
          const months = Math.max(0, activeMonths);
          if (months === 0) return acc;

          const principal = sip.monthlyAmount * months;
          const rate = (sip.annualRate && sip.annualRate > 0) ? sip.annualRate : sipRate(sip.type);
          const futureValue = sipFutureValue(sip.monthlyAmount, rate, months);

          acc.principal += principal;
          acc.futureValue += futureValue;
          return acc;
        } else {
          // No end date — SIP runs indefinitely (wealth-building)
          const activeMonths = yearEnd - Math.max(sipStart, yearStart) + 1;
          const months = Math.max(0, activeMonths);
          if (months === 0) return acc;

          const principal = sip.monthlyAmount * months;
          const rate = (sip.annualRate && sip.annualRate > 0) ? sip.annualRate : sipRate(sip.type);
          const futureValue = sipFutureValue(sip.monthlyAmount, rate, months);

          acc.principal += principal;
          acc.futureValue += futureValue;
          return acc;
        }
      }, { principal: 0, futureValue: 0 });

    const sipContributions = sipRollup.principal;
    const sipFutureValueThisYear = sipRollup.futureValue;

    // Keep principal invested this year separate from the return earned on it.
    const openingBalanceInterest = openingBalance * cagr;
    const sipInterestAccrued = Math.max(0, sipFutureValueThisYear - sipContributions);
    const interestAccrued = openingBalanceInterest + sipInterestAccrued;
    const closingBalance  = openingBalance + interestAccrued + netSurplus + sipContributions;

    rows.push({
      calendarYear,
      age,
      openingBalance,
      annualIncome:      annualIncomeThisYear,
      lifestyleExpenses,
      medicalExpenses,
      emiExpenses,
      goalOutlays,
      totalExpenses,
      netSurplus,
      sipContributions,
      sipFutureValue: sipFutureValueThisYear,
      interestAccrued,
      closingBalance,
      isRetired,
      goalsThisYear,
    });

    // Next year starts where this year ended
    openingBalance = closingBalance;
  }

  return rows;
}

/**
 * Compute the accumulated value (as of today) of all asset-linked SIPs
 * that have past contributions. This reflects historical SIP investing
 * that should already be in the user's existing portfolio.
 *
 * Returns a record: { byAssetKey: { [key]: value }, unallocated: number, total: number, weightedAnnualReturn: number }
 * where keys match the format "groupId.itemKey" (e.g. "equity.equityMutualFunds").
 *
 * @param {Array} activeSavings - state.activeSavings
 * @returns {{ byAssetKey: Object, unallocated: number, total: number, weightedAnnualReturn: number }}
 */
export function computeHistoricalSIPByAsset(activeSavings = []) {
  const byAssetKey = {};
  let unallocated  = 0;
  let weightedAnnualReturn = 0;
  const today = new Date();
  const todayYYYYMM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [ty, tm] = todayYYYYMM.split('-').map(Number);
  const todayMonths = ty * 12 + tm;

  for (const sip of activeSavings) {
    if (!sip.monthlyAmount || sip.monthlyAmount <= 0 || !sip.startDate) continue;
    const [sy, sm] = sip.startDate.split('-').map(Number);
    const sipStartMonths = sy * 12 + sm;

    // Only accumulate periods that have already passed (start is in the past)
    if (sipStartMonths >= todayMonths) continue;

    // Effective end: earlier of today or the SIP's endDate
    let effectiveEndMonths = todayMonths;
    if (sip.endDate) {
      const [ey, em] = sip.endDate.split('-').map(Number);
      const sipEndMonths = ey * 12 + em;
      effectiveEndMonths = Math.min(todayMonths, sipEndMonths);
    }
    if (effectiveEndMonths <= sipStartMonths) continue;

    const months = effectiveEndMonths - sipStartMonths;
    const rate   = (sip.annualRate && sip.annualRate > 0) ? sip.annualRate : sipRate(sip.type);
    const fv     = sipFutureValue(sip.monthlyAmount, rate, months);
    weightedAnnualReturn += fv * rate;

    if (sip.linkType === 'asset' && sip.linkedAssetKey) {
      byAssetKey[sip.linkedAssetKey] = (byAssetKey[sip.linkedAssetKey] || 0) + fv;
    } else {
      unallocated += fv;
    }
  }

  const total = Object.values(byAssetKey).reduce((s, v) => s + v, 0) + unallocated;
  return { byAssetKey, unallocated, total, weightedAnnualReturn };
}

/**
 * Calculate the monthly SIP required to hit a future corpus target.
 * SIP = FV × r / ((1+r)^n - 1)  (end-of-period payments)
 * @param {number} targetCorpus - Required future corpus (₹)
 * @param {number} annualRate   - Annual portfolio CAGR (decimal)
 * @param {number} years        - Investment horizon
 * @returns {number} Monthly SIP amount (₹)
 */
export function calculateRequiredSIP(targetCorpus, annualRate, years) {
  // Phase 2 — full implementation
  const months = years * 12;
  const mr = annualRate / 12;
  if (mr === 0) return targetCorpus / months;
  return (targetCorpus * mr) / (Math.pow(1 + mr, months) - 1);
}

/**
 * Calculate a 0–100 plan health score from the trajectory.
 * @param {YearlyRow[]} trajectory
 * @param {Goal[]} goals
 * @returns {number} 0–100
 */
export function calculatePlanHealth(trajectory, goals = []) {
  if (!trajectory || trajectory.length === 0) return 0;

  const lastRow = trajectory[trajectory.length - 1];
  const requiredTerminal = lastRow.totalExpenses * CORPUS.LEGACY_BUFFER_MULTIPLIER;
  const totalYears       = trajectory.length;
  const shortfallYears   = trajectory.filter(r => r.closingBalance < 0).length;

  // Terminal corpus score (0–50 pts)
  // Full 50 pts if closing balance at age 100 >= 4× that year's expenses (legacy buffer)
  const terminalRatio = requiredTerminal > 0
    ? Math.max(0, lastRow.closingBalance / requiredTerminal)
    : (lastRow.closingBalance >= 0 ? 1 : 0);
  const terminalScore = Math.min(50, terminalRatio * 50);

  // Continuity score (0–30 pts): fraction of years corpus stays positive
  const continuityScore = 30 * (1 - shortfallYears / totalYears);

  // Goal funding score (0–20 pts): fraction of goals met without corpus shortfall
  let goalScore = 20;
  if (goals.length > 0) {
    const funded = goals.filter(g => {
      const row = trajectory.find(r => r.calendarYear === g.targetYear);
      return row ? row.closingBalance >= 0 : true;
    }).length;
    goalScore = 20 * (funded / goals.length);
  }

  return Math.round(Math.min(100, terminalScore + continuityScore + goalScore));
}

/**
 * Future Value of an Annuity (end-of-period SIP payments).
 * FV = PMT × ((1 + r_m)^n − 1) / r_m
 *
 * @param {number} monthlyAmount - Monthly SIP / contribution (₹)
 * @param {number} annualRate    - Annual return rate (decimal, e.g. 0.13)
 * @param {number} months        - Number of monthly contributions
 * @returns {number} Projected future value (₹)
 */
export function sipFutureValue(monthlyAmount, annualRate, months) {
  if (months <= 0 || monthlyAmount <= 0) return 0;
  const rm = annualRate / 12;
  if (rm === 0) return monthlyAmount * months;
  return monthlyAmount * (Math.pow(1 + rm, months) - 1) / rm;
}

/**
 * Compute per-goal SIP funding breakdown for Goal Tracking chart.
 *
 * @param {Array}  activeSavings  - state.activeSavings entries
 * @param {Array}  goals          - state.goals entries
 * @param {number} planStartYear  - Current calendar year (used for elapsed months)
 * @returns {Map<string, {name, goalInflatedCost, sipContrib, deficit}>}
 *          Key = goalId  (plus a synthetic key 'unlinked' for wealth-building SIPs)
 */
export function computeSIPGoalFunding(activeSavings = [], goals = [], planStartYear = new Date().getFullYear(), partnerActiveSavings = []) {
  const result = new Map();

  // Pre-populate every goal entry so goals with no SIPs still appear
  goals.forEach(g => {
    const yearsAway = Math.max(0, g.targetYear - planStartYear);
    const inflRate = g.inflationRate ?? INFLATION.GENERAL;
    const goalInflatedCost = goalFutureValue(g.todayValue, inflRate, yearsAway);
    result.set(g.id, {
      name:             g.name,
      targetYear:       g.targetYear,
      goalInflatedCost,
      sipContrib:       0,
      partnerContrib:   0,
      deficit:          goalInflatedCost,
    });
  });

  // Accumulate SIP future values into each goal bucket
  activeSavings.forEach(sip => {
    if (!sip.monthlyAmount || sip.monthlyAmount <= 0) return;

    // Only goal-linked SIPs contribute to goal-deficit reduction
    if (sip.linkType !== 'goal' && sip.linkType !== undefined && sip.linkType !== null && sip.linkedGoalId == null) {
      // asset-linked or unlinked: skip goal tracking but accumulate as unlinked
    }

    // Determine effective end date
    let endYYYYMM = sip.endDate;
    if (!endYYYYMM && sip.linkType === 'goal' && sip.linkedGoalId) {
      const linked = goals.find(g => g.id === sip.linkedGoalId);
      if (linked?.targetYear) endYYYYMM = `${linked.targetYear}-12`;
    }
    if (!endYYYYMM) return; // no end date — skip FV calculation

    const [startY, startM]  = (sip.startDate  || `${planStartYear}-01`).split('-').map(Number);
    const [endY,   endM]    = endYYYYMM.split('-').map(Number);
    const months = Math.max(0, (endY - startY) * 12 + (endM - startM));
    if (months <= 0) return;

    // Use user-supplied rate if set, otherwise default to type rate
    const rate = (sip.annualRate && sip.annualRate > 0) ? sip.annualRate : sipRate(sip.type);
    const fv   = sipFutureValue(sip.monthlyAmount, rate, months);

    const goalId = (sip.linkType === 'goal' && sip.linkedGoalId) ? sip.linkedGoalId : 'unlinked';
    if (result.has(goalId)) {
      const entry = result.get(goalId);
      entry.sipContrib += fv;
      entry.deficit     = Math.max(0, entry.goalInflatedCost - entry.sipContrib - entry.partnerContrib);
    } else if (goalId === 'unlinked') {
      const existing = result.get('unlinked');
      if (existing) {
        existing.sipContrib += fv;
      } else {
        result.set('unlinked', {
          name:             'Wealth Building',
          targetYear:       null,
          goalInflatedCost: 0,
          sipContrib:       fv,
          partnerContrib:   0,
          deficit:          0,
        });
      }
    }
  });

  // ── Partner contributions ──────────────────────────────────
  // Only shared SIPs from the partner are included (private SIPs are excluded)
  partnerActiveSavings.forEach(sip => {
    if (!sip.monthlyAmount || sip.monthlyAmount <= 0) return;
    if ((sip.visibility ?? 'shared') !== 'shared') return;

    let endYYYYMM = sip.endDate;
    if (!endYYYYMM && sip.linkType === 'goal' && sip.linkedGoalId) {
      const linked = goals.find(g => g.id === sip.linkedGoalId);
      if (linked?.targetYear) endYYYYMM = `${linked.targetYear}-12`;
    }
    if (!endYYYYMM) return;

    const [startY, startM]  = (sip.startDate || `${planStartYear}-01`).split('-').map(Number);
    const [endY,   endM]    = endYYYYMM.split('-').map(Number);
    const months = Math.max(0, (endY - startY) * 12 + (endM - startM));
    if (months <= 0) return;

    const rate = (sip.annualRate && sip.annualRate > 0) ? sip.annualRate : sipRate(sip.type);
    const fv   = sipFutureValue(sip.monthlyAmount, rate, months);

    const goalId = (sip.linkType === 'goal' && sip.linkedGoalId) ? sip.linkedGoalId : 'unlinked';
    if (result.has(goalId)) {
      const entry = result.get(goalId);
      entry.partnerContrib  += fv;
      entry.deficit          = Math.max(0, entry.goalInflatedCost - entry.sipContrib - entry.partnerContrib);
    } else if (goalId === 'unlinked') {
      const existing = result.get('unlinked');
      if (existing) {
        existing.partnerContrib += fv;
      } else {
        result.set('unlinked', {
          name:             'Wealth Building',
          targetYear:       null,
          goalInflatedCost: 0,
          sipContrib:       0,
          partnerContrib:   fv,
          deficit:          0,
        });
      }
    }
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// LIABILITY & DEBT MANAGEMENT ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate the fixed monthly EMI for a reducing-balance loan.
 *
 * Formula: EMI = P × r(1+r)^n / ((1+r)^n − 1)
 *
 * @param {number} principal   - Outstanding loan balance (₹)
 * @param {number} annualRate  - Annual interest rate as decimal (e.g. 0.085)
 * @param {number} months      - Remaining tenure in months
 * @returns {number} Monthly EMI (₹), rounded to 2 decimal places
 */
export function calculateEMI(principal, annualRate, months) {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  const emi = principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
  return Math.round(emi * 100) / 100;
}

/**
 * Generate a reducing-balance amortization schedule for a loan,
 * optionally with a fixed extra payment on top of the EMI each month.
 *
 * @param {number} principal     - Outstanding loan balance (₹)
 * @param {number} annualRate    - Annual interest rate as decimal
 * @param {number} months        - Remaining tenure in months
 * @param {number} [extraPayment=0] - Additional principal paid per month (₹)
 * @returns {{
 *   totalInterest:    number,   Total interest paid (₹)
 *   actualMonths:     number,   Actual months taken to clear the loan
 *   baselineInterest: number,   Interest without extra payments (₹)
 * }}
 */
export function generateAmortizationSchedule(principal, annualRate, months, extraPayment = 0) {
  if (principal <= 0 || months <= 0) return { totalInterest: 0, actualMonths: 0, baselineInterest: 0 };

  const r   = annualRate / 12;
  const emi = calculateEMI(principal, annualRate, months);

  // ── Baseline (no extra payments) ──────────────────────────────────────────
  let baselineInterest = 0;
  {
    let bal = principal;
    for (let i = 0; i < months && bal > 0; i++) {
      const interest       = bal * r;
      const principalPaid  = emi - interest;
      baselineInterest    += interest;
      bal                 -= principalPaid;
    }
  }

  // ── With extra payments ───────────────────────────────────────────────────
  let totalInterest = 0;
  let actualMonths  = 0;
  let balance       = principal;

  while (balance > 0.01) {
    const interest      = balance * r;
    const principalPaid = Math.min(emi - interest + extraPayment, balance);
    totalInterest      += interest;
    balance            -= principalPaid;
    actualMonths++;

    // Safety cap — prevent infinite loop for zero/negative rates
    if (actualMonths > months + 12) break;
  }

  return {
    totalInterest:    Math.round(totalInterest),
    actualMonths,
    baselineInterest: Math.round(baselineInterest),
  };
}

/**
 * Calculate the financial arbitrage between prepaying a loan vs investing the surplus.
 *
 * Scenario A — Prepay: Add surplusCash as extra principal every month.
 *   Benefit = Interest saved compared to no extra payments.
 *
 * Scenario B — Invest: Put surplusCash into a SIP at expectedInvestmentReturn
 *   for the original remaining tenure.
 *   Benefit = Net wealth created (future value − total principal invested).
 *
 * @param {{ annualRate: number, outstandingBalance: number, tenureMonths: number }} loan
 * @param {number} surplusCash               - Extra ₹/month available
 * @param {number} expectedInvestmentReturn  - Annual return rate as decimal (e.g. 0.12)
 * @returns {{
 *   interestSaved:    number,   ₹ saved by prepaying
 *   wealthCreated:    number,   Net ₹ earned by investing (FV − principal)
 *   recommendation:   'PREPAY' | 'INVEST' | 'EQUAL',
 *   monthsSaved:      number,   Tenure reduction from prepaying
 *   investFV:         number,   Total future value of the investment SIP
 * }}
 */
export function calculateArbitrage(loan, surplusCash, expectedInvestmentReturn) {
  const { annualRate, outstandingBalance, tenureMonths } = loan;

  // Scenario A
  const withPrepay   = generateAmortizationSchedule(outstandingBalance, annualRate, tenureMonths, surplusCash);
  const interestSaved = Math.max(0, withPrepay.baselineInterest - withPrepay.totalInterest);
  const monthsSaved   = Math.max(0, tenureMonths - withPrepay.actualMonths);

  // Scenario B
  const investFV      = sipFutureValue(surplusCash, expectedInvestmentReturn, tenureMonths);
  const totalSurplus  = surplusCash * tenureMonths;
  const wealthCreated = Math.max(0, investFV - totalSurplus);

  let recommendation;
  if (wealthCreated > interestSaved * 1.01) {
    recommendation = 'INVEST';
  } else if (interestSaved > wealthCreated * 1.01) {
    recommendation = 'PREPAY';
  } else {
    recommendation = 'EQUAL';
  }

  return { interestSaved, wealthCreated, recommendation, monthsSaved, investFV };
}

/* ═══════════════════════════════════════════════════════════════
   HOUSEHOLD AGGREGATION ENGINE
   Builds a single merged inputs object for buildCorpusTrajectory
   by combining primary user's data with the linked partner's
   SHARED items. Primary user's state is never mutated.
═══════════════════════════════════════════════════════════════ */

/**
 * Merge primary user state with partner's shared data into a single
 * `inputs` object compatible with buildCorpusTrajectory().
 *
 * Only partner items where `visibility === 'shared'` are included.
 * The primary user's own data is always included in full.
 *
 * @param {Object} primaryState  - The primary user's full state object
 * @param {Object} partnerData   - The read-only partner snapshot
 * @returns {PersonalInputs}     - Merged inputs for the trajectory engine
 */
export function buildHouseholdInputs(primaryState, partnerData) {
  const sharedSavings     = (partnerData.activeSavings || []).filter(s => (s.visibility ?? 'shared') === 'shared');
  const sharedGoals       = (partnerData.goals         || []).filter(g => (g.visibility ?? 'shared') === 'shared');
  const sharedLiabilities = (partnerData.liabilities   || []).filter(l => (l.visibility ?? 'shared') === 'shared');

  const partnerMonthlyEMI = sharedLiabilities.reduce((s, l) => s + (l.currentEMI || 0), 0);

  // Include partner's asset balances when they have opted in (shareAssets !== false)
  const includePartnerAssets = (partnerData.shareAssets !== false);
  const pa = includePartnerAssets ? partnerData : {};

  return {
    currentAge:           primaryState.currentAge,
    retirementAge:        primaryState.retirementAge,
    annualIncome:         (primaryState.monthlyIncome + (partnerData.monthlyIncome || 0)) * 12,
    salaryRaiseRate:      primaryState.salaryRaiseRate,
    equityFraction:       primaryState.equityPercent / 100,
    currentEquity:        primaryState.currentEquity        + (pa.currentEquity        || 0),
    currentDebt:          primaryState.currentDebt          + (pa.currentDebt          || 0),
    currentEPF:           primaryState.currentEPF           + (pa.currentEPF           || 0),
    currentGold:          primaryState.currentGold          + (pa.currentGold          || 0),
    currentRealEstate:    primaryState.currentRealEstate    + (pa.currentRealEstate    || 0),
    currentCash:          primaryState.currentCash          + (pa.currentCash          || 0),
    currentAlternatives:  primaryState.currentAlternatives  + (pa.currentAlternatives  || 0),
    inflationRate:        INFLATION.GENERAL,
    monthlyExpenses:      primaryState.monthlyExpenses      + (partnerData.monthlyExpenses      || 0),
    monthlyMedicalPremium: primaryState.monthlyMedicalPremium + (partnerData.monthlyMedicalPremium || 0),
    monthlyEMI:           primaryState.monthlyEMI           + partnerMonthlyEMI,
    planStartYear:        primaryState.planStartYear,
    goals:                [...(primaryState.goals        || []), ...sharedGoals],
    activeSavings:        [...(primaryState.activeSavings || []), ...sharedSavings],
  };
}

/* ═══════════════════════════════════════════════════════════════
   HOUSEHOLD CASHFLOW SUMMARY (used by FamilySyncForm display)
═══════════════════════════════════════════════════════════════ */

/**
 * @param {Object} primaryState
 * @param {Object|null} partnerData
 * @returns {{ totalIncome, partnerIncome, totalExpenses, totalEMI, investibleSurplus }}
 */
export function calculateHouseholdCashflow(primaryState, partnerData = null) {
  const partnerIncome = partnerData?.monthlyIncome || 0;
  const totalIncome   = primaryState.monthlyIncome + partnerIncome;
  const totalExpenses = primaryState.monthlyExpenses + (partnerData?.monthlyExpenses || 0);
  const sharedEMI     = partnerData
    ? (partnerData.liabilities || []).filter(l => (l.visibility ?? 'shared') === 'shared').reduce((s, l) => s + (l.currentEMI || 0), 0)
    : 0;
  const totalEMI      = primaryState.monthlyEMI + sharedEMI;
  const investibleSurplus = totalIncome - totalExpenses - totalEMI;
  return { totalIncome, partnerIncome, totalExpenses, totalEMI, investibleSurplus };
}


/* ═══════════════════════════════════════════════════════════════
   HOUSEHOLD TAX OPTIMISATION
   Brute-forces the split of 80C ELSS and Sec 24(b) home-loan
   interest across two spouses to minimise combined tax outgo.
═══════════════════════════════════════════════════════════════ */

/**
 * @param {Object} p1TaxInputs   - taxInputs object for primary user
 * @param {Object} p2TaxInputs   - taxInputs object for spouse
 * @param {Array}  jointLoans    - liabilities with ownerId === 'joint'
 * @returns {{
 *   p1Tax:         number,
 *   p2Tax:         number,
 *   householdTax:  number,
 *   p1Regime:      'NEW'|'OLD',
 *   p2Regime:      'NEW'|'OLD',
 *   p1_80c:        number,
 *   p2_80c:        number,
 *   p1_24b:        number,
 *   p2_24b:        number,
 *   aiInsight:     string,
 * }}
 */
export function calculateOptimalTaxStrategy(p1TaxInputs = {}, p2TaxInputs = {}, jointLoans = []) {
  // Import tax functions lazily to avoid circular dependency at module eval time.
  // Both files are pure ESM so dynamic import would require async; instead
  // we inline a minimal "which regime is better" helper derived from the
  // same logic as taxEngine.js, keeping this module free of circular imports.

  // Helper: compute best tax for one person given a taxInputs object.
  // We call the actual taxEngine via a captured reference passed in at call-time.
  // Because we cannot import taxEngine here (circular), we resolve the minimum
  // tax using the simple approximation of comparing new/old regime slabs.
  // Caller (main.js) passes real taxEngine outputs via p1TaxInputs.__newTax /
  // __oldTax when available; otherwise we fall back to the gross income estimate.

  function bestTax(inputs) {
    // Use pre-computed totals if the caller already ran both regimes
    if (typeof inputs.__newTax === 'number' && typeof inputs.__oldTax === 'number') {
      return {
        tax:    Math.min(inputs.__newTax, inputs.__oldTax),
        regime: inputs.__newTax <= inputs.__oldTax ? 'NEW' : 'OLD',
      };
    }
    // Fallback simple estimate using flat 30% on income above 15L
    const income = inputs.grossSalary || 0;
    const newTax = income > 1500000
      ? 150000 + (income - 1500000) * 0.30
      : income > 1200000 ? 90000 + (income - 1200000) * 0.20
      : income > 900000  ? 45000 + (income - 900000) * 0.15
      : income > 600000  ? 15000 + (income - 600000) * 0.10
      : income > 300000  ? (income - 300000) * 0.05
      : 0;
    return { tax: Math.max(0, newTax), regime: 'NEW' };
  }

  const SEC_24B_CAP  = 200000;  // ₹2L per person per year
  const SEC_80C_CAP  = 150000;  // ₹1.5L per person per year

  const jointHomeLoanInterest = jointLoans.reduce((s, l) => {
    // Annualise from EMI schedule if annualInterest is available, else estimate 70% of EMI as interest
    return s + (l.annualInterest ?? (l.currentEMI || 0) * 12 * 0.70);
  }, 0);

  // ELSS pool shared between spouses
  const total80C = (p1TaxInputs.elssContrib || 0) + (p2TaxInputs.elssContrib || 0);

  let bestTotal  = Infinity;
  let bestResult = null;

  // Iterate 80C split in ₹10 K increments
  for (let p1_80c = 0; p1_80c <= Math.min(total80C, SEC_80C_CAP); p1_80c += 10000) {
    const p2_80c = Math.min(Math.max(0, total80C - p1_80c), SEC_80C_CAP);

    // Iterate 24(b) interest split in ₹10 K increments
    for (let p1_24b = 0; p1_24b <= Math.min(jointHomeLoanInterest, SEC_24B_CAP); p1_24b += 10000) {
      const p2_24b = Math.min(Math.max(0, jointHomeLoanInterest - p1_24b), SEC_24B_CAP);

      const p1Inputs = { ...p1TaxInputs, elssContrib: p1_80c, homeLoanInterest: p1_24b };
      const p2Inputs = { ...p2TaxInputs, elssContrib: p2_80c, homeLoanInterest: p2_24b };

      const { tax: p1Tax, regime: p1Regime } = bestTax(p1Inputs);
      const { tax: p2Tax, regime: p2Regime } = bestTax(p2Inputs);
      const total = p1Tax + p2Tax;

      if (total < bestTotal) {
        bestTotal  = total;
        bestResult = { p1Tax, p2Tax, householdTax: total, p1Regime, p2Regime, p1_80c, p2_80c, p1_24b, p2_24b };
      }
    }
  }

  // Build human-readable AI insight
  let aiInsight = '';
  if (bestResult) {
    const saving = (bestTax(p1TaxInputs).tax + bestTax(p2TaxInputs).tax) - bestResult.householdTax;
    if (saving > 0) {
      aiInsight = `Optimal split: ${p1TaxInputs.name || 'Primary'} claims ₹${(bestResult.p1_80c / 1000).toFixed(0)}K 80C + ₹${(bestResult.p1_24b / 1000).toFixed(0)}K 24(b); ${p2TaxInputs.name || 'Spouse'} claims ₹${(bestResult.p2_80c / 1000).toFixed(0)}K 80C + ₹${(bestResult.p2_24b / 1000).toFixed(0)}K 24(b) → saves ₹${Math.round(saving / 100) * 100} jointly.`;
    } else {
      aiInsight = 'Current deduction allocation is already optimal for your household.';
    }
    bestResult.aiInsight = aiInsight;
  }

  return bestResult ?? { p1Tax: 0, p2Tax: 0, householdTax: 0, p1Regime: 'NEW', p2Regime: 'NEW', p1_80c: 0, p2_80c: 0, p1_24b: 0, p2_24b: 0, aiInsight };
}

/* ═══════════════════════════════════════════════════════════════
   PORTFOLIO REBALANCING ENGINE
   Computes drift between actual and target allocation and
   generates tax-efficient SIP re-routing nudges.
═══════════════════════════════════════════════════════════════ */

/**
 * Calculate per-class drift (actual% − target%) from current asset balances.
 *
 * @param {{ equity: number, debt: number, realAssets: number, cash: number }} currentAssets - ₹ values per class
 * @param {{ equity: number, debt: number, realAssets: number, cash: number }} targetAllocation - target percentages (must sum to 100)
 * @returns {{ equity: number, debt: number, realAssets: number, cash: number, totalAUM: number, actualPct: Object }}
 *   Each class value is the drift in percentage points (positive = overweight, negative = underweight).
 */
export function calculateAssetDrift(currentAssets, targetAllocation) {
  const totalAUM = (currentAssets.equity || 0) + (currentAssets.debt || 0)
    + (currentAssets.realAssets || 0) + (currentAssets.cash || 0);

  if (totalAUM === 0) {
    return {
      equity: 0, debt: 0, realAssets: 0, cash: 0, totalAUM: 0,
      actualPct: { equity: 0, debt: 0, realAssets: 0, cash: 0 },
    };
  }

  const actualPct = {
    equity:     (currentAssets.equity     || 0) / totalAUM * 100,
    debt:       (currentAssets.debt       || 0) / totalAUM * 100,
    realAssets: (currentAssets.realAssets || 0) / totalAUM * 100,
    cash:       (currentAssets.cash       || 0) / totalAUM * 100,
  };

  return {
    equity:     actualPct.equity     - (targetAllocation.equity     || 0),
    debt:       actualPct.debt       - (targetAllocation.debt       || 0),
    realAssets: actualPct.realAssets - (targetAllocation.realAssets || 0),
    cash:       actualPct.cash       - (targetAllocation.cash       || 0),
    totalAUM,
    actualPct,
  };
}

/**
 * Generate actionable rebalancing nudges from asset class drift.
 *
 * Triggers only when |drift| > 5 percentage points for any class.
 * Framing is tax-efficient: recommends SIP re-routing, not selling
 * (avoids triggering STCG/LTCG for equity/debt holdings).
 *
 * @param {{ equity: number, debt: number, realAssets: number, cash: number }} drift - output of calculateAssetDrift
 * @param {Array} [activeSavings] - state.activeSavings (used to show current SIP amounts per class)
 * @returns {string[]} Array of actionable nudge strings; empty array when portfolio is balanced.
 */
export function generateRebalancingNudges(drift, activeSavings = []) {
  const THRESHOLD = 5; // percentage-point drift required to trigger a nudge
  const CLASS_LABELS = {
    equity:     'Equity',
    debt:       'Debt',
    realAssets: 'Real Assets',
    cash:       'Cash & Alternatives',
  };
  const SKIP_KEYS = new Set(['totalAUM', 'actualPct']);

  const overweight  = Object.entries(drift)
    .filter(([k, v]) => !SKIP_KEYS.has(k) && v >  THRESHOLD)
    .sort((a, b) => b[1] - a[1]);
  const underweight = Object.entries(drift)
    .filter(([k, v]) => !SKIP_KEYS.has(k) && v < -THRESHOLD)
    .sort((a, b) => a[1] - b[1]);

  if (overweight.length === 0 && underweight.length === 0) return [];

  // Monthly SIP totals per asset class
  const sipByClass = activeSavings.reduce((acc, s) => {
    const cls = s.assetClass;
    if (cls) acc[cls] = (acc[cls] || 0) + (s.monthlyAmount || 0);
    return acc;
  }, {});

  const nudges = [];

  for (const [underCls] of underweight) {
    const label    = CLASS_LABELS[underCls];
    const driftAmt = Math.abs(drift[underCls]).toFixed(1);
    const existing = sipByClass[underCls] || 0;
    const [overCls] = overweight[0] || [];
    const overLabel = overCls ? CLASS_LABELS[overCls] : null;
    const overAmt   = overCls ? Math.abs(drift[overCls]).toFixed(1) : null;

    if (overLabel) {
      nudges.push(
        `${label} is underweight by ${driftAmt}% — route new SIPs to ${label} funds` +
        (existing > 0 ? ` (you currently invest ₹${Math.round(existing).toLocaleString('en-IN')}/mo here)` : '') +
        ` instead of adding more to ${overLabel} (overweight by ${overAmt}%). Prefer SIP re-routing over selling to avoid STCG/LTCG.`,
      );
    } else {
      nudges.push(
        `${label} is underweight by ${driftAmt}% — start or increase a monthly SIP in ${label} instruments to restore balance.`,
      );
    }
  }

  // Any overweight class not already paired gets its own nudge
  for (const [overCls, overDrift] of overweight) {
    const label        = CLASS_LABELS[overCls];
    const alreadyPaired = nudges.some(n => n.includes(`more to ${label}`));
    if (!alreadyPaired) {
      nudges.push(
        `${label} is overweight by ${overDrift.toFixed(1)}% — pause or reduce new ${label} contributions and redirect surplus toward lagging asset classes.`,
      );
    }
  }

  return nudges;
}
