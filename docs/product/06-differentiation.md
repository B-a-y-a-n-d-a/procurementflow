# G. Product Differentiation

What makes CIVICFLOW different is its **data model and workflow**, not its adjectives. The comparison below is at the level of what each type of product *records* and *enforces*.

| Compared with | What it does well | What it structurally can't do | What CIVICFLOW does differently |
| --- | --- | --- | --- |
| **Traditional procurement / e-procurement software** (requisition → PO) | Controls: budgets, approvals, POs, compliance | Starts at "I want to buy X", so the *problem* is never captured, and it stops at the PO. Outcomes live outside the system. | The root record is a **PublicNeed** (problem + desired outcome), not a requisition. The PO **spawns** an Implementation and ImpactMetrics, so the same record chain answers *"did it work?"*. |
| **Supplier marketplaces / directories** (e.g. vendor databases) | Findability of registered vendors | They list *who sells*, not *which public problems exist*. Suppliers have to be registered before they're discoverable, which excludes early-stage innovators. | **Provider ≠ Supplier.** Innovators, co-ops and open-source projects join as Providers with Solutions, and they become Suppliers only when selected. Opportunities are problem-first and carry their published evaluation weights. |
| **Government tender portals / bulletins** | Legal publication of bids | One-way broadcast: PDFs, no structured capabilities, no evaluation transparency to bidders, and no link to delivery. | Structured opportunities (capabilities, location, eligible provider types, open-source preference). The **weighted scoring and its breakdown** are explicit, and the same platform tracks the award into delivery and impact. |
| **Innovation directories / hackathon showcases** | Visibility of prototypes | No procurement pathway. Great demos die after the event. | The **Solution Registry** is wired to real, budgeted, approved needs. Platform deployments are *counted from actual implementations*, not self-declared. |
| **Generic project management tools** (Jira, Asana, MS Project) | Tasks, milestones | They don't know about budgets, approvals, supplier selection or public outcomes. Impact is a free-text field. | Implementation milestones are tied to a **PO and a need**. Impact metrics have a **baseline, target, direction and dated, evidenced measurements**, with a derived status that rolls up to executives. |
| **Generic AI chatbots** | Fluent text | They hallucinate, and they have no authority boundaries. | CIVIC AI has **six bounded tasks** over **cited platform records**. It can't approve, select or write, and it has a deterministic fallback. |

## The three product-level differentiators

1. **Problem-to-outcome traceability in one data model.** `PublicNeed → PurchaseRequest → Opportunity → Submission → Evaluation → PurchaseOrder → Implementation → ImpactMeasurement` is a single foreign-key chain. The **Journey** view and the executive "invested → outcome" figures are simple joins, not a reporting project.
2. **Explainable, configurable selection.** Each score is `criterion score × weight`, auto criteria come from versioned rules, manual criteria need a rationale, and deviating from the recommendation requires a justification. All of it is in a hash-chained audit trail.
3. **An inclusive supply side.** Providers of any type (SME, co-op, startup, innovator, open-source project) can be discovered *before* they're formal suppliers, and local participation is a first-class, configurable scoring input.
