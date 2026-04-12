# FinVision AI — Copilot Instructions

## Project Overview
AI-driven financial planning SPA for the Indian market. Vanilla JS, Vite 8, Tailwind v4, Firebase 12, Chart.js 4, jsPDF 4, html2canvas.

- **Entry point**: `src/main.js`
- **Alias**: `@/` → `src/`
- **Module type**: ES modules — all imports must use `.js` extensions

## Build & Dev Commands

> `npm run dev` / `npm run build` fail in PowerShell due to execution policy.
> **Always use these instead:**

```powershell
# Dev server
node node_modules/vite/bin/vite.js

# Production build
node node_modules/vite/bin/vite.js build
```

**Always run a successful build before committing.**

## Git Conventions

Use conventional commits with a scope:

```
feat(investments): rename tab, user-editable rate, calendar popups, SIPs in trajectory
fix(investments): include activeSavings in Firestore save payload
feat(autosave): auto-save to Firestore every 10s on dirty state
feat(routing): hash-based navigation persists section and sub-tab across refreshes
```

Push to `origin main` after every feature/fix.

## State & Recalculation Pipeline

All state lives in the single `state` object in `main.js`. Mutations must go through:

```js
updateState({ field: value });      // sets _isDirty = true, triggers debounced recalculate()
// recalculate() → buildCorpusTrajectory() → compareTaxRegimes() → updateAllUI()
```

Never mutate `state` directly outside `updateState()`.

### Dirty Flag & Auto-Save

```js
let _isDirty = false;       // set true by updateState(), reset after successful auto-save
let _autoSaveTimer = null;  // setInterval handle, 10s cadence
```

Auto-save runs every 10 seconds. It only fires when `_isDirty && state.uid && isFirebaseConfigured`. Shows `Auto-saved HH:MM` in `#autosave-status` span — no toast.

## Component Pattern — Forms

Every form component follows this exact signature:

```js
export function mountXForm(container, state, onUpdate) {
  // render HTML into container
  // call onUpdate(fieldName, value) on input events
}
```

Mounted in `main.js` like:
```js
mountXForm(container('form-x'), state, (field, value) => {
  updateState({ [field]: value });
});
```

## Firebase Pattern

Every Firebase call must be guarded:

```js
import { auth, db, isFirebaseConfigured } from './config.js';

if (!isFirebaseConfigured || !auth) return null;   // graceful degradation
```

The app must remain fully functional offline (no Firebase errors shown to user).

### Firestore Schema

```
/Users/{uid}/FinVision/data/Personal_Details/profile   ← all plan state (single doc)
/Users/{uid}/FinVision/data/Financial_Plans/{planId}   ← named plan scenarios
/Users/{uid}/FinVision/data/AI_Summaries/latest        ← cached AI summary
```

- Path is always 6 segments (even) — `Users/{uid}/FinVision/data/{sub}/{docId}`
- Firestore rules use capital-U `Users`: `match /Users/{userId}/{document=**}`
- **All fields saved to `Personal_Details/profile`** must be explicitly listed in the `savePersonalDetails()` call — missing fields are lost on reload. Current saved fields include `activeSavings`.

### Data Load on Login

After `loadPersonalDetails()` returns, call `mountAllForms()` then `recalculate()` so loaded values render into the UI:

```js
Object.assign(state, saved);
mountAllForms();
recalculate();
```

## Duplicate Export Rule

When implementing a stub file, **delete the old stub functions in the same pass** — never leave two `export function foo()` declarations in the same file. Vite 8 / Rolldown treats duplicate exports as a hard parse error.

## Hash-Based Routing

Navigation state is persisted in the URL hash so the user returns to the same page on refresh.

```js
// Format: #sectionId  or  #inputs/subTabId
navigateTo('inputs', 'assets');  // → sets location.hash = 'inputs/assets'
switchInputSubSection('goals');  // → updates hash to 'inputs/goals'
```

On `initApp()`, the hash is read and `navigateTo()` is called to restore the last view. The valid sections are:

```js
const SECTIONS = ['dashboard', 'inputs', 'projections', 'tax', 'ai', 'reports'];
```

Input sub-tabs: `personal`, `assets`, `expenses`, `goals`, `savings` (note: "savings" is the panel id even though the tab label is "Investments").

## Code Style

- No TypeScript — plain ES modules only
- Tailwind v4 utility classes; CSS variables defined in `src/styles/main.css`
- Dark theme only — no light mode toggle
- `formatRupee()` / `formatCompact()` from `src/utils/formatters.js` for all currency display
- Indian number formatting (lakhs/crores) throughout

## Development Phases

