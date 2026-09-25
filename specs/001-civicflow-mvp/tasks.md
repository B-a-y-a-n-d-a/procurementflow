# Tasks 001: CIVICFLOW MVP

Legend: `[x]` done · `[ ]` open (tracked as a GitHub issue) · **[P]** can run in parallel · IDs referenced in commits (`T012: …`).

## Phase 0: Specification
- [x] T001 Constitution (`specs/constitution.md`)
- [x] T002 Product docs A–I (`docs/product/01…08`)
- [x] T003 Spec, plan, API contract, DTO types (`specs/001-civicflow-mvp/*`, `frontend/src/api/types.ts`)

## Phase 1: Foundation (backend)
- [ ] T010 Maven project + wrapper, Spring Boot 3.5 / Java 21 (NFR-06)
- [ ] T011 Flyway `V1__schema.sql`: 25 tables mirroring the ERD (Data req. §23)
- [ ] T012 JPA entities, enums, JSON converter, repositories
- [ ] T013 Demo auth filter (`X-Demo-User`), `CurrentUser`, `Permissions` (FR-001, FR-002, SEC-01)
- [ ] T014 Error model + `ApiExceptionHandler` (contract §Errors)
- [ ] T015 Docker: backend Dockerfile, frontend Dockerfile + nginx, `docker-compose.yml` with MySQL healthcheck (NFR-06)

## Phase 2: Rule engine (pure Java + JUnit)
- [ ] T020 [P] `RoutingRules`: threshold bands → approver roles (BR-02)
- [ ] T021 [P] `BudgetCalculator`: allocated/committed/available (BR-03)
- [ ] T022 [P] `SlaCalculator` (BR-01)
- [ ] T023 [P] `ScoringEngine`: price/B-BBEE/local/manual, weighted totals, ranking, recommendation (BR-06, BR-17–BR-19, FR-062, FR-064)
- [ ] T024 [P] `ImpactCalculator`: change %, progress, status (BR-15)
- [ ] T025 [P] `LifecycleStageResolver` (FR-011)
- [ ] T026 JUnit tests for T020–T025, including the spec's worked examples (90.00 / 84.42 / 76.00, −34.69%)

## Phase 3: Lifecycle services & API
- [ ] T030 `AuditService` (SHA-256 chain, correlation `need_id`, verify) + `NotificationService` (BR-11, FR-120, FR-130)
- [ ] T031 `RuleService` + `/rules`, `/rules/routing-preview` (FR-140)
- [ ] T032 `NeedService`: create/draft/submit + budget validation + approval step generation (US-02)
- [ ] T033 `ApprovalService`: inbox, approve/reject, SoD, escalate (US-03)
- [ ] T034 `OpportunityService`: create from need, publish, start evaluation, cancel (US-05)
- [ ] T035 `SubmissionService`: submit, withdraw, shortlist, reject (US-06)
- [ ] T036 `EvaluationService`: board, save/complete evaluation (US-07)
- [ ] T037 `ProcurementService`: select (submission/quote), supplier onboarding/verification, quotes, issue PO (US-08, US-09)
- [ ] T038 `ImplementationService`: milestones, updates, status, complete (US-10)
- [ ] T039 `ImpactService`: templates, metrics, measurements (US-11)
- [ ] T040 `DashboardService`: executive, department, procurement, provider (FR-110, US-12)
- [ ] T041 Ecosystem: providers, solutions, map (FR-040–FR-042, FR-101)
- [ ] T042 `CivicAiService`: context builder, deterministic engine, Gemini REST client (US-13)
- [ ] T043 `DemoDataSeeder` + `/admin/reset-demo` (FR-141)
- [ ] T044 Integration test: full hero lifecycle on H2 (need → impact → audit verify)

## Phase 4: Frontend
- [ ] T050 API client (`X-Demo-User`), hash router, auth context, persona login (US-01)
- [ ] T051 App shell: role-based sidebar, header with notifications bell, CIVIC AI drawer
- [ ] T052 UI kit: Card, Badge, Button, Stat, Table, Modal, Field, StageTracker, Money, EmptyState
- [ ] T053 [P] Dashboards: executive, department, procurement, provider
- [ ] T054 [P] Needs: list, create (live budget + routing preview), detail with stage tracker + Journey
- [ ] T055 [P] Approvals inbox with SLA badges, approve/reject/escalate
- [ ] T056 [P] Opportunities: marketplace, detail, create-from-need (criteria weights), publish, submit (provider)
- [ ] T057 [P] Solutions registry + providers directory
- [ ] T058 [P] Evaluation workspace: breakdown, manual scoring, ranking, select + justification
- [ ] T059 [P] Procurement: quotes comparison, suppliers verification, POs + issue
- [ ] T060 [P] Implementations: detail, milestones, updates, status, complete
- [ ] T061 [P] Impact: templates, metrics, measurements, portfolio view
- [ ] T062 [P] Map (Leaflet, 3 layers)
- [ ] T063 [P] Audit log + chain verification; Settings (rules editor, demo reset)

## Phase 5: Verification & delivery
- [ ] T070 `mvnw verify` green, `npm run lint` + `npm run build` green
- [ ] T071 `docker compose up --build` from clean; click through the judge demo end to end
- [ ] T072 README (monorepo, Docker, dev loop, personas, demo script), docs index
- [ ] T073 GitHub: close obsolete ProcureFlow issues, file the open tasks below as issues

## Open (post-MVP backlog → GitHub issues)
- [ ] T100 Real authentication (OIDC/Keycloak) replacing the demo header (SEC-05)
- [ ] T101 CI pipeline (GitHub Actions: `mvnw verify`, frontend lint/build, docker build). Needs a token with `workflow` scope.
- [ ] T102 File uploads for attachments/evidence (MinIO/S3) instead of links
- [ ] T103 Email/SMS notifications (FR-120 extension)
- [ ] T104 Multiple evaluators per submission UI + conflict-of-interest declarations (FR-063, BR-09)
- [ ] T105 Provider self-registration & profile editing flow (FR-040)
- [ ] T106 CSD / SARS tax-status verification integration (FR-073)
- [ ] T107 Procurement value by location table + map heat layer (FR-102)
- [ ] T108 Public citizen transparency portal (read-only journeys + impact)
- [ ] T109 Anchor audit chain head hash to a public ledger (Blockchain for Impact extension)
- [ ] T110 Frontend automated tests (Vitest + Testing Library) for key flows
- [ ] T111 Accessibility audit (WCAG 2.1 AA) & fixes (NFR-02)
- [ ] T112 Journey/audit CSV export
- [ ] T113 Testcontainers-based MySQL integration tests (replace H2 in CI)
