# Tasks 001: CIVICFLOW MVP

Legend: `[x]` done · `[ ]` open (tracked as a GitHub issue) · **[P]** can run in parallel · IDs referenced in commits (`T012: …`).

## Phase 0: Specification
- [x] T001 Constitution (`specs/constitution.md`)
- [x] T002 Product docs A–I (`docs/product/01…08`)
- [x] T003 Spec, plan, API contract, DTO types (`specs/001-civicflow-mvp/*`, `frontend/src/api/types.ts`)

## Phase 1: Foundation (backend)
- [x] T010 Maven project + wrapper, Spring Boot 3.5 / Java 21 (NFR-06)
- [x] T011 Flyway `V1__schema.sql`: 25 tables mirroring the ERD (Data req. §23)
- [x] T012 JPA entities, enums, JSON converter, repositories
- [x] T013 Demo auth filter (`X-Demo-User`), `CurrentUser`, `Permissions` (FR-001, FR-002, SEC-01)
- [x] T014 Error model + `ApiExceptionHandler` (contract §Errors)
- [x] T015 Docker: backend Dockerfile, frontend Dockerfile + nginx, `docker-compose.yml` with MySQL healthcheck (NFR-06)

## Phase 2: Rule engine (pure Java + JUnit)
- [x] T020 [P] `RoutingRules`: threshold bands → approver roles (BR-02)
- [x] T021 [P] `BudgetCalculator`: allocated/committed/available (BR-03)
- [x] T022 [P] `SlaCalculator` (BR-01)
- [x] T023 [P] `ScoringEngine`: price/B-BBEE/local/manual, weighted totals, ranking, recommendation (BR-06, BR-17–BR-19, FR-062, FR-064)
- [x] T024 [P] `ImpactCalculator`: change %, progress, status (BR-15)
- [x] T025 [P] `LifecycleStageResolver` (FR-011)
- [x] T026 JUnit tests for T020–T025, including the spec's worked examples (90.00 / 84.42 / 76.00, −34.69%)

## Phase 3: Lifecycle services & API
- [x] T030 `AuditService` (SHA-256 chain, correlation `need_id`, verify) + `NotificationService` (BR-11, FR-120, FR-130)
- [x] T031 `RuleService` + `/rules`, `/rules/routing-preview` (FR-140)
- [x] T032 `NeedService`: create/draft/submit + budget validation + approval step generation (US-02)
- [x] T033 `ApprovalService`: inbox, approve/reject, SoD, escalate (US-03)
- [x] T034 `OpportunityService`: create from need, publish, start evaluation, cancel (US-05)
- [x] T035 `SubmissionService`: submit, withdraw, shortlist, reject (US-06)
- [x] T036 `EvaluationService`: board, save/complete evaluation (US-07)
- [x] T037 `ProcurementService`: select (submission/quote), supplier onboarding/verification, quotes, issue PO (US-08, US-09)
- [x] T038 `ImplementationService`: milestones, updates, status, complete (US-10)
- [x] T039 `ImpactService`: templates, metrics, measurements (US-11)
- [x] T040 `DashboardService`: executive, department, procurement, provider (FR-110, US-12)
- [x] T041 Ecosystem: providers, solutions, map (FR-040–FR-042, FR-101)
- [x] T042 `CivicAiService`: context builder, deterministic engine, Gemini REST client (US-13)
- [x] T043 `DemoDataSeeder` + `/admin/reset-demo` (FR-141)
- [x] T044 Integration test: full hero lifecycle on H2 (need → impact → audit verify)

## Phase 4: Frontend
- [x] T050 API client (`X-Demo-User`), hash router, auth context, persona login (US-01)
- [x] T051 App shell: role-based sidebar, header with notifications bell, CIVIC AI drawer
- [x] T052 UI kit: Card, Badge, Button, Stat, Table, Modal, Field, StageTracker, Money, EmptyState
- [x] T053 [P] Dashboards: executive, department, procurement, provider
- [x] T054 [P] Needs: list, create (live budget + routing preview), detail with stage tracker + Journey
- [x] T055 [P] Approvals inbox with SLA badges, approve/reject/escalate
- [x] T056 [P] Opportunities: marketplace, detail, create-from-need (criteria weights), publish, submit (provider)
- [x] T057 [P] Solutions registry + providers directory
- [x] T058 [P] Evaluation workspace: breakdown, manual scoring, ranking, select + justification
- [x] T059 [P] Procurement: quotes comparison, suppliers verification, POs + issue
- [x] T060 [P] Implementations: detail, milestones, updates, status, complete
- [x] T061 [P] Impact: templates, metrics, measurements, portfolio view
- [x] T062 [P] Map (Leaflet, 3 layers)
- [x] T063 [P] Audit log + chain verification; Settings (rules editor, demo reset)

## Phase 5: Verification & delivery
- [x] T070 `mvnw verify` green, `npm run lint` + `npm run build` green
- [x] T071 `docker compose up --build` from clean; click through the judge demo end to end
- [x] T072 README (monorepo, Docker, dev loop, personas, demo script), docs index
- [x] T073 GitHub: close obsolete ProcureFlow issues, file the open tasks below as issues

## Open (post-MVP backlog → GitHub issues)
- [ ] T100 Real authentication (OIDC/Keycloak) replacing the demo header (SEC-05) (#34)
- [x] T101 CI pipeline (GitHub Actions: `mvnw verify`, frontend lint/build, docker build). Needs a token with `workflow` scope. (#13)
- [ ] T102 File uploads for attachments/evidence (MinIO/S3) instead of links (#14)
- [ ] T103 Email/SMS notifications (FR-120 extension) (#15)
- [ ] T104 Multiple evaluators per submission UI + conflict-of-interest declarations (FR-063, BR-09) (#16)
- [ ] T105 Provider self-registration & profile editing flow (FR-040) (#17)
- [ ] T106 CSD / SARS tax-status verification integration (FR-073) (#18)
- [ ] T107 Procurement value by location table + map heat layer (FR-102) (#19)
- [ ] T108 Public citizen transparency portal (read-only journeys + impact) (#20)
- [ ] T109 Anchor audit chain head hash to a public ledger (Blockchain for Impact extension) (#21)
- [ ] T110 Frontend automated tests (Vitest + Testing Library) for key flows (#22)
- [ ] T111 Accessibility audit (WCAG 2.1 AA) & fixes (NFR-02) (#23)
- [ ] T112 Journey/audit CSV export (#24)
- [ ] T113 Testcontainers-based MySQL integration tests (replace H2 in CI) (#25)
- [ ] T114 Enforce B-BBEE certificate expiry in evaluation & supplier verification (BR-17) (#26)
- [ ] T115 Upgrade Flyway (MySQL 8.4 "newer than supported" warning) (#27)
- [ ] T116 Choose and add an open-source licence (Open Source Agenda) (#28)
- [ ] T117 Judge demo rehearsal checklist & backup video (#29)
- [ ] T118 Rename the repository to `civicflow` (#30)
- [x] T119 Reject impact measurements dated in the future or before the implementation start date; judge demo backdates the PO start date instead of forward-dating measurements (#31)
- [ ] T120 Confirmation dialog before "Mark completed" on an implementation (irreversible) (#32)
- [ ] T121 Code-split the frontend bundle (697 kB; lazy-load routes and Leaflet) (#33)
