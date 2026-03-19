# Contributing to FinVision AI

Thank you for your interest in contributing! This document outlines the process for submitting contributions.

---

## Code of Conduct

By participating in this project, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## How to Contribute

### Reporting Bugs

1. Search [existing issues](../../issues) to avoid duplicates.
2. Open a new issue using the **Bug Report** template.
3. Include browser/OS version, steps to reproduce, and expected vs. actual behavior.

### Requesting Features

1. Search [existing issues](../../issues) and [discussions](../../discussions).
2. Open a new issue using the **Feature Request** template.
3. Clearly explain the use case and how it fits the Indian financial planning context.

### Submitting a Pull Request

1. **Fork** the repository and create your branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Follow the coding standards:**
   - ES Modules only — no CommonJS `require()`
   - Keep all macroeconomic constants in `src/utils/constants.js`
   - All financial math belongs in `src/utils/financeEngine.js` or `src/utils/taxEngine.js`
   - Do not hardcode rupee values or tax figures — always reference `constants.js`
   - UI components must use the existing Tailwind v4 design tokens (no inline `style=` attributes)

3. **Test your changes:**
   ```bash
   npm run build   # must pass with zero errors
   npm run dev     # visual smoke test in the browser
   ```

4. **Commit with a conventional commit message:**
   ```
   feat: add recurring SIP goal type
   fix: correct Section 87A rebate edge case at ₹12L boundary
   docs: update macroeconomic assumptions table in README
   refactor: extract slab loop into shared helper
   ```

5. **Open a Pull Request** targeting the `main` branch and fill in the PR template.

---

## Project Architecture Constraints

| Rule | Rationale |
|---|---|
| No server-side code (except Firebase Cloud Functions) | SPA-only architecture |
| Financial formulas must match `ARD.md` | Single source of truth |
| Never commit `.env` or Firebase credentials | Security |
| All monetary values in **paise** integers internally | Floating-point accuracy |
| Chart rendering lives in `src/components/charts/` | Separation of concerns |

---

## Development Setup

```bash
npm install
cp .env.example .env   # add Firebase credentials (optional)
npm run dev
```

---

## Questions?

Open a [Discussion](../../discussions) rather than an issue for general questions.
