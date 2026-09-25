# Spec 001: CIVICFLOW Hackathon MVP

| | |
| --- | --- |
| **Status** | In progress (see [tasks.md](tasks.md) for per-task status) |
| **Inputs** | [BRS v2.0](../../docs/product/02-brs-v2.md), [ERD](../../docs/product/03-erd.md), [MVP scope](../../docs/product/04-mvp-scope.md), [Judge demo](../../docs/product/05-judge-demo.md) |
| **Plan** | [plan.md](plan.md) · **Contract** [contracts/api.md](contracts/api.md) · **Tasks** [tasks.md](tasks.md) |

## Goal
Deliver the single end-to-end vertical slice **need → approval → opportunity → submissions → evaluation → selection → supplier → PO → implementation → impact → executive view → audit**. It's backed by a Spring Boot + MySQL API and a React UI, and it all starts with `docker compose up --build`.

---

## User stories & acceptance criteria

### US-01 Demo login & roles (FR-001, FR-002, SEC-01) · MUST
*As a judge, I want to switch between personas so I can see each stakeholder's view.*
- **Given** the login page, **when** I pick a persona, **then** I'm signed in as that user and the navigation shows only the modules for that role.
- **Given** I'm a PROVIDER, **when** I call a staff-only endpoint (e.g. `GET /api/needs`), **then** the API returns `403`.
- The login page states that it's a demo persona picker with no passwords.

### US-02 Create a need with budget validation (FR-010, FR-020, FR-021, BR-03) · MUST
*As a department officer, I want to describe a problem and request budget.*
- **Given** Environmental Services has R X available, **when** I enter an amount, **then** the form shows allocated / committed / available and the approval routing that will apply (`GET /api/rules/routing-preview`).
- **When** I submit an amount ≤ available, **then** a `PublicNeed` (`OPEN`) and a `PurchaseRequest` (`PENDING_APPROVAL`, or `APPROVED` if auto) are created with a budget snapshot, and the audit log has `NEED_CREATED`, `BUDGET_VALIDATED` and `REQUEST_SUBMITTED`.
- **When** I submit an amount > available, **then** the API returns `422 BUDGET_EXCEEDED` and nothing is created.
- **When** I choose *Save as draft*, **then** only the need is created (`DRAFT`), with no request and no budget check.

### US-03 Approval routing & SLA (FR-022, FR-023, FR-024, BR-01, BR-02, BR-09, BR-16) · MUST
- R4 999 → one `AUTO_APPROVED` step (role `SYSTEM`), request `APPROVED`.
- R5 000 and R50 000 → one step: `DEPARTMENT_MANAGER`.
- R50 000.01 → two steps: `DEPARTMENT_MANAGER` (`PENDING`), then `FINANCE_DIRECTOR` (`WAITING` until step 1 is approved).
- Each active step has `dueAt = activatedAt + approvalSlaHours`. After that the SLA state is `OVERDUE`.
- A manager of another department, or the requester themselves, gets `403` when trying to approve.
- Rejecting requires a comment, and the request becomes `REJECTED`.
- Approving the last step makes the request `APPROVED` and notifies the requester and procurement officers.
- An `OVERDUE` step can be escalated: `escalatedAt` is set, the escalation role is notified, and `REQUEST_ESCALATED` is audited.

### US-04 Need journey (FR-011, FR-012) · MUST
- The need detail shows a **stage tracker** (Need → Approval → Opportunity → Evaluation → Procurement → Implementation → Impact) with completed, current and pending stages, derived by the backend.
- The **Journey** tab lists every audit entry correlated to the need, in chronological order.

### US-05 Opportunity creation & publishing (FR-030, FR-031, FR-033, BR-06, BR-08, BR-12) · MUST
- Only a PROCUREMENT_OFFICER can create an opportunity, and only from a need whose request is `APPROVED` with `OPEN_OPPORTUNITY`. Anything else returns `409`/`422`.
- Default criteria come from the rule set. Weights not totalling 100 return `422 WEIGHTS_INVALID`.
- Publishing sets `PUBLISHED` and `publishedAt`, and notifies users of eligible provider types.
- The API returns `displayStatus = CLOSING_SOON` when the deadline is within `closingSoonDays`.
- The opportunity DTO exposes the need's problem, budget, capabilities, location and department (read through the need).

