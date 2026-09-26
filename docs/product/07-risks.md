# H. Risks & Weaknesses (critical analysis)

This concept has real weaknesses. Each is listed with a severity (H/M/L) and a practical mitigation for the MVP.

## Scope risks
| Risk | Sev | MVP mitigation |
| --- | --- | --- |
| The lifecycle spans 8 stages, so it's easy to build 8 shallow CRUD screens instead of one convincing story | H | Build strictly for the judge demo. MUSTs are only what the demo needs ([04](04-mvp-scope.md)). Seed data covers the other stages, so they don't all need live creation. |
| Adding Spring Boot + MySQL + Docker triples the surface area vs a front-end prototype | H | One monolith, one migration file, no microservices. The API contract is written first, so the frontend and backend can be built in parallel. Docker Compose is the *only* supported run path. |
| Temptation to add blockchain, GIS and chat to tick more challenge boxes | M | The constitution bans them for the MVP. Secondary challenges are addressed through data (open-source flags, provider types), not features. |

## Technical risks
| Risk | Sev | MVP mitigation |
| --- | --- | --- |
| Docker/MySQL startup race (the backend starts before the DB is ready) | M | A Compose `healthcheck` on MySQL, `depends_on: condition: service_healthy`, and Flyway runs on boot. |
| Derived values (scores, SLA, budget) drift between the frontend and backend | M | The backend computes every derived value and returns it in DTOs. The frontend never recalculates. |
| Seed dates go stale (deadlines pass, approvals all become overdue) | M | Seed dates are relative to *now* at seed time, and there's a reset endpoint. |
| Windows developers get CRLF-broken `mvnw` in containers | L | `.gitattributes` forces LF, and the Maven build runs inside the Docker image. |

## Business-model risks
| Risk | Sev | Mitigation |
| --- | --- | --- |
| Municipalities already pay for ERP/SCM systems and won't replace them | H | Position CIVICFLOW as the **need-to-impact layer** that sits beside the ERP (the PO number and commitments get pushed to the ERP later). It doesn't replace it. |
| Who pays? Innovators won't pay to find government work | M | Public-sector SaaS (per organisation), or funding by innovation agencies and programmes. It's open source, so there's no vendor lock-in, which is a selling point in public procurement. |

## Adoption risks
| Risk | Sev | Mitigation |
| --- | --- | --- |
| Officials see it as extra admin on top of existing processes | H | The need form *is* the requisition (one form, not two). Metric templates cut impact capture to a few clicks. |
| Innovators don't trust that small providers can win | M | Weights and scoring are published on the opportunity, and the breakdown is explainable. Local participation and B-BBEE are visible inputs. |
| Impact measurement stops after go-live | H | Impact is part of the same implementation record, and executives see *"not measured"* as a status. |

## Data risks
| Risk | Sev | Mitigation |
| --- | --- | --- |
| Self-declared B-BBEE levels and impact figures may be false | H | Declared vs verified status is shown, measurements require an evidence link and a named recorder, and auditors have a read-only trail. Integrating certificate/CSD verification is Future. |
| Personal information (POPIA) about provider contacts | M | Only business contact data. Real deployments need a privacy notice and retention policy (SEC-05). |
| Demo data mistaken for real organisations | L | A fictional municipality and `example.org` URLs. |

## AI risks
| Risk | Sev | Mitigation |
| --- | --- | --- |
| Hallucinated supplier facts or impact numbers | H | Grounded context only, references cited, "not recorded" when data is missing, and a *draft* label. |
| AI perceived as making procurement decisions | H | No write/decision endpoints are reachable from AI, and the UI says "AI assists, humans decide". Selection requires a human action and is audited with the user's ID. |
| API key leakage | M | The key lives only in the backend environment (`GEMINI_API_KEY`), never in the frontend bundle. |
| No key / no network on demo day | M | A deterministic fallback engine produces the same structured summaries. |

## Governance risks
| Risk | Sev | Mitigation |
| --- | --- | --- |
| Rules presented as law could mislead | M | Rules are labelled as organisational configuration, and the docs avoid legal claims. |
| Rule changes rewrite history | M | Rule sets are versioned, and each request stores the version it was routed under. |
| Collusion: an evaluator tied to a provider | M | Segregation-of-duties checks (BR-09). Declarations of interest are Future. |
| Audit log tampering | M | Append-only service (no update/delete), a SHA-256 hash chain and a verification endpoint. |

## UX risks
| Risk | Sev | Mitigation |
| --- | --- | --- |
| Too many modules, so judges get lost | H | The **Journey** view ties everything to one need. Role-specific navigation shows only relevant sections. |
| Dashboard clutter | M | Executive KPIs are limited to 8 cards plus a funnel, and details are one click away. |
| Accessibility | M | Semantic elements, labels, focus rings, and status badges that combine text with colour. |
