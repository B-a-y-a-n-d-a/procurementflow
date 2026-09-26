# CIVICFLOW Business Requirements Document (Version 2.0)

| | |
| --- | --- |
| **Product** | CIVICFLOW: Public Innovation, Procurement & Impact Management Platform |
| **Supersedes** | ProcureFlow BRS v1.x (Procurement Request Management System) |
| **Status** | Approved for hackathon MVP build |
| **Date** | 2026-09-25 |
| **Primary challenge** | Geekulcha Hackathon: *Gov Innovation Platform* |
| **Related** | [Product definition](01-product-definition.md) · [ERD](03-erd.md) · [MVP scope](04-mvp-scope.md) · [MVP spec](../../specs/001-civicflow-mvp/spec.md) |

Requirement IDs: **FR-** functional, **BR-** business rule, **NFR-** non-functional, **SEC-** security, **AI-** AI guardrail. Priorities follow MoSCoW: **M**ust / **S**hould / **C**ould / **F**uture.

---

## 1. Purpose

This document defines what CIVICFLOW must do for public-sector organisations and local solution providers. It consolidates the ProcureFlow procurement workflow into a wider lifecycle that runs from a public problem to measurable impact. It is the single source of truth for the product scope, the rules and the hackathon MVP.

## 2. Background

ProcureFlow digitised internal procurement: purchase requests, budget validation, approval routing, supplier quotes, purchase orders and an audit trail. That solved *how* government buys. It didn't address two gaps the Gov Innovation Platform challenge highlights:

1. **Discovery gap:** South Africa produces many local solutions (hackathons, incubators, SMEs, open-source projects), yet few reach government, because public needs aren't visible to innovators.
2. **Outcome gap:** once a purchase order is issued, most systems stop tracking. Nobody can easily show whether the spend *worked*.

CIVICFLOW keeps ProcureFlow's controls and adds the front of the lifecycle (need → opportunity → local solutions) and the back (implementation → impact).

## 3. Problem statement

> Public-sector organisations can't consistently connect a documented problem to local solutions, procure them transparently, and prove whether the investment produced results. Innovators can't see which public problems exist, and citizens and executives can't see what their money achieved.

Symptoms:
- Needs are buried in internal memos, and opportunities go to the "usual" suppliers.
- Evaluation rationale is scattered across spreadsheets and emails.
- Approvals stall with no SLA visibility.
- Delivery and impact are reported anecdotally, if at all.

## 4. Vision

**"From Public Need to Measurable Impact."** Every public rand in CIVICFLOW can be traced from the problem it was meant to solve, through a transparent choice between local solutions, to verified delivery and measured outcomes.

## 5. Business objectives

| ID | Objective | Measure (see §29) |
| --- | --- | --- |
| OBJ-1 | Make public needs visible to local providers | Share of approved needs published as opportunities |
| OBJ-2 | Increase participation of local SMEs, co-ops, startups and open-source projects | Local-provider share of submissions and awards |
| OBJ-3 | Keep procurement transparent and rule-compliant | 100% of selections with a recorded evaluation; 100% of deviations justified |
| OBJ-4 | Reduce approval delays | Approvals within SLA (target ≥ 90%) |
| OBJ-5 | Track delivery beyond the PO | Share of POs with an active implementation record |
| OBJ-6 | Prove outcomes | Share of completed implementations with ≥ 1 measured impact metric |

## 6. Stakeholders

| Stakeholder | Interest |
| --- | --- |
| Municipal/provincial departments | Solve service-delivery problems within budget |
| Supply Chain Management (procurement) | Compliant, efficient, defensible procurement |
| Finance | Budget control, high-value oversight |
| Executive leadership / political office bearers | Visibility of investment, risk and impact |
| Internal audit / Auditor-General | A complete and tamper-evident trail |
| Local providers (SMEs, startups, co-ops, innovators, open-source maintainers, local businesses) | Visibility of opportunities, fair evaluation, a route to government |
| Citizens / communities (indirect) | Better services, transparency about outcomes |
| Innovation ecosystem (hackathons, incubators such as Geekulcha, universities) | A pipeline from prototype to public deployment |

