/**
 * FinVision AI — Personal Details Input Form (Phase 3)
 * ============================================================
 * Renders the Personal Details sub-panel inside #form-personal-details.
 * Emits state changes to the central store on every input event.
 */

import { DEFAULTS, CORPUS } from '@/utils/constants.js';
import { formatRupee } from '@/utils/formatters.js';

/**
 * Mount the Personal Details form into the given container.
 * @param {HTMLElement} container
 * @param {Object} state     - Current application state
 * @param {Function} onUpdate - Callback(fieldName, value) on any change
 */
export function mountPersonalDetailsForm(container, state, onUpdate) {
  // Phase 3 — full form HTML + event binding
  container.innerHTML = `
    <div class="card">
      <h2 class="card-title mb-4">Personal Information</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div class="form-group">
          <label for="inp-name" class="form-label">Full Name</label>
          <input id="inp-name" type="text" class="form-input" 
            placeholder="Rajesh Kumar"
            value="${state.name || ''}" />
        </div>

        <div class="form-group">
          <label for="inp-dob" class="form-label">Date of Birth</label>
          <input id="inp-dob" type="date" class="form-input"
            value="${state.dob || ''}" />
          <p class="form-hint">Current age: <strong id="display-current-age">${state.currentAge || DEFAULTS.CURRENT_AGE}</strong></p>
        </div>

        <div class="form-group">
          <label for="inp-retirement-age" class="form-label">
            Retirement Age
            <span class="text-brand font-semibold" id="retirement-age-display">${state.retirementAge || DEFAULTS.RETIREMENT_AGE}</span>
          </label>
          <input id="inp-retirement-age" type="range" class="form-range"
            min="45" max="75" step="1"
            value="${state.retirementAge || DEFAULTS.RETIREMENT_AGE}" />
          <div class="flex justify-between text-xs text-slate-500 mt-1"><span>45</span><span>60</span><span>75</span></div>
        </div>

        <div class="form-group">
          <label for="inp-monthly-income" class="form-label">Monthly Gross Income</label>
          <div class="form-input-prefix-group">
            <span class="form-input-prefix">₹</span>
            <input id="inp-monthly-income" type="number" class="form-input"
              placeholder="150000" min="0" step="5000"
              value="${state.monthlyIncome || DEFAULTS.MONTHLY_INCOME}" />
          </div>
          <p class="form-hint">Annual: <strong id="display-annual-income">${formatRupee((state.monthlyIncome || DEFAULTS.MONTHLY_INCOME) * 12)}</strong></p>
        </div>

        <div class="form-group">
          <label for="inp-salary-raise" class="form-label">
            Annual Salary Raise
            <span class="text-brand font-semibold" id="salary-raise-display">${((state.salaryRaiseRate || DEFAULTS.SALARY_RAISE_RATE) * 100).toFixed(1)}%</span>
          </label>
          <input id="inp-salary-raise" type="range" class="form-range"
            min="0" max="20" step="0.5"
            value="${((state.salaryRaiseRate || DEFAULTS.SALARY_RAISE_RATE) * 100)}" />
          <div class="flex justify-between text-xs text-slate-500 mt-1"><span>0%</span><span>10%</span><span>20%</span></div>
        </div>
      </div>
    </div>
  `;

  // Phase 3 — attach event listeners here
}
