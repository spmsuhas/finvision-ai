---
name: my-plan-tab
description: "FinVision AI My Plan tab — Personal, Assets, Expenses, Goals forms. Use when: modifying form components, adding new input fields, changing form layout, updating asset categories, adjusting expense categories, editing goal types, fixing Indian number formatting, updating form CSS, changing the Net Worth / Expenses / Goals UI."
---

# My Plan Tab — Design & Implementation Reference

## Overview

The **My Plan** tab contains 4 sub-tabs that collect all user financial data. Each sub-tab is a form component mounted into a container element by `main.js`. All forms follow an identical visual layout pattern and share common UX conventions.

## Architecture

### Mounting Pattern

Every form component exports a single mount function with this signature:

```js
export function mountXForm(container, state, onUpdate) {
  // 1. Render HTML into container.innerHTML
  // 2. Bind input events
  // 3. Call onUpdate(fieldName, value) on changes
}
```

Mounted in `src/main.js` → `mountAllForms()`:

```js
mountPersonalDetailsForm(container('form-personal-details'), state, (field, value) => {
  updateState({ [field]: value });
});
```

`updateState()` triggers the recalculation pipeline: `recalculate()` → `buildCorpusTrajectory()` → `compareTaxRegimes()` → `updateAllUI()`.

### File Map

| File | Purpose |
|------|---------|
| `src/components/forms/PersonalDetailsForm.js` | Name, DOB, retirement age, income, salary raise |
| `src/components/forms/AssetsForm.js` | 12 debt + 10 equity Indian asset categories with ₹ amounts |
| `src/components/forms/ExpensesForm.js` | Categorised monthly expenses + medical + EMI |
| `src/components/forms/GoalsForm.js` | Life goals with type, target year, today's value |
| `src/styles/main.css` | All form CSS — inputs, date picker, select, tooltips, range sliders |

## Unified Layout Pattern

All 4 forms use this identical layout structure:

```html
<div class="max-w-5xl mx-auto space-y-5">
  <!-- Centered page header -->
  <div class="text-center mb-2">
    <h2 class="text-lg font-bold text-white tracking-wide">Section Title</h2>
    <p class="text-xs text-slate-500 mt-0.5">Subtitle description</p>
  </div>

  <!-- Two-column card grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
    <div class="card">
      <h3 class="card-title flex items-center gap-2 text-base mb-3">
        <span class="w-2.5 h-2.5 rounded-full bg-{color} inline-block"></span>
        Card Title
      </h3>
      <!-- Content -->
    </div>
    <div class="card"><!-- Second column --></div>
  </div>

  <!-- Optional: Centered summary footer -->
  <div class="card bg-surface-3 max-w-2xl mx-auto">
    <h3 class="card-title mb-3 text-center text-base">Summary Title</h3>
    <!-- Summary rows -->
  </div>
</div>
```

### Color Dot Convention

Each card header has a small colored dot indicator:
- **Brand (amber)**: `bg-brand` — primary data cards
- **Blue**: `bg-blue-400` — debt / fixed-income related
- **Emerald**: `bg-emerald-400` — income / positive values
- **Rose**: `bg-rose-400` — expenses / outflows

## Indian Number Formatting

All ₹ currency inputs use Indian comma system (lakhs/crores, not millions):

```js
/** Format: 12,34,567 */
function indianFormat(n) {
  if (!n) return '';
  const s = Math.floor(n).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest  = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}

/** Parse: strips commas → integer */
function parseIndian(str) {
  return parseInt(String(str).replace(/[^\d]/g, ''), 10) || 0;
}
```

### Input Behavior

- All rupee inputs use `type="text" inputmode="numeric"` (not `type="number"`)
- **Focus**: Shows raw digits (e.g., `1234567`)
- **Blur**: Re-formats with Indian commas (e.g., `12,34,567`)
- Number spinner arrows are hidden globally via CSS

### Rupee Input HTML Pattern

