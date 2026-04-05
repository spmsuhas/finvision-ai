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
feat(expenses): categorised expense breakdown with add/remove
fix(auth): add user dropdown with logout button, wire fbSignOut
feat(phase5): Firebase Auth + Firestore + Gemini AI + PDF export
```

Push to `origin main` after every feature/fix.

## State & Recalculation Pipeline

All state lives in the single `state` object in `main.js`. Mutations must go through:

```js
updateState({ field: value });      // triggers debounced recalculate()
// recalculate() → buildCorpusTrajectory() → compareTaxRegimes() → updateAllUI()
```

Never mutate `state` directly outside `updateState()`.

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

## Duplicate Export Rule

When implementing a stub file, **delete the old stub functions in the same pass** — never leave two `export function foo()` declarations in the same file. Vite 8 / Rolldown treats duplicate exports as a hard parse error.

## Code Style

- No TypeScript — plain ES modules only
- Tailwind v4 utility classes; CSS variables defined in `src/styles/main.css`
- Dark theme only — no light mode toggle
- `formatRupee()` / `formatCompact()` from `src/utils/formatters.js` for all currency display
- Indian number formatting (lakhs/crores) throughout

## Development Phases

Work strictly phase-by-phase. Do not start the next phase without explicit user approval.

| Phase | Scope |
|-------|-------|
| 1 | Scaffold, Vite config, Tailwind |
| 2 | `financeEngine.js` + `taxEngine.js` |
| 3 | All 4 input form components |
| 4 | Charts (CorpusChart, AllocationChart, ExpenseChart) + ProjectionTable |
| 5 | Firebase Auth + Firestore + Gemini AI + PDF export |

## Key Files

| File | Purpose |
|------|---------|
| `src/main.js` | Bootstrap, state, all event binding |
| `src/firebase/config.js` | Firebase init — reads from `.env.local` |
| `src/firebase/auth.js` | Google OAuth + email/password auth |
| `src/firebase/firestore.js` | Firestore CRUD for plans + AI summaries |
| `src/ai/aiAdvisor.js` | Gemini 2.0-flash dual-path (SDK + REST fallback) |
| `src/components/reports/PDFExport.js` | jsPDF + html2canvas multi-page report |
| `src/utils/constants.js` | `DEFAULTS`, `APP`, `INFLATION` constants |
| `src/utils/financeEngine.js` | `buildCorpusTrajectory()` core projection |
| `src/utils/taxEngine.js` | `compareTaxRegimes()` old vs new regime |
| `.env.local` | Firebase + Gemini secrets (gitignored) |
