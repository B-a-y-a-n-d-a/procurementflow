# I. Final Recommendation & Consolidated Architecture

## 1. What CIVICFLOW actually is
A **need-to-impact management layer** for the public sector. It captures a problem, funds and approves it, opens it to local innovators, selects transparently, and then tracks delivery and measured outcomes, all in one traceable record chain.

## 2. Who it serves
- **Primary:** municipal and provincial departments, supply chain management units, finance, and executives.
- **Supply side:** local SMEs, startups, co-operatives, innovators, technology companies and open-source projects.
- **Oversight:** internal audit, the Auditor-General, and (in future) citizens.

## 3. What problem it solves
Public problems don't reach local innovators, procurement choices are hard to explain, and nobody can show whether spending worked.

## 4. Why it matters
Money spent without evidence of outcomes erodes service delivery and public trust. Meanwhile local innovation, including hackathon outputs, rarely reaches the people it could serve. Linking the two, with proof of impact, turns procurement into a development instrument.

## 5. Why the solution is different
One data model runs from **problem to measured outcome**. Selection is **explainable and configurable**. **Providers** are discoverable before they're **suppliers**. The AI is **bounded and grounded**. See [06-differentiation.md](06-differentiation.md).

## 6. What the MVP must demonstrate
The single vertical slice in [05-judge-demo.md](05-judge-demo.md): need → budget validation → approval → opportunity → submissions → weighted evaluation → human selection with justification → supplier onboarding → PO → implementation → impact → executive dashboard → audit chain verification.

## 7. Primary challenge
**Gov Innovation Platform.** It connects innovators with public-sector opportunities, increases the visibility of local solutions, fosters collaboration between departments, procurement and providers, and tracks idea → real-world impact.

## 8. Secondary challenges it naturally supports
- **Open Source Agenda:** open-source solution catalogue, licence and repository metadata, an "open-source preferred" flag, and the platform itself is open source.
- **Street Economy:** local-business and co-operative provider types and local-participation scoring, *where organisational rules permit*.
- **Brand New:** "public outcome accountability".
- *Future:* **Blockchain for Impact** (anchoring the audit hash chain), **GeoTech** (spatial impact layers for agriculture/mining).

## 9. What NOT to build for the hackathon
Real SSO; file storage; email/SMS; ERP/CSD integrations; formal bid-committee workflows; contract and payment management; blockchain; GIS analytics; open-ended chat; multi-tenancy; a citizen portal; native mobile apps.

---

## Consolidated architecture

```text
┌──────────────────────────── Docker Compose ────────────────────────────┐
│                                                                        │
│  frontend (nginx :3000)            backend (Spring Boot :8080)         │
│  ┌──────────────────────┐  /api   ┌──────────────────────────────────┐ │
│  │ React 19 + TS + Vite │ ──────▶ │ web      REST controllers + DTOs │ │
│  │ Tailwind, Leaflet    │         │ security demo persona filter     │ │
│  │ role dashboards,     │         │ service  lifecycle services      │ │
│  │ journey, evaluation  │         │          (need, approval, opp,   │ │
│  └──────────────────────┘         │           evaluation, procurement│ │
│                                   │           implementation, impact)│ │
│                                   │ rules    pure rule engine (JUnit)│ │
│                                   │ audit    SHA-256 chained log     │ │
│                                   │ ai       CivicAiService ──▶ Gemini (optional)
│                                   │ seed     demo data (relative dates)│
│                                   └───────────────┬──────────────────┘ │
│                                                   │ JPA / Flyway       │
│                                   ┌───────────────▼──────────────────┐ │
│                                   │ MySQL 8 (:3306) volume civicflow │ │
│                                   └──────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

**Lifecycle services and their state machines:**

| Service | Owns | Emits (audit) |
| --- | --- | --- |
| NeedService | PublicNeed, PurchaseRequest | NEED_CREATED, REQUEST_SUBMITTED, BUDGET_VALIDATED |
| ApprovalService | ApprovalStep | REQUEST_APPROVED/REJECTED/ESCALATED |
| OpportunityService | InnovationOpportunity, EvaluationCriterion | OPPORTUNITY_CREATED/PUBLISHED/CLOSED |
| SubmissionService | OpportunitySubmission | SUBMISSION_* |
| EvaluationService | Evaluation, EvaluationScore | EVALUATION_COMPLETED |
| ProcurementService | SupplierQuote, Supplier, PurchaseOrder | QUOTE_RECORDED, SUPPLIER_SELECTED/ONBOARDED/VERIFIED, PO_ISSUED |
| ImplementationService | Implementation, Milestone, ImplementationUpdate | IMPLEMENTATION_* |
| ImpactService | ImpactMetric, ImpactMeasurement | IMPACT_METRIC_DEFINED, IMPACT_UPDATED |
| RuleService | BusinessRuleSet, ApprovalRule | RULES_UPDATED |
| AuditService / NotificationService | cross-cutting | — |

**Bottom line:** build CIVICFLOW as **one lifecycle with one data spine**. Every screen is a view of a record's position on that spine, and every rule is configuration.