## 7. Roles

| Role | Key permissions |
| --- | --- |
| `DEPARTMENT_OFFICER` | Create and edit own needs, submit purchase requests, view own department |
| `DEPARTMENT_MANAGER` | Approve/reject department requests (first line), manage implementations for the department, record impact |
| `FINANCE_DIRECTOR` | Approve/reject high-value requests, view all budgets |
| `PROCUREMENT_OFFICER` | Create/publish/close opportunities, record quotes, onboard suppliers, evaluate, select, issue POs |
| `EVALUATOR` | Score submissions assigned to them (the MVP lets procurement officers evaluate too) |
| `PROVIDER` | Manage own provider profile and solutions, view published opportunities, submit/withdraw own submissions |
| `EXECUTIVE` | Read-only across the organisation, CIVIC AI executive briefings |
| `AUDITOR` | Read-only across the organisation, full audit log |
| `ADMIN` | Manage business rules, departments and users |

**Segregation of duties (BR-09):** a user can't approve a request they raised. An evaluator can't score a submission from a provider they're affiliated with. Providers only see their own submissions.

## 8. User journeys

### UJ-1 Department: from problem to approved need
Thandi (Environmental Services officer) records *"Illegal dumping is increasing across several wards"*. She gives it a title, a problem statement, a desired outcome, a location (ward, municipality, map point), the capabilities required (GIS, mobile reporting, analytics), an estimated budget of R500 000 and the sourcing method *Open opportunity*. CIVICFLOW shows the department's available budget, confirms that R500 000 fits, and routes the request to the **Department Manager** and then the **Finance Director** (because the value is above R50 000). Both approve within the 48-hour SLA.

### UJ-2 Procurement: from approved need to published opportunity
Johan (Procurement Officer) opens the approved need and clicks **Convert to opportunity**. CIVIC AI proposes a public-facing title and description, which Johan edits. He sets the deadline, the eligible provider types and the evaluation criteria (weights must total 100%), then publishes it.

### UJ-3 Provider: discover and submit
Nomsa (CleanSight SA, a Level 1 SME in Soshanguve) filters the marketplace by her province and capabilities, opens *Illegal Dumping Intelligence Platform*, links her registered solution *DumpWatch*, and submits R420 000 with a technical proposal and implementation plan. EcoVision (R390 000) and GlobalTech (R350 000) also submit.

### UJ-4 Evaluation and selection
After the deadline Johan closes the opportunity for evaluation. Price, B-BBEE and local-participation scores are **calculated automatically** from the configured rules. Technical capability and suitability are scored by the evaluator with a rationale. The breakdown shows CleanSight at 90.0, EcoVision at 84.4 and GlobalTech at 76.0. GlobalTech is the cheapest but isn't the best value. Johan selects the recommended CleanSight, so no deviation justification is needed. Had he picked another provider, a justification would have been mandatory.

### UJ-5 Supplier onboarding and PO
CleanSight is a **Provider**, not yet a **Supplier**. On selection CIVICFLOW creates a Supplier record in `PENDING_VERIFICATION`. Johan captures the CSD number and confirms tax compliance, which activates the supplier. He then issues **PO-2026-0xx** for R420 000, and the department's committed budget updates.

### UJ-6 Implementation
The PO creates an Implementation managed by Sipho (Department Manager). He adds milestones (hotspot baseline survey, app rollout, ward training), posts progress, flags an issue and uploads delivery evidence. If a milestone slips, he sets the implementation to `AT_RISK`, and the executive dashboard shows it.

### UJ-7 Impact
Using metric templates suggested by the need's category, Sipho defines *Illegal dumping hotspots* (baseline 147, target 100, lower is better), *Wards covered* (target 12), *Jobs supported* (target 8) and *Local SMEs supported* (target 1). Three months later he records a measurement of 96 hotspots with evidence. CIVICFLOW calculates a **−34.7%** change and marks the implementation `COMPLETED`.

