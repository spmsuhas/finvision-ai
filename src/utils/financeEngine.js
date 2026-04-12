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

import { INFLATION, CORPUS, GOAL_TYPES, blendedReturn, almBlendedReturn, sipRate } from './constants.js';

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
 * @property {number} goalOutlays       - One-time goal disbursements (₹)
 * @property {number} totalExpenses     - Sum of all outflows (₹)
 * @property {number} netSurplus        - annualIncome - totalExpenses (₹)
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
    planStartYear,
    goals         = [],
    activeSavings = [],
  } = inputs;

  // Starting corpus = sum of ALL asset buckets across all 4 groups
  let openingBalance = (currentEquity || 0) + (currentDebt || 0) + (currentEPF || 0)
    + (currentGold || 0) + (currentRealEstate || 0) + (currentCash || 0) + (currentAlternatives || 0);

  // Compute ALM-weighted blended CAGR
  const total = openingBalance || 1; // avoid divide-by-zero
  const cagr = openingBalance > 0
    ? almBlendedReturn({
        equity:     (currentEquity) / total,
        debt:       (currentDebt + currentEPF) / total,
        gold:       (currentGold) / total,
        realEstate: (currentRealEstate) / total,
        cash:       (currentCash) / total,
        alts:       (currentAlternatives) / total,
      }, inflationRate)
    : blendedReturn(equityFraction); // fallback when corpus is zero

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

    // One-time goal disbursements scheduled for this calendar year
    const goalsThisYear = goals.filter(g => g.targetYear === calendarYear);
    const goalOutlays = goalsThisYear.reduce((sum, g) => {
      const yearsUntilGoal = g.targetYear - planStartYear;
      const inflRate = g.inflationRate != null
        ? g.inflationRate
        : (GOAL_TYPES[g.type]?.inflation ?? INFLATION.GENERAL);
      return sum + goalFutureValue(g.todayValue, inflRate, Math.max(0, yearsUntilGoal));
    }, 0);

    const totalExpenses = lifestyleExpenses + medicalExpenses + goalOutlays;
    const netSurplus    = annualIncomeThisYear - totalExpenses;

    // Sum monthly SIP contributions active during this calendar year
    const sipContributions = activeSavings.reduce((sum, sip) => {
      if (!sip.monthlyAmount || sip.monthlyAmount <= 0) return sum;
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
        if (sipStart > yearEnd) return sum;

        if (endYYYYMM) {
          const [ey, em] = endYYYYMM.split('-').map(Number);
          const sipEnd   = ey * 12 + em;
          if (sipEnd < yearStart) return sum; // already ended
          const activeMonths = Math.min(sipEnd, yearEnd) - Math.max(sipStart, yearStart) + 1;
          return sum + sip.monthlyAmount * Math.max(0, activeMonths);
        } else {
          // No end date — SIP runs indefinitely (wealth-building)
          const activeMonths = yearEnd - Math.max(sipStart, yearStart) + 1;
          return sum + sip.monthlyAmount * Math.max(0, activeMonths);
        }
      }, 0);

    // Portfolio grows at blended CAGR on opening balance
    const interestAccrued = openingBalance * cagr;
    const closingBalance  = openingBalance + interestAccrued + netSurplus + sipContributions;

    rows.push({
      calendarYear,
      age,
      openingBalance,
      annualIncome:      annualIncomeThisYear,
      lifestyleExpenses,
      medicalExpenses,
      goalOutlays,
      totalExpenses,
      netSurplus,
      sipContributions,
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
export function computeSIPGoalFunding(activeSavings = [], goals = [], planStartYear = new Date().getFullYear()) {
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
      entry.deficit     = Math.max(0, entry.goalInflatedCost - entry.sipContrib);
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
          deficit:          0,
        });
      }
    }
  });

  return result;
}
