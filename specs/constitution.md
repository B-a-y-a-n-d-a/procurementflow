# CIVICFLOW Constitution

> The non-negotiable principles for this codebase. Every spec, plan, task and pull request is checked against them. If a change conflicts with this document, change the document first (by PR, with a reason), then the code.

**Version:** 1.0 · **Ratified:** 2026-09-25

---

## Article I: One lifecycle

CIVICFLOW is one product with one spine:

```
PUBLIC NEED → LOCAL INNOVATION → TRANSPARENT PROCUREMENT → IMPLEMENTATION → MEASURABLE IMPACT
```

1. Every feature must move a record along this lifecycle, or explain where it is on it.
2. A feature that doesn't strengthen the lifecycle doesn't ship in the MVP. It goes to `docs/product/04-mvp-scope.md → FUTURE`.
3. Every rand of procurement must trace back to a `PublicNeed` (the *why*) and forward to `ImpactMetric`s (the *so what*).

## Article II: Spec-driven development

1. Order of work: **constitution → product docs → spec → plan → tasks → code**. Code without a spec'd requirement ID is scope creep.
2. Requirement IDs (`FR-xxx`, `BR-xxx`) are defined in the BRS (`docs/product/02-brs-v2.md`) and referenced in `specs/*/spec.md`, `tasks.md`, commit messages and GitHub issues.
3. Each user story in a spec has testable acceptance criteria (Given / When / Then).
4. When code and spec disagree, the spec wins, or the spec gets amended in the same PR.

## Article III: Business rules are configuration, not constants

1. Approval thresholds, SLA hours, the quotation threshold, minimum competitive offers, evaluation weights, B-BBEE scoring tables and "closing soon" windows all live in **one** versioned `BusinessRuleSet` (MySQL table `business_rule_set` + `approval_rule`). They're editable in *Settings → Business Rules*.
2. The product presents these as **organisational rules**, never as statements of law. The UI and docs never claim that a rule "is required by the PPPFA/MFMA/PFMA".
3. Rule logic lives in plain Java classes (`com.civicflow.rules`) with JUnit tests that need no database.

## Article IV: Humans decide, AI assists

1. CIVIC AI may **summarise, draft, organise and search**. It may **never** approve, reject, select, score on its own authority, or write to procurement records.
2. AI output is always labelled a *draft for human review* and is grounded in platform records, which it cites by reference number.
3. If a fact isn't in the records, the AI says so. It doesn't invent suppliers, prices or impact figures.
4. The API key stays server-side, in the Spring Boot backend's environment. Browser code never sees `GEMINI_API_KEY`. Without a key, CIVIC AI falls back to a deterministic, template-based engine over the same grounded context.

## Article V: Everything important is audited

1. Every state transition writes an `AuditLogEntry` with the actor, action, entity, timestamp and a summary.
2. The audit log is **append-only at application level**. No update or delete path exists in code.
3. Entries are SHA-256 hash-chained (each stores the hash of the previous one), so tampering can be detected. `GET /api/audit/verify` recomputes the chain.

## Article VI: Normalised data, derived views

1. Store each fact once. Opportunities inherit problem, department, budget, capabilities and location from their `PublicNeed`. Current impact values are derived from the latest `ImpactMeasurement`. Budget utilisation is derived from requests and orders.
2. Snapshots are allowed only where they serve audit (e.g. the budget available at submission time).
3. A **Provider** (anyone offering a solution) is distinct from a **Supplier** (a provider registered in a formal procurement context). A provider becomes a supplier only when selected or invited to quote.

## Article VII: Honest demo, honest claims

1. Demo data is clearly fictional (a fictional "Mzansi Metro" municipality, `example.org` links).
2. Demo login is a persona picker and is labelled as such. No fake password screens.
3. We never claim that informal traders automatically qualify for government procurement. The platform only improves visibility and participation *where organisational rules permit*.

## Article VIII: Hackathon-grade simplicity

1. **Stack (fixed):** Java 21 + Spring Boot + Maven (`backend/`), MySQL 8 (Flyway migrations), and React + TypeScript + Vite + Tailwind (`frontend/`). Everything runs with **Docker Compose**, using one command: `docker compose up --build`.
2. **The backend is the source of truth.** Business rules, authorisation, audit and notifications are enforced in Spring services. The frontend never re-implements a rule. It displays what the API returns (including derived values such as scores, SLA state and impact status).
3. The API contract ([`specs/001-civicflow-mvp/contracts/api.md`](001-civicflow-mvp/contracts/api.md)) is changed *before* either side is coded against it.
4. No blockchain, no full GIS and no generic chatbot in the MVP.
3. Accessible by default: semantic HTML, keyboard reachable, colour isn't the only signal, WCAG AA contrast.
