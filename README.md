# ProcurementFlow (ProcureSouth)

A South African corporate & public-sector procurement suite. It covers **B-BBEE scorecard verification**, **PPPFA 80/20 and 90/10 tender evaluation**, and **supplier compliance tracking**, all in one React dashboard.

> **Hackathon status:** this is a working **front-end prototype**. All data is mock/seed data stored in the browser's `localStorage`. There is no backend, database, login or AI integration yet. Those are tracked as [GitHub Issues](../../issues). Pick one up!

---

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Quick start (run locally)](#quick-start-run-locally)
4. [Available scripts](#available-scripts)
5. [Environment variables](#environment-variables)
6. [Project structure](#project-structure)
7. [How the app works](#how-the-app-works)
8. [Domain primer: B-BBEE & PPPFA](#domain-primer-b-bbee--pppfa)
9. [Resetting demo data](#resetting-demo-data)
10. [Troubleshooting](#troubleshooting)
11. [Contributing workflow](#contributing-workflow)
12. [Roadmap / known gaps](#roadmap--known-gaps)

---

## Features

| Module | What it does |
| --- | --- |
| **Procurement Dashboard** | KPI cards (spend, preferential spend, active tenders, verified suppliers), B-BBEE level distribution, sector spread, preferential-target gauge and a compliance timeline. |
| **Supplier Directory** | Searchable, filterable table of suppliers (sector, B-BBEE level, audit status). Has a detail drawer with the full scorecard breakdown, and a form to register new suppliers. |
| **B-BBEE Verification Hub** | Slider-based scorecard calculator (Ownership, Management Control, Skills Dev, ESD, SED). It computes the total points, the B-BBEE level and the procurement recognition %, generates a verification certificate and can register the supplier in the directory. |
| **Tender Evaluation Board** | Publish tenders, submit bids from registered suppliers and auto-rank them using the PPPFA formulas. Non-compliant bidders (supplier status not `Approved`) are disqualified. It also has a **Live Bidding Solver** sandbox to try out "what-if" evaluations. |

---

## Tech stack

- **React 19** + **TypeScript 5.8**
- **Vite 6** (dev server & bundler)
- **Tailwind CSS v4** (via `@tailwindcss/vite`, configured in `src/index.css` with `@theme`)
- **lucide-react** for icons
- State: React `useState` persisted to `localStorage`, with no backend

Installed but **not used yet** (reserved for upcoming features): `@google/genai` (Gemini), `express`, `dotenv`, `motion`, `tsx`.

---

## Quick start (run locally)

### Prerequisites

| Tool | Version | Check |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | **20 LTS or newer** (tested on Node 24) | `node -v` |
| npm | 10+ (ships with Node) | `npm -v` |
| Git | any recent | `git --version` |

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/B-a-y-a-n-d-a/procurementflow.git
cd procurementflow

# 2. Install dependencies
npm install

# 3. (Optional) create your local env file - not needed for the current build
cp .env.example .env.local        # Windows PowerShell: Copy-Item .env.example .env.local

# 4. Start the dev server
npm run dev
```

Open **http://localhost:3000** in your browser. The dev server listens on `0.0.0.0`, so teammates on the same Wi-Fi can open `http://<your-LAN-IP>:3000` too.

---

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server on port **3000** with hot reload. |
| `npm run build` | Production build into `dist/`. |
| `npm run preview` | Serve the production build locally (default port 4173). |
| `npm run lint` | Type-check the project with `tsc --noEmit`. **Run this before pushing.** |
| `npm run clean` | Delete the `dist/` folder (cross-platform). |

---

## Environment variables

Copy `.env.example` to `.env.local`. Files matching `.env*` are git-ignored, except for the example.

| Variable | Required now? | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | No | For the planned Gemini AI features. **Never expose it in client code.** Call Gemini from a server/API route. |
| `APP_URL` | No | Public URL of the deployed app (default `http://localhost:3000`). |
| `DISABLE_HMR` | No | Set to `true` to turn off hot reload/file watching (used by Google AI Studio). |

> Vite only exposes variables prefixed with `VITE_` to browser code (`import.meta.env.VITE_*`). Anything secret must **not** use that prefix.

---

## Project structure

```
procuresouth/
├── index.html                 # HTML entry, mounts #root
├── vite.config.ts             # Vite + React + Tailwind plugins, "@" alias -> project root
├── tsconfig.json
├── package.json
├── metadata.json              # Google AI Studio app metadata
├── .env.example               # Template for .env.local
└── src/
    ├── main.tsx               # React entry point
    ├── App.tsx                # App shell: header, sidebar, tab routing, global state + localStorage
    ├── index.css              # Tailwind import, theme tokens (fonts, animations), scrollbars
    ├── types.ts               # Domain types, PPPFA/B-BBEE constants & formulas, SEED DATA
    └── components/
        ├── Sidebar.tsx            # Left navigation (responsive: drawer / icon rail / full)
        ├── DashboardView.tsx      # KPIs & charts
        ├── SupplierDirectory.tsx  # Supplier table, filters, detail drawer, add-supplier modal
        ├── VerificationHub.tsx    # Scorecard calculator & certificate generator
        └── TenderBoard.tsx        # Tenders, bids, PPPFA evaluation, sandbox solver
```

---

## How the app works

- **Navigation:** there is no router. `App.tsx` holds an `activeTab` string (`dashboard | suppliers | verification | tenders`) and `renderView()` swaps components.
- **State:** `suppliers` and `tenders` live in `App.tsx` and are passed down as props with callbacks (`onAddSupplier`, `onAddTender`, `onAddBid`).
- **Persistence:** every change is saved to `localStorage` under the keys `procuresouth_suppliers_v1` and `procuresouth_tenders_v1`. On first load (or when those keys are missing), the app uses `DEFAULT_SUPPLIERS` and `DEFAULT_TENDERS` from `src/types.ts`.
- **Business logic:** all formulas are in `src/types.ts`:
  - `calculatePricePoints(pt, pMin, systemType)`: PPPFA price points
  - `determineBeeLevel(score)`: maps scorecard points to Level 1–8 (9 = non-compliant)
  - `BBBEE_POINTS_80_20` / `BBBEE_POINTS_90_10`: preference points per level
- **Bid evaluation (`TenderBoard.getEvaluatedBids`):** the lowest compliant price is `Pmin`. Each compliant bid gets price points plus B-BBEE points, and the bids are sorted by total. The top bid is tagged `Best Choice`, or `Awarded` if the tender status is Awarded. Scores stored in the seed data are recalculated at runtime.
- **Styling:** Tailwind utility classes with the brand navy `#1F3864`. Fonts (Work Sans, JetBrains Mono) load from Google Fonts in `index.css`.

---

## Domain primer: B-BBEE & PPPFA

**B-BBEE scorecard** (Broad-Based Black Economic Empowerment), as modelled here:

| Element | Max points |
| --- | --- |
| Ownership | 25 |
| Management Control | 19 |
| Skills Development | 20 |
| Enterprise & Supplier Development (ESD) | 40 |
| Socio-Economic Development (SED) | 5 |
| **Total** | **109** |

| Points | Level | Recognition |
| --- | --- | --- |
| ≥ 100 | 1 | 135% |
| ≥ 95 | 2 | 125% |
| ≥ 90 | 3 | 110% |
| ≥ 80 | 4 | 100% |
| ≥ 75 | 5 | 80% |
| ≥ 70 | 6 | 60% |
| ≥ 55 | 7 | 50% |
| ≥ 40 | 8 | 10% |
| < 40 | Non-compliant | 0% |

**PPPFA** (Preferential Procurement Policy Framework Act):

- **80/20** system (smaller contracts): `Ps = 80 × (1 − (Pt − Pmin) / Pmin)` + up to 20 B-BBEE points
- **90/10** system (larger contracts): `Ps = 90 × (1 − (Pt − Pmin) / Pmin)` + up to 10 B-BBEE points
- `Pt` = bid price being scored, `Pmin` = lowest acceptable bid. Price points are floored at 0.

> The app uses the R50m threshold between 80/20 and 90/10. Check this against the current PPPFA Regulations (2022) before any real-world use.

---

## Resetting demo data

Seed data only loads when `localStorage` is empty. If you edit `DEFAULT_SUPPLIERS` / `DEFAULT_TENDERS` and don't see the changes, clear storage in the browser DevTools console:

```js
localStorage.removeItem('procuresouth_suppliers_v1');
localStorage.removeItem('procuresouth_tenders_v1');
location.reload();
```

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Port 3000 is already in use` | Stop the other process, or run `npx vite --port=3001`. |
| `npm install` is very slow / hangs | If the project sits inside a **OneDrive**-synced folder, pause OneDrive syncing or clone into a non-synced folder (e.g. `C:\dev`). Also try `npm cache verify`. |
| Styles look unstyled / plain | Make sure you're on the Vite dev server (`npm run dev`), not opening `index.html` directly. |
| Changes to seed data don't show | See [Resetting demo data](#resetting-demo-data). |
| Type errors | Run `npm run lint` and fix what it reports before pushing. |

---

## Contributing workflow

1. Pick an [issue](../../issues) and assign yourself, so nobody duplicates work.
2. Branch off `main`: `git checkout -b feature/<issue-number>-short-name`
3. Commit small, clear changes. Reference the issue, e.g. `Fix #3: auto-expire certificates`.
4. Run `npm run lint` and `npm run build`. Both must pass.
5. Push and open a Pull Request into `main`. Ask a teammate to review.
6. Don't commit `.env.local`, API keys or `node_modules/`.

**Code conventions:** functional React components with typed props interfaces, Tailwind classes for styling (no new CSS files), and domain logic/formulas in `src/types.ts` (or a new `src/lib/` module), not inside components.

---

## Roadmap / known gaps

These are tracked as GitHub Issues. At a glance:

- Backend API + database (replace `localStorage`)
- Authentication & role-based access (the "J. Du Plessis / Treasury Officer" user is hard-coded)
- Dashboard spend figures are hard-coded. They should be computed from awarded bids
- The compliance timeline and notifications bell are static placeholders
- Automatic certificate-expiry detection
- Gemini AI integration (declared in `metadata.json` but not implemented)
- Print/export a certificate on its own (PDF), plus CSV/Excel exports
- Tender lifecycle management (Open → Evaluation → Awarded) and bid editing/removal
- PPPFA threshold auto-selection & 2022 regulations check
- Unit tests for the scoring formulas
- Router with deep links (currently tab state only)
