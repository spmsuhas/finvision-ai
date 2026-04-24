/**
 * FinVision AI — Family Profiles Form
 * ============================================================
 * Manages household member profiles (Self + Spouse).
 * Allows adding a spouse and editing per-profile income /
 * retirement age / tax inputs without touching the primary
 * flat state fields.
 *
 * Follows the standard mountXForm(container, state, onUpdate) signature.
 * Emits: onUpdate('profiles', [...])
 */

import { formatRupee } from '@/utils/formatters.js';
import { confirmDelete } from '@/utils/confirmDelete.js';

/* ── Indian number helpers ──────────────────────────────────── */
function indianFormat(n) {
  if (!n && n !== 0) return '';
  const s = Math.floor(Math.abs(n)).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest  = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}
function parseIndian(str) {
  return parseInt(String(str).replace(/[^\d]/g, ''), 10) || 0;
}

/* ── Default p2 profile template ───────────────────────────── */
function defaultSpouseProfile() {
  return {
    id:             'p2',
    relation:       'Spouse',
    name:           '',
    dob:            '',
    retirementAge:  60,
    monthlyIncome:  0,
    salaryRaiseRate: 0.04,
    taxInputs: {
      grossSalary:          0,
      epfContrib:           0,
      ppfContrib:           0,
      elssContrib:          0,
      lifeInsurance:        0,
      homeLoanInterest:     0,
      medicalPremiumSelf:   0,
      medicalPremiumParents: 0,
      npsContrib80CCD1B:    0,
      parentsAbove60:       false,
    },
  };
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════════════ */
export function mountFamilyForm(container, state, onUpdate) {
  if (!container) return;

  // AbortController prevents listener stacking on re-mount
  if (container._famAbort) container._famAbort.abort();
  const _ac = new AbortController();
  container._famAbort = _ac;
  const { signal } = _ac;

  let profiles = (state.profiles ?? []).map(p => ({ ...p }));

  /* ── Notify parent ─────────────────────────────────────────── */
  function notifyUpdate() {
    onUpdate('profiles', profiles.map(p => ({ ...p })));
  }

  /* ── Render ────────────────────────────────────────────────── */
  function render() {
    const p1 = profiles.find(p => p.id === 'p1') ?? profiles[0];
    const p2 = profiles.find(p => p.id === 'p2');

    container.innerHTML = `
      <div class="max-w-5xl mx-auto space-y-5">
        <!-- Header -->
        <div class="text-center mb-2">
          <h2 class="text-lg font-bold text-white tracking-wide">Family Profiles</h2>
          <p class="text-xs text-slate-500 mt-0.5">Household financial planning — manage multiple earners and optimise tax jointly</p>
        </div>

        <!-- Primary (Self) card -->
        <div class="card">
          <h3 class="card-title flex items-center gap-2 text-base mb-4">
            <span class="w-2.5 h-2.5 rounded-full bg-brand inline-block"></span>
            Primary Member — Self
          </h3>
          ${renderProfileFields(p1, 'p1')}
        </div>

        <!-- Spouse card or Add button -->
        ${p2 ? renderSpouseCard(p2) : renderAddSpouseCard()}

        <!-- Household summary -->
        ${p2 ? renderHouseholdSummary(p1, p2) : ''}
      </div>

      <!-- Spouse add modal -->
      <div id="fam-modal" class="fixed inset-0 z-50 hidden items-center justify-center p-4">
        <div id="fam-modal-backdrop" class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div class="relative z-10 w-full max-w-xl bg-surface-2 rounded-2xl shadow-2xl border border-white/10 overflow-y-auto" style="max-height:90vh">
          <div class="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h3 class="text-base font-semibold text-white flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
              Add Spouse / Partner
            </h3>
            <button id="fam-modal-close" class="icon-btn text-slate-400 hover:text-white">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="p-6 space-y-4" id="fam-modal-body">
            ${renderSpouseModalForm(defaultSpouseProfile())}
          </div>
          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
            <button id="fam-modal-cancel" class="btn-secondary text-sm">Cancel</button>
            <button id="fam-modal-save" class="btn-primary text-sm">Add Spouse</button>
          </div>
        </div>
      </div>
    `;

    wireEvents();
  }

  /* ── Profile input fields (shared P1 / P2) ─────────────────── */
  function renderProfileFields(profile, prefix) {
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input type="text" class="form-input fam-field" data-id="${profile.id}" data-field="name"
            value="${profile.name || ''}" placeholder="Enter name" />
        </div>
        <div class="form-group">
          <label class="form-label">Date of Birth</label>
          <input type="date" class="form-input fam-field" data-id="${profile.id}" data-field="dob"
            value="${profile.dob || ''}" style="color-scheme:dark" />
        </div>
        <div class="form-group">
          <label class="form-label">Monthly Income (₹)</label>
          <div class="form-input-prefix-group">
            <span class="form-input-prefix">₹</span>
            <input type="text" inputmode="numeric" class="form-input fam-income fam-field"
              data-id="${profile.id}" data-field="monthlyIncome"
              value="${indianFormat(profile.monthlyIncome)}" placeholder="0" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Annual Salary Raise (%)</label>
          <input type="number" class="form-input fam-field" data-id="${profile.id}" data-field="salaryRaiseRate"
            min="0" max="50" step="0.5"
            value="${((profile.salaryRaiseRate || 0) * 100).toFixed(1)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Retirement Age</label>
          <input type="number" class="form-input fam-field" data-id="${profile.id}" data-field="retirementAge"
            min="40" max="80" value="${profile.retirementAge || 60}" />
        </div>
      </div>`;
  }

  function renderSpouseCard(p2) {
    return `
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="card-title flex items-center gap-2 text-base">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
            Spouse / Partner — ${p2.name || 'Partner'}
          </h3>
          <button id="fam-remove-spouse" class="btn-secondary text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10">
            Remove Spouse
          </button>
        </div>
        ${renderProfileFields(p2, 'p2')}
      </div>`;
  }

  function renderAddSpouseCard() {
    return `
      <div class="card flex flex-col items-center justify-center gap-4 py-10 border-dashed border-2 border-white/10 bg-surface-3/50">
        <div class="text-4xl">👫</div>
        <div class="text-center">
          <p class="text-sm font-medium text-white mb-1">Add your spouse or partner</p>
          <p class="text-xs text-slate-500 max-w-xs">Enable household cashflow aggregation, joint tax optimisation (Sec 24b/80C split), and per-person goal assignment.</p>
        </div>
        <button id="fam-btn-add-spouse" class="btn-primary flex items-center gap-2 text-sm">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Add Spouse
        </button>
      </div>`;
  }

  function renderHouseholdSummary(p1, p2) {
    const totalIncome = (p1.monthlyIncome || 0) + (p2.monthlyIncome || 0);
    return `
      <div class="card bg-surface-3 max-w-2xl mx-auto">
        <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Household Summary</h4>
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <p class="text-xs text-slate-500 mb-0.5">Primary Income</p>
            <p class="text-sm font-bold text-white">${formatRupee(p1.monthlyIncome || 0)}/mo</p>
          </div>
          <div>
            <p class="text-xs text-slate-500 mb-0.5">Spouse Income</p>
            <p class="text-sm font-bold text-white">${formatRupee(p2.monthlyIncome || 0)}/mo</p>
          </div>
          <div>
            <p class="text-xs text-slate-500 mb-0.5">Combined Income</p>
            <p class="text-sm font-bold text-brand">${formatRupee(totalIncome)}/mo</p>
          </div>
        </div>
      </div>`;
  }

  function renderSpouseModalForm(p2) {
    return `
      <div class="grid grid-cols-1 gap-4">
        <div class="form-group">
          <label class="form-label">Spouse / Partner Name</label>
          <input type="text" id="fam-sp-name" class="form-input" value="${p2.name || ''}" placeholder="Enter name" />
        </div>
        <div class="form-group">
          <label class="form-label">Date of Birth</label>
          <input type="date" id="fam-sp-dob" class="form-input" value="${p2.dob || ''}" style="color-scheme:dark" />
        </div>
        <div class="form-group">
          <label class="form-label">Monthly Income (₹)</label>
          <div class="form-input-prefix-group">
            <span class="form-input-prefix">₹</span>
            <input type="text" inputmode="numeric" id="fam-sp-income" class="form-input"
              value="${indianFormat(p2.monthlyIncome)}" placeholder="0" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Annual Salary Raise (%)</label>
          <input type="number" id="fam-sp-raise" class="form-input" min="0" max="50" step="0.5"
            value="${((p2.salaryRaiseRate || 0) * 100).toFixed(1)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Retirement Age</label>
          <input type="number" id="fam-sp-retire" class="form-input" min="40" max="80"
            value="${p2.retirementAge || 60}" />
        </div>
      </div>`;
  }

  /* ── Wire events ───────────────────────────────────────────── */
  function wireEvents() {
    // Inline edit fields (both p1 and p2 existing cards)
    container.querySelectorAll('.fam-field').forEach(el => {
      const evt = el.tagName === 'INPUT' && el.type === 'date' ? 'change' : 'input';
      el.addEventListener(evt, () => {
        const profileId = el.dataset.id;
        const field     = el.dataset.field;
        const profile   = profiles.find(p => p.id === profileId);
        if (!profile) return;

        let val;
        if (field === 'monthlyIncome') {
          val = parseIndian(el.value);
        } else if (field === 'salaryRaiseRate') {
          val = (parseFloat(el.value) || 0) / 100;
        } else if (field === 'retirementAge') {
          val = parseInt(el.value, 10) || 60;
        } else {
          val = el.value;
        }
        profile[field] = val;
        // Sync grossSalary in taxInputs for p2 if income changes
        if (field === 'monthlyIncome' && profileId === 'p2') {
          profile.taxInputs = { ...(profile.taxInputs || {}), grossSalary: val * 12 };
        }
        notifyUpdate();
        // Re-render summary row without full re-mount
        const p1 = profiles.find(p => p.id === 'p1');
        const p2 = profiles.find(p => p.id === 'p2');
        if (p1 && p2) {
          const summaryEl = container.querySelector('.card.bg-surface-3.max-w-2xl');
          if (summaryEl) summaryEl.outerHTML = renderHouseholdSummary(p1, p2);
        }
      }, { signal });

      // Indian formatting on income fields
      if (el.classList.contains('fam-income')) {
        el.addEventListener('focus', () => {
          const raw = parseIndian(el.value);
          el.value = raw > 0 ? String(raw) : '';
        }, { signal });
        el.addEventListener('blur', () => {
          const raw = parseIndian(el.value);
          el.value = raw > 0 ? indianFormat(raw) : '';
        }, { signal });
      }
    });

    // Remove spouse
    const removeBtn = container.querySelector('#fam-remove-spouse');
    if (removeBtn) {
      removeBtn.addEventListener('click', async () => {
        const ok = await confirmDelete({
          title:   'Remove Spouse Profile',
          message: 'This will remove the spouse profile and clear ownership on any linked items. This cannot be undone.',
        });
        if (!ok) return;
        profiles = profiles.filter(p => p.id !== 'p2');
        notifyUpdate();
        render();
      }, { signal });
    }

    // Open add-spouse modal
    const addBtn = container.querySelector('#fam-btn-add-spouse');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        openModal();
      }, { signal });
    }

    // Modal close / cancel
    container.querySelector('#fam-modal-close')?.addEventListener('click', closeModal, { signal });
    container.querySelector('#fam-modal-cancel')?.addEventListener('click', closeModal, { signal });
    container.querySelector('#fam-modal-backdrop')?.addEventListener('click', closeModal, { signal });

    // Modal save
    container.querySelector('#fam-modal-save')?.addEventListener('click', () => {
      const name    = (container.querySelector('#fam-sp-name')?.value || '').trim();
      const dob     = container.querySelector('#fam-sp-dob')?.value || '';
      const income  = parseIndian(container.querySelector('#fam-sp-income')?.value || '0');
      const raise   = (parseFloat(container.querySelector('#fam-sp-raise')?.value) || 4) / 100;
      const retire  = parseInt(container.querySelector('#fam-sp-retire')?.value, 10) || 60;

      const existing = profiles.find(p => p.id === 'p2');
      if (existing) {
        Object.assign(existing, { name, dob, monthlyIncome: income, salaryRaiseRate: raise, retirementAge: retire });
        existing.taxInputs = { ...(existing.taxInputs || {}), grossSalary: income * 12 };
      } else {
        const sp = defaultSpouseProfile();
        Object.assign(sp, { name, dob, monthlyIncome: income, salaryRaiseRate: raise, retirementAge: retire });
        sp.taxInputs.grossSalary = income * 12;
        profiles.push(sp);
      }

      notifyUpdate();
      closeModal();
      render();
    }, { signal });
  }

  function openModal() {
    const modal = container.querySelector('#fam-modal');
    if (modal) { modal.classList.remove('hidden'); modal.style.display = 'flex'; }
  }

  function closeModal() {
    const modal = container.querySelector('#fam-modal');
    if (modal) { modal.classList.add('hidden'); modal.style.display = ''; }
  }

  render();
}
