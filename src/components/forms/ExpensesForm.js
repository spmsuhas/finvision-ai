/**
 * FinVision AI — Monthly Expenses Input Form
 * Categorised expense breakdown with add/remove capability.
 */
import { formatRupee } from '@/utils/formatters.js';

/** Pre-set categories (sum = ₹60,000 matching DEFAULTS.MONTHLY_EXPENSES) */
const DEFAULT_CATEGORIES = [
  { id: 'home',          label: 'Home / Rent',       amount: 25000 },
  { id: 'food',          label: 'Food & Groceries',  amount: 15000 },
  { id: 'vehicle',       label: 'Vehicle',            amount: 5000  },
  { id: 'utilities',     label: 'Utilities',          amount: 5000  },
  { id: 'education',     label: 'Education / Fees',   amount: 0     },
  { id: 'entertainment', label: 'Entertainment',      amount: 5000  },
  { id: 'others',        label: 'Others',             amount: 5000  },
];

/** Category accent colours (cycles for custom entries) */
const ACCENT_COLORS = [
  'bg-blue-400','bg-amber-400','bg-violet-400','bg-emerald-400',
  'bg-rose-400','bg-cyan-400','bg-orange-400','bg-pink-400',
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
  // Work on a local mutable copy so splice/push don't mutate state directly
  let categories = (state.expenseCategories && state.expenseCategories.length > 0)
    ? state.expenseCategories.map(c => ({ ...c }))
    : DEFAULT_CATEGORIES.map(c => ({ ...c }));

  const mm = state.monthlyMedicalPremium ?? 2000;
  const mi = state.monthlyEMI            ?? 0;

  /* ── helpers ─────────────────────────────────────────────── */
  function sumCategories() {
    return categories.reduce((s, c) => s + (c.amount || 0), 0);
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
    const surplus  = Math.max(0, (state.monthlyIncome ?? 150000) - total);

    const q = id => container.querySelector(id);
    if (q('#exp-cat-badge'))        q('#exp-cat-badge').textContent        = formatRupee(catTotal) + '/mo';
    if (q('#exp-cat-total-summary'))q('#exp-cat-total-summary').textContent= formatRupee(catTotal);
    if (q('#exp-total-outflow'))    q('#exp-total-outflow').textContent    = formatRupee(total);
    if (q('#exp-investable'))       q('#exp-investable').textContent       = formatRupee(surplus);
    if (q('#exp-fixed-summary'))    q('#exp-fixed-summary').textContent    = formatRupee(medVal + emiVal);
  }

  function renderCategoryRows() {
    const list = container.querySelector('#exp-category-list');
    if (!list) return;
    list.innerHTML = categories.map((cat, i) => `
      <div class="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0" data-cat-idx="${i}">
        <div class="w-2 h-2 rounded-full flex-shrink-0 ${ACCENT_COLORS[i % ACCENT_COLORS.length]}"></div>
        <span class="flex-1 text-sm text-slate-200 truncate" title="${cat.label}">${cat.label}</span>
        <div class="form-input-prefix-group w-40 flex-shrink-0">
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
      </div>
    `).join('');

    // Indian comma focus/blur for category rows
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

  /* ── initial render ──────────────────────────────────────── */
  const initCatTotal = sumCategories();
  const initTotal    = initCatTotal + mm + mi;
  const initSurplus  = Math.max(0, (state.monthlyIncome ?? 150000) - initTotal);

  container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-5">

      <div class="text-center mb-2">
        <h2 class="text-lg font-bold text-white tracking-wide">Monthly Expenses</h2>
        <p class="text-xs text-slate-500 mt-0.5">Track your outflows to maximise investable surplus</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

        <!-- ── Expense Categories ───────────────────────────── -->
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="card-title flex items-center gap-2 text-base">
              <span class="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block"></span>
              Lifestyle Expenses
            </h3>
            <span id="exp-cat-badge" class="text-sm font-semibold text-brand">${formatRupee(initCatTotal)}/mo</span>
          </div>

          <p class="text-[11px] text-slate-500 mb-2">
            Inflated at <span class="text-brand">8%/yr</span> in projections
          </p>

          <!-- Category rows (re-rendered on changes) -->
          <div id="exp-category-list"></div>

          <!-- Add new category inline form -->
          <div class="mt-3">
            <button id="btn-add-expense" type="button"
              class="flex items-center gap-1.5 text-sm text-brand hover:text-brand-light transition-colors py-1">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Add expense type
            </button>
            <div id="exp-add-form" class="hidden flex-wrap gap-2 mt-2">
              <input id="inp-new-exp-label" type="text"
                class="form-input flex-1 min-w-32 text-sm py-1.5"
                placeholder="e.g. Subscriptions" maxlength="32" />
              <div class="form-input-prefix-group w-36 flex-shrink-0">
                <span class="form-input-prefix text-xs">₹</span>
                <input id="inp-new-exp-amount" type="text" inputmode="numeric"
                  class="form-input text-sm py-1.5" placeholder="0" />
              </div>
              <button id="btn-add-expense-confirm" type="button"
                class="btn-primary text-sm py-1.5 px-3 flex-shrink-0">Add</button>
              <button id="btn-add-expense-cancel" type="button"
                class="icon-btn text-slate-500 flex-shrink-0" aria-label="Cancel">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- ── Healthcare & Loans ───────────────────────────── -->
        <div class="card">
          <h3 class="card-title flex items-center gap-2 text-base mb-3">
            <span class="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block"></span>
            Healthcare &amp; Loans
          </h3>
          <p class="text-[11px] text-slate-500 mb-2">Fixed monthly obligations</p>

          <div class="space-y-3">
            <div class="form-group">
              <label for="inp-medical-premium" class="form-label">Monthly Medical Insurance Premium</label>
              <div class="form-input-prefix-group">
                <span class="form-input-prefix">₹</span>
                <input id="inp-medical-premium" type="text" inputmode="numeric" class="form-input"
                  value="${indianFormat(mm)}" placeholder="2,000" data-rupee-field="monthlyMedicalPremium" />
              </div>
              <p class="form-hint">Health insurance · Inflated at <span class="text-red-400">13.5%/yr</span></p>
            </div>

            <div class="form-group">
              <label for="inp-emi" class="form-label">Monthly EMI / Loan Payments</label>
              <div class="form-input-prefix-group">
                <span class="form-input-prefix">₹</span>
                <input id="inp-emi" type="text" inputmode="numeric" class="form-input"
                  value="${indianFormat(mi)}" placeholder="0" data-rupee-field="monthlyEMI" />
              </div>
              <p class="form-hint">Home, car, personal loan EMIs — fixed amount</p>
            </div>
          </div>
        </div>

      </div>

      <!-- ── Monthly Summary (centered footer) ──────────────── -->
      <div class="card bg-surface-3 max-w-2xl mx-auto">
        <h3 class="card-title mb-3 text-center text-base">Monthly Summary</h3>
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-slate-400">Lifestyle Expenses</span>
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

  // populate rows
  renderCategoryRows();

  /* ── category row events (delegated) ────────────────────── */
  container.querySelector('#exp-category-list').addEventListener('input', (e) => {
    const idx = e.target.dataset.catInput;
    if (idx === undefined) return;
    const raw = e.target.value.replace(/[^\d]/g, '');
    categories[+idx].amount = parseInt(raw, 10) || 0;
    updateSummary();
    notifyUpdate();
  });

  container.querySelector('#exp-category-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat-delete]');
    if (!btn) return;
    categories.splice(+btn.dataset.catDelete, 1);
    renderCategoryRows();
    updateSummary();
    notifyUpdate();
  });

  /* ── add expense ─────────────────────────────────────────── */
  const addForm = container.querySelector('#exp-add-form');
  const addBtn  = container.querySelector('#btn-add-expense');

  addBtn.addEventListener('click', () => {
    addForm.style.display = 'flex';
    addBtn.classList.add('hidden');
    container.querySelector('#inp-new-exp-label').focus();
  });

  container.querySelector('#btn-add-expense-cancel').addEventListener('click', () => {
    addForm.style.display = '';
    addBtn.classList.remove('hidden');
    container.querySelector('#inp-new-exp-label').value  = '';
    container.querySelector('#inp-new-exp-amount').value = '';
  });

  function confirmAddExpense() {
    const label  = container.querySelector('#inp-new-exp-label').value.trim();
    const amount = parseIndian(container.querySelector('#inp-new-exp-amount').value);
    if (!label) { container.querySelector('#inp-new-exp-label').focus(); return; }
    categories.push({ id: `custom_${Date.now()}`, label, amount });
    renderCategoryRows();
    updateSummary();
    notifyUpdate();
    container.querySelector('#inp-new-exp-label').value  = '';
    container.querySelector('#inp-new-exp-amount').value = '';
    addForm.style.display = '';
    addBtn.classList.remove('hidden');
  }

  container.querySelector('#btn-add-expense-confirm').addEventListener('click', confirmAddExpense);
  container.querySelector('#inp-new-exp-label').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); container.querySelector('#inp-new-exp-amount').focus(); }
  });
  container.querySelector('#inp-new-exp-amount').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmAddExpense(); }
  });

  /* ── medical & EMI (rupee fields with Indian formatting) ── */
  container.querySelectorAll('[data-rupee-field]').forEach(el => {
    const field = el.dataset.rupeeField;
    let localVal = field === 'monthlyMedicalPremium' ? mm : mi;

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