### UJ-8 Executive and audit
Ayesha (City Manager) opens the executive dashboard: **R420 000 invested · 12 wards covered · 1 local SME supported · 8 jobs · 34.7% fewer tracked dumping hotspots**. She asks CIVIC AI for a briefing, which cites the records it used. Grace (Auditor) opens the need's **Journey** and the audit log, which shows every event from `NEED_CREATED` to `IMPACT_UPDATED` with an intact hash chain.

## 9. Functional requirements

### 9.1 Identity & access
| ID | Requirement | P |
| --- | --- | --- |
| FR-001 | Users sign in and act under exactly one role. The MVP uses a labelled demo persona picker (no passwords). | M |
| FR-002 | Navigation, actions and data visibility follow role permissions (§7). | M |

### 9.2 Public Need Management
| ID | Requirement | P |
| --- | --- | --- |
| FR-010 | Create a need with: title, problem statement, department, category, priority, estimated budget, required capabilities, location (province, municipality, ward, latitude, longitude), desired outcome, supporting document links. | M |
| FR-011 | Needs have status `DRAFT`, `OPEN`, `CLOSED` or `CANCELLED`. The *lifecycle stage* (Need → Approval → Opportunity → Evaluation → Procurement → Implementation → Impact → Closed) is derived and shown as a tracker. | M |
| FR-012 | Every need has a **Journey** view showing all linked records and audit events in order. | M |
| FR-013 | List and filter needs by department, category, priority, stage and location. | M |
| FR-014 | CIVIC AI can analyse a need (summary, suggested capabilities, suggested metrics). | S |