All phases complete. Feature additions are incremental — no phase gating required.

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Scaffold, Vite config, Tailwind | ✅ |
| 2 | `financeEngine.js` + `taxEngine.js` | ✅ |
| 3 | All 4 input form components | ✅ |
| 4 | Charts (CorpusChart, AllocationChart, ExpenseChart) + ProjectionTable | ✅ |
| 5 | Firebase Auth + Firestore + Gemini AI + PDF export | ✅ |
| 6 | Investments tab, auto-save, hash routing | ✅ |
| 7 | SIP compounding fix, investment families, CAGR from declared rates, row breakdown popup | ✅ |

## Key Files

| File | Purpose |
|------|---------|
| `src/main.js` | Bootstrap, state, all event binding, auto-save interval, hash routing |
| `src/components/forms/PersonalDetailsForm.js` | Name (auto-filled from Google account), DOB (calendar popup on click), retirement age, income, salary raise |
| `src/components/forms/AssetsForm.js` | 4 ALM groups: debt, equity, real assets, cash — with tooltips |
| `src/components/forms/ExpensesForm.js` | 6 categorised expense cards + medical + EMI |
| `src/components/forms/GoalsForm.js` | Life goals with type, target year, today's value |
| `src/components/forms/SavingsForm.js` | **Investments tab** — recurring SIPs/RDs/PPF/NPS with user-editable rate, goal/asset linking, calendar month pickers |
| `src/components/charts/CorpusChart.js` | Corpus growth area chart |
| `src/components/charts/AllocationChart.js` | Asset allocation doughnut chart |
| `src/components/charts/ExpenseChart.js` | Expense breakdown pie chart |
| `src/components/tables/ProjectionTable.js` | Year-by-year projection table |
| `src/firebase/config.js` | Firebase init — reads from `.env.local` |
| `src/firebase/auth.js` | Google OAuth + email/password auth |
| `src/firebase/firestore.js` | Firestore CRUD for plans + AI summaries |
| `src/ai/aiAdvisor.js` | Gemini 2.0-flash dual-path (SDK + REST fallback) |
| `src/components/reports/PDFExport.js` | jsPDF + html2canvas multi-page report |
| `src/utils/constants.js` | `DEFAULTS`, `APP`, `INFLATION`, `GOAL_TYPES`, `SIP_TYPES`, `sipRate()` constants |
| `src/utils/financeEngine.js` | `buildCorpusTrajectory()` (includes SIP contributions), `computeSIPGoalFunding()`, `sipFutureValue()`, `computeEffectiveRatesByAssetClass()` |
| `src/utils/taxEngine.js` | `compareTaxRegimes()` old vs new regime |
| `src/utils/formatters.js` | `formatRupee()`, `formatCompact()` Indian currency |
| `src/styles/main.css` | Design tokens, form CSS, tooltips, dark theme overrides |
| `.env.local` | Firebase + Gemini secrets (gitignored) |

## Investments Tab (SavingsForm)

The 5th input tab (`data-sub="savings"`, panel id `inputs-sub-savings`) lets users track recurring investments.

### Data model per entry (`state.activeSavings[]`)

```js
{
  id:                  crypto.randomUUID(),
  type:                string,               // instrument key e.g. 'MF_SIP', 'PPF', 'NPS'
  name:                string,               // user-visible label
  monthlyAmount:       number,               // ₹ per month
  annualRate:          number,               // decimal e.g. 0.13 — user-overridable
  investmentFamily:    string,               // family key e.g. 'mutual-funds', 'deposits'
  investmentFamilyLabel: string,             // display label for the family
  instrumentLabel:     string,               // display label for the instrument
  customFamily:        string | null,        // set when investmentFamily === 'other'
  customInstrument:    string | null,        // set when type === 'CUSTOM'
  assetClass:          'equity' | 'debt' | 'realAssets' | 'cash',
  linkType:            'goal' | 'asset' | null,
  linkedGoalId:        string | null,        // used when linkType === 'goal'
  linkedAssetKey:      string | null,        // used when linkType === 'asset'
  startDate:           'YYYY-MM',
  endDate:             'YYYY-MM' | null,
}
```

### INVESTMENT_FAMILIES (in `SavingsForm.js`)

Replaces the old flat `SIP_TYPES` list. Six families, each with named instruments:

| Family key | Instruments |
|---|---|
| `mutual-funds` | MF SIP, ELSS SIP, Index Fund SIP, ETF SIP |
| `deposits` | RD, PPF Contribution, EPF/VPF, Debt Fund SIP |
| `retirement` | NPS Contribution, Pension Fund Contribution |
| `market-linked` | Stock SIP, REIT SIP, Gold SIP |
| `cash-management` | Liquid Fund Sweep |
| `other` | Custom Instrument (user-defined name + category) |

Each instrument has its own `rate` and `assetClass`. `INSTRUMENT_LOOKUP` map provides O(1) lookup by instrument key.

`normalizeInvestmentMeta(sip)` provides backward-compatible display for older saved records that lack the new fields.

