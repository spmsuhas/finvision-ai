/**
 * FinVision AI - Life Goals Input Form
 * Add, edit, and delete goals while keeping everything bound to central state.
 */

import { GOAL_TYPES } from '@/utils/constants.js';
import { formatRupee } from '@/utils/formatters.js';

const GOAL_ICONS = {
  EDUCATION: '\u{1F393}',
  MARRIAGE: '\u{1F48D}',
  PROPERTY: '\u{1F3E0}',
  VEHICLE: '\u{1F697}',
  TRAVEL: '\u2708\uFE0F',
  RETIREMENT: '\u{1F3D6}\uFE0F',
  OTHER: '\u{1F3AF}',
};

function indianFormat(n) {
  if (!n) return '';
  const s = Math.floor(n).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}

function parseIndian(str) {
  return parseInt(String(str).replace(/[^\d]/g, ''), 10) || 0;
}

function renderGoalTable(container, goals, planStartYear, onUpdate, onEdit) {
  const listEl = container.querySelector('#goals-list');
  if (!listEl) return;

  if (goals.length === 0) {
    listEl.innerHTML = `<div class="text-center py-12 text-slate-500">
      <p class="text-4xl mb-3">&#x1F3AF;</p>
      <p class="text-sm font-medium">No goals yet &mdash; click <strong class="text-slate-400">Add Goal</strong> to plan your first milestone</p>
    </div>`;
    return;
  }

  listEl.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs text-slate-500 border-b border-white/10">
            <th class="pb-2 pr-3 font-medium">Goal</th>
            <th class="pb-2 pr-3 font-medium">Type</th>
            <th class="pb-2 pr-3 font-medium text-right">Target Year</th>
            <th class="pb-2 pr-3 font-medium text-right">Today's Value</th>
            <th class="pb-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5">
          ${goals.map((goal) => {
            const yearsAway = goal.targetYear ? goal.targetYear - planStartYear : 0;
            return `<tr data-goal-id="${goal.id}">
              <td class="py-2.5 pr-3">
                <div class="flex items-center gap-2">
                  <span class="text-lg leading-none">${GOAL_ICONS[goal.type] || GOAL_ICONS.OTHER}</span>
                  <span class="text-white font-medium">${goal.name}</span>
                </div>
              </td>
              <td class="py-2.5 pr-3">
                <span class="inline-block text-xs px-2 py-0.5 rounded-full bg-surface-3 text-brand font-medium whitespace-nowrap">${GOAL_TYPES[goal.type]?.label ?? goal.type}</span>
              </td>
              <td class="py-2.5 pr-3 text-right">
                <span class="text-white font-semibold">${goal.targetYear ?? '&ndash;'}</span>
                ${yearsAway > 0 ? `<span class="block text-xs text-slate-500">${yearsAway} yrs</span>` : ''}
              </td>
              <td class="py-2.5 pr-3 text-right text-brand font-semibold whitespace-nowrap">${formatRupee(goal.todayValue)}</td>
              <td class="py-2.5 text-right whitespace-nowrap">
                <button class="btn-edit-goal icon-btn text-slate-500 hover:text-brand" data-id="${goal.id}" aria-label="Edit goal">
                  <svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button class="btn-delete-goal icon-btn text-slate-500 hover:text-red-400" data-id="${goal.id}" aria-label="Delete goal">
                  <svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;

  listEl.querySelectorAll('.btn-delete-goal').forEach((button) => {
    button.addEventListener('click', () => {
      const updated = goals.filter((goal) => goal.id !== button.dataset.id);
      goals.splice(0, goals.length, ...updated);
      onUpdate('goals', [...goals]);
      renderGoalTable(container, goals, planStartYear, onUpdate, onEdit);
      const badge = container.querySelector('#goals-count-badge');
      if (badge) badge.textContent = `${goals.length} goals`;
    });
  });

  listEl.querySelectorAll('.btn-edit-goal').forEach((button) => {
    button.addEventListener('click', () => {
      const goal = goals.find((item) => item.id === button.dataset.id);
      if (goal && onEdit) onEdit(goal);
    });
  });
}

export function mountGoalsForm(container, state, onUpdate) {
  const currentYear = state.planStartYear ?? new Date().getFullYear();
  const goals = state.goals ?? [];

  container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-white tracking-wide">Life Goals</h2>
          <p class="text-xs text-slate-500 mt-0.5">Plan major milestones &mdash; inflation is auto-applied to future values</p>
        </div>
        <button id="btn-open-goal-modal" class="btn-primary flex items-center gap-2 text-sm">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Add Goal
        </button>
      </div>

      <div class="card bg-surface-3 flex items-center justify-between gap-4 py-3 px-5">
        <div class="flex items-center gap-2 text-slate-400 text-sm">
          <span class="text-lg">&#x1F3AF;</span>
          Life Goals Tracker
        </div>
        <span id="goals-count-badge" class="text-sm text-brand font-semibold">${goals.length} goals</span>
      </div>

      <div class="card overflow-hidden">
        <h3 class="card-title flex items-center gap-2 text-base mb-4">
          <span class="w-2.5 h-2.5 rounded-full bg-brand inline-block"></span>
          Your Goals
        </h3>
        <div id="goals-list"></div>
      </div>
    </div>

    <div id="goal-modal" class="fixed inset-0 z-50 hidden items-center justify-center p-4">
      <div id="goal-modal-backdrop" class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      <div class="relative z-10 w-full max-w-lg bg-surface-2 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 id="goal-modal-title" class="text-base font-semibold text-white flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-brand inline-block"></span>
            Add Goal
          </h3>
          <button id="goal-modal-close" class="icon-btn text-slate-400 hover:text-white" aria-label="Close">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="px-6 py-5 overflow-y-auto max-h-[calc(100vh-12rem)]">
          <form id="goal-add-form" class="space-y-4">
            <div class="form-group">
              <label for="goal-name" class="form-label">Goal Name</label>
              <input id="goal-name" type="text" class="form-input" required maxlength="60" placeholder="e.g. Daughter's Engineering Degree" />
            </div>

            <div class="form-group">
              <label for="goal-type" class="form-label">Goal Type</label>
              <select id="goal-type" class="form-input">
                ${Object.entries(GOAL_TYPES).map(([key, value]) => (
                  `<option value="${key}">${value.icon ?? ''} ${value.label}</option>`
                )).join('')}
              </select>
            </div>

            <div class="form-group">
              <label for="goal-year" class="form-label">Target Year</label>
              <input id="goal-year" type="text" inputmode="numeric" class="form-input" required placeholder="${currentYear + 10}" />
            </div>

            <div class="form-group">
              <label for="goal-value" class="form-label">Cost in Today's Rupees</label>
              <div class="form-input-prefix-group">
                <span class="form-input-prefix">&#8377;</span>
                <input id="goal-value" type="text" inputmode="numeric" class="form-input" required placeholder="20,00,000" />
              </div>
              <p class="form-hint">Enter today's value &mdash; inflation is auto-applied</p>
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <button type="button" id="goal-form-cancel" class="btn-secondary text-sm">Cancel</button>
              <button type="submit" id="goal-form-submit" class="btn-primary flex items-center gap-2 text-sm">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                Add Goal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  const modal = container.querySelector('#goal-modal');
  const modalTitle = container.querySelector('#goal-modal-title');
  const submitBtn = container.querySelector('#goal-form-submit');
  const nameEl = container.querySelector('#goal-name');
  const typeEl = container.querySelector('#goal-type');
  const yearEl = container.querySelector('#goal-year');
  const valueEl = container.querySelector('#goal-value');

  let editingId = null;

  function openModal() {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
  }

  function exitEditMode() {
    editingId = null;
    modalTitle.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-brand inline-block"></span> Add Goal';
    submitBtn.innerHTML = '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> Add Goal';
    container.querySelector('#goal-add-form').reset();
    valueEl.value = '';
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
    exitEditMode();
  }

  function enterEditMode(goal) {
    editingId = goal.id;
    modalTitle.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-brand inline-block"></span> Edit Goal';
    submitBtn.innerHTML = '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Update Goal';
    nameEl.value = goal.name || '';
    typeEl.value = goal.type || 'OTHER';
    yearEl.value = goal.targetYear || '';
    valueEl.value = indianFormat(goal.todayValue);
    openModal();
  }

  renderGoalTable(container, goals, currentYear, onUpdate, enterEditMode);

  container.querySelector('#btn-open-goal-modal').addEventListener('click', openModal);
  container.querySelector('#goal-modal-close').addEventListener('click', closeModal);
  container.querySelector('#goal-form-cancel').addEventListener('click', closeModal);
  container.querySelector('#goal-modal-backdrop').addEventListener('click', closeModal);

  valueEl.addEventListener('focus', () => {
    const value = parseIndian(valueEl.value);
    valueEl.value = value || '';
  });
  valueEl.addEventListener('blur', () => {
    const value = parseIndian(valueEl.value);
    valueEl.value = indianFormat(value);
  });

  container.querySelector('#goal-add-form').addEventListener('submit', (event) => {
    event.preventDefault();

    const name = nameEl.value.trim();
    const type = typeEl.value;
    const year = parseInt(yearEl.value, 10);
    const value = parseIndian(valueEl.value);

    if (!name || !year || !value) return;

    const payload = {
      name,
      type,
      targetYear: year,
      todayValue: value,
      inflationRate: GOAL_TYPES[type]?.inflation ?? 0.08,
    };

    if (editingId) {
      const index = goals.findIndex((goal) => goal.id === editingId);
      if (index !== -1) goals[index] = { ...goals[index], ...payload };
    } else {
      goals.push({ id: crypto.randomUUID(), ...payload });
    }

    onUpdate('goals', [...goals]);
    state.goals = goals;
    renderGoalTable(container, goals, currentYear, onUpdate, enterEditMode);
    const badge = container.querySelector('#goals-count-badge');
    if (badge) badge.textContent = `${goals.length} goals`;
    closeModal();
  });
}