/**
 * FinVision AI — Personal Details Input Form (Phase 3)
 * ============================================================
 * Renders the Personal Details sub-panel inside #form-personal-details.
 * Emits state changes to the central store on every input event.
 */

import { formatRupee } from '@/utils/formatters.js';

/** Format number with Indian comma system (e.g. 12,34,567) */
function indianFormat(n) {
  if (!n) return '';
  const s = Math.floor(n).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest  = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}

/** Parse Indian-formatted string back to number */
function parseIndian(str) {
  return parseInt(String(str).replace(/[^\d]/g, ''), 10) || 0;
}

/**
 * Mount the Personal Details form into the given container.
 * @param {HTMLElement} container
 * @param {Object} state     - Current application state
 * @param {Function} onUpdate - Callback(fieldName, value) on any change
 */
export function mountPersonalDetailsForm(container, state, onUpdate) {
  const income = state.monthlyIncome || 0;

  container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-5">

      <div class="text-center mb-2">
        <h2 class="text-lg font-bold text-white tracking-wide">Personal Information</h2>
        <p class="text-xs text-slate-500 mt-0.5">Basic details for accurate financial projections</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

        <!-- Identity Card -->
        <div class="card">
          <h3 class="card-title flex items-center gap-2 text-base mb-3">
            <span class="w-2.5 h-2.5 rounded-full bg-brand inline-block"></span>
            Identity
          </h3>

          <div class="form-group mb-3">
            <label for="inp-name" class="form-label">Full Name</label>
            <input id="inp-name" type="text" class="form-input" 
              placeholder="Rajesh Kumar"
              value="${state.name || ''}" />
          </div>

          <div class="form-group mb-3">
            <label for="inp-dob" class="form-label">Date of Birth</label>
            <input id="inp-dob" type="date" class="form-input"
              value="${state.dob || ''}" />
            <p class="form-hint">Current age: <strong id="display-current-age">${state.currentAge || '—'}</strong></p>
          </div>

          <div class="form-group">
            <label for="inp-retirement-age" class="form-label">
              Retirement Age
              <span class="text-brand font-semibold" id="retirement-age-display">${state.retirementAge || 60}</span>
            </label>
            <input id="inp-retirement-age" type="range" class="form-range"
              min="45" max="75" step="1"
              value="${state.retirementAge || 60}" />
            <div class="flex justify-between text-xs text-slate-500 mt-1"><span>45</span><span>60</span><span>75</span></div>
          </div>
        </div>

        <!-- Income Card -->
        <div class="card">
          <h3 class="card-title flex items-center gap-2 text-base mb-3">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
            Income
          </h3>

          <div class="form-group mb-3">
            <label for="inp-monthly-income" class="form-label">Monthly Gross Income</label>
            <div class="form-input-prefix-group">
              <span class="form-input-prefix">₹</span>
              <input id="inp-monthly-income" type="text" inputmode="numeric" class="form-input"
                placeholder="1,50,000"
                value="${indianFormat(income)}"
                data-rupee="monthlyIncome" />
            </div>
            <p class="form-hint">Annual: <strong id="display-annual-income">${income ? formatRupee(income * 12) : '—'}</strong></p>
          </div>

          <div class="form-group">
            <label for="inp-salary-raise" class="form-label">
              Annual Salary Raise
              <span class="text-brand font-semibold" id="salary-raise-display">${((state.salaryRaiseRate || 0) * 100).toFixed(1)}%</span>
            </label>
            <input id="inp-salary-raise" type="range" class="form-range"
              min="0" max="20" step="0.5"
              value="${((state.salaryRaiseRate || 0) * 100)}" />
            <div class="flex justify-between text-xs text-slate-500 mt-1"><span>0%</span><span>10%</span><span>20%</span></div>
          </div>
        </div>

      </div>
    </div>
  `;

  /* ── Indian comma formatting for rupee inputs ──────────── */
  container.querySelectorAll('[data-rupee]').forEach(el => {
    el.addEventListener('focus', () => {
      const num = parseIndian(el.value);
      el.value = num || '';
    });
    el.addEventListener('blur', () => {
      const num = parseIndian(el.value);
      el.value = indianFormat(num);
    });
  });

  function bind(id, field, transform) {
    const el = container.querySelector(`#${id}`);
    if (!el) return;
    el.addEventListener('input', () => {
      let val;
      if (el.dataset.rupee) {
        // Strip non-digits for rupee fields
        const raw = el.value.replace(/[^\d]/g, '');
        val = parseInt(raw, 10) || 0;
      } else {
        val = transform ? transform(el.value) : el.value;
      }

      if (field === 'monthlyIncome') {
        const annualEl = container.querySelector('#display-annual-income');
        if (annualEl) annualEl.textContent = formatRupee(val * 12);
      }
      if (field === 'retirementAge') {
        const disp = container.querySelector('#retirement-age-display');
        if (disp) disp.textContent = val;
      }
      if (field === 'salaryRaiseRate') {
        const disp = container.querySelector('#salary-raise-display');
        if (disp) disp.textContent = `${(val * 100).toFixed(1)}%`;
      }
      if (field === 'dob') {
        const birth = new Date(el.value);
        if (!isNaN(birth)) {
          const age = new Date().getFullYear() - birth.getFullYear();
          const ageEl = container.querySelector('#display-current-age');
          if (ageEl) ageEl.textContent = age;
          onUpdate('currentAge', age);
        }
      }
      onUpdate(field, val);
    });
  }

  bind('inp-name',           'name');
  bind('inp-dob',            'dob');
  bind('inp-retirement-age', 'retirementAge',  v => parseInt(v, 10));
  bind('inp-monthly-income', 'monthlyIncome');
  bind('inp-salary-raise',   'salaryRaiseRate', v => parseFloat(v) / 100);

  // Open calendar popup on any click on the DOB field
  const dobInput = container.querySelector('#inp-dob');
  if (dobInput) {
    dobInput.addEventListener('click', () => {
      try { dobInput.showPicker(); } catch (_) { /* unsupported browser */ }
    });
  }
}
