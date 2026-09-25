# E. MVP Scope (MoSCoW)

**Scope test:** a feature is a MUST only if the judge demo ([05-judge-demo.md](05-judge-demo.md)) breaks without it.

## MUST HAVE (the vertical slice)

| # | Feature | Req. IDs |
| --- | --- | --- |
| M1 | Demo persona login (labelled) + role-based navigation and service-layer authorisation | FR-001, FR-002, SEC-01 |
| M2 | Create a public need (with location, capabilities, outcome) and submit it with a purchase request | FR-010, FR-020 |
| M3 | Budget validation against the department's available budget, with a snapshot | FR-021, BR-03 |
| M4 | Threshold-based approval routing, auto-approval, approver inbox with SLA / overdue flag, approve/reject | FR-022, FR-023, BR-01, BR-02, BR-09 |
| M5 | Convert an approved need → opportunity with weighted criteria (Σ = 100), then publish/close | FR-030, FR-031, FR-033, BR-06, BR-08 |
| M6 | Opportunity marketplace for providers + submit a solution | FR-032, FR-050, BR-07 |
| M7 | Evaluation workspace: auto price/B-BBEE/local scores, manual scores with rationale, transparent breakdown, ranking, recommendation | FR-060…FR-064, BR-17…BR-19 |
| M8 | Human selection with deviation justification + minimum competitive offers | FR-072, BR-04, BR-05, BR-10 |
| M9 | Provider → Supplier onboarding & verification, then issue the PO | FR-073, FR-074, BR-13 |
| M10 | Implementation tracking: milestones, updates (progress/issue/evidence), status, completion | FR-080…FR-082, BR-14 |
| M11 | Impact metrics (templates) + dated measurements + derived change %/status | FR-090…FR-092, BR-15 |
| M12 | Executive dashboard (investment → outcome) | FR-110 |
| M13 | Need **Journey** view + append-only, SHA-256-chained audit log with verification | FR-012, FR-130, BR-11 |
| M14 | Seeded South-African-style demo data + one-click reset | FR-141 |
| M15 | Docker Compose: MySQL + Spring Boot + React (nginx) in one command | NFR-06 |

## SHOULD HAVE (strengthens the story, cut if time runs out)

| # | Feature | Req. IDs |
| --- | --- | --- |
| S1 | Quotation route: record 3 quotes, comparison, lowest compliant highlighted | FR-070, FR-071 |
| S2 | Solution registry with an open-source filter (repo, licence, deployments) | FR-041, FR-042 |
| S3 | Provider, department and procurement dashboards | FR-110 |
| S4 | In-app notifications with an unread count | FR-120 |
| S5 | CIVIC AI: executive briefing, need analysis, opportunity draft, solution discovery, submission summary, impact summary (Gemini if a key is set, deterministic otherwise) | AI-01…AI-06 |
| S6 | One map with needs, providers and implementations | FR-101 |
| S7 | Business rules settings page (edit thresholds, SLA, weights) | FR-140 |
| S8 | Escalation of overdue approval steps | FR-024, BR-16 |

## COULD HAVE

- Multiple evaluators per submission with score averaging (the data model supports it; the UI shows one evaluator)
- Procurement value by province table (FR-102)
- Shortlisting as a separate step before scoring
- Export the journey/audit trail to CSV
- Dark mode

## FUTURE (explicitly not in the hackathon build)

- Real authentication (OIDC/Keycloak), password policies, MFA
- File upload/storage (S3/MinIO). The MVP stores document *links*.
- Email/SMS/WhatsApp notifications
- CSD / SARS tax-status API verification, ERP commitment integration
- Formal competitive bidding (bid committees, briefing sessions) above organisational thresholds
- Contract management, invoicing, payments
- Public citizen transparency portal
- Anchoring audit hashes to a public blockchain (Blockchain for Impact)
- GeoTech layers (agriculture and mining monitoring), heatmaps, spatial analysis
- Multi-tenant (several municipalities) and a shared solution catalogue
- Provider reputation derived from verified impact

## Ruthless cuts (and why)

| Cut | Why |
| --- | --- |
| B-BBEE certificate generator (from ProcureFlow) | Makes legal claims, and only SANAS-accredited agencies issue certificates. The declared level plus expiry is enough. |
| Fixed PPPFA 80/20 / 90/10 calculator | Replaced by configurable weights. Hard-coding one legal regime contradicts constitution Art. III. |
| Chat interface for CIVIC AI | Six task buttons with grounded outputs demo better and are safer than open chat. |
| Blockchain | A hash chain gives tamper evidence. A ledger adds cost with no MVP value. |
| Real auth | A persona switcher lets judges see four perspectives in seconds. |
