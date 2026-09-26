# CIVICFLOW

### Public Innovation, Procurement & Impact Management Platform
> **From Public Need to Measurable Impact.**

CIVICFLOW connects public-sector problems with local solutions. It manages transparent procurement, tracks implementation and measures real-world outcomes, all in **one lifecycle**:

```
PUBLIC NEED → LOCAL INNOVATION → TRANSPARENT PROCUREMENT → IMPLEMENTATION → MEASURABLE IMPACT
```

Built for the **Geekulcha hackathon, *Gov Innovation Platform* challenge**. It evolved from *ProcureFlow* (procurement request management); see [what changed](docs/product/01-product-definition.md#3-resolving-procureflow--civicflow-contradictions).

| | |
| --- | --- |
| **Stack** | Java 21 · Spring Boot 3.5 · Maven · MySQL 8.4 · Flyway · React 19 · TypeScript · Vite · Tailwind 4 · Leaflet · Docker Compose |
| **Method** | Spec-Driven Development: [constitution](specs/constitution.md) → [product docs](docs/product/) → [spec](specs/001-civicflow-mvp/spec.md) → [plan](specs/001-civicflow-mvp/plan.md) → [API contract](specs/001-civicflow-mvp/contracts/api.md) → [tasks](specs/001-civicflow-mvp/tasks.md) → code |
| **Demo** | Fictional municipality "Mzansi Metro". Persona login (no passwords). A 7-minute [judge demo script](docs/product/05-judge-demo.md) |
| **Status** | MVP complete (T001–T073 in [tasks](specs/001-civicflow-mvp/tasks.md)). Backend tests, frontend lint/build and the full judge demo verified on the Docker stack. Post-MVP work is tracked in [issues](../../issues) |

---

## Contents
1. [Quick start (Docker, one command)](#1-quick-start-docker-one-command)
2. [Demo personas](#2-demo-personas)
3. [Local development loop](#3-local-development-loop)
4. [Architecture](#4-architecture)
5. [Repository layout](#5-repository-layout)
6. [How we work: Spec-Driven Development](#6-how-we-work-spec-driven-development)
7. [Business rules](#7-business-rules-configurable)
8. [CIVIC AI](#8-civic-ai)
9. [Testing](#9-testing)
10. [Troubleshooting](#10-troubleshooting)
11. [Contributing](#11-contributing)
12. [Documentation index](#12-documentation-index)

---

## 1. Quick start (Docker, one command)

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose v2) and Git. That's all. Java, Maven and Node are only needed for the dev loop in §3.

```bash
git clone https://github.com/B-a-y-a-n-d-a/procurementflow.git civicflow
cd civicflow
docker compose up --build
```

The first build downloads the Maven and npm dependencies and takes a few minutes. When it's done:

| Service | URL | Notes |
| --- | --- | --- |
| **Web app** | http://localhost:3000 | nginx serves the React build and proxies `/api` |
| API | http://localhost:8081/api/health | Spring Boot. Container port 8080 is published on **8081** |
| MySQL | `localhost:3306`, db/user/password `civicflow` | Data persists in the `mysql-data` volume |

On first start the backend runs the Flyway migrations and **seeds the demo** automatically (~15 s).

Useful commands:
```bash
docker compose logs -f backend      # follow API logs
docker compose down                 # stop (keeps data)
docker compose down -v              # stop AND wipe the database (re-seeds on next start)
```
Reset the demo without restarting: sign in as **Lindiwe (Admin)** → *Business Rules* → **Reset demo data**.

**Optional configuration:** copy `.env.example` to `.env` to change ports, DB passwords, or to set `GEMINI_API_KEY` (see [CIVIC AI](#8-civic-ai)).

---

## 2. Demo personas

The login screen is a **labelled demo persona picker**. Every request sends `X-Demo-User: <id>`. These are the judge-demo cast, in lifecycle order:

| Persona | Id | Role | Does |
| --- | --- | --- | --- |
| Thandi Nkosi | `u-thandi` | Department Officer, Environmental Services | Records public needs, requests budget |
| Sipho Mokoena | `u-sipho` | Department Manager, Environmental Services | First-line approval, manages implementations |
| Lerato Dlamini | `u-lerato` | Finance Director (CFO) | Approves requests above R50 000 |
| Johan van der Merwe | `u-johan` | Procurement Officer | Publishes opportunities, evaluates, onboards suppliers, issues POs |
| Nomsa Zulu | `u-nomsa` | Provider, CleanSight SA (SME) | Discovers opportunities, submits solutions |
| Ayesha Patel | `u-ayesha` | Executive (City Manager) | Investment → impact dashboard, CIVIC AI briefing |
| Grace Naidoo | `u-grace` | Auditor | Journey view, audit chain verification |
| Lindiwe Sithole | `u-lindiwe` | Admin | Business rules, demo reset |

There are more officers, managers and providers under *More personas*.

**Seeded scenario:** the hero need *"Illegal Dumping Monitoring Solution"* (R500 000) is approved, and its opportunity has closed with **3 submissions** (CleanSight R420 000 L1, EcoVision R390 000 L2, GlobalTech R350 000 L4). Two of the three are evaluated, and you score CleanSight live. Supporting stories fill the dashboards: a completed water-leak project with measured impact, an in-progress open-source permit service, an at-risk streetlight project (quotation route), open opportunities, an overdue approval, a rejected request and a draft.

---

## 3. Local development loop

**Frontend developers (no Java needed):**
```bash
docker compose up -d mysql backend   # API on http://localhost:8081
cd frontend
npm install
npm run dev                          # http://localhost:5173, hot reload, /api proxied to :8081
```

**Backend developers** (Java 21; Maven is provided by the wrapper):
```bash
docker compose up -d mysql           # database only
cd backend
./mvnw spring-boot:run               # Windows: mvnw.cmd spring-boot:run  → http://localhost:8080
```
If you run the frontend against this local backend: `VITE_API_PROXY=http://localhost:8080 npm run dev`.

| Env var (backend) | Default | Purpose |
| --- | --- | --- |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `localhost` / `3306` / `civicflow` / `civicflow` / `civicflow` | MySQL connection |
| `SEED_ON_STARTUP` | `true` | Seed demo data when the DB is empty |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | empty / `gemini-2.5-flash` | Optional CIVIC AI model |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Dev CORS |

---

## 4. Architecture

```
┌──────────────────────────── docker compose ─────────────────────────────┐
│  frontend (nginx :3000)             backend (Spring Boot :8080 → 8081)  │
│  React SPA ──── /api ─────────────▶ web/       REST controllers + DTOs  │
│  (hash routes, role nav)            security/  demo persona filter      │
│                                     service/   lifecycle services       │
│                                     rules/     pure rule engine (JUnit) │
│                                     ai/        CIVIC AI (Gemini | rules)│
│                                     seed/      demo data                │
│                                            │ JPA + Flyway               │
│                                     mysql (:3306)  volume: mysql-data   │
└─────────────────────────────────────────────────────────────────────────┘
```

Key principles (from the [constitution](specs/constitution.md)):
- **The backend is the source of truth.** Every rule, every derived value (lifecycle stage, SLA, budget, scores, impact status) and all authorisation live in Spring services. The UI only displays DTOs.
- **Business rules are configuration.** A versioned `business_rule_set` is editable in the UI. Nothing is hard-coded as law.
- **Humans decide, AI assists.** CIVIC AI is read-only and cites its records.
- **Everything important is audited.** An append-only, **SHA-256 hash-chained** audit log, with `GET /api/audit/verify`.
- **Provider ≠ Supplier.** Innovators are discoverable before they're formal suppliers. The supplier record is created at selection and verified before a PO is issued.

Data model: 25 normalised tables. See the [ERD with Mermaid diagram](docs/product/03-erd.md) and [`V1__schema.sql`](backend/src/main/resources/db/migration/V1__schema.sql).

---

## 5. Repository layout

```
.
├── docker-compose.yml          # mysql + backend + frontend
├── .env.example                # optional overrides (ports, DB, GEMINI_API_KEY)
├── docs/product/               # Product deliverables A–I (definition, BRS v2.0, ERD, MVP, demo, …)
├── specs/                      # SDD: constitution + spec/plan/contract/tasks per feature
├── backend/                    # Spring Boot (Maven wrapper included)
│   ├── Dockerfile
│   └── src/main/java/com/civicflow/
│       ├── domain/             # JPA entities + enums (mirror the ERD)
│       ├── repository/         # Spring Data repositories
│       ├── rules/              # Pure rule engine: routing, budget, SLA, scoring, impact, lifecycle
│       ├── service/            # Need, Approval, Opportunity, Submission, Evaluation, Procurement,
│       │                       # Implementation, Impact, Dashboard, Ecosystem, Audit, Notification, Rule
│       ├── ai/                 # CivicAiService + GeminiClient
│       ├── security/           # Demo auth (X-Demo-User) + CurrentUser
│       ├── seed/               # DemoDataSeeder
│       └── web/                # Controllers, DTOs (Dto.java), error handling
│   └── src/main/resources/db/migration/V1__schema.sql
└── frontend/                   # React + Vite + Tailwind
    ├── Dockerfile, nginx.conf
    └── src/
        ├── api/                # types.ts (contract), client.ts
        ├── app/                # App (routes), Layout, auth, router, nav, toast
        ├── components/         # ui.tsx (UI kit), StageTracker, AiPanel
        ├── lib/                # format, labels, hooks
        └── features/           # dashboard, needs, approvals, opportunities, evaluations, procurement,
                                # implementations, impact, solutions, providers, map, audit, ai, settings
```

---

## 6. How we work: Spec-Driven Development

1. **Constitution first.** [`specs/constitution.md`](specs/constitution.md) holds the non-negotiables. Changing it takes a PR with a reason.
2. **Requirements have IDs.** `FR-xxx`, `BR-xxx`, `NFR-xxx`, `SEC-xxx` and `AI-xx` are defined in the [BRS v2.0](docs/product/02-brs-v2.md).
3. **Spec → plan → contract → tasks.** User stories with Given/When/Then are in [`spec.md`](specs/001-civicflow-mvp/spec.md), the technical plan in [`plan.md`](specs/001-civicflow-mvp/plan.md), the API in [`contracts/api.md`](specs/001-civicflow-mvp/contracts/api.md) plus [`frontend/src/api/types.ts`](frontend/src/api/types.ts) (the DTO shapes), and the work in [`tasks.md`](specs/001-civicflow-mvp/tasks.md).
4. **Contract before code.** To change an API shape, update `contracts/api.md` and `types.ts` first, then `Dto.java`, then the UI.
5. **Traceability.** Commits and PRs reference task/requirement IDs (e.g. `T058: evaluation breakdown (FR-062)`). GitHub issues map to open tasks.
6. **New feature?** Add `specs/00N-<feature>/spec.md`, then plan and tasks, then code.

---

## 7. Business rules (configurable)

Edit these in **Business Rules** (Admin). Every change creates a new version, and requests keep the version they were routed under. They're **organisational defaults, not legal statements**.

| Rule | Default |
| --- | --- |
| Approval SLA | 48 h per step, then overdue; escalation available |
| Approval thresholds | < R5 000 auto · R5 000–R50 000 Department Manager · > R50 000 Manager → Finance Director |
| Budget validation | Request ≤ available (allocated − committed), otherwise blocked |
| Minimum competitive offers | > R10 000 needs ≥ 3 compliant quotes / eligible submissions before a PO |
| Selection justification | Required (≥ 20 chars) when the selected option isn't the recommended one; the PO is flagged |
| Evaluation weights | Price 30 · Technical 30 · Suitability 20 · Local 10 · B-BBEE 10 (must total 100) |
| Auto scores | Price = lowest ÷ price × 100 · B-BBEE L1 100 … L8 10 · Local: same municipality 100 / province 70 / elsewhere 40 |
| Impact status | Achieved (target met) · On track (≥ 50% of baseline→target) · At risk · Not measured |

---

## 8. CIVIC AI

Six bounded tasks: executive briefing, need analysis, opportunity drafting, solution discovery, submission summary and impact summary.
- **Grounded:** it only uses platform records and cites their references. Missing data is reported as "not recorded".
- **Read-only:** it can't approve, select, score or write. AI calls leave the audit log unchanged, and a test verifies this.
- **Server-side key:** set `GEMINI_API_KEY` in `.env` (never in frontend code). Without a key, a **deterministic** template engine produces the same structured, cited output, so the demo works offline.

---

## 9. Testing

```bash
cd backend && ./mvnw verify          # JUnit: rule engine + end-to-end lifecycle on H2
cd frontend && npm run lint          # TypeScript type-check
cd frontend && npm run build         # production build
```
CI (`.github/workflows/ci.yml`) runs the same three checks plus `docker compose build` on every PR and push to `main`.

The backend suite includes the spec's worked examples: the scores **90.00 / 84.42 / 76.00**, the impact **−34.69%**, and a full hero lifecycle from evaluation to measured impact with audit-chain verification.

---

## 10. Troubleshooting

| Problem | Fix |
| --- | --- |
| `port is already allocated` | Another app uses 3000/8081/3306. Set `FRONTEND_PORT`, `BACKEND_PORT` or `MYSQL_PORT` in `.env`. |
| Frontend shows "Cannot reach the CIVICFLOW API" | Check `docker compose ps` and `docker compose logs backend`. The backend waits for MySQL to be healthy, so give it ~40 s on the first start. |
| `./mvnw: bad interpreter` / `\r` errors | The file was checked out with CRLF. The repo's `.gitattributes` forces LF, so re-clone or run `git add --renormalize .` |
| Slow `npm install` on Windows | Don't clone into a OneDrive-synced folder (e.g. use `C:\dev`). |
| Demo data looks stale | Admin → Business Rules → **Reset demo data**, or `docker compose down -v && docker compose up`. |
| Flyway warns "MySQL 8.4 newer than supported" | Harmless for this schema. It's tracked for a Flyway upgrade. |

---

## 11. Contributing

1. Pick an open [issue](../../issues) (each maps to a task in `tasks.md`) and assign yourself.
2. Branch: `git checkout -b feature/T1xx-short-name`.
3. If the change touches behaviour, update the spec/contract first.
4. Before pushing, run `./mvnw verify`, `npm run lint` and `npm run build`.
5. Open a PR that references the issue and requirement IDs. Get one review.

Never commit `.env` or API keys. Keep demo data fictional (`example.org` links, the Mzansi Metro municipality).

---

## 12. Documentation index

| Doc | What |
| --- | --- |
| [01 Product definition](docs/product/01-product-definition.md) | A. The consolidated product, the lifecycle, and ProcureFlow → CIVICFLOW resolutions |
| [02 BRS v2.0](docs/product/02-brs-v2.md) | B. The full business requirements (29 sections) |
| [03 ERD](docs/product/03-erd.md) | C/D. The relational model, cardinalities and the Mermaid `erDiagram` |
| [04 MVP scope](docs/product/04-mvp-scope.md) | E. MUST / SHOULD / COULD / FUTURE |
| [05 Judge demo](docs/product/05-judge-demo.md) | F. The 7-minute demo script |
| [06 Differentiation](docs/product/06-differentiation.md) | G. How CIVICFLOW differs, at product level |
| [07 Risks](docs/product/07-risks.md) | H. Risks and MVP mitigations |
| [08 Final recommendation](docs/product/08-final-recommendation.md) | I. Architecture and recommendation |

Licence: to be confirmed by the team (an open-source licence such as MIT is recommended for the Open Source Agenda).