### 9.3 Procurement Request & Approvals
| ID | Requirement | P |
| --- | --- | --- |
| FR-020 | Submitting a need creates its Purchase Request with amount, justification and sourcing method (`OPEN_OPPORTUNITY` or `QUOTATION`). | M |
| FR-021 | On submission the system validates the amount against the department's available budget (BR-03) and stores a budget snapshot. | M |
| FR-022 | Approval steps are generated from the configured thresholds (BR-02), and requests below the auto-approval threshold are approved automatically. | M |
| FR-023 | Approvers see an inbox of pending steps with SLA countdown and breach flags (BR-01), and can approve or reject with a comment. Rejection needs a comment. | M |
| FR-024 | Overdue steps can be escalated. Escalation notifies the escalation role and is audited (BR-16). | S |
| FR-025 | Request statuses: `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `CANCELLED`, `ORDERED`. | M |

### 9.4 Innovation Opportunity Marketplace
| ID | Requirement | P |
| --- | --- | --- |
| FR-030 | A procurement officer converts an approved `OPEN_OPPORTUNITY` need into an opportunity (BR-08) with a public title, description, deadline, eligible provider types, open-source preference and evaluation criteria. | M |
| FR-031 | Opportunity statuses: `DRAFT`, `PUBLISHED`, `CLOSING_SOON` (derived, BR-12), `CLOSED`, `EVALUATION`, `AWARDED`, `CANCELLED`. | M |
| FR-032 | Providers browse and filter published opportunities by category, capability, province and closing date. | M |
| FR-033 | Opportunity problem, department, category, budget, capabilities and location are read from the linked need. They aren't copied. | M |
| FR-034 | CIVIC AI drafts an opportunity from an approved need, and a human edits it before publishing. | S |

### 9.5 Solution Registry & Provider Ecosystem
| ID | Requirement | P |
| --- | --- | --- |
| FR-040 | Providers have a type (`SME`, `STARTUP`, `LOCAL_BUSINESS`, `COOPERATIVE`, `INNOVATOR`, `TECHNOLOGY_COMPANY`, `OPEN_SOURCE_PROJECT`), location, declared B-BBEE level and expiry, contact details and verification status. | M |
| FR-041 | Providers register solutions: name, description, category, technologies, open-source flag, repository URL, licence, demo URL, coverage provinces, maturity, external deployments. | M |
| FR-042 | The registry is searchable and filterable (open source, category, province, maturity), and shows platform deployments derived from implementations. | M |
| FR-043 | A provider's formal **Supplier** record is separate from its profile (see §23). | M |
| FR-044 | CIVIC AI suggests registry solutions relevant to a need (solution discovery). | S |

### 9.6 Submissions
| ID | Requirement | P |
| --- | --- | --- |
| FR-050 | A provider submits to a published opportunity with: solution (optional), proposed price, technical proposal, implementation plan, duration, declared local jobs, document links (BR-07). | M |
| FR-051 | Submission statuses: `SUBMITTED`, `UNDER_REVIEW`, `SHORTLISTED`, `REJECTED`, `SELECTED`, `WITHDRAWN`. Providers can withdraw before the deadline. | M |
| FR-052 | CIVIC AI summarises a submission against the criteria. | S |

### 9.7 Evaluation Engine
| ID | Requirement | P |
| --- | --- | --- |
| FR-060 | Criteria are configurable per opportunity (defaults come from the rule set), and weights must total 100% (BR-06). | M |
| FR-061 | Criteria scored `AUTO_PRICE` (BR-19), `AUTO_BBBEE` (BR-17), `AUTO_LOCAL` (BR-18) or `MANUAL` (0–100 with a rationale). | M |
| FR-062 | Weighted totals and a per-criterion breakdown (score × weight = points) are always visible, and submissions are ranked. | M |
| FR-063 | Evaluators can shortlist or reject (with a reason) and complete their evaluation. With several evaluators, the scores are averaged. | M |
| FR-064 | The system identifies the **recommended** submission (highest weighted total) but never selects it on its own. | M |

### 9.8 Procurement Engine
| ID | Requirement | P |
| --- | --- | --- |
| FR-070 | For `QUOTATION` requests, record quotes (supplier, amount, validity, compliance and reason). | M |
| FR-071 | The quote comparison shows the B-BBEE level, supplier details, compliance, and highlights the lowest compliant quote. | M |
| FR-072 | Selection enforces minimum competitive offers (BR-04) and deviation justification (BR-05). | M |
| FR-073 | Selecting a provider without a supplier record creates one in `PENDING_VERIFICATION`. Verification captures the CSD number and tax compliance → `ACTIVE` (BR-13). | M |
| FR-074 | Issue a Purchase Order (number, supplier, amount, link to submission/quote, deviation flag). PO statuses: `DRAFT`, `ISSUED`, `COMPLETED`, `CANCELLED`. | M |

### 9.9 Implementation Management
| ID | Requirement | P |
| --- | --- | --- |
| FR-080 | Issuing a PO creates an Implementation (manager, start, expected completion) in `NOT_STARTED`. | M |
| FR-081 | Track milestones (title, due date, completion), progress %, updates of type `PROGRESS`, `ISSUE`, `EVIDENCE`, `NOTE`. | M |
| FR-082 | Statuses: `NOT_STARTED`, `PLANNED`, `IN_PROGRESS`, `AT_RISK`, `COMPLETED`, `CANCELLED`. Completing needs at least one evidence update (BR-14) and sets the PO to `COMPLETED`. | M |

### 9.10 Impact Management
| ID | Requirement | P |
| --- | --- | --- |
| FR-090 | Define metrics per implementation: name, description, unit, direction (increase/decrease is better), baseline, target. The need category suggests templates. | M |
| FR-091 | Record dated measurements with evidence and a note. The current value is the latest measurement. | M |
| FR-092 | Show the change vs baseline (%), the progress to target, and the derived status (BR-15). | M |
| FR-093 | CIVIC AI turns metrics into an executive summary. | S |

### 9.11 Geographic intelligence
| ID | Requirement | P |
| --- | --- | --- |
| FR-100 | Needs, providers and implementations carry a location, and opportunities inherit theirs from the need. | M |
| FR-101 | One map with toggleable layers: needs/opportunities, providers, implementations (coloured by status). Clicking a marker opens the record. | S |
| FR-102 | Procurement value by province/municipality (table). | C |

### 9.12 Dashboards, notifications, audit, settings
| ID | Requirement | P |
| --- | --- | --- |
| FR-110 | Role dashboards per §18. | M |
| FR-120 | In-app notifications per §19, with an unread count and mark-as-read. | M |
| FR-130 | Append-only audit log with filters, and a per-entity trail with hash-chain verification (§20). | M |
| FR-140 | Admins edit the business rule set. Changes are audited and apply to new transactions only. | M |
| FR-141 | Reset the demo data (admin) for repeatable demos. | M |

## 10. Business rules

All rules live in one configurable, versioned **Business Rule Set** (MySQL `business_rule_set` + `approval_rule`, *Settings → Business Rules*), enforced by the Spring Boot services. They're organisational defaults, **not legal statements**.

| ID | Rule | Default |
| --- | --- | --- |
| BR-01 | **Approval SLA:** each approval step must be decided within *N* hours of becoming active. After that it's `OVERDUE`. | 48 h |
| BR-02 | **Approval thresholds** (amount = request amount, in ZAR) | `< 5 000` → auto-approved · `5 000 – 50 000` → Department Manager · `> 50 000` → Department Manager, then Finance Director |
| BR-03 | **Budget validation:** amount ≤ available budget, where available = allocated − committed (pending + approved requests, and POs at PO value). If it exceeds, the request is **blocked**. | Mode: BLOCK |
| BR-04 | **Minimum competitive offers:** for amounts above the threshold, a PO can't be issued until at least *N* compliant quotes (quotation route) or eligible, non-withdrawn submissions (opportunity route) exist. | > R10 000 → 3 |
| BR-05 | **Selection justification:** if the selected option isn't the recommended one (highest weighted score, or the lowest compliant quote), a justification (≥ 20 characters) is required and the PO is flagged as a deviation. | On |
| BR-06 | Evaluation weights for an opportunity must total exactly 100%. | — |
| BR-07 | Submissions are accepted only while the opportunity is `PUBLISHED` and before its deadline, from eligible provider types, with one active submission per provider. | — |
| BR-08 | An opportunity can only be created from a need whose request is `APPROVED` with sourcing method `OPEN_OPPORTUNITY`, and there's at most one opportunity per need. | — |
| BR-09 | **Segregation of duties:** requesters can't approve their own requests. The approver's role (and department, for managers) must match the step. | — |
| BR-10 | Selection requires every eligible (non-withdrawn, non-rejected) submission to have a completed evaluation. | — |
| BR-11 | Every state transition writes an audit entry, and audit entries are never edited or deleted. | — |
| BR-12 | **Closing soon:** a published opportunity whose deadline is within *N* days. | 7 days |
| BR-13 | A PO can only be issued to a supplier in `ACTIVE` status. | — |
| BR-14 | An implementation can only be completed with at least one `EVIDENCE` update. | — |
| BR-15 | **Impact status:** `NOT_MEASURED` (no measurement) · `ACHIEVED` (target reached in the metric's direction) · `ON_TRACK` (≥ 50% of the way from baseline to target) · `AT_RISK` (otherwise). | 50% |
| BR-16 | **Escalation:** an overdue step can be escalated, which notifies the escalation role. | Escalate to Executive |
| BR-17 | **B-BBEE scoring** for `AUTO_BBBEE` criteria (level → score/100). | L1 100 · L2 90 · L3 70 · L4 60 · L5 40 · L6 30 · L7 20 · L8 10 · Non-compliant 0 |
| BR-18 | **Local participation scoring** for `AUTO_LOCAL` criteria. | Same municipality 100 · same province 70 · elsewhere in SA 40 |
| BR-19 | **Price scoring** for `AUTO_PRICE` criteria: `lowest eligible price ÷ this price × 100`. | — |
| BR-20 | **Default criteria** for new opportunities. | Price 30 · Technical 30 · Suitability 20 · Local 10 · B-BBEE 10 |

## 11. Approval workflow

```text
Need submitted ─▶ Budget check (BR-03) ──fail──▶ blocked (officer revises the amount or cancels)
                        │ pass
                        ▼
          Amount < 5 000? ──yes──▶ AUTO-APPROVED (REQUEST_APPROVED by system)
                        │ no
                        ▼
      Step 1: Department Manager (SLA 48 h) ──reject──▶ REJECTED (comment required)
                        │ approve
          Amount > 50 000? ──no──▶ APPROVED
                        │ yes
                        ▼
      Step 2: Finance Director (SLA 48 h)  ──reject──▶ REJECTED
                        │ approve
                        ▼
                    APPROVED ──▶ notify the requester and procurement