```html
<div class="form-input-prefix-group">
  <span class="form-input-prefix">₹</span>
  <input type="text" inputmode="numeric" class="form-input"
    value="${indianFormat(amount)}" data-rupee="fieldName" />
</div>
```

## Form Details

### 1. PersonalDetailsForm

**Two cards**: Identity (left) + Income (right)

| Field | Type | State Key | Notes |
|-------|------|-----------|-------|
| Full Name | text | `name` | Free text |
| Date of Birth | date | `dob` | Dark theme styled, auto-computes `currentAge` |
| Retirement Age | range 45–75 | `retirementAge` | Displays value inline in label |
| Monthly Income | rupee text | `monthlyIncome` | Indian formatted, shows annual below |
| Salary Raise | range 0–20% | `salaryRaiseRate` | Stored as decimal (e.g., 0.08) |

### 2. AssetsForm

**Two cards**: Debt Assets (left) + Equity Assets (right) + Portfolio Summary footer

#### Debt Categories (12)

| Key | Label | Info |
|-----|-------|------|
| `savingsBank` | Savings Bank Account | 2.5–4% p.a., highly liquid |
| `fixedDeposit` | Bank Fixed Deposits | 5–7.5% p.a., tax-saver FD 5yr lock-in |
| `recurringDeposit` | Recurring Deposits | Monthly instalment deposits |
| `ppf` | PPF (Public Provident Fund) | EEE, ~7.1%, max ₹1.5L/yr |
| `epf` | EPF / VPF | ~8.25%, EEE, employer match |
| `nscKvp` | NSC / KVP | Post office small savings |
| `scss` | SCSS / POMIS | Senior citizens / monthly income |
| `debtMutualFunds` | Debt Mutual Funds | SEBI-classified, taxed per slab |
| `govtBonds` | Govt Bonds / RBI Bonds / SGBs | Zero credit risk |
| `companyFD` | Corporate / Company FDs | Higher risk, 7–9% |
| `npsDebt` | NPS — Debt Allocation | Sec 80CCD(1B) extra ₹50K |
| `otherDebt` | Other Debt | Has remarks field |

#### Equity Categories (10)

| Key | Label | Info |
|-----|-------|------|
| `directEquity` | Direct Equity (Demat) | LTCG >₹1.25L at 12.5% |
| `equityMutualFunds` | Equity Mutual Funds (incl. ELSS) | Most popular vehicle |
| `npsEquity` | NPS — Equity Allocation | Up to 75% in Active Choice |
| `pms` | PMS (Portfolio Mgmt Services) | Min ₹50L |
| `aif` | AIF (Alternative Investment Funds) | Min ₹1Cr |
| `ulipEquity` | ULIP — Equity Portion | 5yr lock-in |
| `esopRsu` | ESOPs / RSUs | Taxed at exercise + sale |
| `gratuity` | Gratuity | Tax-exempt up to ₹20L |
| `superannuation` | Superannuation / Pension Funds | Employer-sponsored |
| `otherEquity` | Other Equity | Has remarks field |

#### Info Tooltip Pattern

Each asset row has a CSS-only hover tooltip:

```html
<span class="asset-info-wrap" aria-label="Info: Label">
  <svg class="asset-info-icon" fill="none" viewBox="0 0 20 20"
    stroke="currentColor" stroke-width="1.8">
    <circle cx="10" cy="10" r="8.5"/>
    <path d="M10 9v4M10 7h.01" stroke-linecap="round"/>
  </svg>
  <span class="asset-info-bubble">Tooltip text here</span>
</span>
```

No JavaScript tooltip code — pure CSS positioning via `.asset-info-wrap` (relative) + `.asset-info-bubble` (absolute, slides right on hover).

#### Derived State Fields

`deriveAndNotify()` computes from asset totals:
- `equityPercent`, `debtPercent` — percentage split
- `currentEquity`, `currentDebt` — totals (debt excludes EPF)
- `currentEPF` — separate EPF value for financeEngine

### 3. ExpensesForm

**Two cards**: Lifestyle Expenses (left) + Healthcare & Loans (right) + Monthly Summary footer