### US-06 Provider discovery & submission (FR-032, FR-040–FR-042, FR-050, FR-051, BR-07) · MUST
- Providers see `PUBLISHED`+ opportunities only (never `DRAFT`), and can filter them by category, province and text.
- A provider can submit once per opportunity while it's `PUBLISHED` and before the deadline, and only if their type is eligible. Otherwise `422`.
- A provider can link one of their own solutions (another provider's solution → `422`).
- A provider sees only their own submissions (SEC-04).
- A provider can withdraw before the deadline, which sets `WITHDRAWN` with a reason.
- The solution registry is filterable by open source, category and province, and shows platform deployments counted from implementations.

### US-07 Transparent evaluation (FR-060–FR-064, BR-10, BR-17–BR-19) · MUST
- Starting the evaluation sets the opportunity to `EVALUATION` and moves non-withdrawn submissions to `UNDER_REVIEW`.
- The auto scores: price = `min eligible price ÷ price × 100`, B-BBEE from the table, local from the municipality/province match. Each comes with a human-readable `basis` string.
- Manual scores are 0–100 and need a rationale. Completing an evaluation requires every manual criterion to be scored.
- **Given** the seeded OPP-2026-007 with default weights and manual scores (CleanSight 90/90, EcoVision 75/80, GlobalTech 70/60), **then** the totals are **90.00, 84.42, 76.00**, and CleanSight is `recommendedSubmissionId`.
- The board never selects on its own.

### US-08 Selection, supplier onboarding, PO (FR-072–FR-074, BR-04, BR-05, BR-13) · MUST
- Selecting when not all eligible submissions are evaluated returns `422 EVALUATION_INCOMPLETE`.
- Selecting when amount > quotation threshold and eligible offers < minimum returns `422 MIN_OFFERS_NOT_MET`.
- Selecting a non-recommended submission without a justification of ≥ 20 characters returns `422 JUSTIFICATION_REQUIRED`. With one, the PO has `isDeviation = true`.
- Selection creates a `PurchaseOrder` (`DRAFT`). If the provider has no Supplier record, one is created (`PENDING_VERIFICATION`, `SUPPLIER_ONBOARDED`). The selected submission becomes `SELECTED`, other eligible ones `REJECTED` ("Not selected"), and the opportunity `AWARDED`. The `SUPPLIER_SELECTED` audit metadata holds the full score breakdown.
- Verifying a supplier requires a CSD number and `taxCompliant = true` → `ACTIVE`.
- Issuing a PO to a non-active supplier returns `422 SUPPLIER_NOT_ACTIVE`. On success the PO is `ISSUED`, the request `ORDERED`, and an Implementation (`NOT_STARTED`) is created with the chosen manager. The department's committed budget includes the PO amount.

### US-09 Quotation route (FR-070, FR-071) · SHOULD
- For `QUOTATION` requests, procurement records quotes from active suppliers (one per supplier).
- The comparison flags the lowest compliant quote, shows the B-BBEE level and supplier details, and enforces BR-04 and BR-05 on selection like US-08.

### US-10 Implementation tracking (FR-080–FR-082, BR-14) · MUST
- The manager can add milestones, complete them, post updates (`PROGRESS`/`ISSUE`/`EVIDENCE`/`NOTE`), change the status (`PLANNED`, `IN_PROGRESS`, `AT_RISK`) and progress.
- Setting `AT_RISK` notifies executives and audits `IMPLEMENTATION_AT_RISK`.
- Completing without any `EVIDENCE` update returns `422 EVIDENCE_REQUIRED`. On success the status is `COMPLETED`, progress 100, `actualCompletion` set, and the PO `COMPLETED`.

### US-11 Impact (FR-090–FR-092, BR-15) · MUST
- Templates are returned per need category (e.g. WASTE_ENVIRONMENT → hotspots, wards covered, jobs, local SMEs).
- A metric has a baseline, target and direction. A measurement has a value, date, evidence and note.
- **Given** baseline 147, target 100, direction DECREASE and a latest measurement of 96, **then** `changePct = −34.69` (shown as −34.7%), `progressPct = 108.5` and `status = ACHIEVED`.
- With no measurements, the status is `NOT_MEASURED`.

### US-12 Executive dashboard & audit (FR-110, FR-130, BR-11) · MUST
- The executive KPIs are total procurement value (sum of issued and completed POs), active opportunities, active implementations, budget utilisation, local providers engaged, pending approvals, SLA breaches and projects at risk. They're shown with the lifecycle funnel, impact highlights (invested → metrics), at-risk projects and overdue approvals.
- The audit log is filterable. `GET /api/audit/verify` returns `valid: true` for an untouched chain, and `valid: false` with `brokenAtSequence` if any row was modified in MySQL.
- No API route updates or deletes audit entries.

### US-13 CIVIC AI (AI-01…AI-06, AI-G1…G5) · SHOULD
- Six tasks are available from context buttons (dashboard, need, opportunity, submission, implementation).
- Responses include `mode` (`GEMINI` | `DETERMINISTIC`), `citations` and a `disclaimer`. With no `GEMINI_API_KEY`, the mode is `DETERMINISTIC`.
- No AI endpoint changes data. The audit count stays the same after an AI call.

### US-14 Rules, notifications, map, reset · SHOULD
- An ADMIN edits the rule set, which creates a new version and audits `RULES_UPDATED`. Existing requests keep their `ruleSetVersion`.
- The notification bell shows the unread count, and a user can mark one or all as read.
- The map shows needs, providers and implementations with layer toggles.
- An ADMIN reset restores the seed data (`DEMO_RESET`).

## Out of scope
See BRS §25.

## Open questions (resolved)
| Question | Decision |
| --- | --- |
| Does every purchase need a PublicNeed? | Yes (1 : 0..1). Routine buys use a light need + `QUOTATION`. |
| Where is the award decision stored? | On `PurchaseOrder` (`DRAFT` = selected). |
| Is the AI allowed to pre-fill evaluation scores? | No. It can only summarise the evidence. |
| Real login? | No. A demo persona header (`X-Demo-User`). The production path is OIDC (Future). |
