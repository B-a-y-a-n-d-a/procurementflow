# A. CIVICFLOW: Consolidated Product Definition

> **CIVICFLOW is a public innovation, procurement and impact management platform. It connects public-sector problems with local solutions, manages transparent procurement workflows, tracks implementation and measures real-world outcomes.**
>
> **From Public Need to Measurable Impact.**

---

## 1. The product in one paragraph

A municipal or provincial department records a **Public Need**: a problem, stated in terms of outcomes, with a budget, a location and the capabilities it requires. CIVICFLOW checks the budget and routes the internal **Purchase Request** through the configured approvals. Once approved, the need is either published as an **Innovation Opportunity** that local SMEs, startups, co-operatives, innovators and open-source projects can discover and respond to, or sourced through **quotations** for routine purchases. Submissions are scored against **configurable, weighted criteria** with the full calculation visible. A human selects the winner and justifies any deviation from the recommendation. The winning **Provider** is onboarded as a **Supplier**, and a **Purchase Order** is issued. From there CIVICFLOW keeps going: it tracks the **Implementation** (milestones, issues, delivery evidence) and records **Impact Metrics** against a baseline and a target. Every step writes to an append-only, hash-chained **audit trail**, and every rand can be traced from problem to outcome.

## 2. The lifecycle (the spine of the product)

```text
PROBLEM ─▶ NEED ─▶ APPROVAL ─▶ OPPORTUNITY ─▶ SUBMISSIONS ─▶ EVALUATION ─▶ SELECTION ─▶ PURCHASE ORDER ─▶ IMPLEMENTATION ─▶ IMPACT
   │                                                                                                                           │
   └──────────────────────────────────── AUDIT TRAIL (every transition) ───────────────────────────────────────────────────────┘
```

| Lifecycle question | Answered by |
| --- | --- |
| *What problem is government trying to solve?* | `PublicNeed`: problem statement, desired outcome, location, capabilities |
| *Is there money, and who approved it?* | `PurchaseRequest` + `ApprovalStep`s: budget snapshot, thresholds, SLA |
| *What solutions exist?* | `InnovationOpportunity`, the solution registry (`InnovationSolution`), `Provider` ecosystem |
| *Why was one selected?* | `EvaluationCriterion` weights, `Evaluation` + `EvaluationScore`s, deviation justification on the `PurchaseOrder` |
| *Was it actually implemented?* | `Implementation`, `Milestone`s, `ImplementationUpdate`s (issues and evidence) |
| *Did it produce measurable results?* | `ImpactMetric` (baseline, target) + `ImpactMeasurement`s (dated, evidenced) |

## 3. Resolving ProcureFlow → CIVICFLOW contradictions

| # | Contradiction / overlap | Resolution |
| --- | --- | --- |
| 1 | ProcureFlow started with a *Purchase Request*. CIVICFLOW starts with a *Public Need*. | **Every Purchase Request belongs to exactly one Public Need.** Even routine buys (laptops) record a light need, so every rand has a "why". The need is the problem, and the request is the internal financial and approval instrument. |
| 2 | Approval of a need vs approval of a request | Only the **Purchase Request** is approved, because it carries the money. The need's lifecycle *stage* is **derived** from its linked records. It isn't a second status that could drift. |
| 3 | Supplier quotes (ProcureFlow) vs opportunity submissions (CIVICFLOW) | Two **sourcing methods** on the request: `QUOTATION` (routine goods and services from existing suppliers) and `OPEN_OPPORTUNITY` (public problem → innovators). The "minimum competitive offers" rule applies to both, counting compliant quotes or eligible submissions. |
| 4 | Supplier vs innovator | **Provider** = any organisation offering a solution. **Supplier** = a provider's formal procurement registration (CSD number, tax compliance), created only when needed. B-BBEE status belongs to the Provider organisation, so it's stored once. |
| 5 | ProcureFlow's PPPFA 80/20 & 90/10 calculator and B-BBEE scorecard generator | **Dropped as hard-coded features.** They made legal claims and didn't serve the lifecycle. Replaced with a **configurable weighted evaluation engine** (price, technical, suitability, local participation, B-BBEE, experience, implementation). An organisation can configure weights that mirror its own preference policy. |
| 6 | Purchase Order was the end of ProcureFlow | The PO is now **the midpoint**. It spawns an `Implementation`, which in turn owns `ImpactMetric`s. |
| 7 | Notifications and audit trail were generic | Both are now **lifecycle events** (`NEED_CREATED` … `IMPACT_UPDATED`), and they drive the executive "what needs attention" views. |
| 8 | Financial dashboards | Kept, but reframed as **investment → outcome** ("R420 000 invested → 34.7% fewer dumping hotspots"), not only spend. |
| 9 | Hard-coded policy numbers scattered in code | A single, editable **Business Rule Set** (approval thresholds, SLA, quotation rule, weights, scoring tables). |