### Orphaned goal link cleanup

`cleanupSavingsGoalLinks(activeSavings, goals)` in `main.js` is called inside `updateState()` whenever `goals` changes. It nullifies `linkType`/`linkedGoalId` on any investment whose linked goal no longer exists.

### Engine integration

- `buildCorpusTrajectory()` accepts `activeSavings` — adds monthly SIP contributions to each year's closing balance
- `computeSIPGoalFunding(activeSavings, goals, planStartYear)` returns a `Map<goalId, {name, sipContrib, goalInflatedCost, deficit}>`
- `sipFutureValue(monthlyAmount, annualRate, months)` — standard annuity FV formula
- `computeEffectiveRatesByAssetClass(activeSavings, inflationRate)` — returns weighted-average rates per asset class derived from declared investments; used by `buildCorpusTrajectory` to compute CAGR (falls back to `RETURNS.*` defaults when no investments declared for that class)

## UI / UX Conventions

### Layout Pattern (All Form Tabs)

Every form tab uses this identical structure:

```html
<div class="max-w-5xl mx-auto space-y-5">
  <!-- Centered header -->
  <div class="text-center mb-2">
    <h2 class="text-lg font-bold text-white tracking-wide">Title</h2>
    <p class="text-xs text-slate-500 mt-0.5">Subtitle</p>
  </div>
  <!-- Two-column card grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
    <div class="card"><!-- Left card with colored dot header --></div>
    <div class="card"><!-- Right card --></div>
  </div>
  <!-- Optional: centered summary footer -->
  <div class="card bg-surface-3 max-w-2xl mx-auto"><!-- Summary --></div>
</div>
```

### Card Header Pattern

```html
<h3 class="card-title flex items-center gap-2 text-base mb-3">
  <span class="w-2.5 h-2.5 rounded-full bg-{color} inline-block"></span>
  Card Title
</h3>
```

Colors: `bg-brand` (amber), `bg-blue-400` (debt), `bg-emerald-400` (income), `bg-rose-400` (expenses).

### Auto-Save Status

The Save Plan button area has a sibling `#autosave-status` span that shows the last auto-save time. It is hidden by default and shown after first successful auto-save:

```html
<div class="flex items-center gap-3">
  <span id="autosave-status" class="text-xs text-slate-500 hidden"></span>
  <button id="btn-save-plan" ...>Save Plan</button>
</div>
```

### Indian Number Formatting

All ₹ inputs use `type="text" inputmode="numeric"` with focus/blur formatting:
- **Focus**: raw digits (`1234567`)
- **Blur**: Indian commas (`12,34,567`)

Helper functions `indianFormat(n)` / `parseIndian(str)` are defined locally in each form file.

### Rupee Input HTML

```html
<div class="form-input-prefix-group">
  <span class="form-input-prefix">₹</span>
  <input type="text" inputmode="numeric" class="form-input" value="..." />
</div>
```

### Date / Month Input

- **Date** (`type="date"`): Uses `color-scheme: dark` for dark calendar popup. `showPicker()` called on click for immediate popup.
- **Month** (`type="month"`): Same `color-scheme: dark` + `showPicker()` on click (used in Investments form for start/end date).

### Select Dropdown

Uses `color-scheme: dark` with a custom SVG chevron. Option backgrounds match `surface-2`.

### Tooltips (Assets)

Pure CSS hover tooltips — `.asset-info-wrap` (relative) + `.asset-info-bubble` (absolute, slides right). No JavaScript tooltip code.

### Goal Tracker Empty State

`#goal-tracker-card` contains both `#goal-tracker-chart-wrap` (canvas) and `#goal-tracker-empty-state` (paragraph, hidden by default). `renderGoalTrackingChart()` in `main.js` shows the empty state and hides the chart when `state.goals.length === 0`.

### Projection Row Breakdown Popup

Clicking any row in the projection table opens `#row-breakdown-modal` — a `modal-overlay` with `z-index: 60`. Content is typed out character-by-character (5 ms/char, 20 ms line pause) by `_typeLines()`. Three sections: **Income & Expenses**, **Corpus Growth**, **Closing Balance**. A "Skip ▶" button sets `skipRef.skip = true` to flush remaining text instantly. Clicking the backdrop or × closes the modal.

## Design Tokens

```css
--color-brand:     oklch(0.75 0.15 75);   /* Amber-400 */
--color-surface-1: oklch(0.11 0.008 252); /* Slate-950 — deepest bg */
--color-surface-2: oklch(0.17 0.008 252); /* Slate-900 — card bg */
--color-surface-3: oklch(0.22 0.008 252); /* Slate-800 — input/chip */
--color-profit:    oklch(0.72 0.17 148);  /* Emerald-400 */
--color-loss:      oklch(0.63 0.23 27);   /* Red-400 */
```
