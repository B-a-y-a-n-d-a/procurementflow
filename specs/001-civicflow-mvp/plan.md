# Plan 001: Technical Implementation Plan

**Spec:** [spec.md](spec.md) · **Constitution check:** ✅ Art. I–VIII (see the end of this file)

## 1. Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Backend | Java 21, Spring Boot 3.5, Maven (wrapper `mvnw`) | Requested stack. Mature, and fits a strict service layer for rules and audit. |
| Persistence | MySQL 8.4, Spring Data JPA (Hibernate), Flyway | Requested DB. Flyway gives us a single reviewed schema (`V1__schema.sql`) that mirrors the ERD. |
| API | REST/JSON under `/api`, DTOs as Java records, Bean Validation | Simple and demo-friendly. The contract is in [contracts/api.md](contracts/api.md). |
| Auth (demo) | `X-Demo-User: <userId>` header, resolved by a servlet filter into a request-scoped `CurrentUser` | Persona switching for judges. It's swappable for OIDC/JWT later without touching services. |
| AI | `CivicAiService`: grounded context → Gemini REST (`GEMINI_API_KEY`, `GEMINI_MODEL`), else a deterministic template engine | Key stays server-side (Art. IV). |
| Frontend | React 19, TypeScript, Vite 6, Tailwind 4, lucide-react, Leaflet (react-leaflet) | Keeps the existing toolchain. Leaflet serves the one-map requirement. |
| Runtime | Docker Compose: `mysql`, `backend`, `frontend` (nginx serves the SPA and proxies `/api` → backend) | One command. The same origin avoids CORS in Docker. |
| Tests | JUnit 5 (rule engine: pure unit tests), `@SpringBootTest` on H2 (MySQL mode) for the lifecycle flow, `tsc --noEmit` + `vite build` for the frontend | NFR-05 |

## 2. Repository layout

```
/
├── docker-compose.yml          # mysql + backend + frontend
├── .env.example                # GEMINI_API_KEY, MySQL creds (optional overrides)
├── docs/product/               # A–I deliverables (BRS, ERD, MVP, demo, …)
├── specs/                      # SDD: constitution + feature specs
├── backend/
│   ├── Dockerfile              # multi-stage: maven build → temurin JRE
│   ├── pom.xml, mvnw, .mvn/
│   └── src/main/java/com/civicflow/
│       ├── CivicFlowApplication.java
│       ├── domain/             # JPA entities + enums (mirror ERD)
│       ├── repository/         # Spring Data repositories
│       ├── rules/              # Pure rule engine: RoutingRules, BudgetCalculator, ScoringEngine, ImpactCalculator, SlaCalculator, LifecycleStageResolver
│       ├── service/            # Lifecycle services (one per aggregate) + AuditService, NotificationService
│       ├── ai/                 # CivicAiService, GeminiClient, DeterministicAiEngine, AiContextBuilder
│       ├── security/           # DemoAuthFilter, CurrentUser, Permissions
│       ├── web/                # Controllers, dto/ (records), Mapper, ApiExceptionHandler
│       ├── seed/               # DemoDataSeeder (relative dates), reset
│       └── config/             # Jackson, CORS (dev), properties
│   └── src/main/resources/
│       ├── application.yml     # profiles: default (MySQL), test (H2)
│       └── db/migration/V1__schema.sql
└── frontend/
    ├── Dockerfile, nginx.conf
    └── src/
        ├── api/                # client.ts (fetch + X-Demo-User), types.ts (contract DTOs)
        ├── app/                # App shell, router (hash), auth context, layout, nav per role
        ├── components/ui/      # Card, Badge, Button, Stat, Table, Modal, Field, EmptyState, StageTracker, Money
        ├── features/           # dashboard, needs, approvals, opportunities, solutions, providers,
        │                       # evaluations, procurement, implementations, impact, map, audit, ai, settings
        └── lib/                # format (ZAR, dates), labels (enum → text), hooks (useApi)
```

## 3. Key design decisions

1. **The backend owns every derived value** (lifecycle stage, SLA state, budget, scores, impact status, `CLOSING_SOON`). The React UI renders the DTOs, so the two can't drift (Art. VIII.2).
2. **Rule engine = pure Java.** `rules/*` classes take plain values and a `RuleSnapshot` and return results. They're unit-tested without Spring. Services load the current `BusinessRuleSet` and delegate to them.
3. **The audit correlation id.** `audit_log_entry.need_id` (nullable) correlates every lifecycle event with its root need, so the Journey is one indexed query. This is audit metadata, not business data, so it's allowed by Art. VI.2.
4. **The hash chain.** `hash = SHA-256(prevHash | sequence | occurredAt | actorId | action | entityType | entityId | summary | metadata)`. Writes are serialised in `AuditService` (synchronized plus the sequence from `MAX+1` inside the transaction, which is fine for the hackathon's single instance).
5. **Selection on PurchaseOrder.** `DRAFT` = selected, awaiting supplier verification. `ISSUED` triggers the Implementation.
6. **Seed.** `DemoDataSeeder` runs at startup if `department` is empty (and on `POST /api/admin/reset-demo`). All timestamps are relative to `now`. It writes realistic audit entries for the seeded history, so journeys aren't empty.
7. **JSON columns.** Capability lists, provider types, technologies, scoring tables and default criteria are stored as MySQL `JSON` via a JPA `AttributeConverter` (Jackson).
8. **Errors.** `{ status, code, message, details }`, with 400 validation, 403 permission, 404 not found, 409 invalid state and 422 business rule. The rule codes are listed in the contract.
9. **Frontend routing.** Hash-based routes (`#/needs/:id`) give deep links without a server config, and they work under nginx and Vite alike.
10. **The dev loop.** `docker compose up mysql` + `./mvnw spring-boot:run` + `npm run dev` (Vite proxies `/api` → `localhost:8080`). Or run the whole stack in Docker.

## 4. Build sequence (maps to tasks.md phases)

1. **Foundation:** Maven project, Flyway schema, entities, repositories, Docker Compose, demo auth.
2. **Rule engine + tests:** routing, budget, SLA, scoring, impact, lifecycle stage.
3. **Lifecycle services + controllers:** needs/approvals → opportunities/submissions → evaluation/selection → suppliers/PO → implementation/impact → dashboards/audit/notifications/rules → AI.
4. **Seeder:** the hero story + the supporting stories.
5. **Frontend:** API client/types, shell & role nav, UI kit → feature screens in demo order.
6. **Verification:** `mvnw verify`, frontend build, `docker compose up --build`, then click through the judge demo end to end.
7. **Docs and GitHub:** README, issues from the remaining tasks.

## 5. Constitution check

| Article | How the plan complies |
| --- | --- |
| I Lifecycle | Every service maps to one lifecycle stage. PurchaseRequest requires `need_id`. |
| II SDD | Spec → plan → contract → tasks precede code. Commits reference task IDs. |
| III Rules as config | `business_rule_set` + `approval_rule` tables, `rules/` pure engine, JUnit. |
| IV Humans decide | `ai/` has read-only repositories access only. No selection or approval from AI. |
| V Audit | `AuditService.record(...)` in every state transition, SHA-256 chain, verify endpoint, no update/delete API. |
| VI Normalised | Opportunity reads the need's fields, current impact comes from measurements, budget is computed. |
| VII Honest demo | Fictional municipality, `example.org` links, labelled persona login. |
| VIII Simplicity | One Spring Boot monolith, one MySQL, one SPA, one Compose file. |
