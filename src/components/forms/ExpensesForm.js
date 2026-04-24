/**
 * FinVision AI — Monthly Expenses Input Form
 * Grouped expense cards with add/remove capability per group.
 */
import { formatRupee } from '@/utils/formatters.js';
import { confirmDelete } from '@/utils/confirmDelete.js';

/* ── Expense Groups ─────────────────────────────────────────── */
const EXPENSE_GROUPS = [
  { id: 'home',       label: 'Home & Utilities',           color: 'bg-blue-400'   },
  { id: 'food',       label: 'Food & Dining',              color: 'bg-amber-400'  },
  { id: 'transport',  label: 'Transport',                  color: 'bg-violet-400' },
  { id: 'education',  label: 'Education & Kids',           color: 'bg-cyan-400'   },
  { id: 'lifestyle',  label: 'Entertainment & Lifestyle',  color: 'bg-rose-400'   },
  { id: 'other',      label: 'Others',                     color: 'bg-emerald-400'},
];

/** Pre-set categories per group — user fills in amounts */
const DEFAULT_CATEGORIES = [
  { id: 'rent',          label: 'Rent / Mortgage',     amount: 0, group: 'home'      },
  { id: 'maintenance',   label: 'Maintenance',         amount: 0, group: 'home'      },
  { id: 'electricity',   label: 'Electricity & Water', amount: 0, group: 'home'      },
  { id: 'broadband',     label: 'Broadband / WiFi',    amount: 0, group: 'home'      },
  { id: 'groceries',     label: 'Groceries',           amount: 0, group: 'food'      },
  { id: 'dining',        label: 'Dining Out',          amount: 0, group: 'food'      },
  { id: 'fuel',          label: 'Fuel',                amount: 0, group: 'transport' },
  { id: 'vehicle',       label: 'Vehicle Maintenance', amount: 0, group: 'transport' },
  { id: 'publictrans',   label: 'Public Transport',    amount: 0, group: 'transport' },
  { id: 'school',        label: 'School / College',    amount: 0, group: 'education' },
  { id: 'tuition',       label: 'Tuition / Coaching',  amount: 0, group: 'education' },
  { id: 'subscriptions', label: 'Subscriptions / OTT', amount: 0, group: 'lifestyle' },
  { id: 'shopping',      label: 'Shopping & Personal', amount: 0, group: 'lifestyle' },
  { id: 'gym',           label: 'Gym / Wellness',      amount: 0, group: 'lifestyle' },
  { id: 'others',        label: 'Miscellaneous',       amount: 0, group: 'other'     },
];

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

