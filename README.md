# FinVision AI — AI-Driven Financial Planning Platform

[![Build](https://github.com/spmsuhas/finvision-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/spmsuhas/finvision-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An open-source, production-ready financial planning web application tailored for the Indian market. FinVision AI combines deterministic financial mathematics with Google Gemini generative AI to provide personalized, multi-decade wealth projections, tax optimization, and goal planning — all in a single-page app with zero backend servers required.

---

## Features

- **Corpus Trajectory Engine** — Year-by-year wealth accumulation from current age to 100, accounting for inflation-adjusted expenses, salary growth, and blended equity/debt CAGR.
- **Tax Optimizer** — Side-by-side comparison of Old vs. New Tax Regime (Section 115BAC) with Section 87A rebate, surcharge, and marginal relief calculations for FY 2025-26 & 2026-27.
- **LTCG Tax Harvesting** — Automated simulation of annual profit-booking up to the ₹1.25 lakh exemption limit to minimize future capital gains liability.
- **Goal Planning** — Life milestone modelling (child's education, wedding, home purchase) with inflation-specific compounding (8% general, 13.5% medical, 11% education).
- **AI Advisor** — Conversational financial advisor powered by Google Gemini with RAG-grounded Indian regulatory context.
- **Interactive Charts** — Corpus spline-area timeline, asset allocation doughnut, and expense bar charts via Chart.js.
- **PDF Export** — Professionally formatted downloadable report with executive summary, tax analysis, and year-by-year projection tables.
- **Firebase Sync** — Optional Firebase Auth (Google OAuth + email/password) and Firestore persistence for multi-device access.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Build tool | Vite 8 (Rolldown bundler) |
| Styling | Tailwind CSS v4 |
| Charts | Chart.js 4 |
| AI | Firebase AI Logic (Gemini) |
| Database | Cloud Firestore |
| Auth | Firebase Authentication |
| PDF | jsPDF + html2canvas |
| Runtime | Vanilla ES Modules (no framework) |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Installation

```bash
git clone https://github.com/spmsuhas/finvision-ai.git
cd finvision-ai
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your Firebase project credentials:

```bash
cp .env.example .env
```

> The app runs fully in offline/demo mode without Firebase credentials. Auth and cloud save features require a valid Firebase project.

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

---

## Project Structure

```
finvision-ai/
├── index.html                  # SPA shell — all 6 sections
├── src/
│   ├── main.js                 # App bootstrap, state management, SPA router
│   ├── styles/
│   │   └── main.css            # Tailwind v4 with @theme design tokens
│   ├── utils/
│   │   ├── constants.js        # ARD macroeconomic parameters (inflation, CAGR, tax slabs)
│   │   ├── formatters.js       # Indian number system formatters (₹, Lakh, Crore)
│   │   ├── financeEngine.js    # Corpus trajectory & SIP calculation engine
│   │   └── taxEngine.js        # Old/New regime tax + LTCG harvesting engine
│   ├── components/
│   │   ├── charts/             # Chart.js wrappers (corpus, allocation, expense)
│   │   ├── forms/              # Input forms (personal, assets, expenses, goals)
│   │   ├── tables/             # Projection table with pagination & CSV export
│   │   └── reports/            # PDF export module
│   ├── firebase/
│   │   ├── config.js           # Firebase app init (reads VITE_FIREBASE_* env vars)
│   │   ├── auth.js             # Auth helpers (Google OAuth, email/password)
│   │   └── firestore.js        # Firestore CRUD for plans & personal details
│   └── ai/
│       └── aiAdvisor.js        # Gemini integration with RAG context injection
├── .env.example                # Environment variable template
├── vite.config.js              # Vite config with Tailwind plugin & code splitting
└── ARD.md                      # Application Requirement Document (source of truth)
```

---

## Macroeconomic Assumptions

All financial projections are calibrated against institutional research from Vanguard, Goldman Sachs, J.P. Morgan, and McKinsey & Company:

| Parameter | Value | Source |
|---|---|---|
| General inflation | 8.0% p.a. | Goldman Sachs (conservative buffer) |
| Medical inflation | 13.5% p.a. | Asia Healthcare Index |
| Education inflation | 11.0% p.a. | India private education trends |
| Equity CAGR | 13.0% p.a. | Vanguard VCMM (emerging markets) |
| Debt CAGR | 6.0% p.a. | India normalized interest rate |
| Salary raise | 4.0% p.a. | ARD default |
| End of Life horizon | 100 years | Longevity risk buffer |
| Legacy buffer | 4× annual expense | Terminal estate planning |

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

---

## Security

If you discover a security vulnerability, please follow the responsible disclosure process in [SECURITY.md](SECURITY.md). Do **not** open a public issue.

---

## License

This project is licensed under the [MIT License](LICENSE).

© 2026 Suhas Manjunath
