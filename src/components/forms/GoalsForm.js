/**
 * FinVision AI — Life Goals Input Form (Phase 3)
 * Add/edit/delete goal cards with type, year, and today-value fields.
 */
import { GOAL_TYPES } from '@/utils/constants.js';
import { formatRupee } from '@/utils/formatters.js';

const GOAL_ICONS = { EDUCATION: '🎓', MARRIAGE: '💍', PROPERTY: '🏠', VEHICLE: '🚗', TRAVEL: '✈️', RETIREMENT: '🏖️', OTHER: '🎯' };

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

function renderGoalCards(container, goals, planStartYear, onUpdate) {
  const listEl = container.querySelector('#goals-list');
  if (!listEl) return;

  if (goals.length === 0) {
    listEl.innerHTML = `<div class="text-center py-12 text-slate-500">
      <p class="text-4xl mb-3">🎯</p>
      <p class="text-sm font-medium">No goals yet — add your first life milestone</p>
    </div>`;
    return;
  }

  listEl.innerHTML = goals.map(g => {
    const fy = g.targetYear ? `FY ${g.targetYear}-${String(g.targetYear + 1).slice(-2)}` : '–';
    const yearsAway = g.targetYear ? g.targetYear - planStartYear : 0;
    return `
    <div class="goal-card bg-surface-3 rounded-xl p-4 flex items-start gap-4" data-goal-id="${g.id}">
      <span class="text-2xl mt-0.5">${GOAL_ICONS[g.type] || '🎯'}</span>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between gap-2">
          <p class="font-semibold text-white truncate">${g.name}</p>
          <button class="btn-delete-goal icon-btn text-slate-500 hover:text-red-400" data-id="${g.id}" title="Remove goal" aria-label="Delete goal">
            <svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <p class="text-xs text-slate-400 mt-0.5">${GOAL_TYPES[g.type]?.label ?? g.type} · ${fy}${yearsAway > 0 ? ` · ${yearsAway} years away` : ''}</p>
        <p class="text-sm font-semibold text-brand mt-1.5">${formatRupee(g.todayValue)} <span class="text-slate-500 font-normal text-xs">today's value</span></p>
      </div>
    </div>`;
  }).join('');

  listEl.querySelectorAll('.btn-delete-goal').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const updated = goals.filter(g => g.id !== id);
      onUpdate('goals', updated);
      renderGoalCards(container, updated, planStartYear, onUpdate);
    });
  });
}

export function mountGoalsForm(container, state, onUpdate) {
  const currentYear = state.planStartYear ?? new Date().getFullYear();

  container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-5">

      <div class="text-center mb-2">
        <h2 class="text-lg font-bold text-white tracking-wide">Life Goals</h2>
        <p class="text-xs text-slate-500 mt-0.5">Plan major milestones — inflation is auto-applied to future values</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

        <!-- Add Goal Form Card -->
        <div class="card">
          <h3 class="card-title flex items-center gap-2 text-base mb-3">
            <span class="w-2.5 h-2.5 rounded-full bg-brand inline-block"></span>
            Add a Goal
          </h3>
          <form id="goal-add-form" class="space-y-3">

            <div class="form-group">
              <label for="goal-name" class="form-label">Goal Name</label>
              <input id="goal-name" type="text" class="form-input" required maxlength="60"
                placeholder="e.g. Daughter's Engineering Degree" />
            </div>

            <div class="form-group">
              <label for="goal-type" class="form-label">Goal Type</label>
              <select id="goal-type" class="form-input">
                ${Object.entries(GOAL_TYPES).map(([k, v]) =>
                  `<option value="${k}">${v.icon ?? ''} ${v.label}</option>`
                ).join('')}
              </select>
            </div>

            <div class="form-group">
              <label for="goal-year" class="form-label">Target Year</label>
              <input id="goal-year" type="text" inputmode="numeric" class="form-input" required
                placeholder="${currentYear + 10}" />
            </div>

            <div class="form-group">
              <label for="goal-value" class="form-label">Cost in Today's Rupees</label>
              <div class="form-input-prefix-group">
                <span class="form-input-prefix">₹</span>
                <input id="goal-value" type="text" inputmode="numeric" class="form-input" required
                  placeholder="20,00,000" data-rupee="goalValue" />
              </div>
              <p class="form-hint">Enter today's value — inflation is auto-applied</p>
            </div>

            <div class="flex justify-end">
              <button type="submit" class="btn-primary flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                Add Goal
              </button>
            </div>
          </form>
        </div>

        <!-- Goals List Card -->
        <div class="card">
          <h3 class="card-title flex items-center gap-2 text-base mb-3">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
            Your Goals <span id="goals-count-badge" class="text-sm text-slate-400 font-normal">(${state.goals?.length ?? 0})</span>
          </h3>
          <div id="goals-list" class="space-y-3"></div>
        </div>

      </div>
    </div>
  `;

  // Initial render
  renderGoalCards(container, state.goals ?? [], currentYear, onUpdate);

  /* ── Indian comma formatting for rupee input ──────────── */
  const goalValueEl = container.querySelector('#goal-value');
  if (goalValueEl) {
    goalValueEl.addEventListener('focus', () => {
      const num = parseIndian(goalValueEl.value);
      goalValueEl.value = num || '';
    });
    goalValueEl.addEventListener('blur', () => {
      const num = parseIndian(goalValueEl.value);
      goalValueEl.value = indianFormat(num);
    });
  }

  // Add goal form submit
  container.querySelector('#goal-add-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name  = container.querySelector('#goal-name').value.trim();
    const type  = container.querySelector('#goal-type').value;
    const year  = parseInt(container.querySelector('#goal-year').value, 10);
    const value = parseIndian(container.querySelector('#goal-value').value);

    if (!name || !year || !value) return;

    const newGoal = {
      id:           crypto.randomUUID(),
      name,
      type,
      targetYear:   year,
      todayValue:   value,
      inflationRate: GOAL_TYPES[type]?.inflation ?? 0.08,
    };

    const updated = [...(state.goals ?? []), newGoal];
    onUpdate('goals', updated);
    state.goals = updated;  // keep local reference in sync for re-render

    renderGoalCards(container, updated, currentYear, onUpdate);
    const badge = container.querySelector('#goals-count-badge');
    if (badge) badge.textContent = `(${updated.length})`;

    // Reset form
    e.target.reset();
  });
}