export function mountExpensesForm(container, state, onUpdate) {
  // Abort any listeners registered by a previous mount of this form on the same container
  if (container._expAbort) container._expAbort.abort();
  const _ac = new AbortController();
  container._expAbort = _ac;
  const { signal } = _ac;

  // Work on a local mutable copy so splice/push don't mutate state directly
  let categories = (state.expenseCategories && state.expenseCategories.length > 0 && state.expenseCategories[0].group)
    ? state.expenseCategories.map(c => ({ ...c }))
    : DEFAULT_CATEGORIES.map(c => ({ ...c }));

  const mm = state.monthlyMedicalPremium ?? 0;
  const mi = state.monthlyEMI            ?? 0;   // derived from Liabilities; read-only here

  /* ── helpers ─────────────────────────────────────────────── */
  function sumCategories() {
    return categories.reduce((s, c) => s + (c.amount || 0), 0);
  }

  function sumGroup(groupId) {
    return categories.filter(c => c.group === groupId).reduce((s, c) => s + (c.amount || 0), 0);
  }

  function notifyUpdate() {
    const total = sumCategories();
    onUpdate('expenseCategories', [...categories]);
    onUpdate('monthlyExpenses', total);
  }

  function updateSummary() {
    const catTotal = sumCategories();
    const medVal   = parseIndian(container.querySelector('#inp-medical-premium')?.value);
    const emiVal   = parseIndian(container.querySelector('#inp-emi')?.value);
    const total    = catTotal + medVal + emiVal;
    const surplus  = Math.max(0, (state.monthlyIncome ?? 0) - total);

    const q = id => container.querySelector(id);
    if (q('#exp-total-outflow')) q('#exp-total-outflow').textContent = formatRupee(total);
    if (q('#exp-investable'))    q('#exp-investable').textContent    = formatRupee(surplus);
    if (q('#exp-fixed-summary')) q('#exp-fixed-summary').textContent = formatRupee(medVal + emiVal);

    // Update per-group subtotals
    for (const g of EXPENSE_GROUPS) {
      const badge = q(`#exp-grp-badge-${g.id}`);
      const sumEl = q(`#exp-grp-sum-${g.id}`);
      const gTotal = sumGroup(g.id);
      if (badge) badge.textContent = formatRupee(gTotal) + '/mo';
      if (sumEl) sumEl.textContent = formatRupee(gTotal);
    }
    // Lifestyle total in footer
    if (q('#exp-cat-total-summary')) q('#exp-cat-total-summary').textContent = formatRupee(catTotal);
  }

  function renderGroupRows(groupId) {
    const list = container.querySelector(`#exp-group-${groupId}`);
    if (!list) return;
    const groupCats = categories.filter(c => c.group === groupId);
    list.innerHTML = groupCats.map(cat => {
      const i = categories.indexOf(cat);
      return `
      <div class="flex items-center gap-3 py-2 border-b border-white/5 last:border-0" data-cat-idx="${i}">
        <span class="flex-1 text-sm text-slate-200 truncate" title="${cat.label}">${cat.label}</span>
        <div class="form-input-prefix-group w-36 flex-shrink-0">
          <span class="form-input-prefix text-xs">₹</span>
          <input type="text" inputmode="numeric" class="form-input text-sm py-1.5"
            value="${indianFormat(cat.amount)}" data-cat-input="${i}" aria-label="${cat.label} amount" />
        </div>
        <button type="button" class="icon-btn text-slate-600 hover:text-red-400 flex-shrink-0"
          data-cat-delete="${i}" title="Remove ${cat.label}">
          <svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>`;
    }).join('');

    // Indian comma focus/blur
    list.querySelectorAll('[data-cat-input]').forEach(el => {
      el.addEventListener('focus', () => {
        const idx = +el.dataset.catInput;
        el.value = categories[idx]?.amount || '';
      });
      el.addEventListener('blur', () => {
        const idx = +el.dataset.catInput;
        el.value = indianFormat(categories[idx]?.amount || 0);
      });
    });
  }

  function renderAllGroups() {
    for (const g of EXPENSE_GROUPS) renderGroupRows(g.id);
  }

  /* ── build group cards HTML ──────────────────────────────── */
  function buildGroupCards() {
    return EXPENSE_GROUPS.map(g => {
      const gTotal = sumGroup(g.id);
      return `
        <div class="card">
          <div class="flex items-center justify-between mb-2">
            <h3 class="card-title flex items-center gap-2 text-sm">
              <span class="w-2.5 h-2.5 rounded-full ${g.color} inline-block"></span>
              ${g.label}
            </h3>
            <span id="exp-grp-badge-${g.id}" class="text-xs font-semibold text-brand">${formatRupee(gTotal)}/mo</span>
          </div>
          <div id="exp-group-${g.id}"></div>
          <button type="button" class="exp-add-grp-btn flex items-center gap-1 text-xs text-brand hover:text-brand-light transition-colors py-1 mt-2"
            data-add-group="${g.id}">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add
          </button>
          <div class="exp-add-grp-form hidden flex-wrap gap-2 mt-2" data-add-form-group="${g.id}">
            <input type="text" class="form-input flex-1 min-w-24 text-sm py-1.5 exp-new-label"
              placeholder="Label" maxlength="32" />
            <div class="form-input-prefix-group w-28 flex-shrink-0">
              <span class="form-input-prefix text-xs">₹</span>
              <input type="text" inputmode="numeric" class="form-input text-sm py-1.5 exp-new-amount" placeholder="0" />
            </div>
            <button type="button" class="btn-primary text-sm py-1 px-2 flex-shrink-0 exp-add-confirm" data-confirm-group="${g.id}">Add</button>
            <button type="button" class="icon-btn text-slate-500 flex-shrink-0 exp-add-cancel" data-cancel-group="${g.id}" aria-label="Cancel">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>`;
    }).join('');
  }

  /* ── build summary footer rows ───────────────────────────── */
  function buildSummaryRows() {
    return EXPENSE_GROUPS.map(g => `
      <div class="flex justify-between text-sm">
        <span class="text-slate-400 flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full ${g.color} inline-block"></span>${g.label}
        </span>
        <span id="exp-grp-sum-${g.id}" class="font-medium text-white">${formatRupee(sumGroup(g.id))}</span>
      </div>`).join('');
  }

  /* ── initial render ──────────────────────────────────────── */
  const initCatTotal = sumCategories();
  const initTotal    = initCatTotal + mm + mi;
  const initSurplus  = Math.max(0, (state.monthlyIncome ?? 0) - initTotal);

  container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-5">

      <div class="text-center mb-2">
        <h2 class="text-lg font-bold text-white tracking-wide">Monthly Expenses</h2>
        <p class="text-xs text-slate-500 mt-0.5">Track your outflows to maximise investable surplus</p>
      </div>

      <p class="text-[11px] text-slate-500 text-center -mt-2">
        Lifestyle expenses inflated at <span class="text-brand">8%/yr</span> in projections
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${buildGroupCards()}

        <!-- ── Healthcare & Loans ───────────────────────────── -->
        <div class="card">
          <h3 class="card-title flex items-center gap-2 text-sm mb-2">
            <span class="w-2.5 h-2.5 rounded-full bg-pink-400 inline-block"></span>
            Healthcare &amp; Loans
          </h3>
          <p class="text-[11px] text-slate-500 mb-2">Fixed monthly obligations</p>

          <div class="space-y-3">
            <div class="form-group">
              <label for="inp-medical-premium" class="form-label text-xs">Medical Insurance Premium</label>
              <div class="form-input-prefix-group">
                <span class="form-input-prefix text-xs">₹</span>
                <input id="inp-medical-premium" type="text" inputmode="numeric" class="form-input text-sm py-1.5"
                  value="${indianFormat(mm)}" placeholder="2,000" data-rupee-field="monthlyMedicalPremium" />
              </div>
              <p class="form-hint">Inflated at <span class="text-red-400">13.5%/yr</span></p>
            </div>

            <div class="form-group">
              <label class="form-label text-xs">Debt Servicing — EMI
                <span class="ml-1 text-[10px] text-blue-400 font-normal">(auto-synced)</span>
              </label>
              <div class="flex items-center gap-2 rounded-lg bg-white/3 border border-white/8 px-3 py-2">
                <span class="text-xs text-slate-400 flex-1">
                  Total EMI from
                  <button type="button" class="text-brand hover:text-brand-light underline underline-offset-2 transition-colors"
                    data-section="inputs" data-sub="liabilities">Liabilities tab</button>
                </span>
                <span id="exp-emi-readonly" class="text-sm font-semibold text-rose-300">${formatRupee(mi)}</span>
              </div>
              <p class="form-hint">Add / edit loans in the Liabilities tab to update this value</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Monthly Summary (centered footer) ──────────────── -->
      <div class="card bg-surface-3 max-w-2xl mx-auto">
        <h3 class="card-title mb-3 text-center text-base">Monthly Summary</h3>
        <div class="space-y-1.5">
          ${buildSummaryRows()}
          <div class="flex justify-between text-sm pt-1">
            <span class="text-slate-400">All Lifestyle</span>
            <span id="exp-cat-total-summary" class="font-medium text-white">${formatRupee(initCatTotal)}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">Medical + EMI</span>
            <span id="exp-fixed-summary" class="font-medium text-white">${formatRupee(mm + mi)}</span>
          </div>
          <div class="border-t border-white/10 pt-2 flex justify-between text-sm">
            <span class="text-slate-300 font-medium">Total Outflows</span>
            <span id="exp-total-outflow" class="font-semibold text-white">${formatRupee(initTotal)}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">Investable Surplus</span>
            <span id="exp-investable" class="font-semibold text-emerald-400">${formatRupee(initSurplus)}</span>
          </div>
          <p class="text-xs text-slate-600 mt-1">Based on current monthly income</p>
        </div>
      </div>

    </div>
  `;

  // populate rows for each group
  renderAllGroups();

  /* ── category row events (delegated on container) ───────── */
  container.addEventListener('input', (e) => {
    const idx = e.target.dataset?.catInput;
    if (idx === undefined) return;
    const raw = e.target.value.replace(/[^\d]/g, '');
    categories[+idx].amount = parseInt(raw, 10) || 0;
    updateSummary();
    notifyUpdate();
  }, { signal });

  container.addEventListener('click', (e) => {
    // Delete category
    const delBtn = e.target.closest('[data-cat-delete]');
    if (delBtn) {
      const idx   = +delBtn.dataset.catDelete;
      const label = categories[idx]?.label || 'this item';
      confirmDelete({
        title: 'Remove Expense?',
        message: `"${label}" will be permanently removed from your expenses.`,
      }).then(confirmed => {
        if (!confirmed) return;
        categories.splice(idx, 1);
        renderAllGroups();
        updateSummary();
        notifyUpdate();
      });
      return;
    }

    // Show add form
    const addBtn = e.target.closest('[data-add-group]');
    if (addBtn) {
      const gid = addBtn.dataset.addGroup;
      const form = container.querySelector(`[data-add-form-group="${gid}"]`);
      if (form) { form.style.display = 'flex'; addBtn.classList.add('hidden'); form.querySelector('.exp-new-label').focus(); }
      return;
    }

    // Cancel add
    const cancelBtn = e.target.closest('[data-cancel-group]');
    if (cancelBtn) {
      const gid = cancelBtn.dataset.cancelGroup;
      const form = container.querySelector(`[data-add-form-group="${gid}"]`);
      const btn  = container.querySelector(`[data-add-group="${gid}"]`);
      if (form) { form.style.display = ''; form.querySelector('.exp-new-label').value = ''; form.querySelector('.exp-new-amount').value = ''; }
      if (btn)  btn.classList.remove('hidden');
      return;
    }

    // Confirm add
    const confirmBtn = e.target.closest('[data-confirm-group]');
    if (confirmBtn) {
      const gid   = confirmBtn.dataset.confirmGroup;
      const form  = container.querySelector(`[data-add-form-group="${gid}"]`);
      const label = form.querySelector('.exp-new-label').value.trim();
      const amt   = parseIndian(form.querySelector('.exp-new-amount').value);
      if (!label) { form.querySelector('.exp-new-label').focus(); return; }
      categories.push({ id: `custom_${Date.now()}`, label, amount: amt, group: gid });
      renderAllGroups();
      updateSummary();
      notifyUpdate();
      form.querySelector('.exp-new-label').value  = '';
      form.querySelector('.exp-new-amount').value = '';
      form.style.display = '';
      const btn = container.querySelector(`[data-add-group="${gid}"]`);
      if (btn) btn.classList.remove('hidden');
      return;
    }
  }, { signal });

  // Enter key handling for add forms
  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const labelInp = e.target.closest('.exp-new-label');
    if (labelInp) { e.preventDefault(); labelInp.closest('.exp-add-grp-form').querySelector('.exp-new-amount').focus(); return; }
    const amtInp = e.target.closest('.exp-new-amount');
    if (amtInp) { e.preventDefault(); amtInp.closest('.exp-add-grp-form').querySelector('.exp-add-confirm').click(); }
  }, { signal });

  /* ── medical (rupee fields with Indian formatting) ── */
  container.querySelectorAll('[data-rupee-field]').forEach(el => {
    const field = el.dataset.rupeeField;
    let localVal = mm;

    el.addEventListener('focus', () => { el.value = localVal || ''; });
    el.addEventListener('blur',  () => { el.value = indianFormat(localVal); });
    el.addEventListener('input', () => {
      const raw = el.value.replace(/[^\d]/g, '');
      localVal = parseInt(raw, 10) || 0;
      onUpdate(field, localVal);
      updateSummary();
    });
  });
}