Overdue at any step ─▶ flagged OVERDUE ─▶ may be ESCALATED (BR-16)
```

## 12. Procurement workflow

```text
APPROVED request
   ├─ sourcing = QUOTATION ─▶ record quotes ─▶ comparison (lowest compliant highlighted)
   │                                              │
   └─ sourcing = OPEN_OPPORTUNITY ─▶ opportunity (§13) ─▶ evaluation (§14)
                                                  ▼
                           Select option ─▶ BR-04 min offers ─▶ BR-05 justification if deviating
                                                  ▼
                       Provider has supplier? ──no──▶ create Supplier (PENDING_VERIFICATION)
                                                  ▼
                        Verify supplier (CSD no., tax compliant) ─▶ ACTIVE (BR-13)
                                                  ▼
                           Issue PO (ISSUED) ─▶ request ORDERED ─▶ Implementation created
```

## 13. Innovation opportunity workflow

`DRAFT` ─publish─▶ `PUBLISHED` (shown as `CLOSING_SOON` inside the window) ─deadline/close─▶ `CLOSED` ─start evaluation─▶ `EVALUATION` ─selection─▶ `AWARDED`. An opportunity in any state before `AWARDED` can be `CANCELLED` (with a reason).

## 14. Evaluation workflow

1. Opportunity moves to `EVALUATION`, and the submissions move to `UNDER_REVIEW`.
2. Auto criteria are computed from the submissions and the provider records.
3. The evaluator scores the manual criteria (0–100, with a rationale) and completes the evaluation.
4. Optionally the evaluator shortlists or rejects (a reason is required).
5. The system ranks the submissions and marks the recommendation (FR-064).
6. A human selects (BR-05, BR-10). The selected submission becomes `SELECTED`, the others `REJECTED` (not selected), and the opportunity becomes `AWARDED`.

## 15. Implementation workflow

`NOT_STARTED` ─plan─▶ `PLANNED` ─start─▶ `IN_PROGRESS` ⇄ `AT_RISK` ─complete (BR-14)─▶ `COMPLETED`. `CANCELLED` is possible from any non-completed state. Milestones and updates are added at any time before completion.

## 16. Impact workflow

Define metrics (templates suggested) → record baseline → record measurements over time (dated, with evidence) → the derived status and change % update → roll up to the department and executive dashboards → CIVIC AI impact summary.

## 17. AI requirements (CIVIC AI)

| ID | Capability | P |
| --- | --- | --- |
| AI-01 | **Executive briefing:** summarise the organisation's state (evaluations, at-risk implementations, SLA breaches, budget utilisation, impact). | M |
| AI-02 | **Need analysis:** summary, suggested capabilities and metrics. | S |
| AI-03 | **Opportunity drafting:** a public title and description from a need. | S |
| AI-04 | **Solution discovery:** rank registry solutions against a need's capabilities, category and location. | S |
| AI-05 | **Submission analysis:** summarise a submission against the criteria. | S |
| AI-06 | **Impact summarisation.** | S |

**Guardrails (constitution Art. IV):**
- AI-G1: output is labelled *"Draft — AI-generated from platform records. Verify before use."*
- AI-G2: grounded only in the records passed as context, citing their references. It must say "not recorded" when data is missing.
- AI-G3: no approve, select, score-on-its-own-authority or write actions. AI output is never persisted as a decision.
- AI-G4: the key stays server-side (the Spring Boot `CivicAiService` calls the Gemini REST API). Without a key, a deterministic, template-based engine produces the same grounded outputs.
- AI-G5: prompts and responses aren't used to change rules.

## 18. Dashboard requirements

| Dashboard | Shows |
| --- | --- |
| **Executive** | Total procurement value (issued POs), active opportunities, active implementations, budget utilisation (all departments), local providers engaged, pending approvals, SLA breaches, projects at risk, impact highlights, lifecycle funnel, map, CIVIC AI briefing |
| **Department** | Budget allocated / committed / remaining, pending approvals, requests, opportunities, implementations, department impact |
| **Procurement** | Approved requests awaiting sourcing, active opportunities with submission counts, evaluation queue, quote comparisons pending, POs pending issue, suppliers pending verification |
| **Provider** | Available and closing-soon opportunities, submitted, shortlisted and selected submissions, profile completeness, own solutions |

## 19. Notification requirements

In-app notifications (email/SMS are Future) for: an approval step assigned; a request approved or rejected; a step overdue or escalated; an opportunity published (to providers of an eligible type); a submission received (procurement); shortlisted, selected or not selected (provider); supplier verification required; PO issued (provider, department); implementation at risk (executive, department manager); impact updated (executive).

## 20. Audit requirements

- Actions (minimum): `NEED_CREATED`, `REQUEST_SUBMITTED`, `BUDGET_VALIDATED`, `REQUEST_APPROVED`, `REQUEST_REJECTED`, `REQUEST_ESCALATED`, `OPPORTUNITY_CREATED`, `OPPORTUNITY_PUBLISHED`, `OPPORTUNITY_CLOSED`, `SUBMISSION_CREATED`, `SUBMISSION_WITHDRAWN`, `SUBMISSION_SHORTLISTED`, `SUBMISSION_REJECTED`, `EVALUATION_COMPLETED`, `QUOTE_RECORDED`, `SUPPLIER_SELECTED`, `SUPPLIER_ONBOARDED`, `SUPPLIER_VERIFIED`, `PO_ISSUED`, `IMPLEMENTATION_STARTED`, `IMPLEMENTATION_UPDATED`, `IMPLEMENTATION_AT_RISK`, `IMPLEMENTATION_COMPLETED`, `IMPACT_METRIC_DEFINED`, `IMPACT_UPDATED`, `RULES_UPDATED`, `DEMO_RESET`.
- Each entry has: id, sequence, timestamp, actor (or `SYSTEM`), action, entity type and id, a human summary, metadata (JSON), the previous hash and its own hash.
- It's append-only at application level, with no edit/delete API. Verification recomputes the chain and reports the first broken link.

## 21. Non-functional requirements

| ID | Requirement |
| --- | --- |
| NFR-01 | Responsive from 360 px to large desktop, with no horizontal page scroll. |
| NFR-02 | WCAG 2.1 AA: contrast, keyboard access, focus states, labels, and status never shown by colour alone. |
| NFR-03 | Page interactions < 200 ms on the demo dataset, and first load < 3 s on 4G. |
| NFR-04 | Currency ZAR (`R 1 234 567`), dates in SAST, en-ZA formatting. |
| NFR-05 | All business rules have JUnit tests. `./mvnw verify` (backend) and `npm run lint && npm run build` (frontend) must pass. |
| NFR-06 | Stack: Spring Boot (Java 21, Maven) REST API + MySQL 8 (Flyway migrations) + React SPA served by nginx. The whole stack starts with `docker compose up --build`. |
| NFR-07 | Demo resilience: the demo dataset ships as `database/civicflow.sql`; importing it (MySQL Workbench, or automatically into a new Docker volume) restores a known state. |

## 22. Security

| ID | Requirement |
| --- | --- |
| SEC-01 | Role-based access enforced in the service layer (not only by hiding buttons). |
| SEC-02 | Segregation of duties (BR-09). |
| SEC-03 | Secrets (e.g. `GEMINI_API_KEY`) are never bundled into client code. |
| SEC-04 | Provider data isolation: providers see only their own submissions and scores. |
| SEC-05 | Production (Future): real authentication (OIDC), server-side authorisation, TLS, encryption at rest, POPIA-compliant handling of personal information, a retention policy. |
| SEC-06 | Input validation on all forms (amounts > 0, weights = 100, required fields, URL formats). |

## 23. Data requirements

- The canonical model is in [03-erd.md](03-erd.md) (25 entities, normalised).
- Key separations: **PublicNeed** (problem) ≠ **PurchaseRequest** (internal money and approval) ≠ **InnovationOpportunity** (public face). **Provider** (organisation) ≠ **InnovationSolution** (what it built) ≠ **OpportunitySubmission** (its response) ≠ **Supplier** (formal registration). **Evaluation** (decision evidence) ≠ **PurchaseOrder** (transaction) ≠ **Implementation** (delivery) ≠ **ImpactMetric/ImpactMeasurement** (results).
- Derived and not stored: the need lifecycle stage, `CLOSING_SOON`, budget committed/remaining, the current impact value and status, and platform deployments per solution.
- Demo data is fictional ("Mzansi Metro"), and URLs use `example.org`.

## 24. MVP scope

See [04-mvp-scope.md](04-mvp-scope.md). In short: one complete vertical slice, **login → need → budget check → approval → opportunity → submissions → evaluation → selection → supplier onboarding → PO → implementation → impact → executive dashboard → audit trail**, plus the quotation route, the solution registry, the map, CIVIC AI (6 grounded tasks) and editable rules.

## 25. Out of scope (hackathon)

Real authentication/SSO (a demo persona header is used instead); email/SMS; document upload/storage (links only); ERP/financial-system integration (e.g. mSCOA ledgers); CSD/SARS API verification; formal competitive bidding above the organisation's threshold (bid committees, briefing sessions); contract management and invoicing/payments; blockchain anchoring; full GIS analysis; multi-tenant organisations; public citizen portal; mobile native apps.

## 26. Hackathon challenge alignment

| Challenge | Fit | How |
| --- | --- | --- |
| **Gov Innovation Platform** | **Primary** | Connects public problems to local innovators, increases the visibility of local solutions, lets departments, procurement and providers collaborate, and tracks idea → procurement → implementation → impact. |
| Open Source Agenda | Secondary (natural) | Open-source solution catalogue (repo, licence, maintainer, deployments), open-source provider type, "open-source preferred" flag on opportunities. The product itself is open source. |
| Street Economy | Secondary (careful) | Local business and co-operative provider types, eligible-provider filtering and local-participation scoring. We improve visibility *where rules permit*, with no claim that informal traders automatically qualify. |
| Brand New | Possible framing | "Public outcome accountability" as a self-defined challenge. |
| Blockchain for Impact | Future | The hash-chained audit trail could later be anchored to a public ledger. This isn't built now. |
| GeoTech for Impact | Future | Location-aware needs and impact could extend to agriculture and mining monitoring. |
| Train Journey Mapper, Localised Self-Learning | Not targeted | — |

## 27. Demo scenario

See [05-judge-demo.md](05-judge-demo.md): *"Illegal dumping in Soshanguve: from a problem to 34.7% fewer hotspots"*, a 7-minute walkthrough.

## 28. Future roadmap

1. **Pilot-ready (post-hackathon):** a backend (PostgreSQL + API), OIDC login, file storage, email notifications, server-side AI.
2. **Integration:** CSD supplier verification, ERP/financial-system commitments, e-tender portal hand-off above thresholds.
3. **Ecosystem:** a public citizen transparency portal, innovation-programme pipelines (hackathon → registry), provider reputation from verified impact.
4. **Extensions:** audit-hash anchoring to a public ledger (Blockchain for Impact), GeoTech layers (agriculture/mining monitoring), a street-economy trader registry integration, a multi-municipality shared solution catalogue.

## 29. Success metrics

| Metric | Hackathon demo target | Pilot target (6 months) |
| --- | --- | --- |
| End-to-end lifecycle completed live | 1 need → impact in < 8 min | — |
| Approved open needs published as opportunities | 100% (demo) | ≥ 70% |
| Local providers' share of submissions | ≥ 60% (demo data) | ≥ 50% |
| Selections with a completed evaluation | 100% | 100% |
| Deviations with a justification | 100% | 100% |
| Approval steps within SLA | shown live | ≥ 90% |
| Completed implementations with measured impact | 100% (demo) | ≥ 80% |
| Audit chain integrity | verified live | 100% |