**ProcureFlow features kept:** purchase requests, department budgets, budget validation, approval routing, delegation thresholds, supplier management, quotations and comparison, B-BBEE information, purchase orders, SLA monitoring, notifications, audit trail, dashboards.
**Dropped:** the B-BBEE scorecard certificate generator, the fixed PPPFA solver sandbox and the static KPI figures.

## 4. Who it serves

| Persona | Primary job in CIVICFLOW |
| --- | --- |
| **Department Officer** (e.g. Environmental Services) | Describe the problem, request budget, own the need |
| **Department Manager** | First-line approval, implementation manager for their department |
| **Finance Director** | High-value approval, budget oversight |
| **Procurement Officer** (Supply Chain) | Turn approved needs into opportunities, run evaluation, onboard suppliers, issue POs |
| **Evaluator** | Score submissions against criteria with rationale |
| **Provider** (SME, startup, co-op, innovator, open-source project, tech company, local business) | Discover opportunities, showcase solutions, submit proposals, track outcomes |
| **Executive** (City/Municipal Manager, MMC) | See investment, delivery risk and impact across departments |
| **Auditor** | Read-only access to the full, tamper-evident trail |
| **Administrator** | Configure business rules, departments and users |

## 5. Product modules (and how each serves the lifecycle)

| Module | Lifecycle stage | MVP? |
| --- | --- | --- |
| Public Need Management | Problem → Need | ✅ |
| Procurement Request & Approvals (budget, thresholds, SLA, escalation) | Need → Approval | ✅ |
| Innovation Opportunity Marketplace | Approval → Opportunity | ✅ |
| Solution Registry & Provider Ecosystem (incl. open-source catalogue) | Opportunity ↔ Innovation | ✅ (registry + filters) |
| Submissions | Innovation → Evaluation | ✅ |
| Evaluation Engine (weighted, explainable) | Evaluation → Selection | ✅ |
| Procurement Engine (quotes, comparison, supplier onboarding, PO) | Selection → PO | ✅ |
| Implementation Management | PO → Delivery | ✅ |
| Impact Management | Delivery → Outcome | ✅ |
| Geographic view (needs, opportunities, providers, projects on one map) | Cross-cutting | ✅ (one map, four layers) |
| CIVIC AI (grounded drafts and summaries) | Cross-cutting | ✅ (executive briefing, need analysis, opportunity draft, submission summary, impact summary) |
| Role dashboards (Executive, Department, Procurement, Provider) | Cross-cutting | ✅ |
| Notifications | Cross-cutting | ✅ (in-app) |
| Audit Log | Cross-cutting | ✅ |
| Business Rules settings | Cross-cutting | ✅ |

## 6. What CIVICFLOW is *not*

- Not an ERP or a financial ledger. It records commitments and references, and it integrates later.
- Not an e-tender portal replacement for formal bids above an organisation's competitive-bid threshold. It covers need-led innovation procurement and quotations, and it hands off above that threshold (see risks).
- Not a GIS. It has one practical map with four layers.
- Not a chatbot. CIVIC AI does six specific, grounded jobs.
- Not a blockchain product. The audit trail is hash-chained, and anchoring to a public ledger is a *future* option for the Blockchain for Impact challenge.