#### Default Categories

| ID | Label | Default ₹ |
|----|-------|-----------|
| `home` | Home / Rent | 25,000 |
| `food` | Food & Groceries | 15,000 |
| `vehicle` | Vehicle | 5,000 |
| `utilities` | Utilities | 5,000 |
| `education` | Education / Fees | 0 |
| `entertainment` | Entertainment | 5,000 |
| `others` | Others | 5,000 |

Users can add/remove categories dynamically. Each row has a colored accent dot (cycles through 8 colors).

#### Fixed Fields

| Field | State Key | Notes |
|-------|-----------|-------|
| Medical Premium | `monthlyMedicalPremium` | Inflated at 13.5%/yr |
| EMI | `monthlyEMI` | Fixed amount (not inflated) |

#### Summary Footer

Shows: Lifestyle total, Medical + EMI, Total Outflows, Investable Surplus (income − outflows).

### 4. GoalsForm

**Two cards**: Add a Goal (left) + Your Goals list (right)

#### Goal Fields

| Field | Input | Notes |
|-------|-------|-------|
| Goal Name | text | Max 60 chars |
| Goal Type | select | From `GOAL_TYPES` constant |
| Target Year | text (numeric) | Future year |
| Cost | rupee text | Today's value, Indian formatted |

#### Goal Types (from constants.js)

`EDUCATION`, `MARRIAGE`, `PROPERTY`, `VEHICLE`, `TRAVEL`, `RETIREMENT`, `OTHER` — each with icon emoji.

Goal cards display: icon, name, type, FY target, years away, today's value in brand color.

## CSS Reference

### Design Tokens (from `@theme`)

```css
--color-brand:     oklch(0.75 0.15 75);   /* Amber-400 */
--color-surface-1: oklch(0.11 0.008 252); /* Slate-950 — deepest bg */
--color-surface-2: oklch(0.17 0.008 252); /* Slate-900 — card bg */
--color-surface-3: oklch(0.22 0.008 252); /* Slate-800 — input/chip */
--color-profit:    oklch(0.72 0.17 148);  /* Emerald-400 */
--color-loss:      oklch(0.63 0.23 27);   /* Red-400 */
```

### Key CSS Classes

| Class | Purpose |
|-------|---------|
| `.form-group` | Flex column with 0.375rem gap |
| `.form-label` | 0.8125rem, 500 weight, slate-400 color |
| `.form-input` | Surface-3 bg, 0.625rem radius, white text, brand focus ring |
| `.form-input-prefix-group` | Flex row for ₹ prefix + input |
| `.form-input-prefix` | Left-side ₹ badge with rounded-l corners |
| `.form-range` | Custom slider — 4px track, 16px brand thumb |
| `.form-hint` | 0.75rem muted helper text |
| `.asset-info-wrap` | 1.25rem info icon container (relative) |
| `.asset-info-bubble` | 240px tooltip bubble (absolute, slides right on hover) |

### Date Input Dark Theme

```css
input[type="date"].form-input {
  color-scheme: dark;  /* Dark calendar popup */
  color: white;        /* Selected date text */
}
/* Pseudo-elements for day/month/year fields all set to white, opacity: 1 */
/* Calendar icon: slate filter default, amber/gold filter on hover */
```

### Select Dropdown Dark Theme

```css
select.form-input {
  color-scheme: dark;
  background-image: url("data:image/svg+xml,...chevron...");
  /* Custom chevron, dark option backgrounds */
}
```

## State Keys Reference

All state fields emitted by My Plan forms, consumed by `financeEngine.js`:

```
name, dob, currentAge, retirementAge,
monthlyIncome, salaryRaiseRate,
assetAllocation: { debt: {...}, equity: {...} },
equityPercent, debtPercent, currentEquity, currentDebt, currentEPF,
expenseCategories: [{ id, label, amount }...],
monthlyExpenses, monthlyMedicalPremium, monthlyEMI,
goals: [{ id, name, type, targetYear, todayValue, inflationRate }...]
```
